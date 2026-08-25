// Optional cloud backup/sync. Entirely inert unless the user has configured
// their own Firebase project (see src/config/firebase.js + .env.example).
// The app never calls into Firebase until isFirebaseConfigured() is true.

import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, linkWithPopup } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, orderBy } from 'firebase/firestore'
import firebaseConfig, { isFirebaseConfigured } from '../config/firebase.js'

let app = null
let auth = null
let db = null
let googleProvider = null

if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    db = getFirestore(app)
    googleProvider = new GoogleAuthProvider()
}

let currentUser = null
let syncEnabled = false

export function isCloudSyncAvailable() {
    return isFirebaseConfigured()
}

// Initialize authentication. No-ops (resolves null) if not configured.
export async function initializeAuth() {
    if (!isFirebaseConfigured()) return null

    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user
                syncEnabled = true
                resolve(user)
            } else {
                try {
                    const result = await signInAnonymously(auth)
                    currentUser = result.user
                    syncEnabled = true
                    resolve(result.user)
                } catch (error) {
                    console.error('Auth initialization error:', error)
                    syncEnabled = false
                    reject(error)
                }
            }
        })
    })
}

export async function signInWithGoogle() {
    if (!isFirebaseConfigured() || !auth) {
        return { success: false, error: 'Cloud sync is not configured for this deployment.' }
    }

    try {
        if (currentUser && currentUser.isAnonymous) {
            try {
                const result = await linkWithPopup(currentUser, googleProvider)
                return { success: true, user: result.user, method: 'linked' }
            } catch (linkError) {
                if (linkError.code === 'auth/credential-already-in-use') {
                    const result = await signInWithPopup(auth, googleProvider)
                    return { success: true, user: result.user, method: 'signin' }
                }
                throw linkError
            }
        } else {
            const result = await signInWithPopup(auth, googleProvider)
            return { success: true, user: result.user, method: 'signin' }
        }
    } catch (error) {
        console.error('Google sign-in error:', error)
        return { success: false, error: error.message }
    }
}

function getUserId() {
    if (!currentUser) throw new Error('User not authenticated')
    return currentUser.uid
}

export function isSyncEnabled() {
    return isFirebaseConfigured() && syncEnabled && navigator.onLine
}

export function getCurrentUser() {
    return currentUser
}

// ============================================
// Generic collection sync helpers
// ============================================

async function syncCollection(name, items, idFn) {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }
    try {
        const userId = getUserId()
        const ref = collection(db, 'users', userId, name)
        await Promise.all(
            items.map((item) =>
                setDoc(doc(ref, idFn(item)), { ...item, synced: true, syncedAt: new Date().toISOString() })
            )
        )
        return { success: true, count: items.length }
    } catch (error) {
        console.error(`${name} sync error:`, error)
        return { success: false, error: error.message }
    }
}

async function fetchCollection(name, orderField = 'date') {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated', data: [] }
    try {
        const userId = getUserId()
        const ref = collection(db, 'users', userId, name)
        const q = query(ref, orderBy(orderField, 'desc'))
        const snapshot = await getDocs(q)
        const data = []
        snapshot.forEach((d) => data.push(d.data()))
        return { success: true, data }
    } catch (error) {
        console.error(`Fetch ${name} error:`, error)
        return { success: false, error: error.message, data: [] }
    }
}

const LS_KEYS = {
    foodLog: 'ct.foodLog',
    activityLog: 'ct.activityLog',
    weightLog: 'ct.weightLog',
    customFoods: 'ct.customFoods',
}

function readLocal(key, fallback) {
    try {
        const raw = localStorage.getItem(key)
        return raw == null ? fallback : JSON.parse(raw)
    } catch {
        return fallback
    }
}

export async function syncAll() {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const foodLog = readLocal(LS_KEYS.foodLog, [])
        const activityLog = readLocal(LS_KEYS.activityLog, [])
        const weightLog = readLocal(LS_KEYS.weightLog, [])
        const customFoods = readLocal(LS_KEYS.customFoods, {})

        await Promise.all([
            syncCollection('foodLog', foodLog, (e) => e.id),
            syncCollection('activityLog', activityLog, (e) => e.id),
            syncCollection('weightLog', weightLog, (e) => e.date),
            syncCollection('customFoods', Object.entries(customFoods).map(([id, f]) => ({ id, ...f })), (e) => e.id),
        ])

        return { success: true, message: 'All data synced to cloud' }
    } catch (error) {
        console.error('Sync all error:', error)
        return { success: false, message: error.message }
    }
}

export async function fetchAll() {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const [foodResult, activityResult, weightResult, customFoodsResult] = await Promise.all([
            fetchCollection('foodLog'),
            fetchCollection('activityLog'),
            fetchCollection('weightLog'),
            fetchCollection('customFoods', 'date'),
        ])

        if (foodResult.success && foodResult.data.length > 0) {
            localStorage.setItem(LS_KEYS.foodLog, JSON.stringify(foodResult.data))
        }
        if (activityResult.success && activityResult.data.length > 0) {
            localStorage.setItem(LS_KEYS.activityLog, JSON.stringify(activityResult.data))
        }
        if (weightResult.success && weightResult.data.length > 0) {
            localStorage.setItem(LS_KEYS.weightLog, JSON.stringify(weightResult.data))
        }
        if (customFoodsResult.success && customFoodsResult.data.length > 0) {
            const obj = {}
            customFoodsResult.data.forEach(({ id, ...rest }) => { obj[id] = rest })
            localStorage.setItem(LS_KEYS.customFoods, JSON.stringify(obj))
        }

        return {
            success: true,
            message: `Fetched ${foodResult.data.length} food entries, ${activityResult.data.length} activities, ${weightResult.data.length} weigh-ins`,
        }
    } catch (error) {
        console.error('Fetch all error:', error)
        return { success: false, message: error.message }
    }
}

export async function performInitialSync() {
    if (!isSyncEnabled()) return { success: false, message: 'Cannot sync: offline or not authenticated' }

    try {
        const userId = getUserId()
        const profileRef = doc(db, 'users', userId, 'profile', 'metadata')
        const profileDoc = await getDoc(profileRef)

        if (profileDoc.exists() && profileDoc.data().initialSyncDone) {
            return { success: true, message: 'Already synced', alreadySynced: true }
        }

        const result = await syncAll()

        await setDoc(profileRef, {
            initialSyncDone: true,
            syncedAt: new Date().toISOString(),
        })

        return { ...result, alreadySynced: false }
    } catch (error) {
        console.error('Initial sync error:', error)
        return { success: false, message: `Sync failed: ${error.message}` }
    }
}
