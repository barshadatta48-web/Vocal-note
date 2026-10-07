import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini on server if key exists
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Health check endpoint for Cloud Run
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Server-side Gemini API route
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3-flash-preview' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return res.json({ text: response.text });
  } catch (err: any) {
    console.error('Server Gemini Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate content' });
  }
});

// Intelligent Speech-to-Text Post-Processor endpoint
app.post('/api/speech-postprocess', async (req, res) => {
  try {
    const { transcript, isHtml = false } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server' });
    }

    const systemInstruction = `You are a real-time speech-to-text post-processor for a notepad application. Process the incoming transcription instantly with low latency. Convert spoken keywords into symbols and formatting markers according to these strict rules:

1. Punctuation Mapping:
- Spoken "period", "dot", or "full stop" -> .
- Spoken "question mark" -> ?
- Spoken "comma" -> ,
- Spoken "exclamation mark" or "exclamation point" -> !
- Spoken "new line" or "next line" -> ${isHtml ? '<br>' : 'Line break'}
- Spoken "colon" -> :
- Spoken "semicolon" -> ;

2. Text Formatting Commands:
- Spoken "bold [text]" or wrapping speech with formatting cues -> Apply markdown bold syntax **text** around the spoken words.
- Spoken "underline [text]" -> Apply HTML underline tags <u>text</u> around the spoken words.

Keep processing extremely fast, maintain natural word spacing, and do not spell out the command words literally. Return ONLY the processed text with no conversational preamble, quotes, or markdown code blocks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: transcript,
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    return res.json({ text: response.text?.trim() || transcript });
  } catch (err: any) {
    console.error('Server Speech Post-Processor Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to post-process transcript' });
  }
});

const distPath = path.resolve(__dirname, 'dist');

// Ensure production dist directory exists before serving
if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
  console.log('Production dist bundle not found. Building with vite...');
  try {
    execSync('npx vite build', { stdio: 'inherit' });
  } catch (err) {
    console.error('Build execution failed:', err);
  }
}

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.status(503).send('Building application, please refresh in a moment.');
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
