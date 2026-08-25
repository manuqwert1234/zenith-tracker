// Local photo storage using IndexedDB.
// Photos never leave the device — they're stored as compressed data URLs
// keyed by an id you choose (usually the food/log entry id).

const DB_NAME = 'caltrack-photos'
const DB_VERSION = 1
const STORE_NAME = 'photos'

function openDB() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB not supported in this browser'))
            return
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

/**
 * Resize + compress an image File/Blob down to a reasonable size for local
 * storage, returning a JPEG data URL.
 */
export function fileToCompressedDataURL(file, maxDimension = 1024, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const reader = new FileReader()
        reader.onload = () => {
            img.onload = () => {
                let { width, height } = img
                if (width > height && width > maxDimension) {
                    height = Math.round((height * maxDimension) / width)
                    width = maxDimension
                } else if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height)
                    height = maxDimension
                }
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)
                resolve(canvas.toDataURL('image/jpeg', quality))
            }
            img.onerror = reject
            img.src = reader.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export async function savePhoto(id, file) {
    const dataUrl = await fileToCompressedDataURL(file)
    const db = await openDB()
    await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(dataUrl, id)
        tx.oncomplete = resolve
        tx.onerror = () => reject(tx.error)
    })
    db.close()
    return dataUrl
}

export async function getPhoto(id) {
    if (!id) return null
    try {
        const db = await openDB()
        const result = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly')
            const req = tx.objectStore(STORE_NAME).get(id)
            req.onsuccess = () => resolve(req.result || null)
            req.onerror = () => reject(req.error)
        })
        db.close()
        return result
    } catch {
        return null
    }
}

export async function deletePhoto(id) {
    if (!id) return
    try {
        const db = await openDB()
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            tx.objectStore(STORE_NAME).delete(id)
            tx.oncomplete = resolve
            tx.onerror = () => reject(tx.error)
        })
        db.close()
    } catch {
        // ignore
    }
}

export async function getAllPhotoIds() {
    try {
        const db = await openDB()
        const keys = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly')
            const req = tx.objectStore(STORE_NAME).getAllKeys()
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = () => reject(req.error)
        })
        db.close()
        return keys
    } catch {
        return []
    }
}

export async function clearAllPhotos() {
    try {
        const db = await openDB()
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite')
            tx.objectStore(STORE_NAME).clear()
            tx.oncomplete = resolve
            tx.onerror = () => reject(tx.error)
        })
        db.close()
    } catch {
        // ignore
    }
}
