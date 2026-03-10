import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, linkWithPopup } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore'
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage'
import firebaseConfig from '../config/firebase.prod.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Initialize Google Provider
const googleProvider = new GoogleAuthProvider()

let currentUser = null
let syncEnabled = false

// Initialize authentication
export async function initializeAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user
                syncEnabled = true
                console.log('✓ Firebase authenticated:', user.uid, user.isAnonymous ? '(Anonymous)' : '(Verified)')
                resolve(user)
            } else {
                // If no user, standard flow waits for manual login or auto-signs in anonymously
                // For this app, we default to anonymous if not logged in
                try {
                    const result = await signInAnonymously(auth)
                    currentUser = result.user
                    syncEnabled = true
                    console.log('✓ Created new anonymous session:', result.user.uid)
                    resolve(result.user)
                } catch (error) {
                    console.error('Auth initialization error:', error)
                    syncEnabled = false
                    reject(error)
                }
            }
            // unsubscribe() // Don't unsubscribe, we want to listen for auth changes (like linking)
        })
    })
}

export async function signInWithGoogle() {
    if (!auth) throw new Error('Auth not initialized')

    try {
        // If currently anonymous, try to link first
        if (currentUser && currentUser.isAnonymous) {
            try {
                const result = await linkWithPopup(currentUser, googleProvider)
                console.log('✓ Linked anonymous account to Google:', result.user.uid)
                return { success: true, user: result.user, method: 'linked' }
            } catch (linkError) {
                // If linking fails (e.g. email already in use), fall back to normal sign in
                if (linkError.code === 'auth/credential-already-in-use') {
                    // This means the Google account already exists. We must sign in to it.
                    // WARNING: This switches the user and might "hide" current anonymous data locally unless we merge.
                    // For now, let's just sign in.
                    const result = await signInWithPopup(auth, googleProvider)
                    console.log('✓ Signed in to existing Google account:', result.user.uid)
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

// Get current user ID
function getUserId() {
    if (!currentUser) {
        throw new Error('User not authenticated')
    }
    return currentUser.uid
}

// Check if sync is available
export function isSyncEnabled() {
    return syncEnabled && navigator.onLine
}

// ============================================
// BUDGET TRANSACTIONS SYNC
// ============================================

export async function syncBudgetTransactions(transactions) {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const budgetRef = collection(db, 'users', userId, 'budget')

        // Upload all transactions
        const promises = transactions.map(async (txn) => {
            const docRef = doc(budgetRef, txn.id)
            await setDoc(docRef, {
                ...txn,
                synced: true,
                syncedAt: new Date().toISOString()
            })
        })

        await Promise.all(promises)
        return { success: true, count: transactions.length }
    } catch (error) {
        console.error('Budget sync error:', error)
        return { success: false, error: error.message }
    }
}

export async function fetchBudgetTransactions() {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const budgetRef = collection(db, 'users', userId, 'budget')
        const q = query(budgetRef, orderBy('date', 'desc'))
        const snapshot = await getDocs(q)

        const transactions = []
        snapshot.forEach((doc) => {
            transactions.push(doc.data())
        })

        return { success: true, data: transactions }
    } catch (error) {
        console.error('Fetch budget error:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteBudgetTransaction(txnId) {
    if (!isSyncEnabled()) return { success: false }

    try {
        const userId = getUserId()
        const docRef = doc(db, 'users', userId, 'budget', txnId)
        await deleteDoc(docRef)
        return { success: true }
    } catch (error) {
        console.error('Delete budget error:', error)
        return { success: false }
    }
}

// ============================================
// GYM WORKOUTS SYNC
// ============================================

export async function syncGymWorkouts(workouts) {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const workoutsRef = collection(db, 'users', userId, 'workouts')

        const promises = workouts.map(async (workout) => {
            const docRef = doc(workoutsRef, workout.id)
            await setDoc(docRef, {
                ...workout,
                synced: true,
                syncedAt: new Date().toISOString()
            })
        })

        await Promise.all(promises)
        return { success: true, count: workouts.length }
    } catch (error) {
        console.error('Workout sync error:', error)
        return { success: false, error: error.message }
    }
}

export async function fetchGymWorkouts() {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const workoutsRef = collection(db, 'users', userId, 'workouts')
        const q = query(workoutsRef, orderBy('date', 'desc'))
        const snapshot = await getDocs(q)

        const workouts = []
        snapshot.forEach((doc) => {
            workouts.push(doc.data())
        })

        return { success: true, data: workouts }
    } catch (error) {
        console.error('Fetch workouts error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// WEIGHT LOG SYNC
// ============================================

export async function syncWeightLog(weightEntries) {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const weightRef = collection(db, 'users', userId, 'weight')

        const promises = weightEntries.map(async (entry) => {
            // Use ISO date as ID for weight entries since we only have one per day
            const docRef = doc(weightRef, entry.date)
            await setDoc(docRef, {
                ...entry,
                synced: true,
                syncedAt: new Date().toISOString()
            })
        })

        await Promise.all(promises)
        return { success: true, count: weightEntries.length }
    } catch (error) {
        console.error('Weight sync error:', error)
        return { success: false, error: error.message }
    }
}

export async function fetchWeightLog() {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const weightRef = collection(db, 'users', userId, 'weight')
        const q = query(weightRef, orderBy('date', 'desc'))
        const snapshot = await getDocs(q)

        const weightLog = []
        snapshot.forEach((doc) => {
            weightLog.push(doc.data())
        })

        return { success: true, data: weightLog }
    } catch (error) {
        console.error('Fetch weight error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// FLUID INTAKE SYNC
// ============================================

export async function syncFluidLog(fluidLog) {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const fluidRef = collection(db, 'users', userId, 'fluid')

        // fluidLog is a flat object { [isoDate]: liters }
        const promises = Object.entries(fluidLog).map(async ([date, volume]) => {
            const docRef = doc(fluidRef, date)
            await setDoc(docRef, {
                date,
                volume,
                synced: true,
                syncedAt: new Date().toISOString()
            })
        })

        await Promise.all(promises)
        return { success: true, count: Object.keys(fluidLog).length }
    } catch (error) {
        console.error('Fluid sync error:', error)
        return { success: false, error: error.message }
    }
}

export async function fetchFluidLog() {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const fluidRef = collection(db, 'users', userId, 'fluid')
        const snapshot = await getDocs(fluidRef)

        const fluidLog = {}
        snapshot.forEach((doc) => {
            const data = doc.data()
            fluidLog[data.date] = data.volume
        })

        return { success: true, data: fluidLog }
    } catch (error) {
        console.error('Fetch fluid error:', error)
        return { success: false, error: error.message }
    }
}

// ============================================
// INITIAL SYNC (UPLOAD EXISTING DATA)
// ============================================

export async function performInitialSync() {
    if (!isSyncEnabled()) {
        return {
            success: false,
            message: 'Cannot sync: offline or not authenticated'
        }
    }

    try {
        // Check if already synced
        const userId = getUserId()
        const profileRef = doc(db, 'users', userId, 'profile', 'metadata')
        const profileDoc = await getDoc(profileRef)

        if (profileDoc.exists() && profileDoc.data().initialSyncDone) {
            return {
                success: true,
                message: 'Already synced',
                alreadySynced: true
            }
        }

        // Get data from localStorage
        const transactions = JSON.parse(localStorage.getItem('zt.transactions') || '[]')
        const workouts = JSON.parse(localStorage.getItem('zt.gym.workouts') || '[]')
        const photos = JSON.parse(localStorage.getItem('zt.gym.photos') || '[]')
        const weightLog = JSON.parse(localStorage.getItem('zt.weight.log') || '[]')
        const fluidLog = JSON.parse(localStorage.getItem('zt.fluid.log') || '{}')

        // Sync all data
        const results = await Promise.all([
            syncBudgetTransactions(transactions),
            syncGymWorkouts(workouts),
            syncProgressPhotos(photos),
            syncWeightLog(weightLog),
            syncFluidLog(fluidLog)
        ])

        // Mark initial sync as done
        await setDoc(profileRef, {
            initialSyncDone: true,
            syncedAt: new Date().toISOString(),
            budgetCount: transactions.length,
            workoutCount: workouts.length,
            photoCount: photos.length,
            weightCount: weightLog.length,
            fluidCount: Object.keys(fluidLog).length
        })

        return {
            success: true,
            message: `Synced ${transactions.length} transactions, ${workouts.length} workouts, ${weightLog.length} weight entries`,
            budgetCount: transactions.length,
            workoutCount: workouts.length,
            photoCount: photos.length
        }
    } catch (error) {
        console.error('Initial sync error:', error)
        return {
            success: false,
            message: `Sync failed: ${error.message}`
        }
    }
}

// ============================================
// MANUAL SYNC ALL
// ============================================

export async function syncAll() {
    if (!isSyncEnabled()) {
        return { success: false, message: 'Offline or not authenticated' }
    }

    try {
        const transactions = JSON.parse(localStorage.getItem('zt.transactions') || '[]')
        const workouts = JSON.parse(localStorage.getItem('zt.gym.workouts') || '[]')
        const photos = JSON.parse(localStorage.getItem('zt.gym.photos') || '[]')
        const weightLog = JSON.parse(localStorage.getItem('zt.weight.log') || '[]')
        const fluidLog = JSON.parse(localStorage.getItem('zt.fluid.log') || '{}')

        await Promise.all([
            syncBudgetTransactions(transactions),
            syncGymWorkouts(workouts),
            syncProgressPhotos(photos),
            syncWeightLog(weightLog),
            syncFluidLog(fluidLog)
        ])

        return {
            success: true,
            message: 'All features synced to cloud'
        }
    } catch (error) {
        console.error('Sync all error:', error)
        return { success: false, message: error.message }
    }
}

// ============================================
// FETCH ALL (DOWNLOAD FROM CLOUD)
// ============================================

export async function fetchAll() {
    if (!isSyncEnabled()) {
        return { success: false, message: 'Offline or not authenticated' }
    }

    try {
        const [budgetResult, workoutsResult, photosResult, weightResult, fluidResult] = await Promise.all([
            fetchBudgetTransactions(),
            fetchGymWorkouts(),
            fetchProgressPhotos(),
            fetchWeightLog(),
            fetchFluidLog()
        ])

        if (budgetResult.success && budgetResult.data.length > 0) {
            localStorage.setItem('zt.transactions', JSON.stringify(budgetResult.data))
        }

        if (workoutsResult.success && workoutsResult.data.length > 0) {
            localStorage.setItem('zt.gym.workouts', JSON.stringify(workoutsResult.data))
        }

        if (photosResult.success && photosResult.data.length > 0) {
            localStorage.setItem('zt.gym.photos', JSON.stringify(photosResult.data))
        }

        if (weightResult.success && weightResult.data.length > 0) {
            localStorage.setItem('zt.weight.log', JSON.stringify(weightResult.data))
        }

        if (fluidResult.success && Object.keys(fluidResult.data).length > 0) {
            localStorage.setItem('zt.fluid.log', JSON.stringify(fluidResult.data))
        }

        return {
            success: true,
            message: 'Data fetched from cloud',
            budgetCount: budgetResult.data?.length || 0,
            workoutCount: workoutsResult.data?.length || 0,
            photoCount: photosResult.data?.length || 0
        }
    } catch (error) {
        console.error('Fetch all error:', error)
        return { success: false, message: error.message }
    }
}
