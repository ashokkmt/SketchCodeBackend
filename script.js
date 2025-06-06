import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {
  GoogleGenAI,
  createUserContent
} from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();


const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


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


function cleanCodeBlock(text) {
  let cleaned = text.replace(/^```[a-zA-Z]*\s*/, '');
  cleaned = cleaned.replace(/```["']?\s*$/, '');
  cleaned = cleaned.trim();
  return cleaned;
}

app.post('/flowrecieve', async (req, res) => {
  try {
    // console.log(req.body.data);
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
      return res.json({ error: "Start or Stop node missing." });
    }

    // Prepare Gemini content
    const contents = [
      createUserContent([
        `Write code in ${language.name}. Do not give output in .md format.`,
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

    const rawText = response.text;
    const cleanText = cleanCodeBlock(rawText);
    console.log(cleanText);


    // Save request body to output.json
    fs.writeFile('output.json', JSON.stringify(req.body, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('Data saved to output.json');
      }
    });

    // Respond with generated text
    return res.json({ result: cleanText });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error generating code." });
  }
});







//////////////////////////////////////////// Algo to Code  Section ///////////////////////////////////////////////////////

const algoInstructions = `
  this is  the algorigthm write a clean code using this algorigthm.
  Give Algo can't be found if the algo seems to be either incomplete or Not logical.
`

app.post("/algorecieve", async (req, res) => {
  console.log(req.body.algo);
  console.log(req.body.language);

  const contents = [
    createUserContent([
      `Write code in ${req.body.language}. Do not give output in .md format.`,
      JSON.stringify(req.body.algo)
    ])
  ];

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
      config: {
        systemInstruction: algoInstructions,
      },
    });

    const rawText = result.text;
    const cleanText = cleanCodeBlock(rawText);

    res.json({
      data: cleanText
    });

  } catch (err) {
    console.error("Error while generating content:", err.message);
    res.status(500).json({ error: "Failed to generate code" });
  }
});


// Start server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});