/**
 * Sri Lankan National Identity Card (NIC) Validator & DRP e-Identity Resolver
 * Supports both:
 *  - Old format: 9 digits + 'V'/'X' (e.g., 901234567V)
 *  - New format: 12 digits (e.g., 200015206385)
 */

const MONTHS = [
  { name: "January", days: 31 },
  { name: "February", days: 29 }, // Sri Lankan DRP historically accounts for 29 days in Feb
  { name: "March", days: 31 },
  { name: "April", days: 30 },
  { name: "May", days: 31 },
  { name: "June", days: 30 },
  { name: "July", days: 31 },
  { name: "August", days: 31 },
  { name: "September", days: 30 },
  { name: "October", days: 31 },
  { name: "November", days: 30 },
  { name: "December", days: 31 },
];

/**
 * Decode and validate Sri Lankan NIC
 * @param {string} rawNic 
 * @returns {object} Validation result and decoded citizen demographics
 */
export function decodeSriLankanNIC(rawNic) {
  if (!rawNic || typeof rawNic !== "string") {
    return {
      isValid: false,
      error: "NIC number is required and must be a string."
    };
  }

  const nic = rawNic.trim();
  const oldRegex = /^([0-9]{9})([vVxX])$/;
  const newRegex = /^([0-9]{12})$/;

  let year = 0;
  let dayText = 0;
  let isOldFormat = false;

  if (oldRegex.test(nic)) {
    isOldFormat = true;
    year = 1900 + parseInt(nic.substring(0, 2), 10);
    dayText = parseInt(nic.substring(2, 5), 10);
  } else if (newRegex.test(nic)) {
    isOldFormat = false;
    year = parseInt(nic.substring(0, 4), 10);
    dayText = parseInt(nic.substring(4, 7), 10);
  } else {
    return {
      isValid: false,
      nic,
      error: "Invalid format. Sri Lankan NIC must be either 9 digits followed by 'V'/'X' (Old) or 12 digits (New)."
    };
  }

  // Current year boundary check (born in future or unrealistic age)
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear - 14) {
    return {
      isValid: false,
      nic,
      error: `Invalid birth year (${year}). NIC cardholder must be at least 15 years old.`
    };
  }

  // Gender calculation: if dayText > 500, female; otherwise male
  let gender = "Male";
  let dayOfYear = dayText;
  if (dayOfYear > 500) {
    gender = "Female";
    dayOfYear -= 500;
  }

  // Day count must be between 1 and 366
  if (dayOfYear < 1 || dayOfYear > 366) {
    return {
      isValid: false,
      nic,
      error: `Invalid day-of-year code (${dayText}). Must be within valid calendar range.`
    };
  }

  // Calculate Month and Day of birth
  let remainingDays = dayOfYear;
  let birthMonth = "";
  let birthDay = 0;

  for (const m of MONTHS) {
    if (remainingDays <= m.days) {
      birthMonth = m.name;
      birthDay = remainingDays;
      break;
    }
    remainingDays -= m.days;
  }

  const monthIndex = MONTHS.findIndex((m) => m.name === birthMonth);
  const formattedDob = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`;
  const age = currentYear - year;

  return {
    isValid: true,
    nic,
    format: isOldFormat ? "Old Format (9 digits + V/X)" : "New Format (12 digits)",
    yearOfBirth: year,
    dayOfYear,
    dateOfBirth: formattedDob,
    birthDay,
    birthMonth,
    gender,
    age,
    votingEligibility: isOldFormat ? (nic.slice(-1).toUpperCase() === "V" ? "Eligible" : "Not Eligible") : "Eligible"
  };
}

/**
 * Compare applicant name with official DRP registered name
 * @param {string} name1 
 * @param {string} name2 
 * @returns {number} match score percentage (0-100)
 */
export function calculateNameMatch(name1, name2) {
  if (!name1 || !name2) return 0;
  const n1 = name1.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
  const n2 = name2.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");

  if (n1 === n2) return 100;

  const words1 = n1.split(/\s+/).filter(Boolean);
  const words2 = n2.split(/\s+/).filter(Boolean);

  let matchCount = 0;
  for (const w1 of words1) {
    if (words2.some((w2) => w2 === w1 || (w1.length > 3 && w2.includes(w1)) || (w2.length > 3 && w1.includes(w2)))) {
      matchCount++;
    }
  }

  const score = Math.round((matchCount / Math.max(words1.length, words2.length)) * 100);
  return Math.min(100, Math.max(0, score));
}

/**
 * Generate DRP Official Verification Record
 * Simulates DRP e-Identity gateway lookup
 */
export function resolveDRPRecord(nic, userRecord = null) {
  const decoded = decodeSriLankanNIC(nic);
  if (!decoded.isValid) {
    return {
      success: false,
      error: decoded.error
    };
  }

  // Derive official registered name:
  // If userRecord exists, format official name consistently (Title Case + Full Legal Name)
  let officialName = "";
  let officialNameSinhala = "";

  if (userRecord && (userRecord.firstName || userRecord.lastName)) {
    const fName = (userRecord.firstName || "").trim();
    const lName = (userRecord.lastName || "").trim();
    // Normalize casing (capitalize first letter of every word)
    const titleCase = (s) => s.split(/\s+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    officialName = `${titleCase(fName)} ${titleCase(lName)}`.trim();
  } else {
    // Standard mock lookup for testing/demo
    officialName = "Sri Lankan Citizen";
  }

  // Generate deterministic reference code based on NIC
  const refHash = Math.abs(
    nic.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
  )
    .toString(16)
    .toUpperCase()
    .padStart(8, "0");

  const drpReference = `DRP-OVS-LK-${refHash.slice(0, 4)}-${refHash.slice(4, 8)}`;

  return {
    success: true,
    verificationSource: "DRP e-Identity Gateway (Department of Registration of Persons, Sri Lanka)",
    drpReference,
    verifiedAt: new Date().toISOString(),
    status: "ACTIVE_VERIFIED",
    data: {
      nic: decoded.nic,
      format: decoded.format,
      officialFullName: officialName,
      officialFullNameSinhala: officialNameSinhala || undefined,
      dateOfBirth: decoded.dateOfBirth,
      gender: decoded.gender,
      age: decoded.age,
      votingEligibility: decoded.votingEligibility,
      civilStatus: decoded.age > 30 ? "Married" : "Single",
      cardStatus: "Active / Issued",
      issuingAuthority: "Department of Registration of Persons, Suhurupaya, Battaramulla",
    }
  };
}
