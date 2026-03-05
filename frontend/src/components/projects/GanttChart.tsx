import { useState, useEffect, useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import api from '../../utils/api'

interface Project {
    id: string
    name: string
    start_date: string | null
    end_date: string | null
}

interface Milestone {
    id: string
    project_id: string
    title: string
    progress: number
    due_date: string | null
    status: string
}

interface GanttChartProps {
    projects: Project[]
    refreshKey: number
}

export default function GanttChart({ projects, refreshKey }: GanttChartProps) {
    const [milestonesByProject, setMilestonesByProject] = useState<Record<string, Milestone[]>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (projects.length > 0) {
            fetchAllMilestones()
        } else {
            setLoading(false)
        }
    }, [projects, refreshKey])

    const fetchAllMilestones = async () => {
        setLoading(true)
        try {
            const map: Record<string, Milestone[]> = {}
            await Promise.all(
                projects.map(async (p) => {
                    try {
                        const res = await api.get(`/projects/${p.id}/milestones`)
                        if (res.data && Array.isArray(res.data)) {
                            map[p.id] = res.data
                        } else {
                            map[p.id] = []
                        }
                    } catch {
                        map[p.id] = []
                    }
                })
            )
            setMilestonesByProject(map)
        } catch (error) {
            console.error('Error fetching milestones', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculate timeline months based on actual project data
    const { monthMarkers, timelineStart, timelineEnd } = useMemo(() => {
        let earliest = new Date()
        let latest = new Date()
        latest.setMonth(latest.getMonth() + 5)

        projects.forEach(p => {
            if (p.start_date) {
                const sd = new Date(p.start_date)
                if (sd < earliest) earliest = sd
            }
            if (p.end_date) {
                const ed = new Date(p.end_date)
                if (ed > latest) latest = ed
            }
        })

        // Round to exactly the start of the earliest month and end of the latest month
        const earliestMonthStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
        const latestMonthEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 0)

        const rawMonths: Date[] = []
        const d = new Date(earliestMonthStart)
        while (d <= latestMonthEnd) {
            rawMonths.push(new Date(d))
            d.setMonth(d.getMonth() + 1)
        }

        // Show max 7 months
        const displayDates = rawMonths.length > 7 ? rawMonths.slice(0, 7) : rawMonths

        // Re-truncate timelineEnd to match the 7 header limit if we sliced
        const finalEnd = displayDates.length < rawMonths.length
            ? new Date(earliestMonthStart.getFullYear(), earliestMonthStart.getMonth() + 7, 0)
            : latestMonthEnd

        const totalMs = finalEnd.getTime() - earliestMonthStart.getTime()
        const monthMarkers = displayDates.map(date => ({
            label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            leftPercent: totalMs > 0 ? Math.max(0, (date.getTime() - earliestMonthStart.getTime()) / totalMs * 100) : 0
        }))

        return { monthMarkers, timelineStart: earliestMonthStart, timelineEnd: finalEnd }
    }, [projects])

    const getProjectProgress = (projectId: string): number => {
        const ms = milestonesByProject[projectId] || []
        if (ms.length === 0) return 0
        return ms.reduce((sum, m) => sum + (m.progress || 0), 0) / ms.length
    }

    const getBarStyle = (project: Project) => {
        // If the project lacks a start or end date, we cannot accurately plot a bar
        if (!project.start_date || !project.end_date) {
            return { left: '0%', width: '0%', display: 'none' }
        }

        const totalMs = timelineEnd.getTime() - timelineStart.getTime()
        if (totalMs <= 0) return { left: '0%', width: '0%', display: 'none' }

        const sd = new Date(project.start_date)
        const ed = new Date(project.end_date)

        const left = Math.max(0, (sd.getTime() - timelineStart.getTime()) / totalMs * 100)
        const width = Math.min(100 - left, (ed.getTime() - sd.getTime()) / totalMs * 100)

        // Ensure a minimum width if it's very short, but don't show if it's 0 width
        const finalWidth = Math.max(width, 1)

        return { left: `${left}%`, width: `${finalWidth}%`, display: 'block' }
    }

    const formatDateRange = (p: Project) => {
        const sd = p.start_date ? p.start_date.split('T')[0] : '—'
        const ed = p.end_date ? p.end_date.split('T')[0] : '—'
        return `${sd} → ${ed}`
    }

    if (loading) {
        return (
            <div className="content-card">
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading timeline...</div>
            </div>
        )
    }

    return (
        <div className="content-card">
            <div className="content-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} />
                    <span className="content-card-title">Project Timeline View</span>
                </div>
            </div>

            {/* Month Headers */}
            <div className="gantt-header">
                <div className="gantt-label-col"></div>
                <div className="gantt-timeline-col" style={{ display: 'block', height: '20px' }}>
                    {monthMarkers.map((m, i) => (
                        <span
                            key={i}
                            className="gantt-month"
                            style={{ position: 'absolute', left: `${m.leftPercent}%` }}
                        >
                            {m.label}
                        </span>
                    ))}
                </div>
                <div className="gantt-info-col"></div>
            </div>

            {/* Project Rows */}
            {projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No projects available.
                </div>
            ) : (
                projects.map((project) => {
                    const progress = getProjectProgress(project.id)
                    const barStyle = getBarStyle(project)

                    return (
                        <div key={project.id} className="gantt-row">
                            <div className="gantt-label-col">
                                <div className="gantt-project-name">{project.name}</div>
                                <div className="gantt-project-id">PRJ-{project.id.substring(0, 8).toUpperCase()}</div>
                            </div>

                            <div className="gantt-timeline-col">
                                <div className="gantt-track">
                                    <div
                                        className="gantt-bar"
                                        style={{
                                            left: barStyle.left,
                                            width: barStyle.width,
                                            display: barStyle.display,
                                        }}
                                    >
                                        <div
                                            className="gantt-bar-fill"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="gantt-info-col">
                                <div className="gantt-dates">{formatDateRange(project)}</div>
                                <div className="gantt-percent">{Math.round(progress)}%</div>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
