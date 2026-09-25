import { analyzeAccidentDamage } from "./src/utils/aiAnalyzer.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const claimSchema = new mongoose.Schema({}, { strict: false });
const Claim = mongoose.model("Claim", claimSchema, "claims");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");
    const claim = await Claim.findOne({ claimNumber: "CLM-0000-0034" });
    if (!claim) {
      console.log("Claim not found.");
      return;
    }
    const allUrls = [
      ...(claim.get('accidentPhotos')?.front || []),
      ...(claim.get('accidentPhotos')?.rear || []),
      ...(claim.get('accidentPhotos')?.side || [])
    ];
    console.log("Urls:", allUrls);
    console.log("Downloading images...");
    const base64Photos = await Promise.all(
      allUrls.map(async (url) => {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString("base64");
      })
    );
    console.log("Downloaded. Running AI analysis...");
    const aiResult = await analyzeAccidentDamage(base64Photos);
    console.log("AI Result:", JSON.stringify(aiResult, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
