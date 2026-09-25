import OfficeStaff from "../models/office_staff.model.js";

/**
 * Determines the nearest branch name based on a city or location string.
 * This is an async function that queries registered branches from the DB
 * and checks location mapping (Area -> City -> Province -> Fallback).
 * 
 * @param {string} location - The accident location description.
 * @param {string} fallbackBranch - The user's home branch to fallback.
 * @returns {Promise<string>} The resolved branch name.
 */
export async function getNearestBranch(location = "", fallbackBranch = "Galle") {
  const cleanLocation = location.trim();

  try {
    // 1. Fetch active branches registered in the DB
    const activeBranches = await OfficeStaff.find({}, "branch province district area");

    if (activeBranches && activeBranches.length > 0) {
      // Step A: Check if location contains any active branch's specific area name (exact area match)
      for (const branch of activeBranches) {
        if (branch.area) {
          const areaName = branch.area.trim();
          if (areaName) {
            const regex = new RegExp(`\\b${escapeRegExp(areaName)}\\b(?!\\s+Road\\b|\\s+Mawatha\\b|\\s+Street\\b|\\s+Lane\\b|\\s+Avenue\\b)`, "i");
            if (regex.test(cleanLocation)) {
              return branch.branch;
            }
          }
        }
      }

      // Step B: Check if location contains any active branch's district name
      for (const branch of activeBranches) {
        if (branch.district) {
          const districtName = branch.district.trim();
          if (districtName) {
            const regex = new RegExp(`\\b${escapeRegExp(districtName)}\\b(?!\\s+Road\\b|\\s+Mawatha\\b|\\s+Street\\b|\\s+Lane\\b|\\s+Avenue\\b)`, "i");
            if (regex.test(cleanLocation)) {
              return branch.branch;
            }
          }
        }
      }

      // Step C: Check if location contains any active branch's province name
      for (const branch of activeBranches) {
        if (branch.province) {
          const provName = branch.province.trim();
          if (provName) {
            const regex = new RegExp(`\\b${escapeRegExp(provName)}\\b(?!\\s+Road\\b|\\s+Mawatha\\b|\\s+Street\\b|\\s+Lane\\b|\\s+Avenue\\b)`, "i");
            if (regex.test(cleanLocation)) {
              return branch.branch;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Error querying active branches in getNearestBranch:", error);
  }

  // 2. Default hardcoded keyword resolution if DB query failed or matched nothing
  const lowerLocation = cleanLocation.toLowerCase();
  if (/\bkurunegala\b/i.test(lowerLocation)) {
    return "Kurunegala";
  }
  if (/\bsooriyawewa\b/i.test(lowerLocation)) {
    return "Sooriyawewa";
  }
  if (/\bhambantota\b/i.test(lowerLocation) || /\bhambnatota\b/i.test(lowerLocation)) {
    return "Hambantota";
  }
  if (/\bmatara\b/i.test(lowerLocation)) {
    return "Matara";
  }
  if (/\bcolombo\b/i.test(lowerLocation) || /\bgampaha\b/i.test(lowerLocation) || /\bkalutara\b/i.test(lowerLocation)) {
    return "Colombo";
  }
  if (/\banuradhapura\b/i.test(lowerLocation) || /\bpolonnaruwa\b/i.test(lowerLocation)) {
    return "Anuradhapura";
  }
  if (/\bembilipitiya\b/i.test(lowerLocation) || /\bratnapura\b/i.test(lowerLocation)) {
    return "Embilipitiya";
  }
  if (/\bgalle\b/i.test(lowerLocation)) {
    return "Galle";
  }

  // 3. Fallback to user home branch
  if (fallbackBranch) {
    const trimmed = fallbackBranch.trim();
    if (trimmed) return trimmed;
  }

  return "Galle";
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
