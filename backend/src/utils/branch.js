/**
 * Determines the nearest branch name based on a city or location string.
 * @param {string} location - The city or location name.
 * @param {string} fallbackBranch - The fallback branch if no location matches.
 * @returns {string} The matched branch name.
 */
export function getNearestBranch(location = "", fallbackBranch = "Galle") {
  const cleanLocation = location.trim().toLowerCase();

  // 1. Check for specific city/region keywords to determine the nearest branch area.
  // Check other branches first to prevent "Galle Road" from falsely matching the Galle branch.
  if (cleanLocation.includes("kurunegala")) {
    return "Kurunegala";
  }
  if (cleanLocation.includes("sooriyawewa")) {
    return "Sooriyawewa";
  }
  if (cleanLocation.includes("hambantota") || cleanLocation.includes("hambnatota")) {
    return "Hambantota";
  }
  if (cleanLocation.includes("matara")) {
    return "Matara";
  }
  if (cleanLocation.includes("colombo") || cleanLocation.includes("gampaha") || cleanLocation.includes("kalutara")) {
    return "Colombo";
  }
  if (cleanLocation.includes("anuradhapura") || cleanLocation.includes("polonnaruwa")) {
    return "Anuradhapura";
  }
  if (cleanLocation.includes("embilipitiya") || cleanLocation.includes("ratnapura")) {
    return "Embilipitiya";
  }

  // Check Galle last. If it contains "galle" but is NOT just "galle road" in another city.
  // (Note: If it contains "galle road, kalutara", it will match kalutara/colombo above first).
  if (cleanLocation.includes("galle")) {
    return "Galle";
  }

  // 2. If no location-based branch is matched, return the fallback branch (if valid)
  if (fallbackBranch) {
    const trimmed = fallbackBranch.trim();
    if (trimmed) return trimmed;
  }

  return "Galle";
}
