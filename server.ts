import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze-script", async (req, res) => {
    try {
      const { scriptContent, customApiKey } = req.body;
      
      if (!scriptContent) {
        return res.status(400).json({ error: "Script content is required" });
      }

      // BYOK Logic: Prioritize the user's key over the server's environment key
      const apiKeyToUse = customApiKey && customApiKey.trim() !== '' 
        ? customApiKey.trim() 
        : process.env.GEMINI_API_KEY;

      if (!apiKeyToUse) {
        return res.status(500).json({ error: "Gemini API key is not configured or provided." });
      }

      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
      
      const prompt = `You are an expert screenplay analyst and story consultant.
Please analyze the following script and provide constructive, actionable feedback.
Focus on:
1. Pacing and Structure
2. Character Arcs and Dialogue
3. Potential Plot Holes or inconsistencies
4. General suggestions for improvement

Do NOT rewrite the script for the user. Provide your feedback in clear, well-formatted Markdown.

Script Content:
---
${scriptContent}
---`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      res.json({ feedback: response.text });
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      res.status(500).json({ error: error.message || "Failed to analyze script" });
    }
  });

  app.post("/api/import-script", async (req, res) => {
    try {
      const { scriptContent, customApiKey } = req.body;
      
      if (!scriptContent) {
        return res.status(400).json({ error: "Script content is required" });
      }

      const apiKeyToUse = customApiKey && customApiKey.trim() !== '' 
        ? customApiKey.trim() 
        : process.env.GEMINI_API_KEY;

      if (!apiKeyToUse) {
        return res.status(500).json({ error: "Gemini API key is not configured or provided." });
      }

      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
      
      const prompt = `You are an expert screenplay parser.
Parse the following script text into a structured JSON format. Extract scenes and characters.
Return ONLY valid JSON matching this exact schema:
{
  "characters": [{ "name": "string", "role": "string", "description": "string" }],
  "scenes": [{
    "title": "string (e.g. INT. HOUSE - DAY)",
    "description": "string (brief summary of the scene)",
    "scriptBlocks": [
      { "type": "scene_heading" | "action" | "character" | "dialogue" | "parenthetical" | "transition", "text": "string" }
    ]
  }]
}

Script Content:
---
${scriptContent}
---`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      let jsonText = response.text;
      if (!jsonText) {
        throw new Error("Failed to generate JSON from script");
      }

      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsedData = JSON.parse(jsonText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error importing script:", error);
      res.status(500).json({ error: error.message || "Failed to import script" });
    }
  });

  app.post("/api/extract-elements", async (req, res) => {
    try {
      const { scriptContent, customApiKey } = req.body;
      
      if (!scriptContent) {
        return res.status(400).json({ error: "Script content is required" });
      }

      const apiKeyToUse = customApiKey && customApiKey.trim() !== '' 
        ? customApiKey.trim() 
        : process.env.GEMINI_API_KEY;

      if (!apiKeyToUse) {
        return res.status(500).json({ error: "Gemini API key is not configured or provided." });
      }

      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
      
      const prompt = `You are an expert screenplay breakdown assistant.
Parse the following script text and extract all characters and production elements.
Return ONLY valid JSON matching this exact schema:
{
  "characters": [{ "name": "string", "role": "string", "description": "string" }],
  "productionElements": [{ "category": "crew" | "prop" | "location" | "music" | "sfx" | "vfx", "name": "string", "description": "string", "sceneHeading": "string (the exact scene heading where this appears)" }]
}

Script Content:
---
${scriptContent}
---`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      let jsonText = response.text;
      if (!jsonText) {
        throw new Error("Failed to generate JSON from script");
      }

      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsedData = JSON.parse(jsonText);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error extracting elements:", error);
      res.status(500).json({ error: error.message || "Failed to extract elements" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
