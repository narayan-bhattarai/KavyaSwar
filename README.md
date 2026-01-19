# KavyaSwar | काव्यस्वर

<div align="center">
  <img src="public/logo.png" alt="KavyaSwar Logo" width="150" />
  <br/>
  <h3>The Voice of Poetry</h3>
  <p><b>A modern Audio Book Creator & Player for Literature.</b><br/>Create, Narrate, and Share immersive reading experiences.</p>
</div>

---

## 📖 About
**KavyaSwar** reimagines the reading experience by blending visual text with oral narration. It is designed for poets, teachers, and literature lovers to preserve and share their work in a format that honors both the written word and the spoken voice.

Users can create **"Audio Books"** by uploading PDFs and recording narration for each page. The result is a synchronized, multimedia book that lives in the cloud.

## ✨ Features

### 🎙️ Creator Studio
*   **PDF Integration**: Upload your manuscripts or books seamlessly.
*   **Page-by-Page Recording**: Record voiceovers for specific pages directly in the browser.
*   **Live Preview**: Real-time feedback and playback during the creation process.

### 🎧 Immersive Reader
*   **Synchronized Playback**: Navigate through the book while audio plays automatically for the current page.
*   **Focus Mode**: A dark, distraction-free interface designed for long reading sessions.
*   **Audio Visualizer**: Beautiful, real-time waveform animations that react to the voice.

### ☁️ Cloud & Tech
*   **Supabase Backend**: Documents and heavy media (PDFs, Audio) are securely stored in the cloud.
*   **PWA Support**: Installable as a native app on desktop and mobile.
*   **Responsive**: Fluid design that works on tablets, phones, and desktops.

## 🛠 Tech Stack
*   **Frontend**: React 18, Vite, TypeScript
*   **Styling**: Modern CSS3 (Variables, Glassmorphism), Lucide React (Icons), Framer Motion (Animations)
*   **Core Libraries**: `react-pdf` (Rendering), `idb` (Local caching)
*   **Backend**: Supabase (Database & Storage)

## 🚀 Getting Started

### 1. Installation
Clone the repo and install dependencies:
```bash
git clone https://github.com/your-username/kavyaswar.git
cd kavyaswar
npm install
```

### 2. Configuration
Create a `.env.local` file in the root directory with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Locally
```bash
npm run dev
```
Visit `http://localhost:5173` to see your app.

## 📦 Deployment
This project is optimized for **Vercel**:
1.  Push your code to **GitHub**.
2.  Import the repository into Vercel.
3.  Add your `VITE_SUPABASE_...` environment variables in Vercel Project Settings.
4.  Deploy!

## 📄 License
MIT

---
*Crafted with ❤️ for the love of Poetry.*
