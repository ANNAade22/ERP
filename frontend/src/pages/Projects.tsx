import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    MapPin,
    Calendar,
    Users,
    DollarSign,
    Pencil,
    Trash2,
    X,
    GanttChart,
    Search,
    FolderPlus,
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

interface Project {
    id: string
    name: string
    description: string
    location: string
    status: string
    budget: number
    spent_amount: number
    start_date: string | null
    end_date: string | null
    category: string
    timeline: string
    team_size: number
    engineer: string
    manager?: { id: string, name: string, email: string }
    created_at?: string
    updated_at?: string
}

export default function Projects() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('All')
    const [categoryFilter, setCategoryFilter] = useState('All')
    const [sortBy, setSortBy] = useState('name-asc')
    const [milestoneCounts, setMilestoneCounts] = useState<Record<string, { total: number; completed: number }>>({})

    // Modal State
    const [showModal, setShowModal] = useState(false)
    const [editProjectId, setEditProjectId] = useState<string | null>(null)
    const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null)
    const [createLoading, setCreateLoading] = useState(false)
    const [createError, setCreateError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        category: 'Residential',
        status: 'Planning',
        budget: '',
        timeline: '',
        start_date: '',
        end_date: '',
        contractor: '',
        teamSize: '',
        description: '',
    })

    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            category: 'Residential',
            status: 'Planning',
            budget: '',
            timeline: '',
            start_date: '',
            end_date: '',
            contractor: '',
            teamSize: '',
            description: '',
        })
        setEditProjectId(null)
        setCreateError('')
    }

    const openCreateModal = () => {
        resetForm()
        setShowModal(true)
    }

    const openEditModal = (project: Project) => {
        // Map backend enums to UI statuses
        let uiStatus = 'Planning'
        if (project.status === 'IN_PROGRESS') uiStatus = 'In Progress'
        if (project.status === 'ON_HOLD') uiStatus = 'On Hold'
        if (project.status === 'COMPLETED') uiStatus = 'Completed'
        if (project.status === 'CANCELLED') uiStatus = 'Cancelled'

        setFormData({
            name: project.name,
            location: project.location,
            category: project.category || 'Residential',
            status: uiStatus,
            budget: typeof project.budget === 'number' && project.budget > 0 ? project.budget.toString() : '',
            timeline: project.timeline || '',
            start_date: project.start_date ? project.start_date.split('T')[0] : '',
            end_date: project.end_date ? project.end_date.split('T')[0] : '',
            contractor: project.engineer || '',
            teamSize: project.team_size ? project.team_size.toString() : '',
            description: project.description || '',
        })
        setEditProjectId(project.id)
        setShowModal(true)
    }

    const handleDeleteClick = (project: Project) => {
        setProjectToDelete({ id: project.id, name: project.name })
    }

    const executeDelete = async () => {
        if (!projectToDelete) return
        try {
            const response = await api.delete(`/projects/${projectToDelete.id}`)
            if (response.data.success) {
                setProjectToDelete(null)
                fetchProjects()
                toast.success('Project deleted')
            } else {
                toast.error(response.data.message || 'Failed to delete project')
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete project')
        }
    }

    const fetchProjects = async () => {
        try {
            setLoading(true)
            const response = await api.get('/projects')
            if (response.data.success) {
                const list = response.data.data as Project[]
                setProjects(list)
                if (list?.length) {
                    Promise.all(list.map((p) => api.get(`/projects/${p.id}/milestones`))).then((responses) => {
                        const counts: Record<string, { total: number; completed: number }> = {}
                        responses.forEach((r, i) => {
                            const id = list[i]?.id
                            if (!id) return
                            const ms = Array.isArray(r.data) ? r.data : []
                            const completed = ms.filter((m: { progress?: number }) => (m.progress ?? 0) >= 100).length
                            counts[id] = { total: ms.length, completed }
                        })
                        setMilestoneCounts((prev) => ({ ...prev, ...counts }))
                    }).catch(() => {})
                }
            } else {
                setError(response.data.message || 'Failed to fetch projects')
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch projects')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProjects()
    }, [])

    const normalizedStatus = (s: string) => s.toUpperCase().replace(/\s+/g, '_')
    const filteredProjects = projects.filter((p) => {
        const q = searchQuery.trim().toLowerCase()
        if (q && !p.name?.toLowerCase().includes(q) && !p.location?.toLowerCase().includes(q)) return false
        if (statusFilter !== 'All' && normalizedStatus(p.status) !== normalizedStatus(statusFilter)) return false
        if (categoryFilter !== 'All' && (p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false
        return true
    })

    const sortedProjects = [...filteredProjects].sort((a, b) => {
        switch (sortBy) {
            case 'name-asc': return (a.name || '').localeCompare(b.name || '')
            case 'name-desc': return (b.name || '').localeCompare(a.name || '')
            case 'status': return (a.status || '').localeCompare(b.status || '')
            case 'budget-high': return (b.budget || 0) - (a.budget || 0)
            case 'budget-low': return (a.budget || 0) - (b.budget || 0)
            case 'start-date': {
                const da = a.start_date ? new Date(a.start_date).getTime() : 0
                const db = b.start_date ? new Date(b.start_date).getTime() : 0
                return db - da
            }
            default: return 0
        }
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Planning':
            case 'PLANNING': return 'neutral'
            case 'In Progress':
            case 'IN_PROGRESS': return 'info'
            case 'Completed':
            case 'COMPLETED': return 'success'
            case 'On Hold':
            case 'ON_HOLD': return 'warning'
            case 'Cancelled':
            case 'CANCELLED': return 'danger'
            default: return 'neutral'
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A'
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString()
        } catch (e) {
            return dateStr
        }
    }

    const formatDateAgo = (dateStr: string | null | undefined): string => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr)
            const now = new Date()
            const diffMs = now.getTime() - date.getTime()
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
            if (diffDays === 0) return 'Today'
            if (diffDays === 1) return 'Yesterday'
            if (diffDays < 7) return `${diffDays} days ago`
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
            return date.toLocaleDateString()
        } catch {
            return ''
        }
    }

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateError('')
        setCreateLoading(true)

        try {
            // Map the UI fields to the backend payload
            // UI fields: name, location, category, status, budget, timeline, contractor, teamSize, description
            // Backend fields expected: name, description, location, status, budget, start_date (maybe parse timeline)

            // For status, map standard UI names back to backend enums if necessary
            let backendStatus = 'PLANNING'
            if (formData.status === 'In Progress') backendStatus = 'IN_PROGRESS'
            if (formData.status === 'On Hold') backendStatus = 'ON_HOLD'
            if (formData.status === 'Completed') backendStatus = 'COMPLETED'
            if (formData.status === 'Cancelled') backendStatus = 'CANCELLED'
            if (formData.status === 'Planning') backendStatus = 'PLANNING'

            // Clean budget (remove $ or M if they typed it)
            // Just pass parsed float from budget, or extract numbers
            let parsedBudget = parseFloat(formData.budget.replace(/[^0-9.]/g, '')) || 0;
            if (formData.budget.toLowerCase().includes('m')) {
                parsedBudget *= 1000000;
            } else if (formData.budget.toLowerCase().includes('k')) {
                parsedBudget *= 1000;
            } else if (formData.budget.toLowerCase().includes('cr')) {
                parsedBudget *= 10000000;
            }

            const payload = {
                name: formData.name,
                location: formData.location,
                description: formData.description,
                status: backendStatus,
                budget: parsedBudget,
                category: formData.category,
                timeline: formData.timeline,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                team_size: parseInt(formData.teamSize, 10) || 0,
                engineer: formData.contractor,
            }

            let response;
            if (editProjectId) {
                response = await api.put(`/projects/${editProjectId}`, payload)
            } else {
                response = await api.post('/projects', payload)
            }

            if (response.data.success) {
                setShowModal(false)
                resetForm()
                fetchProjects()
                toast.success(editProjectId ? 'Project updated' : 'Project created')
            } else {
                setCreateError(response.data.message || `Failed to ${editProjectId ? 'update' : 'create'} project`)
            }
        } catch (err: any) {
            setCreateError(err.response?.data?.message || `Failed to ${editProjectId ? 'update' : 'create'} project`)
        } finally {
            setCreateLoading(false)
        }
    }

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Projects</h1>
                    <p>Manage construction projects and track progress</p>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link to="/projects/gantt-milestones" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <GanttChart size={18} /> Gantt & Milestones
                    </Link>
                    <button className="btn btn-primary" onClick={openCreateModal}>+ New Project</button>
                </div>
            </div>

            {error && (
                <div className="content-card" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--danger)', background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                    {error}
                </div>
            )}

            {!loading && projects.length > 0 && (
                <div className="filter-row" style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={16} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Search by name or location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: 'var(--space-10)' }}
                        />
                    </div>
                    <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">All statuses</option>
                        <option value="Planning">Planning</option>
                        <option value="In Progress">In Progress</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                    <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="All">All categories</option>
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Infrastructure">Infrastructure</option>
                    </select>
                    <select className="filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name-asc">Name (A–Z)</option>
                        <option value="name-desc">Name (Z–A)</option>
                        <option value="status">Status</option>
                        <option value="budget-high">Budget (high)</option>
                        <option value="budget-low">Budget (low)</option>
                        <option value="start-date">Start date</option>
                    </select>
                </div>
            )}

            {loading ? (
                <div className="cards-grid cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton skeleton-block" style={{ width: '70%', height: 20 }} />
                            <div className="skeleton skeleton-block" style={{ width: '50%', height: 14 }} />
                            <div className="skeleton skeleton-block" style={{ width: '90%', height: 12, marginTop: 'var(--space-4)' }} />
                            <div className="skeleton skeleton-block" style={{ width: '60%', height: 12 }} />
                            <div className="skeleton" style={{ height: 6, marginTop: 'var(--space-4)', width: '100%' }} />
                            <div className="skeleton skeleton-block" style={{ width: '40%', height: 14, marginTop: 'var(--space-4)' }} />
                        </div>
                    ))}
                </div>
            ) : projects.length === 0 ? (
                <div className="content-card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                    <FolderPlus size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                    <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--font-lg)' }}>No projects yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>Create your first project to get started.</p>
                    <button type="button" className="btn btn-primary" onClick={openCreate}>+ New Project</button>
                </div>
            ) : sortedProjects.length === 0 ? (
                <div className="content-card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                    <Search size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No projects match your filters. Try adjusting search or filters.</p>
                </div>
            ) : (
                /* Project Cards Grid */
                <div className="cards-grid cols-3">
                    {sortedProjects.map((project) => {
                        const progress = project.budget > 0 ? Math.min((project.spent_amount / project.budget) * 100, 100) : 0

                        const getCategoryBadge = (category: string) => {
                            switch (category.toLowerCase()) {
                                case 'residential': return 'purple'
                                case 'commercial': return 'info'
                                case 'industrial': return 'orange'
                                case 'infrastructure': return 'warning'
                                default: return 'neutral'
                            }
                        }

                        return (
                            <div className="project-card" key={project.id}>
                                <div className="project-card-header">
                                    <div>
                                        <div className="project-card-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {project.name}
                                            {project.category && (
                                                <span className={`badge badge-${getCategoryBadge(project.category)}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                    {project.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button className="btn-icon" title="Edit" onClick={() => openEditModal(project)}><Pencil size={14} /></button>
                                        <button className="btn-icon danger" title="Delete" onClick={() => handleDeleteClick(project)}><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <div className="project-card-location">
                                    <MapPin size={14} /> {project.location || 'Location not specified'}
                                </div>

                                <div className="project-card-meta">
                                    <span className={`badge badge-${getStatusBadge(project.status)}`}>
                                        {project.status.replace('_', ' ')}
                                    </span>
                                    <span className="project-card-meta-item">
                                        <Calendar size={14} /> {project.timeline || 'No timeline'}
                                    </span>
                                </div>

                                {milestoneCounts[project.id] && milestoneCounts[project.id].total > 0 && (
                                    <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                                        <span>Milestones: {milestoneCounts[project.id].completed}/{milestoneCounts[project.id].total} completed</span>
                                        <div className="progress-bar" style={{ marginTop: 'var(--space-1)', height: 4 }}>
                                            <div className="progress-bar-fill success" style={{ width: `${(milestoneCounts[project.id].completed / milestoneCounts[project.id].total) * 100}%` }} />
                                        </div>
                                    </div>
                                )}
                                <div className="project-card-progress">
                                    <div className="project-card-progress-header">
                                        <span>Budget Used</span>
                                        <span>{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className={`progress-bar-fill ${progress > 90 ? 'danger' : progress > 75 ? 'warning' : 'success'}`}
                                            style={{ width: `${progress}%`, backgroundColor: progress > 90 ? 'var(--danger-color)' : progress > 75 ? 'var(--warning-color)' : 'var(--primary-color)' }}
                                        />
                                    </div>
                                </div>

                                <div className="project-card-budget">
                                    <div>
                                        <div className="project-card-budget-label">
                                            <DollarSign size={12} /> Budget
                                        </div>
                                        <div className="project-card-budget-value">${project.budget.toLocaleString()}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="project-card-budget-label">Spent</div>
                                        <div className="project-card-budget-value">${project.spent_amount.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="project-card-footer">
                                    <span className="project-card-footer-item">
                                        <Users size={12} /> {project.team_size || 0} members
                                    </span>
                                    <span>{project.manager?.name || 'Unassigned'}</span>
                                </div>
                                {(project.created_at || project.updated_at) && (
                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                                        {project.created_at && <span>Created: {formatDateAgo(project.created_at)}</span>}
                                        {project.created_at && project.updated_at && ' · '}
                                        {project.updated_at && <span>Updated: {formatDateAgo(project.updated_at)}</span>}
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-light)' }}>
                                    <Link to={`/projects/gantt-milestones?project=${project.id}`} className="btn btn-secondary" style={{ flex: 1, fontSize: 'var(--font-xs)', padding: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)' }}>
                                        <GanttChart size={12} /> View Gantt
                                    </Link>
                                    <Link to={`/projects/${project.id}`} className="btn btn-secondary" style={{ flex: 1, fontSize: 'var(--font-xs)', padding: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-1)' }}>
                                        Details
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Project Modal Overlay */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">{editProjectId ? 'Edit Project' : 'Create New Project'}</h2>
                                <p className="modal-subtitle">{editProjectId ? 'Update project details.' : 'Add a new construction project to your portfolio.'}</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowModal(false)} type="button">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {createError && (
                                <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: 'var(--font-sm)' }}>
                                    {createError}
                                </div>
                            )}

                            <form id="createProjectForm" onSubmit={handleCreateSubmit}>
                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="name">Project Name</label>
                                        <input
                                            id="name"
                                            name="name"
                                            className="form-input"
                                            type="text"
                                            placeholder="Enter project name"
                                            required
                                            value={formData.name}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="location">Location</label>
                                        <input
                                            id="location"
                                            name="location"
                                            className="form-input"
                                            type="text"
                                            placeholder="Enter project location"
                                            value={formData.location}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="category">Category</label>
                                        <select
                                            id="category"
                                            name="category"
                                            className="form-input"
                                            value={formData.category}
                                            onChange={handleFormChange}
                                        >
                                            <option value="Residential">Residential</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Industrial">Industrial</option>
                                            <option value="Infrastructure">Infrastructure</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="status">Status</label>
                                        <select
                                            id="status"
                                            name="status"
                                            className="form-input"
                                            value={formData.status}
                                            onChange={handleFormChange}
                                        >
                                            <option value="Planning">Planning</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="On Hold">On Hold</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="start_date">Start Date</label>
                                        <input
                                            id="start_date"
                                            name="start_date"
                                            className="form-input"
                                            type="date"
                                            value={formData.start_date}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="end_date">End Date</label>
                                        <input
                                            id="end_date"
                                            name="end_date"
                                            className="form-input"
                                            type="date"
                                            value={formData.end_date}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="budget">Budget</label>
                                        <input
                                            id="budget"
                                            name="budget"
                                            className="form-input"
                                            type="text"
                                            placeholder="e.g., $2.8M"
                                            required
                                            value={formData.budget}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="timeline">Timeline Info</label>
                                        <input
                                            id="timeline"
                                            name="timeline"
                                            className="form-input"
                                            type="text"
                                            placeholder="e.g., Dec 2024"
                                            value={formData.timeline}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="contractor">Engineer</label>
                                        <input
                                            id="contractor"
                                            name="contractor"
                                            className="form-input"
                                            type="text"
                                            placeholder="Enter engineer name"
                                            value={formData.contractor}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" htmlFor="teamSize">Team Size</label>
                                        <input
                                            id="teamSize"
                                            name="teamSize"
                                            className="form-input"
                                            type="text"
                                            placeholder="e.g., 24"
                                            value={formData.teamSize}
                                            onChange={handleFormChange}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        className="form-input"
                                        rows={3}
                                        placeholder="Enter project description"
                                        value={formData.description}
                                        onChange={handleFormChange}
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowModal(false)}
                                disabled={createLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="createProjectForm"
                                className="btn btn-primary"
                                disabled={createLoading}
                            >
                                {createLoading ? 'Saving...' : (editProjectId ? 'Save Changes' : 'Create Project')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-body" style={{ padding: 'var(--space-6)' }}>
                            <h2 className="modal-title" style={{ marginBottom: 'var(--space-2)' }}>Delete Project</h2>
                            <p className="modal-subtitle" style={{ color: 'var(--text-secondary)' }}>
                                Are you sure you want to delete "{projectToDelete.name}"? This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setProjectToDelete(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={executeDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
