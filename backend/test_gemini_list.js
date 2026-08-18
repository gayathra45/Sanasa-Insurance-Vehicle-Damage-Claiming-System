import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  try {
    console.log("Listing models with key:", process.env.GEMINI_API_KEY ? "Present" : "Missing");
    // Call listModels to see if the API key works and which models it can see
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ List Models Failed:", err);
  }
}

test();
