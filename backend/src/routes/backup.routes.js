import express from "express";
import {
  getBackupSettings,
  saveBackupSettings,
  executeBackup,
  listBackups,
  getBackupPath,
  deleteBackupFile,
  initBackupScheduler
} from "../services/backup.service.js";

const router = express.Router();

/**
 * GET /api/admin/backups
 * Returns list of backups and current auto-backup configuration
 */
router.get("/", (req, res) => {
  try {
    const settings = getBackupSettings();
    const backups = listBackups();
    return res.json({
      success: true,
      settings,
      backups
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/backups/trigger
 * Manually creates an instant database snapshot
 */
router.post("/trigger", async (req, res) => {
  try {
    const backupResult = await executeBackup("Admin Manual Trigger");
    const backups = listBackups();
    const settings = getBackupSettings();
    return res.json({
      success: true,
      message: "Database backup created successfully.",
      backup: backupResult,
      settings,
      backups
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/backups/download/:filename
 * Streams the backup .json.gz file for download
 */
router.get("/download/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = getBackupPath(filename);

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/gzip");

    return res.download(filePath, filename);
  } catch (err) {
    return res.status(404).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/backups/settings
 * Updates auto-backup schedule, toggle status, and retention days
 */
router.post("/settings", (req, res) => {
  try {
    const { enabled, scheduleTime, retentionDays } = req.body;

    const updates = {};
    if (typeof enabled === "boolean") updates.enabled = enabled;
    if (scheduleTime && typeof scheduleTime === "string") updates.scheduleTime = scheduleTime;
    if (retentionDays && !isNaN(Number(retentionDays))) updates.retentionDays = Number(retentionDays);

    const updated = saveBackupSettings(updates);

    // Reinitialize scheduler with new settings
    initBackupScheduler();

    return res.json({
      success: true,
      message: "Backup settings updated successfully.",
      settings: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/backups/:filename
 * Deletes a specific backup snapshot
 */
router.delete("/:filename", (req, res) => {
  try {
    const { filename } = req.params;
    deleteBackupFile(filename);
    const backups = listBackups();
    return res.json({
      success: true,
      message: `Backup ${filename} deleted successfully.`,
      backups
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
