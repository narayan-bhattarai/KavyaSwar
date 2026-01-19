# Deploying KavyaSwar to Vercel

Yes! You can easily host this application on Vercel. Since it is a "Local-First" application, hosting is free and simple.

## ⚠️ Important Limitation
**Please Read Carefully:**
This application uses **IndexedDB** (Browser Storage) to save your books and audio. This means:
1.  **Data is Local:** Your books live *only* on the device (and browser) where you created them.
2.  **No Cloud Sync:** If you open your Vercel link on your phone, you will see an empty library.
3.  **No Sharing:** You cannot send a link to a specific book to a friend, because the book is on *your* computer, not the server.

If you are okay with this (it works like a private digital notebook), proceed below!

## How to Deploy

### Option 1: Vercel Dashboard (Recommended)
1.  **Push to GitHub:**
    *   Initialize a git repo if you haven't: `git init`
    *   Add files: `git add .`
    *   Commit: `git commit -m "Initial commit"`
    *   Push to a new repository on your GitHub account.
2.  **Go to Vercel:**
    *   Log in to [vercel.com](https://vercel.com).
    *   Click **"Add New..."** -> **"Project"**.
    *   Import your `kavyaswar` repository from GitHub.
3.  **Configure:**
    *   **Framework Preset:** It should auto-detect **Vite**.
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
    *   Leave Environment Variables empty.
4.  **Deploy:**
    *   Click **Deploy**.
    *   Wait ~1 minute. Your app is now live!

### Option 2: Vercel CLI
If you have the Vercel CLI installed:
1.  Run `vercel` in this folder terminal.
2.  Keep hitting `Enter` to accept defaults.
3.  Run `vercel --prod` to deploy to production.

## Future: How to enable Sharing?
If you later decide you want to share books with friends, we would need to:
1.  Connect a database like **Supabase** or **Firebase**.
2.  Update `src/lib/db.ts` to save data to the cloud instead of the browser.
