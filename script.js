import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {
  GoogleGenAI,
  createUserContent
} from "@google/genai";


const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: "AIzaSyBn1tXZE8OlIpKAPLlD5E8dfL21bQz3J_k" });

const systeminstruct = `
You are a professional coder. I will give you flowchart data in JSON format. Your task is to understand the flow and write only the final code in the specified language.

If the flowchart data is empty like []:
- Do not generate any code.
- Simply respond with "Invalid flowchart data."

Only generate code if:
- The JSON contains valid nodes and edges.
- Both "Start" and "Stop" nodes are present.
- Include minimum number of comments

Do NOT:
- Include "Start" or "Stop" in the code.
- Write any code that parses JSON.
- Include the JSON itself or explanations.

Only output the final code logic, nothing else.
`;

app.post('/receive', async (req, res) => {
  try {
    console.log(req.body.data);
    console.log(req.body.language);

    const { data, language } = req.body;

    // Validate if data is empty
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('Invalid data: Empty or missing.');
      return res.json({ error: "Invalid flowchart data." });
    }

    // Validate if Start and Stop nodes are present
    const labels = data.map(node => node.label?.toLowerCase());
    if (!labels.includes("start") || !labels.includes("stop")) {
      console.log('Invalid data: Start or Stop node missing.');
      return res.json({ error: "Invalid flowchart data." });
    }

    // Prepare Gemini content
    const contents = [
      createUserContent([
        `Write code in ${language.name}.`,
        JSON.stringify(data)
      ])
    ];

    console.log(contents);
    console.log("Calling Gemini Function\n");

    // Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        systemInstruction: systeminstruct,
      },
    });

    console.log("Gemini Function Called\n");
    console.log(response.text);

    // Save request body to output.json
    fs.writeFile('output.json', JSON.stringify(req.body, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('Data saved to output.json');
      }
    });

    // Respond with generated text
    return res.json({ result: response.text });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error generating code." });
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});