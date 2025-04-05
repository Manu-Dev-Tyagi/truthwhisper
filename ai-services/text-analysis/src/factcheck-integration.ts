// src/factcheck-integration.ts
import axios from 'axios';

export const NewsDataFactCheck = {
  verifyClaim: async (claim: string) => {
    console.log("🔥 FactCheck Module ACTIVE"); // Add verification
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) throw new Error("API KEY MISSING");
    
    const response = await axios.get(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(claim)}`
    );
    return { rating: 0.7, sources: [] }; // Simplified for testing
  }
};