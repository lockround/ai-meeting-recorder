# AI Meeting Recorder (Expo + Vercel AI)

Android-focused Expo app that records meetings, transcribes audio with OpenAI Whisper via the Vercel AI Gateway, and generates summaries and action items using the Vercel AI SDK. Notes are stored locally in SQLite and linked to device calendar events. Includes a lightweight Node server for AI endpoints.

## Features
- Audio recording in-app (Expo AV), saved locally
- Transcription via OpenAI Whisper through Vercel AI Gateway
- Structured summarization with `generateObject` (summary + actionItems[])
- Local SQLite storage for offline access
- Device calendar integration to schedule and link notes
- Dashboard of upcoming events, meeting detail view, and search

## Project Structure

```
workspace/
  mobile/            # Expo app (React Native)
  server/            # Node server (Express) using Vercel AI SDK
  README.md
  .env.example
```

## Prerequisites
- Node.js 18+
- Android device or emulator
- Expo CLI (via `npx expo`)
- OpenAI API Key with access to Whisper and GPT models (or Vercel AI Gateway configured for OpenAI)

## Environment Variables
Copy `.env.example` to `.env` in the repository root and fill in the values.

Important:
- `OPENAI_BASE_URL` should point to your Vercel AI Gateway provider URL for OpenAI if you are using the Gateway. If not using the Gateway, omit it and the server will use the default OpenAI API base.
- `EXPO_PUBLIC_API_URL` is read by the mobile app at build/runtime and must be prefixed with `EXPO_PUBLIC_` to be exposed to the client.

## Setup

1) Install dependencies

```bash
cd server && npm install && cd ..
cd mobile && npm install && cd ..
```

2) Run the AI server (Express)

```bash
cd server
npm run start
# Server listens on http://localhost:8787 by default
```

To expose the server to your device, either run the Android emulator (which can access `http://10.0.2.2:8787`) or use a tunneling service (e.g., `cloudflared`, `ngrok`) and set `EXPO_PUBLIC_API_URL` accordingly.

3) Configure the mobile app

Ensure `.env` has a suitable `EXPO_PUBLIC_API_URL`. For Android emulator, use `http://10.0.2.2:8787`. For physical devices, use your machine IP or tunnel URL.

4) Run the mobile app

```bash
cd mobile
npm run android
```

This launches the Expo dev server and opens the app on Android.

## Usage
- Open the app to view upcoming calendar events (grant calendar permission).
- Tap an event to open its meeting page.
- Record audio (grant microphone permission). Recording saves locally.
- Tap Transcribe to send audio to the server (Whisper) and store the transcript.
- Tap Summarize to generate a summary and action items with structured output.
- Use Search to find previous meetings by title, transcript, summary, or actions.

## Notes on Android Networking
- Android emulator can access host `localhost` as `10.0.2.2`.
- On physical devices, ensure phone and computer are on the same network, or use a tunnel URL set in `EXPO_PUBLIC_API_URL`.

## Customization
- Models: configure via `SUMMARY_MODEL` and `WHISPER_MODEL` in `.env`.
- Gateway: set `OPENAI_BASE_URL` to your Vercel AI Gateway provider URL for OpenAI.

## Troubleshooting
- If transcription fails, verify the server logs and your Gateway configuration and model names.
- Ensure file MIME type and size are supported by your Whisper endpoint.
- Calendar permissions vary by device; ensure they are granted in settings.

## License
MIT

