import {
    MapPin,
    Calendar,
    Users,
    DollarSign,
    Pencil,
    Trash2,
} from 'lucide-react'

const projects = [
    {
        name: 'MG Dynes',
        type: 'Commercial',
        typeBadge: 'orange',
        location: 'public_html/img',
        status: 'Active',
        statusBadge: 'success',
        date: '97g97uhn',
        progress: 0,
        budget: '677',
        spent: '',
        members: 34,
        manager: 'PT Amal Loponindo',
    },
    {
        name: 'Hospital-RUDI',
        type: 'Commercial',
        typeBadge: 'orange',
        location: 'Dacop',
        status: 'Planning',
        statusBadge: 'neutral',
        date: 'decem 27',
        progress: 0,
        budget: '2.9',
        spent: '',
        members: 30,
        manager: 'PT Amal Loponindo',
    },
    {
        name: 'it pragati park',
        type: 'Commercial',
        typeBadge: 'orange',
        location: 'motavrachha',
        status: 'Completed',
        statusBadge: 'neutral',
        date: '2020',
        progress: 0,
        budget: '2cr',
        spent: '',
        members: 20,
        manager: 'Sinar Bali',
    },
    {
        name: 'Basundhara Tower',
        type: 'Residential',
        typeBadge: 'success',
        location: 'madani nagar',
        status: 'Planning',
        statusBadge: 'neutral',
        date: '2029',
        progress: 0,
        budget: '2cr',
        spent: '',
        members: 10,
        manager: 'PT Amal Loponindo',
    },
    {
        name: 'Change Roofing',
        type: 'Commercial',
        typeBadge: 'orange',
        location: 'Manila',
        status: 'Near Completion',
        statusBadge: 'warning',
        date: 'feb 28',
        progress: 0,
        budget: '2.5M',
        spent: '',
        members: 10,
        manager: 'fgfg',
    },
    {
        name: 'Change of Pipes',
        type: 'Commercial',
        typeBadge: 'orange',
        location: 'Quezon City',
        status: 'Active',
        statusBadge: 'success',
        date: '30',
        progress: 0,
        budget: '1000000',
        spent: '',
        members: 10,
        manager: 'fgfg',
    },
]

export default function Projects() {
    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Projects</h1>
                    <p>Manage construction projects and track progress</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary">+ New Project</button>
                </div>
            </div>

            {/* Project Cards Grid */}
            <div className="cards-grid cols-3">
                {projects.map((project, i) => (
                    <div className="project-card" key={i}>
                        <div className="project-card-header">
                            <div>
                                <div className="project-card-name">{project.name}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className={`badge badge-${project.typeBadge}`}>{project.type}</span>
                                <button className="btn-icon"><Pencil size={14} /></button>
                                <button className="btn-icon danger"><Trash2 size={14} /></button>
                            </div>
                        </div>

                        <div className="project-card-location">
                            <MapPin size={14} /> {project.location}
                        </div>

                        <div className="project-card-meta">
                            <span className={`badge badge-${project.statusBadge}`}>{project.status}</span>
                            <span className="project-card-meta-item">
                                <Calendar size={14} /> {project.date}
                            </span>
                        </div>

                        <div className="project-card-progress">
                            <div className="project-card-progress-header">
                                <span>Progress</span>
                                <span>{project.progress}%</span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className={`progress-bar-fill ${project.progress > 80 ? 'success' : ''}`}
                                    style={{ width: `${project.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="project-card-budget">
                            <div>
                                <div className="project-card-budget-label">
                                    <DollarSign size={12} /> Budget
                                </div>
                                <div className="project-card-budget-value">{project.budget}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="project-card-budget-label">Spent</div>
                                <div className="project-card-budget-value">{project.spent || '—'}</div>
                            </div>
                        </div>

                        <div className="project-card-footer">
                            <span className="project-card-footer-item">
                                <Users size={12} /> {project.members} members
                            </span>
                            <span>{project.manager}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
