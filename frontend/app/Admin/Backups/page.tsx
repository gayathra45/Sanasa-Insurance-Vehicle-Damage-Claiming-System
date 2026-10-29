"use client";

import React, { useState, useEffect } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import HeaderNotificationBell from "@/app/Components/HeaderNotificationBell";
import { API_URL } from "@/app/config";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  DatabaseIcon,
  Download01Icon,
  Delete01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  Clock01Icon,
  RefreshIcon,
  CloudIcon,
  Shield01Icon,
  Folder01Icon
} from "@hugeicons/core-free-icons";

interface BackupFile {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAtMs: number;
}

interface BackupSettings {
  enabled: boolean;
  scheduleTime: string;
  retentionDays: number;
  lastBackupAt: string | null;
  lastStatus: string;
  lastError: string | null;
  lastFileSize: string | null;
  lastRecordsCount?: number;
}

export default function AdminBackupsPage() {
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: true,
    scheduleTime: "02:00",
    retentionDays: 14,
    lastBackupAt: null,
    lastStatus: "Idle",
    lastError: null,
    lastFileSize: null
  });

  // Settings form states
  const [enabledDraft, setEnabledDraft] = useState(true);
  const [scheduleTimeDraft, setScheduleTimeDraft] = useState("02:00");
  const [retentionDaysDraft, setRetentionDaysDraft] = useState(14);
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Trigger state
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Authentication check
  useEffect(() => {
    const adminData = sessionStorage.getItem("logged_in_admin");
    if (!adminData) {
      window.location.href = "/Login";
      return;
    }
  }, []);

  // Fetch initial backup data
  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/admin/backups`);
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups || []);
        if (data.settings) {
          setSettings(data.settings);
          setEnabledDraft(data.settings.enabled ?? true);
          setScheduleTimeDraft(data.settings.scheduleTime || "02:00");
          setRetentionDaysDraft(data.settings.retentionDays || 14);
        }
      }
    } catch (err: any) {
      console.error("Failed to load backups:", err);
      setFeedbackMsg({ type: "error", text: "Failed to connect to backup service." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const triggerToast = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  // 1. Manual Backup Trigger
  const handleTriggerBackupNow = async () => {
    setTriggeringBackup(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${API_URL}/admin/backups/trigger`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create database snapshot.");
      }
      setBackups(data.backups || []);
      if (data.settings) setSettings(data.settings);
      triggerToast("success", `Snapshot successfully created: ${data.backup?.filename} (${data.backup?.fileSizeMb}, ${data.backup?.totalRecords} records in ${data.backup?.durationSec})`);
    } catch (err: any) {
      triggerToast("error", err.message || "Manual backup failed.");
    } finally {
      setTriggeringBackup(false);
    }
  };

  // 2. Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${API_URL}/admin/backups/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: enabledDraft,
          scheduleTime: scheduleTimeDraft,
          retentionDays: Number(retentionDaysDraft)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save backup configuration.");
      }
      setSettings(data.settings);
      triggerToast("success", "Automated backup schedule updated successfully.");
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to update backup settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  // 3. Delete Snapshot
  const handleDeleteBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete backup "${filename}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/admin/backups/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete backup file.");
      }
      setBackups(data.backups || []);
      triggerToast("success", `Backup ${filename} deleted.`);
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to delete backup.");
    }
  };

  // 4. Download file
  const handleDownload = (filename: string) => {
    const downloadUrl = `${API_URL}/admin/backups/download/${encodeURIComponent(filename)}`;
    window.open(downloadUrl, "_blank");
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans select-none overflow-hidden">
      {/* Desktop & Mobile Admin Sidebar */}
      <AdminNavbar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Row */}
        <header className="h-20 bg-white border-b border-slate-200/80 px-6 lg:px-10 flex items-center justify-between flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new Event("open-admin-mobile-menu"))}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-[#102A43]">
                <HugeiconsIcon icon={DatabaseIcon} className="w-5 h-5 text-[#102A43]" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">Database Auto-Backup</h1>
                <p className="text-xs text-slate-500">Automated daily snapshot engine & data archive</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <HeaderNotificationBell href="/Admin/Notifications" />
            <UserAvatarDropdown userType="admin" />
          </div>
        </header>

        {/* Scrollable Body */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto space-y-8 bg-slate-50">
          
          {/* Toast Banner */}
          {feedbackMsg && (
            <div
              className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-fadeIn ${
                feedbackMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={feedbackMsg.type === "success" ? CheckmarkCircle01Icon : Alert02Icon}
                  className="w-4 h-4 flex-shrink-0"
                />
                <span>{feedbackMsg.text}</span>
              </div>
              <button
                onClick={() => setFeedbackMsg(null)}
                className="text-xs font-bold px-2 py-0.5 rounded hover:bg-black/5"
              >
                &times;
              </button>
            </div>
          )}

          {/* Metric Overview Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Backups */}
            <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Available Snapshots</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{backups.length}</h3>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">Stored in backend archive</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                <HugeiconsIcon icon={Folder01Icon} className="w-6 h-6" />
              </div>
            </div>

            {/* Daily Scheduler Status */}
            <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Daily Schedule</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${settings.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                  <h3 className="text-lg font-bold text-slate-900">
                    {settings.enabled ? `Everyday @ ${settings.scheduleTime}` : "Paused"}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  {settings.retentionDays} days retention policy
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <HugeiconsIcon icon={Clock01Icon} className="w-6 h-6" />
              </div>
            </div>

            {/* Last Backup Output */}
            <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Latest Archive Size</span>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {settings.lastFileSize || (backups[0]?.sizeFormatted ?? "N/A")}
                </h3>
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  {settings.lastRecordsCount ? `${settings.lastRecordsCount} documents` : "Gzip compressed"}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" />
              </div>
            </div>

            {/* Target Cloud DB */}
            <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Primary Storage</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">MongoDB Atlas</h3>
                <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Cluster Connected
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                <HugeiconsIcon icon={CloudIcon} className="w-6 h-6" />
              </div>
            </div>
          </section>

          {/* Configuration and Manual Trigger Split Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column (7 cols): Auto Daily Backup Configuration Form */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-[28px] p-6 lg:p-8 shadow-2xs">
              <div className="pb-5 border-b border-slate-100 mb-6">
                <h3 className="text-lg font-bold text-slate-900">Automated Daily Backup Settings</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure the background daily cron job, execution time, and auto-cleanup retention.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
                {/* 1. Toggle switch */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Enable Daily Auto-Backup</h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Automatically dump all collections into a compressed archive every night
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledDraft}
                      onChange={(e) => setEnabledDraft(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-[#102A43]"></div>
                  </label>
                </div>

                {/* 2. Schedule Time Picker */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">
                      Execution Time (24-Hour Format)
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={scheduleTimeDraft}
                        onChange={(e) => setScheduleTimeDraft(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:border-[#102A43] text-sm"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 block">
                      Recommended: Off-peak hours (e.g. 02:00 AM)
                    </span>
                  </div>

                  {/* 3. Retention Days */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-2">
                      Retention Period (Days)
                    </label>
                    <select
                      value={retentionDaysDraft}
                      onChange={(e) => setRetentionDaysDraft(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:border-[#102A43] text-sm"
                    >
                      <option value={7}>7 Days (1 Week)</option>
                      <option value={14}>14 Days (2 Weeks - Recommended)</option>
                      <option value={30}>30 Days (1 Month)</option>
                      <option value={60}>60 Days (2 Months)</option>
                      <option value={90}>90 Days (Quarterly)</option>
                    </select>
                    <span className="text-[11px] text-slate-400 mt-1.5 block">
                      Older snapshots are automatically pruned to preserve disk space
                    </span>
                  </div>
                </div>

                {/* Form Action */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-6 py-2.5 bg-[#102A43] hover:bg-[#163859] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2 border-none"
                  >
                    {savingSettings ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-white" />
                        <span>Save Schedule Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column (5 cols): On-Demand Manual Trigger & Status */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-[28px] p-6 lg:p-8 shadow-2xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Manual Database Snapshot</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Create an instant backup of all database collections right now.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Last Run:</span>
                  <span className="font-semibold text-slate-900">
                    {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : "Never"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Last Status:</span>
                  <span className={`font-bold ${settings.lastStatus === "Success" ? "text-emerald-600" : "text-amber-600"}`}>
                    {settings.lastStatus}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Compression Format:</span>
                  <span className="font-mono text-slate-900 font-semibold">Gzip (.json.gz)</span>
                </div>
              </div>

              <button
                onClick={handleTriggerBackupNow}
                disabled={triggeringBackup}
                className="w-full py-3.5 bg-[#ff9800] hover:bg-[#ff8f00] disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 border-none cursor-pointer"
              >
                {triggeringBackup ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dumping & Compressing Collections...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={DatabaseIcon} className="w-5 h-5 text-white" />
                    <span>Backup Now (Instant Snapshot)</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-4">
                💡 <strong>Safe Operation:</strong> Snapshots export read-only collection dumps without locking write operations or interrupting normal system activity.
              </div>
            </div>

          </section>

          {/* Historical Backups Table */}
          <section className="bg-white border border-slate-200/90 rounded-[28px] p-6 lg:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stored Database Archives</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Download archives to your local storage or remove outdated files.
                </p>
              </div>

              <button
                onClick={fetchBackups}
                disabled={loading}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border-none cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
              >
                <HugeiconsIcon icon={RefreshIcon} className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh List</span>
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-[#102A43] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Loading backup archives...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <HugeiconsIcon icon={DatabaseIcon} className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <h4 className="font-bold text-slate-700 text-sm">No backup files found</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Backup Now" above to generate your first complete database snapshot.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="pb-3 font-bold">Archive Filename</th>
                      <th className="pb-3 font-bold">Created Timestamp</th>
                      <th className="pb-3 font-bold">File Size</th>
                      <th className="pb-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {backups.map((b) => (
                      <tr key={b.filename} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                              <HugeiconsIcon icon={DatabaseIcon} className="w-4 h-4" />
                            </div>
                            <span className="font-mono font-bold text-slate-900 text-xs">{b.filename}</span>
                          </div>
                        </td>
                        <td className="py-4 text-slate-600 font-medium">
                          {new Date(b.createdAt).toLocaleString()}
                        </td>
                        <td className="py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {b.sizeFormatted}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleDownload(b.filename)}
                              className="px-3 py-1.5 bg-[#102A43] hover:bg-[#163859] text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border-none shadow-2xs"
                              title="Download to PC"
                            >
                              <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5 text-white" />
                              <span>Download</span>
                            </button>

                            <button
                              onClick={() => handleDeleteBackup(b.filename)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer border border-rose-200"
                              title="Delete Archive"
                            >
                              <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}
