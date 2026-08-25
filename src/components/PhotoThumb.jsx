import { useEffect, useState } from 'react'
import { getPhoto } from '../utils/photoStore'

export default function PhotoThumb({ photoId, alt = '', className = 'h-12 w-12 rounded-lg object-cover' }) {
    const [src, setSrc] = useState(null)

    useEffect(() => {
        let cancelled = false
        async function load() {
            const url = photoId ? await getPhoto(photoId) : null
            if (!cancelled) setSrc(url)
        }
        load()
        return () => { cancelled = true }
    }, [photoId])

    if (!photoId || !src) return null
    return <img src={src} alt={alt} className={className} />
}
