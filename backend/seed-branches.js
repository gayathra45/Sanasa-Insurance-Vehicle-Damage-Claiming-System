import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ──────────────────────────────────────────────────────────────────────────────
// Inline OfficeStaff model (matches backend/src/models/office_staff.model.js)
// ──────────────────────────────────────────────────────────────────────────────
const officeStaffSchema = new mongoose.Schema({
  name:               { type: String, required: true },
  email:              { type: String, required: true, unique: true },
  mobile:             { type: String, required: true },
  branch:             { type: String, required: true },
  province:           { type: String, required: true },
  district:           { type: String, required: true },
  area:               { type: String, required: true },
  location:           { type: String, required: true },
  staffCount:         { type: Number, required: true },
  password:           { type: String, required: true },
  mustChangePassword: { type: Boolean, default: true },
  resetOtp:           { type: String },
  resetOtpExpires:    { type: Date },
  createdAt:          { type: Date, default: Date.now },
});
const OfficeStaff = mongoose.models.OfficeStaff
  || mongoose.model("OfficeStaff", officeStaffSchema);

// ──────────────────────────────────────────────────────────────────────────────
// Branch data
// ──────────────────────────────────────────────────────────────────────────────
const branches = [
  // Western Province
  { province: "Western",          district: "Colombo",      area: "Colombo",       branch: "Colombo Branch",       name: "Colombo Branch Office Staff",       location: "Colombo, Sri Lanka",          staffCount: 1, email: "colombo@gmail.com",       mobile: "0771234501", password: "colombo" },
  { province: "Western",          district: "Gampaha",      area: "Negombo",       branch: "Negombo Branch",       name: "Negombo Branch Office Staff",       location: "Negombo, Gampaha, Sri Lanka", staffCount: 1, email: "negombo@gmail.com",       mobile: "0712345602", password: "negombo" },
  { province: "Western",          district: "Kalutara",     area: "Kalutara",      branch: "Kalutara Branch",      name: "Kalutara Branch Office Staff",      location: "Kalutara, Sri Lanka",         staffCount: 1, email: "kalutara@gmail.com",      mobile: "0763456703", password: "kalutara" },
  // Central Province
  { province: "Central",          district: "Kandy",        area: "Kandy",         branch: "Kandy Branch",         name: "Kandy Branch Office Staff",         location: "Kandy, Sri Lanka",            staffCount: 1, email: "kandy@gmail.com",         mobile: "0714567804", password: "kandy" },
  { province: "Central",          district: "Matale",       area: "Matale",        branch: "Matale Branch",        name: "Matale Branch Office Staff",        location: "Matale, Sri Lanka",           staffCount: 1, email: "matale@gmail.com",        mobile: "0785678905", password: "matale" },
  { province: "Central",          district: "Nuwara Eliya", area: "Nuwara Eliya",  branch: "Nuwara Eliya Branch",  name: "Nuwara Eliya Branch Office Staff",  location: "Nuwara Eliya, Sri Lanka",     staffCount: 1, email: "nuwaraeliya@gmail.com",   mobile: "0726789016", password: "nuwaraeliya" },
  // Southern Province
  { province: "Southern",         district: "Galle",        area: "Ambalangoda",   branch: "Ambalangoda Branch",   name: "Ambalangoda Branch Office Staff",   location: "Ambalangoda, Galle, Sri Lanka", staffCount: 1, email: "ambalangoda@gmail.com",  mobile: "0778901127", password: "ambalangoda" },
  { province: "Southern",         district: "Matara",       area: "Matara",        branch: "Matara Branch",        name: "Matara Branch Office Staff",        location: "Matara, Sri Lanka",           staffCount: 1, email: "matara@gmail.com",        mobile: "0718901238", password: "matara" },
  { province: "Southern",         district: "Hambantota",   area: "Hambantota",    branch: "Hambantota Branch",    name: "Hambantota Branch Office Staff",    location: "Hambantota, Sri Lanka",       staffCount: 1, email: "hambantota@gmail.com",    mobile: "0769012349", password: "hambantota" },
  // Northern Province
  { province: "Northern",         district: "Jaffna",       area: "Jaffna",        branch: "Jaffna Branch",        name: "Jaffna Branch Office Staff",        location: "Jaffna, Sri Lanka",           staffCount: 1, email: "jaffna@gmail.com",        mobile: "0751122350", password: "jaffna" },
  { province: "Northern",         district: "Kilinochchi",  area: "Kilinochchi",   branch: "Kilinochchi Branch",   name: "Kilinochchi Branch Office Staff",   location: "Kilinochchi, Sri Lanka",      staffCount: 1, email: "kilinochchi@gmail.com",   mobile: "0732233461", password: "kilinochchi" },
  { province: "Northern",         district: "Mannar",       area: "Mannar",        branch: "Mannar Branch",        name: "Mannar Branch Office Staff",        location: "Mannar, Sri Lanka",           staffCount: 1, email: "mannar@gmail.com",        mobile: "0723344562", password: "mannar" },
  { province: "Northern",         district: "Mullaitivu",   area: "Mullaitivu",    branch: "Mullaitivu Branch",    name: "Mullaitivu Branch Office Staff",    location: "Mullaitivu, Sri Lanka",       staffCount: 1, email: "mullaitivu@gmail.com",    mobile: "0774455663", password: "mullaitivu" },
  { province: "Northern",         district: "Vavuniya",     area: "Vavuniya",      branch: "Vavuniya Branch",      name: "Vavuniya Branch Office Staff",      location: "Vavuniya, Sri Lanka",         staffCount: 1, email: "vavuniya@gmail.com",      mobile: "0715566774", password: "vavuniya" },
  // Eastern Province
  { province: "Eastern",          district: "Batticaloa",   area: "Batticaloa",    branch: "Batticaloa Branch",    name: "Batticaloa Branch Office Staff",    location: "Batticaloa, Sri Lanka",       staffCount: 1, email: "batticaloa@ymail.com",    mobile: "0766677885", password: "batticaloa" },
  { province: "Eastern",          district: "Ampara",       area: "Ampara",        branch: "Ampara Branch",        name: "Ampara Branch Office Staff",        location: "Ampara, Sri Lanka",           staffCount: 1, email: "ampara@gmail.com",        mobile: "0757788896", password: "ampara" },
  { province: "Eastern",          district: "Trincomalee",  area: "Trincomalee",   branch: "Trincomalee Branch",   name: "Trincomalee Branch Office Staff",   location: "Trincomalee, Sri Lanka",      staffCount: 1, email: "trincomalee@gmail.com",   mobile: "0788899007", password: "trincomalee" },
  // North Western Province
  { province: "North Western",    district: "Kurunegala",   area: "Kurunegala",    branch: "Kurunegala Branch",    name: "Kurunegala Branch Office Staff",    location: "Kurunegala, Sri Lanka",       staffCount: 1, email: "kurunegala@gmail.com",    mobile: "0729900118", password: "kurunegala" },
  { province: "North Western",    district: "Puttalam",     area: "Puttalam",      branch: "Puttalam Branch",      name: "Puttalam Branch Office Staff",      location: "Puttalam, Sri Lanka",         staffCount: 1, email: "puttalam@gmail.com",      mobile: "0740011229", password: "puttalam" },
  // North Central Province
  { province: "North Central",    district: "Anuradhapura", area: "Anuradhapura",  branch: "Anuradhapura Branch",  name: "Anuradhapura Branch Office Staff",  location: "Anuradhapura, Sri Lanka",     staffCount: 1, email: "anuradhapura@gmail.com",  mobile: "0712127330", password: "anuradhapura" },
  { province: "North Central",    district: "Polonnaruwa",  area: "Polonnaruwa",   branch: "Polonnaruwa Branch",   name: "Polonnaruwa Branch Office Staff",   location: "Polonnaruwa, Sri Lanka",      staffCount: 1, email: "polonnaruwa@gmail.com",   mobile: "0763233441", password: "polonnaruwa" },
  // Uva Province
  { province: "Uva",              district: "Badulla",      area: "Badulla",       branch: "Badulla Branch",       name: "Badulla Branch Office Staff",       location: "Badulla, Sri Lanka",          staffCount: 1, email: "badulla@gmail.com",       mobile: "0754344552", password: "badulla" },
  { province: "Uva",              district: "Moneragala",   area: "Moneragala",    branch: "Moneragala Branch",    name: "Moneragala Branch Office Staff",    location: "Moneragala, Sri Lanka",       staffCount: 1, email: "moneragala@gmail.com",    mobile: "0785455663", password: "moneragala" },
  // Sabaragamuwa Province
  { province: "Sabaragamuwa",     district: "Ratnapura",    area: "Ratnapura",     branch: "Ratnapura Branch",     name: "Ratnapura Branch Office Staff",     location: "Ratnapura, Sri Lanka",        staffCount: 1, email: "ratnapura@ymail.com",     mobile: "0726566774", password: "ratnapura" },
  { province: "Sabaragamuwa",     district: "Kegalle",      area: "Kegalle",       branch: "Kegalle Branch",       name: "Kegalle Branch Office Staff",       location: "Kegalle, Sri Lanka",          staffCount: 1, email: "kegalle@gmail.com",       mobile: "0777677885", password: "kegalle" },
];

// ──────────────────────────────────────────────────────────────────────────────
// Main seed function
// ──────────────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log("✅ Connected!\n");

  let inserted = 0;
  let skipped  = 0;

  for (const data of branches) {
    const exists = await OfficeStaff.findOne({ email: data.email });
    if (exists) {
      console.log(`⏩ Skipped (already exists): ${data.email}`);
      skipped++;
      continue;
    }
    await OfficeStaff.create({ ...data, mustChangePassword: true });
    console.log(`✅ Inserted: ${data.branch}  (${data.email})`);
    inserted++;
  }

  console.log(`\n──────────────────────────────`);
  console.log(`📦 Total branches : ${branches.length}`);
  console.log(`✅ Inserted       : ${inserted}`);
  console.log(`⏩ Skipped        : ${skipped}`);
  console.log(`──────────────────────────────`);

  await mongoose.disconnect();
  console.log("🔌 Disconnected.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
