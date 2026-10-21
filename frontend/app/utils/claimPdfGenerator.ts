import { API_URL } from "../config";

/**
 * Downloads / opens the official Sanasa Insurance Claim Report PDF
 * @param claimNumber - The claim number (e.g. "CLM-0000-0014")
 */
export function downloadClaimPdf(claimNumber: string) {
  if (!claimNumber) return;
  const baseApi = API_URL.replace(/\/$/, "");
  // Using the backend report endpoint which contains full official Sanasa branding and auto-print to PDF
  const reportUrl = `${baseApi}/claims/${encodeURIComponent(claimNumber.trim())}/report?print=1`;
  
  // Open in a new tab/window which triggers the print/save-as-PDF dialog automatically
  window.open(reportUrl, "_blank");
}
