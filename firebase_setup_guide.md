# Firebase Migration & Deployment Guide

This guide details the steps to fully convert your Lovable-built application to a production-ready application using a Firebase backend, followed by deployment to a production environment.

## 1. Firebase Setup

### Step 1.1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and give it a name (e.g., "Gym Manager").
3. (Optional) Enable Google Analytics if you want to track user metrics.
4. Click **Create Project**.

### Step 1.2: Enable Authentication
1. In the Firebase console, go to **Build > Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, enable **Email/Password**.
4. (Optional) Also enable **Google** if you want social login.

### Step 1.3: Enable Firestore Database
1. Go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (we'll define secure rules later).
4. Choose a region close to your target audience.

### Step 1.4: Enable Storage (Optional but recommended)
1. Go to **Build > Storage**.
2. Click **Get Started** and use the default settings.

### Step 1.5: Get Firebase Config Keys
1. Go to **Project Settings** (the gear icon on the top left).
2. Scroll down to the **Your apps** section.
3. Click the **Web (`</>`)** icon to register a web app.
4. Register the app (e.g., "Gym Manager Web").
5. You will see a `firebaseConfig` object containing keys (`apiKey`, `projectId`, etc.). Copy these values.

---

## 2. Environment Variables

Create a file named `.env.local` in your `e:\gym m\web-app` directory (the root of the React app) and add your keys. It should look exactly like the `.env.example` file I created for you:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> [!IMPORTANT]
> Never commit `.env.local` to GitHub. The `.gitignore` file should already exclude `.env.local`.

---

## 3. Package Dependencies

I cannot install packages directly via CLI due to workspace security boundaries, so please run this in your terminal:

```bash
cd "e:\gym m\web-app"
npm install firebase
```

---

## 4. Understanding the Code Changes

I have already created the foundation for you in your project files:

### `src/config/firebase.js`
This file initializes Firebase using your environment variables and exports the `auth`, `db`, and `storage` instances so they can be imported anywhere in your project.

### `src/context/AuthContext.jsx`
I am refactoring your `AuthContext` to use Firebase Authentication. Instead of storing tokens manually in `localStorage`, Firebase will automatically persist user sessions using `onAuthStateChanged`.

---

## 5. Security Rules (Firestore)

To ensure basic protection in production, go to your Firestore Database rules and apply this snippet:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write data
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Example: Users can only modify their own data
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

---

## 6. Deployment (Vercel)

Once you're ready to launch:

1. Create a free account on [Vercel](https://vercel.com/).
2. You can either push your code to a GitHub repository and connect it to Vercel, or install Vercel CLI and run `vercel` inside `e:\gym m\web-app`.
3. **Environment Variables on Vercel:** During setup on Vercel, you must manually add the variables from your `.env.local` file into the Vercel dashboard's **Environment Variables** section. Vercel automatically exposes them during the build process.
4. Deploy the app. Vercel automatically detects Vite and will run `npm run build`.

> [!NOTE]
> Since we're using Firebase for the backend, you don't need a separate Node.js server deployment! The Vite build running on Vercel acts as your full-stack entry point interfacing directly with Firebase.
