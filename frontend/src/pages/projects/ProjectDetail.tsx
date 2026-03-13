import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Calendar, Users, DollarSign, GanttChart, Camera, ArrowLeft, Loader2, Truck } from 'lucide-react';
import api from '../../utils/api';
import AuthImage from '../../components/AuthImage';

interface ProjectVendorSummary {
  vendor_id: string;
  vendor_name: string;
  pr_count: number;
  total_value: number;
}

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  status: string;
  budget: number;
  spent_amount: number;
  start_date: string | null;
  end_date: string | null;
  category: string;
  timeline: string;
  team_size: number;
  engineer: string;
  manager?: { id: string; name: string; email: string };
}

interface Milestone {
  id: string;
  title: string;
  status: string;
  progress: number;
  planned_start?: string;
  planned_end?: string;
}

interface SitePhoto {
  id: string;
  caption: string;
  created_at: string;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function statusBadge(status: string): string {
  const s = String(status).toUpperCase();
  if (s === 'COMPLETED') return 'success';
  if (s === 'ON_HOLD') return 'warning';
  if (s === 'IN_PROGRESS') return 'info';
  return 'neutral';
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [photos, setPhotos] = useState<SitePhoto[]>([]);
  const [projectVendors, setProjectVendors] = useState<ProjectVendorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [projRes, milestonesRes, photosRes, vendorsRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/projects/${id}/milestones`),
          api.get(`/projects/${id}/photos`),
          api.get(`/projects/${id}/vendors`).catch(() => ({ data: { success: false, data: [] } })),
        ]);
        if (cancelled) return;
        const projData = projRes.data as { success?: boolean; data?: Project };
        const msRaw = milestonesRes.data as { success?: boolean; data?: Milestone[] } | Milestone[];
        const msList = Array.isArray(msRaw) ? msRaw : msRaw?.data ?? [];
        const phRaw = photosRes.data as { success?: boolean; data?: SitePhoto[] } | SitePhoto[];
        const phList = Array.isArray(phRaw) ? phRaw : phRaw?.data ?? [];
        const venRaw = vendorsRes?.data as { success?: boolean; data?: ProjectVendorSummary[] };
        const venList = Array.isArray(venRaw?.data) ? venRaw.data : [];
        setProject(projData.success ? projData.data ?? null : null);
        setMilestones(msList);
        setPhotos(phList);
        setProjectVendors(venList);
        if (!projData.success || !projData.data) setError('Project not found');
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load project');
          setProject(null);
          setMilestones([]);
          setPhotos([]);
          setProjectVendors([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="page-header">
        <div><h1>Project</h1><p>Loading…</p></div>
        <Loader2 className="spin" size={24} />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="content-card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 'var(--space-4)' }}>{error || 'Project not found'}</p>
        <Link to="/projects" className="btn btn-primary"><ArrowLeft size={16} /> Back to Projects</Link>
      </div>
    );
  }

  const progress = project.budget > 0 ? Math.min((project.spent_amount / project.budget) * 100, 100) : 0;
  const completedCount = milestones.filter((m) => (m.progress ?? 0) >= 100).length;

  return (
    <div>
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <Link to="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-2)', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Projects
          </Link>
          <h1 style={{ margin: 0 }}>{project.name}</h1>
          <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-secondary)' }}>
            {project.description || 'No description'}
          </p>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <span className={`badge badge-${statusBadge(project.status)}`}>{project.status.replace(/_/g, ' ')}</span>
            {project.category && <span className="badge badge-neutral">{project.category}</span>}
          </div>
        </div>
        <div className="page-header-actions">
          <Link to={`/projects/gantt-milestones?project=${project.id}`} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <GanttChart size={18} /> Gantt & Milestones
          </Link>
        </div>
      </div>

      <div className="stat-cards" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Budget</span>
            <span className="stat-card-icon"><DollarSign size={20} /></span>
          </div>
          <div className="stat-card-value">${project.budget.toLocaleString()}</div>
          <div className="stat-card-subtitle positive">Spent: ${project.spent_amount.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Budget used</span>
            <span className="stat-card-icon"><DollarSign size={20} /></span>
          </div>
          <div className="stat-card-value">{progress.toFixed(0)}%</div>
          <div className="progress-bar" style={{ marginTop: 'var(--space-2)', height: 6 }}>
            <div className={`progress-bar-fill ${progress > 90 ? 'danger' : progress > 75 ? 'warning' : 'success'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Team</span>
            <span className="stat-card-icon"><Users size={20} /></span>
          </div>
          <div className="stat-card-value">{project.team_size || 0}</div>
          <div className="stat-card-subtitle neutral">members</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Milestones</span>
            <span className="stat-card-icon"><GanttChart size={20} /></span>
          </div>
          <div className="stat-card-value">{completedCount}/{milestones.length}</div>
          <div className="stat-card-subtitle neutral">completed</div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ marginBottom: 'var(--space-4)' }}>Project info</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Location</span><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><MapPin size={14} /> {project.location || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Engineer</span><div>{project.engineer || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Manager</span><div>{project.manager?.name || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Timeline</span><div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Calendar size={14} /> {project.timeline || '—'}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>Start</span><div>{formatDate(project.start_date)}</div></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>End</span><div>{formatDate(project.end_date)}</div></div>
        </div>
      </div>

      <div className="content-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Truck size={20} /> Vendors on this project</h2>
          <Link to="/vendors/contractors" className="btn btn-secondary" style={{ fontSize: 'var(--font-sm)' }}>Manage vendors</Link>
        </div>
        {projectVendors.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No vendors linked to this project yet. Vendors are added when you assign them to material purchase requests.</p>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Vendor</th><th>Purchase requests</th><th>Total value</th></tr>
              </thead>
              <tbody>
                {projectVendors.map((v) => (
                  <tr key={v.vendor_id}>
                    <td>{v.vendor_name}</td>
                    <td>{v.pr_count}</td>
                    <td>${(v.total_value ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content-card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ margin: 0 }}>Milestones</h2>
          <Link to={`/projects/gantt-milestones?project=${project.id}`} className="btn btn-secondary" style={{ fontSize: 'var(--font-sm)' }}>View in Gantt</Link>
        </div>
        {milestones.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No milestones yet.</p>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Milestone</th><th>Status</th><th>Progress</th><th>Dates</th></tr>
              </thead>
              <tbody>
                {milestones.map((m) => (
                  <tr key={m.id}>
                    <td>{m.title}</td>
                    <td><span className={`badge badge-${m.status === 'Completed' ? 'success' : m.status === 'In Progress' ? 'info' : 'neutral'}`}>{m.status}</span></td>
                    <td><div className="progress-bar" style={{ width: 80 }}><div className="progress-bar-fill" style={{ width: `${Math.min(100, m.progress ?? 0)}%` }} /></div> {Math.round(m.progress ?? 0)}%</td>
                    <td>{formatDate(m.planned_start)} – {formatDate(m.planned_end)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><Camera size={20} /> Site photos</h2>
          <Link to={`/projects/gantt-milestones?project=${project.id}`} className="btn btn-secondary" style={{ fontSize: 'var(--font-sm)' }}>View in Gantt</Link>
        </div>
        {photos.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No site photos yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
            {photos.map((p) => (
              <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ aspectRatio: '4/3', background: 'var(--border-light)' }}>
                  <AuthImage projectId={project.id} photoId={p.id} alt={p.caption || 'Site photo'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: 'var(--space-3)' }}>
                  {p.caption && <p style={{ margin: 0, fontSize: 'var(--font-sm)' }}>{p.caption}</p>}
                  <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{formatDate(p.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
