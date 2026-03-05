import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../../utils/api'

interface Project {
    id: string
    name: string
}

interface MilestoneModalProps {
    onClose: () => void
    onSave: () => void
    milestone: any
    projects: Project[]
}

export default function MilestoneModal({ onClose, onSave, milestone, projects }: MilestoneModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        project_id: '',
        title: '',
        due_date: '',
        priority: 'Medium',
        assignee: '',
        progress: '0',
        description: '',
        status: 'Upcoming'
    })

    useEffect(() => {
        if (milestone) {
            setFormData({
                project_id: milestone.project_id || '',
                title: milestone.title || '',
                due_date: milestone.due_date ? new Date(milestone.due_date).toISOString().split('T')[0] : '',
                priority: milestone.priority || 'Medium',
                assignee: milestone.assignee || '',
                progress: milestone.progress !== undefined ? String(milestone.progress) : '0',
                description: milestone.description || '',
                status: milestone.status || 'Upcoming'
            })
        }
    }, [milestone])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const payload = {
                project_id: formData.project_id,
                title: formData.title,
                due_date: formData.due_date || undefined,
                priority: formData.priority,
                assignee: formData.assignee,
                progress: parseFloat(formData.progress) || 0,
                description: formData.description,
                status: formData.status
            }

            if (milestone) {
                await api.put(`/milestones/${milestone.id}`, payload)
            } else {
                await api.post(`/projects/${formData.project_id}/milestones`, payload)
            }

            onSave()
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to save milestone')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{milestone ? 'Edit Milestone' : 'Add New Milestone'}</h2>
                        <p className="modal-subtitle">
                            {milestone ? 'Update milestone details.' : 'Create a new milestone to track project progress.'}
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose} type="button">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>
                            {error}
                        </div>
                    )}

                    <form id="milestoneForm" onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="ms-title">Milestone Title</label>
                                <input
                                    id="ms-title"
                                    name="title"
                                    className="form-input"
                                    type="text"
                                    placeholder="Enter milestone title"
                                    required
                                    value={formData.title}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="ms-project">Project</label>
                                <select
                                    id="ms-project"
                                    name="project_id"
                                    className="form-input"
                                    required
                                    value={formData.project_id}
                                    onChange={handleChange}
                                    disabled={!!milestone}
                                >
                                    <option value="" disabled>Select project</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="ms-due">Due Date</label>
                                <input
                                    id="ms-due"
                                    name="due_date"
                                    className="form-input"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="ms-priority">Priority</label>
                                <select
                                    id="ms-priority"
                                    name="priority"
                                    className="form-input"
                                    value={formData.priority}
                                    onChange={handleChange}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="ms-assignee">Assignee</label>
                                <input
                                    id="ms-assignee"
                                    name="assignee"
                                    className="form-input"
                                    type="text"
                                    placeholder="Enter assignee name"
                                    value={formData.assignee}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" htmlFor="ms-progress">Initial Progress (%)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        id="ms-progress"
                                        name="progress"
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        style={{ flex: 1 }}
                                        value={formData.progress}
                                        onChange={handleChange}
                                    />
                                    <span style={{ minWidth: '36px', fontSize: 'var(--font-sm)', fontWeight: 600 }}>{formData.progress}%</span>
                                </div>
                            </div>
                        </div>

                        {milestone && (
                            <div className="form-row">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" htmlFor="ms-status">Status</label>
                                    <select
                                        id="ms-status"
                                        name="status"
                                        className="form-input"
                                        value={formData.status}
                                        onChange={handleChange}
                                    >
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="At Risk">At Risk</option>
                                    </select>
                                </div>
                                <div></div>
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" htmlFor="ms-desc">Description (Optional)</label>
                            <textarea
                                id="ms-desc"
                                name="description"
                                className="form-input"
                                rows={3}
                                placeholder="Enter milestone description"
                                value={formData.description}
                                onChange={handleChange}
                            />
                        </div>
                    </form>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="milestoneForm"
                        className="btn btn-primary"
                        disabled={loading || !formData.project_id || !formData.title}
                    >
                        {loading ? 'Saving...' : (milestone ? 'Save Changes' : 'Add Milestone')}
                    </button>
                </div>
            </div>
        </div>
    )
}
