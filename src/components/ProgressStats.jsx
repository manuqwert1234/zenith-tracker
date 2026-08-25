import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, Flame as FlameIcon } from 'lucide-react'
import { startOfToday, toISODate, parseISODate } from '../utils/dates'

function WeightSparkline({ entries }) {
    if (entries.length < 2) return null
    const values = entries.map((e) => e.weight)
    const min = Math.min(...values) - 0.5
    const max = Math.max(...values) + 0.5
    const W = 280, H = 56
    const pts = entries.map((e, i) => {
        const x = (i / (entries.length - 1)) * W
        const y = H - ((e.weight - min) / (max - min || 1)) * H
        return `${x},${y}`
    })
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 56 }}>
            <polyline points={pts.join(' ')} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {entries.map((e, i) => {
                const x = (i / (entries.length - 1)) * W
                const y = H - ((e.weight - min) / (max - min || 1)) * H
                return <circle key={i} cx={x} cy={y} r="2.5" fill="#60a5fa" />
            })}
        </svg>
    )
}

export default function ProgressStats({ foodLog, weightLog, waterLog }) {
    const stats = useMemo(() => {
        const today = startOfToday()

        // Logging streak: consecutive days (ending today or yesterday) with >=1 food entry.
        const loggedDates = new Set(foodLog.map((e) => e.date))
        let streak = 0
        const cursor = new Date(today)
        // allow today to be unlogged yet without breaking the streak
        if (!loggedDates.has(toISODate(cursor))) cursor.setDate(cursor.getDate() - 1)
        while (loggedDates.has(toISODate(cursor))) {
            streak += 1
            cursor.setDate(cursor.getDate() - 1)
        }

        // 7-day averages
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 6)
        const weekEntries = foodLog.filter((e) => { const d = parseISODate(e.date); return d && d >= weekAgo && d <= today })
        const daysWithData = new Set(weekEntries.map((e) => e.date)).size || 1
        const weekCalories = weekEntries.reduce((s, e) => s + (Number(e.calories) || 0), 0)
        const weekProtein = weekEntries.reduce((s, e) => s + (Number(e.protein) || 0), 0)
        const avgCalories = Math.round(weekCalories / daysWithData)
        const avgProtein = Math.round(weekProtein / daysWithData)

        // Weight trend over last 30 days
        const monthAgo = new Date(today)
        monthAgo.setDate(monthAgo.getDate() - 29)
        const recentWeights = weightLog
            .filter((e) => { const d = parseISODate(e.date); return d && d >= monthAgo && d <= today })
            .sort((a, b) => a.date.localeCompare(b.date))
        const weightChange = recentWeights.length >= 2
            ? Math.round((recentWeights[recentWeights.length - 1].weight - recentWeights[0].weight) * 10) / 10
            : null

        // Water average over last 7 days
        const weekWater = waterLog.filter((e) => { const d = parseISODate(e.date); return d && d >= weekAgo && d <= today })
        const avgWater = weekWater.length ? Math.round(weekWater.reduce((s, e) => s + (Number(e.ml) || 0), 0) / weekWater.length) : 0

        return { streak, avgCalories, avgProtein, weightChange, recentWeights, avgWater }
    }, [foodLog, weightLog, waterLog])

    return (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-blue-400">
                <TrendingUp className="h-4 w-4" /> YOUR PROGRESS
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                    <div className="flex items-center gap-1 text-xs text-slate-500"><FlameIcon className="h-3 w-3 text-emerald-400" /> Streak</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-50">{stats.streak}</div>
                    <div className="text-xs text-slate-500">day{stats.streak === 1 ? '' : 's'} logged in a row</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                    <div className="text-xs text-slate-500">7-day average</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-50">{stats.avgCalories || '—'}</div>
                    <div className="text-xs text-slate-500">kcal · {stats.avgProtein}g protein</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                    <div className="text-xs text-slate-500">Weight, last 30 days</div>
                    <div className={`mt-1 flex items-center gap-1 text-2xl font-extrabold ${stats.weightChange === null ? 'text-slate-400' : stats.weightChange < 0 ? 'text-emerald-400' : stats.weightChange > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {stats.weightChange === null ? '—' : (
                            <>
                                {stats.weightChange < 0 ? <TrendingDown className="h-4 w-4" /> : stats.weightChange > 0 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                {stats.weightChange > 0 ? '+' : ''}{stats.weightChange}kg
                            </>
                        )}
                    </div>
                    <div className="text-xs text-slate-500">{stats.recentWeights.length} weigh-ins</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                    <div className="text-xs text-slate-500">Avg. water</div>
                    <div className="mt-1 text-2xl font-extrabold text-cyan-400">{stats.avgWater || '—'}</div>
                    <div className="text-xs text-slate-500">ml / day this week</div>
                </div>
            </div>
            {stats.recentWeights.length >= 2 && (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
                    <WeightSparkline entries={stats.recentWeights} />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                        <span>{stats.recentWeights[0].date}</span>
                        <span>{stats.recentWeights[stats.recentWeights.length - 1].date}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
