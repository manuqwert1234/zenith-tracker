// Optional cloud backup config.
//
// CalTrack works fully offline with zero setup — all data lives in this
// browser's localStorage/IndexedDB. Cloud sync is entirely opt-in: it only
// turns on if *you* create your own Firebase project and put its keys in a
// local .env file (see .env.example). Nobody's credentials are baked into
// this repo, so forking this app never sends your data to someone else's
// database.

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured() {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

// Cheap, dependency-free check (no Firebase SDK import) so callers can
// decide whether to show push-notification UI without pulling in the
// Firebase SDK until the user actually opts in. VITE_VAPID_PUBLIC_KEY is
// self-generated (see .env.example) — free, no Google service required.
export function isPushConfigured() {
    return isFirebaseConfigured() && Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
}

export default firebaseConfig
