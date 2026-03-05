import { useState, useEffect } from 'react'
import { Pencil, Trash2, CheckCircle, Target } from 'lucide-react'
import api from '../../utils/api'

interface Project {
    id: string
    name: string
}

interface Milestone {
    id: string
    project_id: string
    title: string
    description: string
    due_date: string | null
    priority: string
    assignee: string
    progress: number
    status: string
}

interface MilestoneListProps {
    projects: Project[]
    refreshKey: number
    onEditMilestone: (milestone: Milestone) => void
    onRefresh: () => void
}

function CircularProgress({ progress, size = 40, strokeWidth = 4 }: { progress: number, size?: number, strokeWidth?: number }) {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (progress / 100) * circumference

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="circular-progress">
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--border)"
                strokeWidth={strokeWidth}
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
        </svg>
    )
}

export default function MilestoneList({ projects, refreshKey, onEditMilestone, onRefresh }: MilestoneListProps) {
    const [milestones, setMilestones] = useState<(Milestone & { projectName: string })[]>([])
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
            const all: (Milestone & { projectName: string })[] = []
            await Promise.all(
                projects.map(async (p) => {
                    try {
                        const res = await api.get(`/projects/${p.id}/milestones`)
                        if (res.data && Array.isArray(res.data)) {
                            all.push(...res.data.map((m: Milestone) => ({ ...m, projectName: p.name })))
                        }
                    } catch { /* skip */ }
                })
            )
            setMilestones(all)
        } catch (error) {
            console.error('Error fetching milestones', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this milestone?')) return
        try {
            await api.delete(`/milestones/${id}`)
            onRefresh()
        } catch (err) {
            console.error(err)
        }
    }

    const handleMarkComplete = async (m: Milestone) => {
        try {
            await api.put(`/milestones/${m.id}`, { ...m, status: 'Completed', progress: 100 })
            onRefresh()
        } catch (err) {
            console.error(err)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'In Progress': return 'info'
            case 'Completed': return 'success'
            case 'At Risk': return 'danger'
            case 'Upcoming':
            default: return 'neutral'
        }
    }

    if (loading) {
        return (
            <div className="content-card">
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading milestones...</div>
            </div>
        )
    }

    return (
        <div className="content-card">
            <div className="content-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={18} />
                    <span className="content-card-title">Milestone Progress Tracker</span>
                </div>
            </div>

            {milestones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No milestones found. Click "Add Milestone" above to create one.
                </div>
            ) : (
                <div className="milestone-items">
                    {milestones.map((m) => (
                        <div key={m.id} className="milestone-item">
                            <div className="milestone-item-info">
                                <div className="milestone-item-title-row">
                                    <span className="milestone-item-title">{m.title}</span>
                                    <span className={`badge badge-${getStatusBadge(m.status)}`}>
                                        {m.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="milestone-item-meta">
                                    {m.projectName} • Due: {m.due_date ? new Date(m.due_date).toISOString().split('T')[0] : 'No date'}
                                </div>
                                <div className="milestone-item-id">
                                    ID: MS-{m.id.substring(0, 8).toUpperCase()}
                                </div>
                            </div>

                            <div className="milestone-item-actions">
                                <div className="milestone-progress-ring">
                                    <CircularProgress progress={m.progress || 0} />
                                </div>
                                <span className="milestone-progress-text">{m.progress || 0}%</span>

                                <button className="btn-icon" title="Edit" onClick={() => onEditMilestone(m)}>
                                    <Pencil size={15} />
                                </button>
                                <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(m.id)}>
                                    <Trash2 size={15} />
                                </button>
                                {m.status !== 'Completed' && (
                                    <button
                                        className="btn-icon"
                                        title="Mark Complete"
                                        onClick={() => handleMarkComplete(m)}
                                        style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
                                    >
                                        <CheckCircle size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
