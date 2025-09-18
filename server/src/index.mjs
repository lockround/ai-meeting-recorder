import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ dest: path.join(__dirname, '../../tmp') });

const PORT = process.env.PORT || 8787;

// Configure OpenAI clients via Vercel AI Gateway
// If you use Vercel AI Gateway, set OPENAI_BASE_URL to your Gateway's OpenAI provider URL
const openaiModel = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined,
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Transcription endpoint using Whisper (via Vercel AI Gateway baseURL)
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing file' });
    const filePath = req.file.path;

    // Read file buffer
    // Call Whisper transcription via official OpenAI SDK (compatible with Vercel AI Gateway baseURL)
    const response = await openaiClient.audio.transcriptions.create({
      model: process.env.WHISPER_MODEL || 'whisper-1',
      file: fs.createReadStream(filePath),
      // language: 'en' // optionally set language
    });

    // Cleanup temp file
    fs.unlink(req.file.path, () => {});

    const text = response.text || response?.data?.text || '';
    return res.json({ text });
  } catch (error) {
    console.error('Transcribe error', error);
    return res.status(500).json({ error: 'transcription_failed' });
  }
});

// Summarization endpoint using generateObject for structured output
app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'invalid_body' });

    const schema = z.object({
      summary: z.string().describe('Concise summary of the meeting'),
      actionItems: z.array(z.string()).describe('Actionable items extracted from the meeting'),
    });

    const { object } = await generateObject({
      model: openaiModel(process.env.SUMMARY_MODEL || 'gpt-4o-mini'),
      schema,
      prompt: `Summarize the meeting transcript and extract clear, actionable items.\n\nTranscript:\n\n${text}`,
    });

    return res.json(object);
  } catch (error) {
    console.error('Summarize error', error);
    return res.status(500).json({ error: 'summarization_failed' });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});

