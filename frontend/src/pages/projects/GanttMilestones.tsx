import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Target, Calendar, CheckCircle2, ChevronRight, GripVertical, Pencil, Trash2, Loader2, RefreshCw, FolderPlus, ImagePlus, Camera, Search } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import AuthImage from '../../components/AuthImage';

// --- Types (aligned with backend models.Milestone) ---
interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  due_date?: string | null;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string | null;
  actual_end?: string | null;
  status: string;
  progress: number;
}

/** Normalize API milestone: backend has due_date, Gantt needs planned_start/planned_end */
function normalizeMilestone(m: Milestone): Milestone {
  const due = m.due_date || m.planned_end || m.planned_start;
  const start = m.planned_start || due;
  const end = m.planned_end || due;
  return { ...m, planned_start: start, planned_end: end };
}

interface Project {
  id: string;
  name: string;
  status: string;
}

/** True when project is completed — no editing of milestones allowed */
function isProjectCompleted(project: Project | null): boolean {
  if (!project?.status) return false;
  const s = String(project.status).toUpperCase().replace(/\s+/g, '_');
  return s === 'COMPLETED';
}

interface CreateMilestoneForm {
  title: string;
  description: string;
  planned_start: string;
  planned_end: string;
  status: string;
  progress: number;
}

const initialForm: CreateMilestoneForm = {
  title: '',
  description: '',
  planned_start: new Date().toISOString().split('T')[0],
  planned_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: 'upcoming',
  progress: 0,
};

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateLong(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusBadgeClass(status: string): string {
  const m: Record<string, string> = {
    pending: 'badge-warning',
    'in-progress': 'badge-info',
    completed: 'badge-success',
    delayed: 'badge-danger',
    upcoming: 'badge-neutral',
    'at-risk': 'badge-danger',
  };
  return m[status] || 'badge-neutral';
}

function formatStatusLabel(status: string): string {
  const m: Record<string, string> = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    delayed: 'Delayed',
    upcoming: 'Upcoming',
    'at-risk': 'At Risk',
  };
  return m[status] || status;
}

/** Backend expects: Upcoming | In Progress | Completed | At Risk */
function formStatusToBackend(formStatus: string): string {
  const normalized = (formStatus || '').toLowerCase().replace(/\s+/g, '-');
  const m: Record<string, string> = {
    pending: 'Upcoming',
    upcoming: 'Upcoming',
    'in-progress': 'In Progress',
    completed: 'Completed',
    delayed: 'At Risk',
    'at-risk': 'At Risk',
  };
  return m[normalized] || 'Upcoming';
}

/** Backend returns "Upcoming" | "In Progress" | "Completed" | "At Risk" -> form value */
function backendStatusToForm(backendStatus: string): string {
  const s = (backendStatus || '').toLowerCase().replace(/\s+/g, '-');
  if (s === 'in-progress' || s === 'upcoming' || s === 'completed' || s === 'at-risk') return s;
  return 'upcoming';
}

/** Display status for timeline and top cards: 100% = completed, >0 = in progress, else pending. Keeps cards in sync with timeline. */
function displayStatus(m: Milestone): string {
  const p = m.progress ?? 0;
  if (p >= 100) return 'completed';
  if (p > 0) return 'in-progress';
  const s = (m.status || '').toLowerCase().replace(/\s+/g, '-');
  return s && ['pending', 'in-progress', 'completed', 'delayed', 'upcoming', 'at-risk'].includes(s) ? s : 'pending';
}

function countByDisplayStatus(milestones: Milestone[], status: string): number {
  return milestones.filter((m) => displayStatus(m) === status).length;
}

interface SitePhoto {
  id: string;
  project_id: string;
  milestone_id?: string;
  caption: string;
  created_at: string;
  file_path: string;
}

export default function GanttMilestones() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [form, setForm] = useState<CreateMilestoneForm>(initialForm);

  // Site photos (progress photos — upload by Site Engineer, Admin, PM)
  const [sitePhotos, setSitePhotos] = useState<SitePhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadPhotoLoading, setUploadPhotoLoading] = useState(false);
  const [uploadPhotoError, setUploadPhotoError] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoMilestoneId, setPhotoMilestoneId] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoMilestoneFilter, setPhotoMilestoneFilter] = useState('');
  const canUploadPhotos =
    user?.role === 'SITE_ENGINEER' || user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState('All');
  const [milestoneSearch, setMilestoneSearch] = useState('');

  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const q = milestoneSearch.trim().toLowerCase();
      if (q && !(m.title || '').toLowerCase().includes(q)) return false;
      if (milestoneStatusFilter === 'All') return true;
      const ds = displayStatus(m);
      const f = milestoneStatusFilter.toLowerCase().replace(/\s+/g, '-');
      if (f === 'pending' && (ds === 'pending' || ds === 'upcoming')) return true;
      if (f === 'in-progress' && ds === 'in-progress') return true;
      if (f === 'completed' && ds === 'completed') return true;
      if (f === 'at-risk' && (ds === 'at-risk' || ds === 'delayed')) return true;
      return false;
    });
  }, [milestones, milestoneSearch, milestoneStatusFilter]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/projects');
      const raw = res.data as { success?: boolean; data?: Project[] } | Project[];
      const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: Project[] }).data))
        ? (raw as { data: Project[] }).data
        : [];
      setProjects(list);
      setSelectedProject((prev) => {
        if (projectIdFromUrl && list.length) {
          const fromUrl = list.find((p) => String(p.id) === String(projectIdFromUrl));
          if (fromUrl) return fromUrl;
        }
        if (prev && list.some((p) => String(p.id) === String(prev.id))) return prev;
        return list.length ? list[0] : null;
      });
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
      const msg = ax.response?.data?.error || ax.message || 'Failed to load projects. Is the server running?';
      setError(msg);
      if (ax.response?.status === 401) {
        setError('Session expired. Please log in again.');
      }
    } finally {
      setLoading(false);
    }
  }, [projectIdFromUrl]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Load milestones when project changes
  useEffect(() => {
    if (!selectedProject?.id) {
      setMilestones([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMilestones(true);
      setError(null);
      try {
        const res = await api.get<Milestone[]>(`/projects/${selectedProject.id}/milestones`);
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setMilestones(list.map(normalizeMilestone));
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
            : null;
          setError(msg || 'Failed to load milestones');
          setMilestones([]);
        }
      } finally {
        if (!cancelled) setLoadingMilestones(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProject?.id]);

  const loadSitePhotos = useCallback(async (milestoneId?: string) => {
    if (!selectedProject?.id) {
      setSitePhotos([]);
      return;
    }
    setLoadingPhotos(true);
    try {
      const url = milestoneId ? `/projects/${selectedProject.id}/photos?milestone_id=${milestoneId}` : `/projects/${selectedProject.id}/photos`;
      const res = await api.get(url);
      const raw = res.data as { success?: boolean; data?: SitePhoto[] } | SitePhoto[];
      const list = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'data' in raw && Array.isArray((raw as { data: SitePhoto[] }).data))
        ? (raw as { data: SitePhoto[] }).data
        : [];
      setSitePhotos(list);
    } catch {
      setSitePhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => {
    setPhotoMilestoneFilter('');
  }, [selectedProject?.id]);

  useEffect(() => {
    if (!selectedProject?.id) return;
    loadSitePhotos(photoMilestoneFilter || undefined);
  }, [loadSitePhotos, photoMilestoneFilter, selectedProject?.id]);

  async function handlePhotoUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject?.id || !photoFile) return;
    setUploadPhotoError(null);
    setUploadPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', photoFile);
      if (photoMilestoneId) formData.append('milestone_id', photoMilestoneId);
      if (photoCaption.trim()) formData.append('caption', photoCaption.trim());
      await api.post(`/projects/${selectedProject.id}/photos`, formData);
      setPhotoFile(null);
      setPhotoCaption('');
      setPhotoMilestoneId('');
      loadSitePhotos();
      toast.success('Photo uploaded');
    } catch (err: unknown) {
      const res = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { message?: string }; status?: number } }).response : undefined;
      const msg = res?.data?.message;
      const status = res?.status;
      // Backend may return 400 (e.g. "No file uploaded") while upload is being fixed — show a friendly message
      setUploadPhotoError(
        status === 400 && msg?.toLowerCase().includes('file')
          ? 'Photo upload is not available right now. Please try again later.'
          : msg || 'Failed to upload photo. Please try again later.'
      );
    } finally {
      setUploadPhotoLoading(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    if (!selectedProject?.id) return;
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api.delete(`/projects/${selectedProject.id}/photos/${photoId}`);
      setSitePhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success('Photo deleted');
    } catch {
      toast.error('Failed to delete photo');
      setError('Failed to delete photo');
    }
  }

  const timelineDateRange = useMemo(() => {
    if (!filteredMilestones.length) return { start: new Date(), end: new Date() };
    let min: Date | null = null;
    let max: Date | null = null;
    filteredMilestones.forEach((m) => {
      const s = parseDate(m.planned_start);
      const e = parseDate(m.planned_end);
      if (s) min = min ? (s < min ? s : min) : s;
      if (e) max = max ? (e > max ? e : max) : e;
    });
    if (!min || !max) return { start: new Date(), end: new Date() };
    return { start: min, end: max };
  }, [filteredMilestones]);

  /** Days from planned_start to planned_end for one milestone (its own timeline) */
  function getMilestoneDays(m: Milestone): Date[] {
    const start = parseDate(m.planned_start);
    const end = parseDate(m.planned_end);
    if (!start || !end) return [];
    const s = new Date(start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(end);
    e.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    const cur = new Date(s);
    while (cur <= e) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days.length ? days : [s];
  }

  /** For long ranges, show fewer date ticks so the timeline isn't cramped (max ~10 labels) */
  function getTimelineTicks(days: Date[]): Date[] {
    if (days.length <= 10) return days;
    const step = Math.ceil(days.length / 9);
    const out: Date[] = [];
    for (let i = 0; i < days.length; i += step) out.push(days[i]);
    if (days.length - 1 > (out.length - 1) * step) out.push(days[days.length - 1]);
    return out;
  }

  function openCreate() {
    if (projectCompleted) return;
    setForm(initialForm);
    setEditingMilestone(null);
    setShowCreateModal(true);
  }

  function openEdit(m: Milestone) {
    if (projectCompleted) return;
    setEditingMilestone(m);
    setForm({
      title: m.title,
      description: m.description || '',
      planned_start: m.planned_start?.slice(0, 10) || initialForm.planned_start,
      planned_end: m.planned_end?.slice(0, 10) || initialForm.planned_end,
      status: backendStatusToForm(m.status),
      progress: m.progress ?? 0,
    });
    setShowCreateModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject?.id) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        due_date: form.planned_end || form.planned_start,
        planned_start: form.planned_start || undefined,
        planned_end: form.planned_end || undefined,
        status: formStatusToBackend(form.status),
        progress: Math.min(100, Math.max(0, form.progress)),
      };
      if (editingMilestone) {
        await api.put(`/milestones/${editingMilestone.id}`, payload);
      } else {
        await api.post(`/projects/${selectedProject.id}/milestones`, payload);
      }
      setShowCreateModal(false);
      setEditingMilestone(null);
      const res = await api.get<Milestone[]>(`/projects/${selectedProject.id}/milestones`);
      setMilestones((Array.isArray(res.data) ? res.data : []).map(normalizeMilestone));
      toast.success(editingMilestone ? 'Milestone updated' : 'Milestone created');
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      setError(msg || 'Failed to save milestone');
    } finally {
      setSaving(false);
    }
  }

  const projectCompleted = isProjectCompleted(selectedProject);

  async function handleDelete(m: Milestone) {
    if (projectCompleted) return;
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await api.delete(`/milestones/${m.id}`);
      setMilestones((prev) => prev.filter((x) => x.id !== m.id));
      toast.success('Milestone deleted');
    } catch {
      setError('Failed to delete milestone');
      toast.error('Failed to delete milestone');
    }
  }

  if (loading) {
    return (
      <div className="page-header">
        <div>
          <h1>Gantt Chart & Milestones</h1>
          <p>Loading…</p>
        </div>
        <Loader2 className="spin" size={24} />
      </div>
    );
  }

  return (
    <div className="gantt-page">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ flex: '1 1 280px' }}>
          <nav style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>
            <Link to="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Projects</Link>
            <span style={{ margin: '0 var(--space-2)' }}>/</span>
            <span>Gantt & Milestones</span>
          </nav>
          <h1 style={{ margin: 0, fontSize: 'var(--font-2xl)', fontWeight: 600 }}>Gantt Chart & Milestones</h1>
          <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--text-secondary)', fontSize: 'var(--font-base)' }}>
            Track project milestones, timeline, and site photos in one place.
          </p>
          {selectedProject && (
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className={`badge ${selectedProject.status === 'COMPLETED' ? 'badge-success' : selectedProject.status === 'ON_HOLD' ? 'badge-warning' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>
                {String(selectedProject.status).replace(/_/g, ' ')}
              </span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedProject.name}</span>
            </div>
          )}
        </div>
        <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/projects" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <FolderPlus size={16} /> Project Management
          </Link>
          <select
            className="filter-select"
            value={selectedProject?.id ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) {
                setSelectedProject(null);
                return;
              }
              const p = projects.find((x) => String(x.id) === String(id));
              setSelectedProject(p ?? null);
            }}
            disabled={!projects.length}
            aria-label="Select project"
            style={{ minWidth: 200 }}
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name || 'Untitled'} {p.status ? `(${p.status.replace(/_/g, ' ')})` : ''}
              </option>
            ))}
          </select>
          {selectedProject && !projectCompleted && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> New Milestone
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="content-card" style={{ marginBottom: 'var(--space-6)', borderColor: 'var(--danger)', background: 'var(--danger-bg)' }}>
          <p style={{ color: 'var(--danger)', margin: 0, marginBottom: 'var(--space-3)' }}>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => loadProjects()}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="content-card" style={{ padding: 'var(--space-8)' }}>
          <div className="skeleton skeleton-block" style={{ width: 200, height: 24, marginBottom: 'var(--space-4)' }} />
          <div className="skeleton skeleton-block" style={{ width: '100%', height: 48, marginBottom: 'var(--space-4)' }} />
          <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 40, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        </div>
      )}

      {!loading && projects.length === 0 && !error && (
        <div className="content-card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <FolderPlus size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
          <h3 style={{ marginBottom: 'var(--space-2)' }}>No projects yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Create a project first, then you can add milestones and see the Gantt chart.
          </p>
          <Link to="/projects" className="btn btn-primary">
            <Plus size={16} /> Go to Project Management
          </Link>
        </div>
      )}

      {!selectedProject && !loading && projects.length > 0 && (
        <div className="content-card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Target size={48} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }} />
          <h3 style={{ marginBottom: 'var(--space-2)' }}>No project selected</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Select a project from the dropdown above.</p>
        </div>
      )}

      {selectedProject && (
        <>
          {projectCompleted && (
            <div className="content-card" style={{ marginBottom: 'var(--space-6)', borderColor: 'var(--success)', background: 'var(--success-bg, rgba(34, 197, 94, 0.08))', color: 'var(--text-secondary)' }}>
              <strong>Project completed.</strong> Milestones are read-only. No edits or new milestones can be added.
            </div>
          )}
          {/* Stats — DESIGN.md: stat-cards */}
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-card-icon primary">
                <Target size={20} />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">{filteredMilestones.length}</span>
                <span className="stat-card-label">Total Milestones</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon success">
                <CheckCircle2 size={20} />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">
                  {countByDisplayStatus(filteredMilestones, 'completed')}
                </span>
                <span className="stat-card-label">Completed</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon info">
                <Calendar size={20} />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">
                  {countByDisplayStatus(filteredMilestones, 'in-progress')}
                </span>
                <span className="stat-card-label">In Progress</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon warning">
                <GripVertical size={20} />
              </div>
              <div className="stat-card-content">
                <span className="stat-card-value">
                  {countByDisplayStatus(filteredMilestones, 'pending')}
                </span>
                <span className="stat-card-label">Pending</span>
              </div>
            </div>
          </div>

          {/* Gantt (DESIGN.md: content-card) */}
          <div className="content-card" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <h2 style={{ margin: 0 }}>Timeline — {selectedProject.name}</h2>
              <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                {formatDateLong(timelineDateRange.start)} – {formatDateLong(timelineDateRange.end)}
              </span>
            </div>
            {milestones.length > 0 && (
              <div className="filter-row" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Search milestones..."
                    value={milestoneSearch}
                    onChange={(e) => setMilestoneSearch(e.target.value)}
                    style={{ paddingLeft: 'var(--space-10)' }}
                  />
                </div>
                <select className="filter-select" value={milestoneStatusFilter} onChange={(e) => setMilestoneStatusFilter(e.target.value)}>
                  <option value="All">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="At Risk">At Risk</option>
                </select>
              </div>
            )}
            {loadingMilestones ? (
              <div style={{ padding: 'var(--space-6)' }}>
                <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 'var(--space-4)' }} />
                <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton skeleton-stat" style={{ flex: 1 }} />
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 32, borderRadius: 'var(--radius-md)' }} />
                  ))}
                </div>
              </div>
            ) : filteredMilestones.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                  {milestones.length === 0 ? (projectCompleted ? 'No milestones. (Read-only — project is completed.)' : 'No milestones yet. Create one to see the Gantt chart.') : 'No milestones match your filters.'}
                </p>
                {!projectCompleted && (
                  <button type="button" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={openCreate}>
                    <Plus size={16} /> New Milestone
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className="gantt-container gantt-per-milestone">
                  {filteredMilestones.map((m) => {
                    const days = getMilestoneDays(m);
                    const ticks = getTimelineTicks(days);
                    const minW = Math.max(380, Math.min(800, ticks.length * 56));
                    return (
                      <div key={m.id} className="gantt-milestone-block">
                        <div className="gantt-milestone-timeline-row" style={{ minWidth: minW }}>
                          <div className="gantt-row-label">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ fontWeight: 500 }}>{m.title}</span>
                            </div>
                            <span className={`badge ${statusBadgeClass(displayStatus(m))}`} style={{ marginTop: 'var(--space-1)' }}>
                              {formatStatusLabel(displayStatus(m))}
                            </span>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
                              {formatDateShort(parseDate(m.planned_start))} – {formatDateShort(parseDate(m.planned_end))}
                            </div>
                          </div>
                          <div className="gantt-timeline gantt-timeline-dates">
                            {ticks.map((d, i) => (
                              <div key={i} className="gantt-day-header">
                                <span className="gantt-day-num">{d.getDate()}</span>
                                <span className="gantt-day-month">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                              </div>
                            ))}
                          </div>
                          <div className="gantt-row-actions" />
                        </div>
                        <div className="gantt-milestone-bar-row" style={{ minWidth: minW }} aria-label={`Progress ${m.title}`}>
                          <div className="gantt-row-label gantt-row-label-empty" />
                          <div className="gantt-timeline gantt-timeline-full">
                            <div className="gantt-bar-container">
                              <div className="gantt-bar-track">
                                <div
                                  className="gantt-bar-fill"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, m.progress ?? 0))}%`,
                                    backgroundColor: (m.progress ?? 0) >= 100 ? 'var(--success)' : 'var(--primary)',
                                  }}
                                />
                                <span
                                  className="gantt-bar-label"
                                  style={{ color: (m.progress ?? 0) > 0 ? 'white' : 'var(--text-secondary)' }}
                                >
                                  {Math.round(m.progress ?? 0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'var(--space-2)' }}>
                            {!projectCompleted && (
                              <>
                                <button type="button" className="btn-icon" onClick={() => openEdit(m)} title="Edit">
                                  <Pencil size={14} />
                                </button>
                                <button type="button" className="btn-icon danger" onClick={() => handleDelete(m)} title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* List — DESIGN.md: content-card, data-table */}
          <div className="content-card">
            <h2 style={{ marginBottom: 'var(--space-4)' }}>All Milestones</h2>
            {loadingMilestones ? (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Milestone</th><th>Planned Start</th><th>Planned End</th><th>Progress</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i}>
                        <td><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                        <td><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                        <td><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                        <td><div className="skeleton" style={{ height: 16, width: 50 }} /></td>
                        <td><div className="skeleton" style={{ height: 16, width: 70 }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : filteredMilestones.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No milestones yet.</p>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Milestone</th>
                      <th>Planned Start</th>
                      <th>Planned End</th>
                      <th>Progress</th>
                      <th>Status</th>
                      {!projectCompleted && <th className="actions">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMilestones.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{m.title}</div>
                          {m.description && (
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{m.description}</div>
                          )}
                        </td>
                        <td>{formatDateLong(parseDate(m.planned_start))}</td>
                        <td>{formatDateLong(parseDate(m.planned_end))}</td>
                        <td>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div
                              className={`progress-bar-fill ${m.progress >= 100 ? 'success' : m.progress >= 50 ? 'info' : 'warning'}`}
                              style={{ width: `${Math.min(100, Math.max(0, m.progress))}%` }}
                            />
                          </div>
                          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{m.progress}%</span>
                        </td>
                        <td>
                          <span className={`badge ${statusBadgeClass(backendStatusToForm(m.status))}`}>{formatStatusLabel(backendStatusToForm(m.status))}</span>
                        </td>
                        {!projectCompleted && (
                          <td className="actions">
                            <button type="button" className="btn-icon" onClick={() => openEdit(m)} title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button type="button" className="btn-icon danger" onClick={() => handleDelete(m)} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Site photos / Progress photos — upload by Site Engineer, view by all */}
          <div className="content-card" style={{ marginTop: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Camera size={22} style={{ color: 'var(--primary)' }} />
                  Site photos
                </h2>
                <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  Progress and work photos for this project. Site engineers can upload photos from the field.
                </p>
              </div>
              {milestones.length > 0 && (
                <select className="filter-select" value={photoMilestoneFilter} onChange={(e) => setPhotoMilestoneFilter(e.target.value)} style={{ minWidth: 180 }}>
                  <option value="">All milestones</option>
                  {milestones.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              )}
            </div>

            {canUploadPhotos && !projectCompleted && (
              <form onSubmit={handlePhotoUpload} className="content-card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--bg)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                    <label className="form-label" htmlFor="photo-file">
                      <ImagePlus size={16} style={{ verticalAlign: 'middle', marginRight: 'var(--space-1)' }} />
                      Choose image (JPG, PNG, GIF, WebP — max 10 MB)
                    </label>
                    <input
                      id="photo-file"
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                      className="form-input"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      required
                    />
                    {photoFile && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{photoFile.name}</span>}
                  </div>
                  <div className="form-group" style={{ flex: '1 1 180px', marginBottom: 0 }}>
                    <label className="form-label" htmlFor="photo-milestone">Link to milestone (optional)</label>
                    <select
                      id="photo-milestone"
                      className="form-input"
                      value={photoMilestoneId}
                      onChange={(e) => setPhotoMilestoneId(e.target.value)}
                    >
                      <option value="">— None —</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                    <label className="form-label" htmlFor="photo-caption">Caption (optional)</label>
                    <input
                      id="photo-caption"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Foundation pour complete"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={uploadPhotoLoading || !photoFile}>
                    {uploadPhotoLoading ? <Loader2 className="spin" size={16} /> : <ImagePlus size={16} />}
                    {uploadPhotoLoading ? ' Uploading…' : ' Upload'}
                  </button>
                </div>
                {uploadPhotoError && (
                  <p style={{ color: 'var(--danger)', fontSize: 'var(--font-sm)', marginTop: 'var(--space-3)', marginBottom: 0 }}>{uploadPhotoError}</p>
                )}
              </form>
            )}

            {loadingPhotos ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Loader2 className="spin" size={24} style={{ margin: '0 auto' }} />
                <p style={{ marginTop: 'var(--space-2)' }}>Loading photos…</p>
              </div>
            ) : sitePhotos.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Camera size={40} style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }} />
                <p style={{ margin: 0 }}>No site photos yet.{canUploadPhotos && !projectCompleted ? ' Upload a photo above to document progress.' : ''}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
                {sitePhotos.map((photo) => (
                  <div key={photo.id} className="content-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ aspectRatio: '4/3', background: 'var(--border-light)' }}>
                      <AuthImage
                        projectId={selectedProject.id}
                        photoId={photo.id}
                        alt={photo.caption || 'Site photo'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: 'var(--space-3)' }}>
                      {photo.caption && <p style={{ margin: 0, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }}>{photo.caption}</p>}
                      <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                        {formatDateLong(parseDate(photo.created_at))}
                      </p>
                      {canUploadPhotos && !projectCompleted && (
                        <button type="button" className="btn btn-secondary" style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-xs)' }} onClick={() => handleDeletePhoto(photo.id)}>
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal — DESIGN.md: modal-overlay, modal-header, modal-body, modal-footer */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !saving && setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{editingMilestone ? 'Edit Milestone' : 'New Milestone'}</h2>
                <p className="modal-subtitle">{selectedProject?.name}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => !saving && setShowCreateModal(false)} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    className="form-input"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Foundation Complete"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional details"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Planned Start *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.planned_start}
                      onChange={(e) => setForm((f) => ({ ...f, planned_start: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Planned End *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.planned_end}
                      onChange={(e) => setForm((f) => ({ ...f, planned_end: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-input"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="at-risk">At Risk</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Progress (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="form-input"
                      value={form.progress}
                      onChange={(e) => setForm((f) => ({ ...f, progress: Number(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <Loader2 className="spin" size={16} /> : editingMilestone ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
