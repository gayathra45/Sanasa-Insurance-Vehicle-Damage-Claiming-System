import fs from "fs";
import path from "path";
import zlib from "zlib";
import cron from "node-cron";
import mongoose from "mongoose";

const __dirname = path.resolve();
const BACKUP_DIR = path.join(__dirname, "backups");
const SETTINGS_FILE = path.join(BACKUP_DIR, "settings.json");

// Ensure backup folder exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Default backup settings
const DEFAULT_SETTINGS = {
  enabled: true,
  scheduleTime: "02:00", // 24H format "HH:mm"
  retentionDays: 14,
  lastBackupAt: null,
  lastStatus: "Idle",
  lastError: null,
  lastFileSize: null
};

export function getBackupSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading backup settings:", err.message);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveBackupSettings(newSettings) {
  try {
    const current = getBackupSettings();
    const updated = { ...current, ...newSettings };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (err) {
    console.error("Error saving backup settings:", err.message);
    throw err;
  }
}

/**
 * Executes a full database backup of all collections, compresses to .json.gz,
 * and prunes outdated backups according to retention policy.
 */
export async function executeBackup(triggeredBy = "System Schedule") {
  const startTime = Date.now();
  console.log(`[Backup] Starting MongoDB database backup (triggered by: ${triggeredBy})...`);

  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB connection is not active (state !== 1).");
  }

  const db = mongoose.connection.db;
  const collections = await db.collections();
  const backupData = {
    meta: {
      title: "Sanasa General Insurance Database Snapshot",
      timestamp: new Date().toISOString(),
      triggeredBy,
      dbName: db.databaseName,
      collectionCount: collections.length,
      stats: {}
    },
    collections: {}
  };

  let totalRecords = 0;

  for (const col of collections) {
    const colName = col.collectionName;
    // Skip internal system collections if any
    if (colName.startsWith("system.")) continue;

    try {
      const docs = await col.find({}).toArray();
      backupData.collections[colName] = docs;
      backupData.meta.stats[colName] = docs.length;
      totalRecords += docs.length;
    } catch (colErr) {
      console.warn(`[Backup] Failed reading collection ${colName}:`, colErr.message);
      backupData.collections[colName] = [];
      backupData.meta.stats[colName] = 0;
    }
  }

  backupData.meta.totalRecords = totalRecords;

  // Generate filename with date and time stamp
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `sanasa_backup_${dateStr}.json.gz`;
  const filePath = path.join(BACKUP_DIR, filename);

  // Compress JSON string to gzip
  const jsonStr = JSON.stringify(backupData);
  const compressed = zlib.gzipSync(Buffer.from(jsonStr, "utf-8"), { level: 9 });
  fs.writeFileSync(filePath, compressed);

  const fileSizeBytes = compressed.length;
  const fileSizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`[Backup] Successfully created ${filename} (${fileSizeMb} MB, ${totalRecords} records across ${collections.length} collections in ${durationSec}s).`);

  // Update settings metadata
  saveBackupSettings({
    lastBackupAt: new Date().toISOString(),
    lastStatus: "Success",
    lastError: null,
    lastFileSize: `${fileSizeMb} MB`,
    lastRecordsCount: totalRecords
  });

  // Prune old backups based on retention days
  pruneOutdatedBackups();

  return {
    filename,
    filePath,
    fileSizeBytes,
    fileSizeMb: `${fileSizeMb} MB`,
    totalRecords,
    collectionsCount: Object.keys(backupData.collections).length,
    durationSec: `${durationSec}s`,
    timestamp: now.toISOString()
  };
}

/**
 * Removes backup files older than configured retention days
 */
export function pruneOutdatedBackups() {
  try {
    const settings = getBackupSettings();
    const retentionDays = Number(settings.retentionDays) || 14;
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".json.gz"));
    let prunedCount = 0;

    for (const file of files) {
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoffTime) {
        fs.unlinkSync(fullPath);
        prunedCount++;
        console.log(`[Backup] Pruned expired backup: ${file}`);
      }
    }

    if (prunedCount > 0) {
      console.log(`[Backup] Cleaned up ${prunedCount} expired backups (retention: ${retentionDays} days).`);
    }
  } catch (err) {
    console.warn("[Backup] Error during backup retention pruning:", err.message);
  }
}

/**
 * Lists all existing backup files with metadata
 */
export function listBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".json.gz"));
    const backups = files.map(file => {
      const fullPath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(fullPath);
      const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
      return {
        filename: file,
        sizeBytes: stat.size,
        sizeFormatted: stat.size > 1024 * 1024 ? `${sizeMb} MB` : `${(stat.size / 1024).toFixed(1)} KB`,
        createdAt: stat.mtime.toISOString(),
        modifiedAtMs: stat.mtimeMs
      };
    });

    // Sort newest first
    backups.sort((a, b) => b.modifiedAtMs - a.modifiedAtMs);
    return backups;
  } catch (err) {
    console.error("[Backup] Error listing backups:", err.message);
    return [];
  }
}

/**
 * Retrieves the full path to a backup file safely
 */
export function getBackupPath(filename) {
  const safeFilename = path.basename(filename);
  if (!safeFilename.endsWith(".json.gz")) {
    throw new Error("Invalid backup filename.");
  }
  const fullPath = path.join(BACKUP_DIR, safeFilename);
  if (!fs.existsSync(fullPath)) {
    throw new Error("Backup file not found.");
  }
  return fullPath;
}

/**
 * Deletes a specific backup file
 */
export function deleteBackupFile(filename) {
  const fullPath = getBackupPath(filename);
  fs.unlinkSync(fullPath);
  return { success: true, deleted: filename };
}

// Active cron task reference
let activeCronTask = null;

/**
 * Schedules or reschedules the automated daily backup job
 */
export function initBackupScheduler() {
  const settings = getBackupSettings();

  // Stop previous task if running
  if (activeCronTask) {
    activeCronTask.stop();
    activeCronTask = null;
  }

  if (!settings.enabled) {
    console.log("[Backup] Auto daily backup scheduler is DISABLED in settings.");
    return;
  }

  // Parse time (e.g. "02:00" -> hour: 2, minute: 0)
  const [hourStr, minStr] = (settings.scheduleTime || "02:00").split(":");
  const hour = parseInt(hourStr, 10) || 2;
  const minute = parseInt(minStr, 10) || 0;

  // Cron expression: minute hour * * *
  const cronExpr = `${minute} ${hour} * * *`;
  console.log(`[Backup] Initializing Daily Auto-Backup cron: "${cronExpr}" (every day at ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")})`);

  activeCronTask = cron.schedule(cronExpr, async () => {
    console.log(`[Backup] Cron triggered daily backup at ${new Date().toISOString()}`);
    try {
      await executeBackup("Automated Daily Cron");
    } catch (err) {
      console.error("[Backup] Automated backup failed:", err.message);
      saveBackupSettings({
        lastStatus: "Failed",
        lastError: err.message
      });
    }
  });
}
