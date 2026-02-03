import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore'
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage'
import firebaseConfig from '../config/firebase.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

let currentUser = null
let syncEnabled = false

// Initialize anonymous authentication
export async function initializeAuth() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUser = user
                syncEnabled = true
                console.log('✓ Firebase authenticated:', user.uid)
                resolve(user)
            } else {
                try {
                    const result = await signInAnonymously(auth)
                    currentUser = result.user
                    syncEnabled = true
                    console.log('✓ Firebase signed in anonymously:', result.user.uid)
                    resolve(result.user)
                } catch (error) {
                    console.error('Firebase auth error:', error)
                    syncEnabled = false
                    reject(error)
                }
            }
        })
    })
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
// PROGRESS PHOTOS SYNC
// ============================================

export async function syncProgressPhotos(photos) {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const photosRef = collection(db, 'users', userId, 'photos')

        // Upload photos to Storage and save metadata to Firestore
        const promises = photos.map(async (photo) => {
            // Upload image to Firebase Storage
            const storageRef = ref(storage, `users/${userId}/photos/${photo.id}.jpg`)
            await uploadString(storageRef, photo.dataUrl, 'data_url')

            // Get download URL
            const downloadURL = await getDownloadURL(storageRef)

            // Save metadata to Firestore
            const docRef = doc(photosRef, photo.id)
            await setDoc(docRef, {
                id: photo.id,
                date: photo.date,
                url: downloadURL,
                synced: true,
                syncedAt: new Date().toISOString()
            })
        })

        await Promise.all(promises)
        return { success: true, count: photos.length }
    } catch (error) {
        console.error('Photos sync error:', error)
        return { success: false, error: error.message }
    }
}

export async function fetchProgressPhotos() {
    if (!isSyncEnabled()) return { success: false, message: 'Offline or not authenticated' }

    try {
        const userId = getUserId()
        const photosRef = collection(db, 'users', userId, 'photos')
        const q = query(photosRef, orderBy('date', 'desc'))
        const snapshot = await getDocs(q)

        const photos = []
        snapshot.forEach((doc) => {
            const data = doc.data()
            // Convert Firebase Storage URL back to local format
            photos.push({
                id: data.id,
                date: data.date,
                dataUrl: data.url, // Use the download URL
                synced: true
            })
        })

        return { success: true, data: photos }
    } catch (error) {
        console.error('Fetch photos error:', error)
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

        // Sync all data
        const results = await Promise.all([
            syncBudgetTransactions(transactions),
            syncGymWorkouts(workouts),
            syncProgressPhotos(photos)
        ])

        // Mark initial sync as done
        await setDoc(profileRef, {
            initialSyncDone: true,
            syncedAt: new Date().toISOString(),
            budgetCount: transactions.length,
            workoutCount: workouts.length,
            photoCount: photos.length
        })

        return {
            success: true,
            message: `Synced ${transactions.length} transactions, ${workouts.length} workouts, ${photos.length} photos`,
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

        await Promise.all([
            syncBudgetTransactions(transactions),
            syncGymWorkouts(workouts),
            syncProgressPhotos(photos)
        ])

        return {
            success: true,
            message: `Synced ${transactions.length} transactions, ${workouts.length} workouts, ${photos.length} photos`
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
        const [budgetResult, workoutsResult, photosResult] = await Promise.all([
            fetchBudgetTransactions(),
            fetchGymWorkouts(),
            fetchProgressPhotos()
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
