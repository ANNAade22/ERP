import { useState, useEffect } from 'react'
import { Users, Building2 } from 'lucide-react'
import api from '../utils/api'

const POLL_INTERVAL_MS = 30_000

interface AttendanceSummary {
    project_id: string
    project_name: string
    total_workers: number
    present_today: number
    absent_today: number
    attendance_rate: number
}

export default function Attendance() {
    const [summaries, setSummaries] = useState<AttendanceSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchAttendance = async (isInitial = true) => {
        try {
            if (isInitial) setLoading(true)
            const response = await api.get('/dashboard')
            if (response.data?.success && response.data?.data?.attendance_summaries) {
                setSummaries(response.data.data.attendance_summaries)
                setLastUpdated(new Date())
            }
        } catch (err) {
            console.error('Failed to fetch attendance', err)
        } finally {
            if (isInitial) setLoading(false)
        }
    }

    useEffect(() => {
        fetchAttendance(true)
        const interval = setInterval(() => fetchAttendance(false), POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [])

    const totalPresent = summaries.reduce((acc, s) => acc + s.present_today, 0)
    const totalWorkers = summaries.reduce((acc, s) => acc + s.total_workers, 0)
    const overallRate = totalWorkers > 0 ? (totalPresent / totalWorkers) * 100 : 0

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <div className="page-header-info">
                        <h1>Labor Attendance</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Labor Attendance</h1>
                    <p>Today’s attendance across all active sites. Data refreshes every 30 seconds.</p>
                </div>
                {lastUpdated && (
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="stat-cards" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-card-title">Sites</span>
                        <span className="stat-card-icon"><Building2 size={20} /></span>
                    </div>
                    <div className="stat-card-value">{summaries.length}</div>
                    <div className="stat-card-subtitle info">Active projects</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-card-title">Present today</span>
                        <span className="stat-card-icon"><Users size={20} /></span>
                    </div>
                    <div className="stat-card-value">{totalPresent}</div>
                    <div className="stat-card-subtitle info">of {totalWorkers} workers</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-card-title">Overall rate</span>
                        <span className="stat-card-icon"><Users size={20} /></span>
                    </div>
                    <div className="stat-card-value">{overallRate.toFixed(1)}%</div>
                    <div className={`stat-card-subtitle ${overallRate >= 90 ? 'positive' : 'warning'}`}>
                        Today across all sites
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Today’s attendance by site</div>
                        <div className="content-card-subtitle">Present vs total workers per project</div>
                    </div>
                </div>
                {summaries.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No attendance data for today. There may be no active projects or no workers assigned.
                    </div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {summaries.map((s) => (
                            <li
                                key={s.project_id}
                                style={{
                                    padding: 'var(--space-4)',
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 'var(--space-2)',
                                }}
                            >
                                <span style={{ fontWeight: 500 }}>{s.project_name}</span>
                                <span>
                                    <strong>{s.present_today}</strong> / {s.total_workers} present
                                    <span
                                        className={`stat-card-subtitle ${s.attendance_rate >= 90 ? 'positive' : s.attendance_rate >= 70 ? 'warning' : 'negative'}`}
                                        style={{ marginLeft: 'var(--space-2)' }}
                                    >
                                        ({s.attendance_rate.toFixed(0)}%)
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
