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
  if (!cleanLocation) return fallbackBranch || "Galle";
  const lowerLocation = cleanLocation.toLowerCase();

  try {
    // 1. Fetch active branches registered in the DB
    const activeBranches = await OfficeStaff.find({}, "branch province district area");
    const activeBranchNames = new Set(activeBranches.map(b => b.branch.trim().toLowerCase()));

    // A. Check if the location is exactly one of the active branches
    for (const b of activeBranches) {
      if (b.branch.trim().toLowerCase() === lowerLocation) {
        return b.branch;
      }
    }

    // B. Check our smart city mapping dictionary to resolve nearby active branches
    const cityNearestBranches = {
      // Western Province
      "colombo": ["Colombo", "Galle"],
      "gampaha": ["Colombo", "Kurunegala"],
      "kalutara": ["Colombo", "Galle"],
      "negombo": ["Colombo", "Kurunegala"],
      "dehiwala-mount lavinia": ["Colombo"],
      "kaduwela": ["Colombo"],
      "moratuwa": ["Colombo"],

      // Central Province
      "kandy": ["Kurunegala", "Colombo"],
      "matale": ["Kurunegala", "Colombo"],
      "nuwara eliya": ["Sooriyawewa", "Matara", "Kurunegala"],
      "gampola": ["Kurunegala", "Colombo"],
      "nawalapitiya": ["Kurunegala", "Colombo"],
      "dambulla": ["Kurunegala", "Colombo"],

      // Southern Province
      "galle": ["Galle", "Matara"],
      "matara": ["Matara", "Galle"],
      "hambantota": ["Sooriyawewa", "Matara", "Galle"],
      "hikkaduwa": ["Galle", "Matara"],
      "ambalangoda": ["Galle", "Matara"],
      "tangalle": ["Sooriyawewa", "Matara", "Galle"],

      // Northern Province
      "jaffna": ["Kurunegala", "Colombo"],
      "vavuniya": ["Kurunegala", "Colombo"],
      "mannar": ["Kurunegala", "Colombo"],
      "kilinochchi": ["Kurunegala", "Colombo"],
      "mullaitivu": ["Kurunegala", "Colombo"],
      "point pedro": ["Kurunegala", "Colombo"],

      // Eastern Province
      "trincomalee": ["Kurunegala", "Colombo"],
      "batticaloa": ["Kurunegala", "Sooriyawewa"],
      "ampara": ["Kurunegala", "Sooriyawewa"],
      "kalmunai": ["Kurunegala", "Sooriyawewa"],
      "samanthurai": ["Kurunegala", "Sooriyawewa"],

      // North Western Province
      "kurunegala": ["Kurunegala", "Colombo"],
      "chilaw": ["Kurunegala", "Colombo"],
      "puttalam": ["Kurunegala", "Colombo"],
      "kuliyapitiya": ["Kurunegala", "Colombo"],
      "wariyapola": ["Kurunegala", "Colombo"],

      // North Central Province
      "anuradhapura": ["Kurunegala", "Colombo"],
      "polonnaruwa": ["Kurunegala", "Colombo"],
      "medawachchiya": ["Kurunegala", "Colombo"],
      "kekirawa": ["Kurunegala", "Colombo"],

      // Uva Province
      "badulla": ["Sooriyawewa", "Matara", "Kurunegala"],
      "bandarawela": ["Sooriyawewa", "Matara", "Kurunegala"],
      "monaragala": ["Sooriyawewa", "Matara"],
      "welimada": ["Kurunegala", "Sooriyawewa"],
      "mahiyanganaya": ["Kurunegala", "Colombo"],

      // Sabaragamuwa Province
      "ratnapura": ["Colombo", "Galle", "Matara"],
      "kegalle": ["Colombo", "Kurunegala"],
      "balangoda": ["Colombo", "Galle", "Matara"],
      "mawanella": ["Kurunegala", "Colombo"],
      "embilipitiya": ["Sooriyawewa", "Matara", "Galle"]
    };

    for (const city of Object.keys(cityNearestBranches)) {
      if (lowerLocation.includes(city)) {
        const preferenceList = cityNearestBranches[city];
        for (const preferred of preferenceList) {
          if (activeBranchNames.has(preferred.toLowerCase())) {
            const match = activeBranches.find(b => b.branch.toLowerCase() === preferred.toLowerCase());
            if (match) return match.branch;
          }
        }
      }
    }

    // C. Traditional Area -> District -> Province matching from DB
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

    // D. Ultimate DB fallback: first active branch
    if (activeBranches && activeBranches.length > 0) {
      return activeBranches[0].branch;
    }
  } catch (error) {
    console.error("Error querying active branches in getNearestBranch:", error);
  }

  // 2. Default hardcoded keyword resolution if DB query failed or matched nothing
  if (/\bkurunegala\b/i.test(lowerLocation)) {
    return "Kurunegala";
  }
  if (/\bsooriyawewa\b/i.test(lowerLocation)) {
    return "Sooriyawewa";
  }
  if (/\bhambantota\b/i.test(lowerLocation) || /\bhambnatota\b/i.test(lowerLocation)) {
    return "Sooriyawewa";
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
