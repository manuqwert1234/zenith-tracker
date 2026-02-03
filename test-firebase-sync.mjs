#!/usr/bin/env node

// Firebase Sync Test Script
// This will authenticate, add test data, and verify it's in Firestore

import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, getDocs } from 'firebase/firestore'

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCDX9iUrbkuBUXX_SNDqsSIYo-nNDIk5BI",
    authDomain: "playgorund-8d2eb.firebaseapp.com",
    projectId: "playgorund-8d2eb",
    storageBucket: "playgorund-8d2eb.firebasestorage.app",
    messagingSenderId: "208100702521",
    appId: "1:208100702521:web:518d50fa160211393310e8"
}

console.log('🔥 Firebase Sync Test Starting...\n')

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function runTest() {
    try {
        // Step 1: Authenticate
        console.log('1️⃣  Authenticating with Firebase...')
        const userCredential = await signInAnonymously(auth)
        const userId = userCredential.user.uid
        console.log(`✅ Authenticated! User ID: ${userId}\n`)

        // Step 2: Add test transaction
        console.log('2️⃣  Adding test transaction to Firestore...')
        const testTransaction = {
            id: `test-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            label: 'CLI Test Transaction',
            amount: 150,
            type: 'expense',
            synced: true,
            syncedAt: new Date().toISOString()
        }

        const transactionRef = doc(db, 'users', userId, 'budget', testTransaction.id)
        await setDoc(transactionRef, testTransaction)
        console.log(`✅ Transaction added! ID: ${testTransaction.id}\n`)

        // Step 3: Verify data in Firestore
        console.log('3️⃣  Fetching all transactions from Firestore...')
        const budgetRef = collection(db, 'users', userId, 'budget')
        const snapshot = await getDocs(budgetRef)

        console.log(`✅ Found ${snapshot.size} transaction(s) in Firestore:\n`)

        snapshot.forEach((doc) => {
            const data = doc.data()
            console.log(`   📊 ${data.label} - ₹${data.amount}`)
            console.log(`      Date: ${data.date}`)
            console.log(`      Synced: ${data.syncedAt}\n`)
        })

        console.log('🎉 SUCCESS! Firebase is working perfectly!')
        console.log('   - Authentication: ✅')
        console.log('   - Write to Firestore: ✅')
        console.log('   - Read from Firestore: ✅\n')

        process.exit(0)
    } catch (error) {
        console.error('❌ ERROR:', error.message)
        console.error('\nFull error:', error)
        process.exit(1)
    }
}

runTest()
