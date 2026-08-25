export function toISODate(d) {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export function parseISODate(iso) {
    if (!iso) return null
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
}

export function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function todayISO() {
    return toISODate(startOfToday())
}

export function daysAgoISO(n) {
    const d = startOfToday()
    d.setDate(d.getDate() - n)
    return toISODate(d)
}

export function formatDateLabel(iso) {
    const d = parseISODate(iso)
    if (!d) return iso
    const today = startOfToday()
    const diffDays = Math.round((today - d) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
