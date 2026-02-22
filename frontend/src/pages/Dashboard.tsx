import {
    Building2,
    DollarSign,
    TrendingUp,
    Users,
    Package,
    AlertTriangle,
    MapPin,
    Calendar,
} from 'lucide-react'

const stats = [
    { title: 'Active Projects', value: '24', subtitle: '+2 from last month', subtitleType: 'positive', icon: <Building2 size={20} /> },
    { title: 'Budget Utilization', value: '78.5%', subtitle: '+5.2% this quarter', subtitleType: 'positive', icon: <DollarSign size={20} /> },
    { title: 'Project Progress', value: '64.2%', subtitle: 'On track', subtitleType: 'neutral', icon: <TrendingUp size={20} /> },
    { title: 'Labor Attendance', value: '94.8%', subtitle: '+1.2% vs average', subtitleType: 'positive', icon: <Users size={20} /> },
    { title: 'Material Stock', value: '87%', subtitle: '3 items low stock', subtitleType: 'warning', icon: <Package size={20} /> },
    { title: 'Safety Incidents', value: '2', subtitle: '-50% this month', subtitleType: 'negative', icon: <AlertTriangle size={20} /> },
]

const activeProjects = [
    {
        name: 'Sunset Residency Phase II',
        location: 'Downtown District',
        date: 'Dec 2024',
        members: 24,
        status: 'In Progress',
        statusType: 'info',
        budget: '$2.8M',
        progress: 78,
    },
    {
        name: 'Green Valley Commercial Complex',
        location: 'Business Park',
        date: 'Mar 2025',
        members: 32,
        status: 'In Progress',
        statusType: 'info',
        budget: '$5.2M',
        progress: 45,
    },
    {
        name: 'Metro Bridge Construction',
        location: 'City Center',
        date: 'Nov 2024',
        members: 45,
        status: 'Near Completion',
        statusType: 'warning',
        budget: '$8.1M',
        progress: 92,
    },
    {
        name: 'Riverside Apartments',
        location: 'River District',
        date: 'Jun 2025',
        members: 18,
        status: 'Planning',
        statusType: 'neutral',
        budget: '$3.5M',
        progress: 12,
    },
]

export default function Dashboard() {
    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Dashboard</h1>
                    <p>Welcome back! Here's what's happening with your projects today.</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                {stats.map((stat) => (
                    <div className="stat-card" key={stat.title}>
                        <div className="stat-card-header">
                            <span className="stat-card-title">{stat.title}</span>
                            <span className="stat-card-icon">{stat.icon}</span>
                        </div>
                        <div className="stat-card-value">{stat.value}</div>
                        <div className={`stat-card-subtitle ${stat.subtitleType}`}>
                            {stat.subtitle}
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Projects */}
            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Active Projects</div>
                        <div className="content-card-subtitle">Overview of ongoing construction projects</div>
                    </div>
                </div>

                {activeProjects.map((project) => (
                    <div className="active-project" key={project.name}>
                        <div className="active-project-header">
                            <div>
                                <div className="active-project-name">{project.name}</div>
                            </div>
                            <div className="active-project-budget">
                                <span className={`badge badge-${project.statusType}`}>
                                    {project.status}
                                </span>
                                <div className="active-project-budget-value">{project.budget}</div>
                            </div>
                        </div>

                        <div className="active-project-meta">
                            <span className="active-project-meta-item">
                                <MapPin size={14} /> {project.location}
                            </span>
                            <span className="active-project-meta-item">
                                <Calendar size={14} /> {project.date}
                            </span>
                            <span className="active-project-meta-item">
                                <Users size={14} /> {project.members} members
                            </span>
                        </div>

                        <div className="active-project-progress">
                            <span className="active-project-progress-label">Progress</span>
                            <div className="progress-bar" style={{ flex: 1 }}>
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${project.progress}%` }}
                                />
                            </div>
                            <span className="active-project-progress-value">{project.progress}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
