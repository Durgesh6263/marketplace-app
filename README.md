# Marketplace App

A Vite + React + TypeScript marketplace application with Firebase authentication, Firestore integration, admin dashboard controls, and payment backend support.

## Key features

- Public marketplace pages: home, projects, categories, and project detail pages
- Sell-with-us onboarding flow and contact submission support
- Firebase Authentication with email/password login and optional Google sign-in support
- Admin dashboard with protected routes for managing projects, branding, seller requests, and contact submissions
- Realtime dashboard statistics and sales reporting
- Firebase Cloud Functions support for backend work, including Razorpay payment integration
- Modern UI built with Tailwind CSS, shadcn-ui components, Radix UI, and Framer Motion

## Tech stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- Firebase (Auth, Firestore, Storage, Functions)
- React Router DOM
- React Query
- shadcn-ui + Radix UI
- Razorpay
- Vitest + Testing Library

## Repository structure

- `src/` - frontend application code
  - `pages/` - application routes and page screens
  - `components/` - reusable UI components
  - `hooks/` - custom React hooks, including `useAuth`
  - `integrations/firebase/` - Firebase client initialization
- `functions/` - Firebase Cloud Functions backend code
- `supabase/` - optional Supabase assets and migrations (not required for the main Firebase app)
- `firebase.json` - Firebase configuration file
- `vite.config.ts` - Vite configuration with path aliases

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a local environment file

Create a `.env.local` file in the project root and add your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

3. Start the development server

```bash
npm run dev
```

4. Open the app in your browser

Visit `http://localhost:8080`

> Note: `.env.local` should never be committed to source control.

## Firebase functions

The backend functions are located in `functions/`.

To use them:

```bash
cd functions
npm install
npm run build
npm run serve
```

Deploy functions when ready:

```bash
cd functions
npm run deploy
```

## Available npm scripts

- `npm run dev` — start Vite development server
- `npm run build` — build production assets
- `npm run build:dev` — build in development mode
- `npm run preview` — preview production build locally
- `npm run lint` — run ESLint
- `npm run test` — run tests once
- `npm run test:watch` — run tests in watch mode

## Firebase configuration

This app expects Firebase web credentials in environment variables. The frontend uses `src/integrations/firebase/client.ts` to initialize:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Admin access

Admin routes are protected by `ProtectedAdminRoute` and require a Firebase-authenticated user with an admin role stored in Firestore. The app checks the `user_roles` collection to determine whether a user is an admin.

## Notes

- The project uses a Vite alias `@` for `src/` imports.
- The default dev server port is `8080`.
- The Firebase setup guide is available at `firebase_setup_guide.md`.
