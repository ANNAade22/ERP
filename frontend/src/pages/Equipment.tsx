import { useState, useEffect } from 'react'
import {
    Wrench,
    CheckCircle,
    AlertTriangle,
    MapPin,
    Calendar,
    Pencil,
    Trash2,
    CalendarDays,
    Clock,
    User,
    TrendingUp,
    X,
} from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useAuth } from '../context/AuthContext'

const EQUIPMENT_TYPES = ['Road Equipment', 'Delivery Vehicle', 'Excavator', 'Crane', 'Other'] as const
const MAINTENANCE_TYPES = ['Repair', 'Inspection', 'Preventive'] as const

interface DashboardData {
    total_equipment: number
    available: number
    under_maintenance: number
    critical_alerts: number
    upcoming_maintenance: {
        id: string
        equipment_name: string
        type: string
        assigned_to: string
        assigned_to_name: string
        date: string
        hours: string
        status: string
    }[]
}

interface EquipmentItem {
    id: string
    name: string
    type: string
    manufacturer: string
    model: string
    serial_number: string
    status: string
    location: string
    last_service_at: string | null
    purchase_date: string | null
    notes: string
}

interface ScheduledItem {
    id: string
    project_id: string
    project_name: string
    equipment_id: string
    equipment_name: string
    operator_name: string
    schedule_date: string
}

function statusType(s: string): string {
    const u = (s || '').toUpperCase()
    if (u === 'ACTIVE') return 'success'
    if (u === 'MAINTENANCE') return 'warning'
    return 'neutral'
}

function formatLastService(d: string | null): string {
    if (!d) return '—'
    try {
        const date = new Date(d)
        return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    } catch {
        return '—'
    }
}

const EQUIPMENT_STATUSES = ['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const

const emptyEquipmentForm = {
    name: '',
    type: 'Road Equipment' as const,
    manufacturer: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    location: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE',
}

const emptyMaintenanceForm = {
    type: 'Repair' as const,
    scheduled_at: '',
    assigned_to: '',
    estimated_hours: '',
}

interface AssignableUser {
    id: string
    name: string
}

export default function Equipment() {
    const { user } = useAuth()
    const [dashboard, setDashboard] = useState<DashboardData | null>(null)
    const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([])
    const [scheduledList, setScheduledList] = useState<ScheduledItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editEquipment, setEditEquipment] = useState<EquipmentItem | null>(null)
    const [equipmentForm, setEquipmentForm] = useState(emptyEquipmentForm)
    const [equipmentSubmitLoading, setEquipmentSubmitLoading] = useState(false)
    const [equipmentFormError, setEquipmentFormError] = useState('')

    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
    const [maintenanceEquipmentId, setMaintenanceEquipmentId] = useState<string | null>(null)
    const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm)
    const [maintenanceSubmitLoading, setMaintenanceSubmitLoading] = useState(false)
    const [maintenanceFormError, setMaintenanceFormError] = useState('')
    const [assignToSelf, setAssignToSelf] = useState(true)
    const [currentUserName, setCurrentUserName] = useState('')
    const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([])

    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
    const [cancelMaintenanceConfirm, setCancelMaintenanceConfirm] = useState<string | null>(null)

    const [rescheduleMaintenanceId, setRescheduleMaintenanceId] = useState<string | null>(null)
    const [rescheduleDate, setRescheduleDate] = useState('')
    const [rescheduleLoading, setRescheduleLoading] = useState(false)

    const [showScheduleModal, setShowScheduleModal] = useState(false)
    const [editSchedule, setEditSchedule] = useState<ScheduledItem | null>(null)
    const [deleteScheduleConfirm, setDeleteScheduleConfirm] = useState<ScheduledItem | null>(null)
    const [projectsList, setProjectsList] = useState<{ id: string; name: string }[]>([])
    const [scheduleForm, setScheduleForm] = useState({ project_id: '', equipment_id: '', operator_name: '', schedule_date: '' })
    const [scheduleFormError, setScheduleFormError] = useState('')
    const [scheduleSubmitLoading, setScheduleSubmitLoading] = useState(false)

    const [showUtilizationModal, setShowUtilizationModal] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const [dashboardRes, equipmentRes, scheduledRes] = await Promise.all([
                api.get('/equipment/dashboard'),
                api.get('/equipment'),
                api.get('/equipment/scheduled'),
            ])
            const dashData = (dashboardRes.data as { data?: DashboardData })?.data ?? null
            const eqData = (equipmentRes.data as { data?: EquipmentItem[] })?.data ?? []
            const schData = (scheduledRes.data as { data?: ScheduledItem[] })?.data ?? []
            setDashboard(dashData)
            setEquipmentList(Array.isArray(eqData) ? eqData : [])
            setScheduledList(Array.isArray(schData) ? schData : [])
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to load equipment data')
            setDashboard(null)
            setEquipmentList([])
            setScheduledList([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return
            if (showUtilizationModal) setShowUtilizationModal(false)
            else if (deleteConfirm) setDeleteConfirm(null)
            else if (cancelMaintenanceConfirm) setCancelMaintenanceConfirm(null)
            else if (deleteScheduleConfirm) setDeleteScheduleConfirm(null)
            else if (showScheduleModal) { setShowScheduleModal(false); setEditSchedule(null) }
            else if (rescheduleMaintenanceId) setRescheduleMaintenanceId(null)
            else if (showMaintenanceModal && maintenanceEquipmentId) { setShowMaintenanceModal(false); setMaintenanceEquipmentId(null) }
            else if (showEditModal && editEquipment) { setShowEditModal(false); setEditEquipment(null) }
            else if (showAddModal) setShowAddModal(false)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [showUtilizationModal, deleteConfirm, cancelMaintenanceConfirm, deleteScheduleConfirm, showScheduleModal, rescheduleMaintenanceId, showMaintenanceModal, maintenanceEquipmentId, showEditModal, editEquipment, showAddModal])

    const openAddModal = () => {
        setEquipmentForm(emptyEquipmentForm)
        setEquipmentFormError('')
        setShowAddModal(true)
    }

    const openEditModal = (eq: EquipmentItem) => {
        setEditEquipment(eq)
        const status = (eq.status?.toUpperCase() === 'MAINTENANCE' || eq.status?.toUpperCase() === 'INACTIVE')
            ? eq.status.toUpperCase() as 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
            : 'ACTIVE'
        setEquipmentForm({
            name: eq.name,
            type: (eq.type as typeof emptyEquipmentForm.type) || 'Road Equipment',
            manufacturer: eq.manufacturer || '',
            model: eq.model || '',
            serial_number: eq.serial_number || '',
            purchase_date: eq.purchase_date ? eq.purchase_date.slice(0, 10) : '',
            location: eq.location || '',
            notes: eq.notes || '',
            status: status === 'INACTIVE' ? 'INACTIVE' : status === 'MAINTENANCE' ? 'MAINTENANCE' : 'ACTIVE',
        })
        setEquipmentFormError('')
        setShowEditModal(true)
    }

    const openMaintenanceModal = (equipmentId: string) => {
        setMaintenanceEquipmentId(equipmentId)
        setAssignToSelf(true)
        setCurrentUserName('')
        setAssignableUsers([])
        setMaintenanceForm({
            ...emptyMaintenanceForm,
            assigned_to: user?.id ?? '',
        })
        setMaintenanceFormError('')
        setShowMaintenanceModal(true)
    }

    useEffect(() => {
        if (!showMaintenanceModal || !maintenanceEquipmentId) return
        let cancelled = false
        const load = async () => {
            try {
                const [profileRes, assignableRes] = await Promise.allSettled([
                    api.get('/profile'),
                    api.get('/users/assignable'),
                ])
                if (cancelled) return
                if (profileRes.status === 'fulfilled' && profileRes.value?.data?.data) {
                    const name = (profileRes.value.data.data as { name?: string }).name
                    if (name) setCurrentUserName(name)
                }
                if (assignableRes.status === 'fulfilled' && assignableRes.value?.data?.data) {
                    const list = assignableRes.value.data.data as AssignableUser[]
                    setAssignableUsers(Array.isArray(list) ? list : [])
                }
            } catch {
                if (!cancelled) setAssignableUsers([])
            }
        }
        load()
        return () => { cancelled = true }
    }, [showMaintenanceModal, maintenanceEquipmentId])

    const handleEquipmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setEquipmentFormError('')
        setEquipmentSubmitLoading(true)
        try {
            if (editEquipment) {
                await api.put(`/equipment/${editEquipment.id}`, {
                    name: equipmentForm.name,
                    type: equipmentForm.type,
                    manufacturer: equipmentForm.manufacturer || undefined,
                    model: equipmentForm.model || undefined,
                    serial_number: equipmentForm.serial_number || undefined,
                    purchase_date: equipmentForm.purchase_date || undefined,
                    location: equipmentForm.location || undefined,
                    notes: equipmentForm.notes || undefined,
                    status: equipmentForm.status,
                })
                toast.success('Equipment updated')
            } else {
                await api.post('/equipment', {
                    name: equipmentForm.name,
                    type: equipmentForm.type,
                    manufacturer: equipmentForm.manufacturer || undefined,
                    model: equipmentForm.model || undefined,
                    serial_number: equipmentForm.serial_number || undefined,
                    purchase_date: equipmentForm.purchase_date || undefined,
                    location: equipmentForm.location || undefined,
                    notes: equipmentForm.notes || undefined,
                })
                toast.success('Equipment added')
            }
            setShowAddModal(false)
            setShowEditModal(false)
            setEditEquipment(null)
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to save equipment'
            setEquipmentFormError(msg)
            toast.error(msg)
        } finally {
            setEquipmentSubmitLoading(false)
        }
    }

    const handleMaintenanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!maintenanceEquipmentId) return
        setMaintenanceFormError('')
        setMaintenanceSubmitLoading(true)
        try {
            await api.post(`/equipment/${maintenanceEquipmentId}/maintenance`, {
                type: maintenanceForm.type,
                scheduled_at: maintenanceForm.scheduled_at,
                assigned_to: maintenanceForm.assigned_to || undefined,
                estimated_hours: maintenanceForm.estimated_hours ? parseFloat(maintenanceForm.estimated_hours) : 0,
            })
            toast.success('Maintenance scheduled')
            setShowMaintenanceModal(false)
            setMaintenanceEquipmentId(null)
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to schedule maintenance'
            setMaintenanceFormError(msg)
            toast.error(msg)
        } finally {
            setMaintenanceSubmitLoading(false)
        }
    }

    const handleDeleteEquipment = async () => {
        if (!deleteConfirm) return
        try {
            await api.delete(`/equipment/${deleteConfirm.id}`)
            toast.success('Equipment deleted')
            setDeleteConfirm(null)
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to delete equipment'
            toast.error(msg)
        }
    }

    const openRescheduleModal = (maintenanceId: string, currentDate: string) => {
        setRescheduleMaintenanceId(maintenanceId)
        setRescheduleDate(currentDate || '')
    }

    const handleRescheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!rescheduleMaintenanceId || !rescheduleDate.trim()) return
        setRescheduleLoading(true)
        try {
            await api.patch(`/maintenance/${rescheduleMaintenanceId}`, { scheduled_at: rescheduleDate })
            toast.success('Maintenance rescheduled')
            setRescheduleMaintenanceId(null)
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to reschedule'
            toast.error(msg)
        } finally {
            setRescheduleLoading(false)
        }
    }

    const openScheduleModal = () => {
        setEditSchedule(null)
        setScheduleForm({ project_id: '', equipment_id: '', operator_name: '', schedule_date: '' })
        setScheduleFormError('')
        setShowScheduleModal(true)
    }

    const parseScheduleDateForInput = (displayDate: string): string => {
        if (!displayDate) return ''
        const parts = displayDate.split('/')
        if (parts.length !== 3) return ''
        const [mm, dd, yyyy] = parts
        return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }

    const openEditScheduleModal = (row: ScheduledItem) => {
        setEditSchedule(row)
        setScheduleForm({
            project_id: row.project_id,
            equipment_id: row.equipment_id,
            operator_name: row.operator_name,
            schedule_date: parseScheduleDateForInput(row.schedule_date),
        })
        setScheduleFormError('')
        setShowScheduleModal(true)
    }

    useEffect(() => {
        if (!showScheduleModal) return
        let cancelled = false
        api.get('/projects')
            .then((res) => {
                if (cancelled) return
                const data = (res.data as { data?: { id: string; name: string }[] })?.data
                setProjectsList(Array.isArray(data) ? data : [])
            })
            .catch(() => { if (!cancelled) setProjectsList([]) })
        return () => { cancelled = true }
    }, [showScheduleModal])

    const handleScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setScheduleFormError('')
        if (!scheduleForm.project_id || !scheduleForm.equipment_id || !scheduleForm.operator_name.trim() || !scheduleForm.schedule_date) {
            setScheduleFormError('Please fill in all fields.')
            return
        }
        setScheduleSubmitLoading(true)
        try {
            if (editSchedule) {
                await api.put(`/equipment/scheduled/${editSchedule.id}`, {
                    project_id: scheduleForm.project_id,
                    equipment_id: scheduleForm.equipment_id,
                    operator_name: scheduleForm.operator_name.trim(),
                    schedule_date: scheduleForm.schedule_date,
                })
                toast.success('Schedule updated')
            } else {
                await api.post('/equipment/scheduled', {
                    project_id: scheduleForm.project_id,
                    equipment_id: scheduleForm.equipment_id,
                    operator_name: scheduleForm.operator_name.trim(),
                    schedule_date: scheduleForm.schedule_date,
                })
                toast.success('Schedule added')
            }
            setShowScheduleModal(false)
            setEditSchedule(null)
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : editSchedule ? 'Failed to update schedule' : 'Failed to add schedule'
            setScheduleFormError(msg)
            toast.error(msg)
        } finally {
            setScheduleSubmitLoading(false)
        }
    }

    const handleDeleteSchedule = async () => {
        if (!deleteScheduleConfirm) return
        try {
            await api.delete(`/equipment/scheduled/${deleteScheduleConfirm.id}`)
            toast.success('Schedule removed')
            setDeleteScheduleConfirm(null)
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to delete schedule'
            toast.error(msg)
        }
    }

    const handleActivateMaintenance = async (maintenanceId: string) => {
        try {
            await api.patch(`/maintenance/${maintenanceId}`, { status: 'IN_PROGRESS' })
            toast.success('Maintenance activated')
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to activate'
            toast.error(msg)
        }
    }

    const handleCancelMaintenance = async (maintenanceId: string) => {
        try {
            await api.patch(`/maintenance/${maintenanceId}`, { status: 'CANCELLED' })
            toast.success('Maintenance cancelled')
            setCancelMaintenanceConfirm(null)
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to cancel'
            toast.error(msg)
        }
    }

    const handleCompleteMaintenance = async (maintenanceId: string) => {
        try {
            await api.patch(`/maintenance/${maintenanceId}`, { status: 'COMPLETED' })
            toast.success('Maintenance completed')
            fetchData()
        } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err && err.response && typeof (err.response as { data?: { message?: string } }).data?.message === 'string'
                ? (err.response as { data: { message: string } }).data.message
                : 'Failed to complete'
            toast.error(msg)
        }
    }

    const stats = dashboard
        ? [
            { title: 'Total Equipment', value: String(dashboard.total_equipment), subtitle: 'All units', subtitleType: 'info' as const, icon: <Wrench size={20} /> },
            { title: 'Available', value: String(dashboard.available), subtitle: 'Ready to use', subtitleType: 'positive' as const, icon: <CheckCircle size={20} /> },
            { title: 'Under Maintenance', value: String(dashboard.under_maintenance), subtitle: 'Scheduled repairs', subtitleType: 'neutral' as const, icon: <Wrench size={20} /> },
            { title: 'Critical Alerts', value: String(dashboard.critical_alerts), subtitle: dashboard.critical_alerts > 0 ? 'Needs attention' : 'None', subtitleType: (dashboard.critical_alerts > 0 ? 'negative' : 'positive') as 'negative' | 'positive', icon: <AlertTriangle size={20} /> },
        ]
        : [
            { title: 'Total Equipment', value: '—', subtitle: '—', subtitleType: 'neutral' as const, icon: <Wrench size={20} /> },
            { title: 'Available', value: '—', subtitle: '—', subtitleType: 'neutral' as const, icon: <CheckCircle size={20} /> },
            { title: 'Under Maintenance', value: '—', subtitle: '—', subtitleType: 'neutral' as const, icon: <Wrench size={20} /> },
            { title: 'Critical Alerts', value: '—', subtitle: '—', subtitleType: 'neutral' as const, icon: <AlertTriangle size={20} /> },
        ]

    const upcomingMaintenance = dashboard?.upcoming_maintenance ?? []

    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#equipment-page-header', popover: { title: 'Equipment Management', description: 'Track machinery, vehicles, and maintenance schedules here. Use "Utilization Report" for a summary view, or "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#equipment-stat-cards', popover: { title: 'Fleet Overview', description: 'Quick stats: total equipment, available, under maintenance, and critical alerts. Click any card to jump to the related section below.' } },
                { element: '#equipment-add-btn', popover: { title: 'Add Equipment', description: 'Add new equipment with name, type, manufacturer, model, serial number, purchase date, location, and notes.' } },
                { element: '#equipment-fleet-section', popover: { title: 'Equipment Fleet', description: 'View and manage each unit. Use the icons to edit or delete. Use "Schedule" or "Maintain" to plan work. Edit equipment to change status (Active, Maintenance, Inactive).' } },
                { element: '#equipment-maintenance-section', popover: { title: 'Upcoming Maintenance', description: 'Scheduled tasks. Use Reschedule to change the date, Activate to start work, Complete when done, or Cancel to remove the task. Press Escape to close any modal.' } },
                { element: '#equipment-scheduled-table', popover: { title: 'Equipment Scheduled', description: 'See which equipment is assigned to which project and operator. Use "+ Add schedule" to assign equipment to a project; use the row actions to edit or remove a schedule.' } },
            ],
            onDestroyed: () => {
                try { localStorage.setItem('equipment-tour-done', 'true') } catch { /* ignore */ }
            },
        })
        driverObj.drive()
    }

    return (
        <div>
            <div id="equipment-page-header" className="page-header">
                <div className="page-header-info">
                    <h1>Equipment Management</h1>
                    <p>Track machinery, vehicles, and maintenance schedules</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">
                        Take tour
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowUtilizationModal(true)}>
                        <TrendingUp size={16} /> Utilization Report
                    </button>
                    <button id="equipment-add-btn" type="button" className="btn btn-primary" onClick={openAddModal}>
                        + Add Equipment
                    </button>
                </div>
            </div>

            {error && (
                <div className="content-card" style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger, #b91c1c)' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <>
                    <div className="stat-cards">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="stat-card">
                                <div className="skeleton skeleton-block" style={{ width: '60%', height: 16 }} />
                                <div className="skeleton skeleton-block" style={{ width: 40, height: 28, marginTop: 'var(--space-2)' }} />
                                <div className="skeleton skeleton-block" style={{ width: '50%', height: 12, marginTop: 'var(--space-2)' }} />
                            </div>
                        ))}
                    </div>
                    <div className="cards-grid cols-2" style={{ marginTop: 'var(--space-4)' }}>
                        <div className="content-card">
                            <div className="skeleton skeleton-block" style={{ width: '40%', height: 20, marginBottom: 'var(--space-4)' }} />
                            <div className="skeleton skeleton-block" style={{ width: '100%', height: 80 }} />
                            <div className="skeleton skeleton-block" style={{ width: '100%', height: 80, marginTop: 'var(--space-4)' }} />
                        </div>
                        <div className="content-card">
                            <div className="skeleton skeleton-block" style={{ width: '50%', height: 20, marginBottom: 'var(--space-4)' }} />
                            <div className="skeleton skeleton-block" style={{ width: '100%', height: 80 }} />
                            <div className="skeleton skeleton-block" style={{ width: '100%', height: 80, marginTop: 'var(--space-4)' }} />
                        </div>
                    </div>
                    <div className="content-card" style={{ marginTop: 'var(--space-4)' }}>
                        <div className="skeleton skeleton-block" style={{ width: '35%', height: 20, marginBottom: 'var(--space-4)' }} />
                        <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 'var(--radius-md)' }} />
                    </div>
                </>
            ) : (
                <>
                    <div id="equipment-stat-cards" className="stat-cards">
                        {stats.map((stat) => {
                            const sectionId = stat.title === 'Critical Alerts' || stat.title === 'Under Maintenance' ? 'equipment-maintenance-section' : 'equipment-fleet-section'
                            return (
                                <button type="button" className="stat-card" key={stat.title} onClick={() => scrollToSection(sectionId)} style={{ cursor: 'pointer', border: 'none', background: 'inherit', textAlign: 'left', width: '100%' }}>
                                    <div className="stat-card-header">
                                        <span className="stat-card-title">{stat.title}</span>
                                        <span className="stat-card-icon">{stat.icon}</span>
                                    </div>
                                    <div className="stat-card-value">{stat.value}</div>
                                    <div className={`stat-card-subtitle ${stat.subtitleType}`}>
                                        {stat.subtitle}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    <div className="cards-grid cols-2">
                        <div id="equipment-fleet-section" className="content-card">
                            <div className="content-card-header">
                                <div>
                                    <div className="content-card-title">Equipment Fleet</div>
                                </div>
                            </div>
                            {equipmentList.length === 0 ? (
                                <p style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No equipment yet. Add equipment to get started.</p>
                            ) : (
                                equipmentList.map((eq) => (
                                    <div className="equipment-card" key={eq.id} style={{ marginBottom: 'var(--space-4)' }}>
                                        <div className="equipment-card-header">
                                            <div>
                                                <div className="equipment-card-name">{eq.name}</div>
                                                <div className="equipment-card-type">{eq.type} • ID: {eq.id.slice(0, 8)}</div>
                                            </div>
                                            <div className="equipment-card-actions">
                                                <button type="button" className="btn-icon" onClick={() => openEditModal(eq)} aria-label="Edit"><Pencil size={16} /></button>
                                                <button type="button" className="btn-icon danger" onClick={() => setDeleteConfirm({ id: eq.id, name: eq.name })} aria-label="Delete"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div style={{ margin: 'var(--space-2) 0' }}>
                                            <span className={`badge badge-${statusType(eq.status)}`}>{eq.status}</span>
                                        </div>
                                        <div className="equipment-card-details">
                                            <div className="equipment-card-detail">
                                                <MapPin size={14} /> {eq.location || '—'}
                                            </div>
                                            <div className="equipment-card-detail">
                                                <Calendar size={14} /> Last Service: {formatLastService(eq.last_service_at)}
                                            </div>
                                        </div>
                                        <div className="equipment-card-footer">
                                            <button type="button" className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }} onClick={() => openMaintenanceModal(eq.id)}>
                                                <CalendarDays size={14} /> Schedule
                                            </button>
                                            <button type="button" className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }} onClick={() => openMaintenanceModal(eq.id)}>
                                                <Wrench size={14} /> Maintain
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div id="equipment-maintenance-section" className="content-card">
                            <div className="content-card-header">
                                <div>
                                    <div className="content-card-title">Upcoming Maintenance</div>
                                </div>
                            </div>
                            {upcomingMaintenance.length === 0 ? (
                                <p style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No upcoming maintenance.</p>
                            ) : (
                                upcomingMaintenance.map((m) => (
                                    <div className="maintenance-card" key={m.id}>
                                        <div className="maintenance-card-header">
                                            <div className="maintenance-card-name">{m.equipment_name}</div>
                                            <div className="maintenance-card-date">
                                                <CalendarDays size={14} /> {m.date}
                                            </div>
                                        </div>
                                        <div className="maintenance-card-info">{m.type}</div>
                                        <div className="maintenance-card-meta">
                                            <span className="maintenance-card-meta-item">
                                                <User size={12} /> {m.assigned_to_name || m.assigned_to || '—'}
                                            </span>
                                            <span className="maintenance-card-meta-item">
                                                <Clock size={12} /> {m.hours || '—'}
                                            </span>
                                        </div>
                                        <div className="maintenance-card-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                            <button type="button" className="btn btn-secondary" style={{ height: '32px', fontSize: '0.8125rem' }} onClick={() => openRescheduleModal(m.id, m.date)}>
                                                Reschedule
                                            </button>
                                            {m.status !== 'COMPLETED' && m.status !== 'CANCELLED' && (
                                                <>
                                                    <button type="button" className="btn btn-primary" style={{ height: '32px', fontSize: '0.8125rem' }} onClick={() => handleActivateMaintenance(m.id)}>
                                                        Activate
                                                    </button>
                                                    <button type="button" className="btn btn-secondary" style={{ height: '32px', fontSize: '0.8125rem' }} onClick={() => handleCompleteMaintenance(m.id)}>
                                                        Complete
                                                    </button>
                                                    <button type="button" className="btn btn-secondary" style={{ height: '32px', fontSize: '0.8125rem', color: 'var(--danger)' }} onClick={() => setCancelMaintenanceConfirm(m.id)}>
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div id="equipment-scheduled-table" className="content-card" style={{ marginTop: 'var(--space-4)' }}>
                        <div className="content-card-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <CalendarDays size={20} />
                                <div className="content-card-title">Equipment Scheduled</div>
                            </div>
                            <button type="button" className="btn btn-primary" onClick={openScheduleModal} disabled={equipmentList.length === 0} title={equipmentList.length === 0 ? 'Add at least one equipment first' : ''}>
                                + Add schedule
                            </button>
                        </div>
                        <div className="data-table-wrapper">
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Project Name</th>
                                        <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Equipment Name</th>
                                        <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Operator Name</th>
                                        <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Schedule Date</th>
                                        <th style={{ textAlign: 'right', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }} className="actions">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduledList.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>
                                                No scheduled equipment.
                                            </td>
                                        </tr>
                                    ) : (
                                        scheduledList.map((row) => (
                                            <tr key={row.id}>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{row.project_name}</td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{row.equipment_name}</td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{row.operator_name}</td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{row.schedule_date}</td>
                                                <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)', textAlign: 'right' }} className="actions">
                                                    <button type="button" className="btn-icon" onClick={() => openEditScheduleModal(row)} aria-label="Edit schedule"><Pencil size={16} /></button>
                                                    <button type="button" className="btn-icon danger" onClick={() => setDeleteScheduleConfirm(row)} aria-label="Delete schedule"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Add Equipment Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Add New Equipment</h2>
                                <p className="modal-subtitle">Enter equipment details below.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {equipmentFormError && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)' }}>{equipmentFormError}</div>}
                            <form onSubmit={handleEquipmentSubmit}>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="add-name">Equipment Name</label>
                                        <input id="add-name" className="form-input" type="text" placeholder="Enter equipment name" required value={equipmentForm.name} onChange={(e) => setEquipmentForm((f) => ({ ...f, name: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="add-type">Type</label>
                                        <select id="add-type" className="form-input" value={equipmentForm.type} onChange={(e) => setEquipmentForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
                                            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="add-manufacturer">Manufacturer</label>
                                        <input id="add-manufacturer" className="form-input" type="text" placeholder="Enter manufacturer" value={equipmentForm.manufacturer} onChange={(e) => setEquipmentForm((f) => ({ ...f, manufacturer: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="add-model">Model</label>
                                        <input id="add-model" className="form-input" type="text" placeholder="Enter model" value={equipmentForm.model} onChange={(e) => setEquipmentForm((f) => ({ ...f, model: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="add-serial">Serial Number</label>
                                        <input id="add-serial" className="form-input" type="text" placeholder="Enter serial number" value={equipmentForm.serial_number} onChange={(e) => setEquipmentForm((f) => ({ ...f, serial_number: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="add-purchase">Purchase Date</label>
                                        <input id="add-purchase" className="form-input" type="date" placeholder="Pick a date" value={equipmentForm.purchase_date} onChange={(e) => setEquipmentForm((f) => ({ ...f, purchase_date: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="add-location">Location</label>
                                    <input id="add-location" className="form-input" type="text" placeholder="Enter current location" value={equipmentForm.location} onChange={(e) => setEquipmentForm((f) => ({ ...f, location: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="add-notes">Notes (Optional)</label>
                                    <textarea id="add-notes" className="form-input" placeholder="Additional notes..." rows={3} value={equipmentForm.notes} onChange={(e) => setEquipmentForm((f) => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={equipmentSubmitLoading}>{equipmentSubmitLoading ? 'Saving...' : 'Add Equipment'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Equipment Modal */}
            {showEditModal && editEquipment && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Edit Equipment</h2>
                                <p className="modal-subtitle">Update equipment details.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => { setShowEditModal(false); setEditEquipment(null); }} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {equipmentFormError && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)' }}>{equipmentFormError}</div>}
                            <form onSubmit={handleEquipmentSubmit}>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="edit-name">Equipment Name</label>
                                        <input id="edit-name" className="form-input" type="text" placeholder="Enter equipment name" required value={equipmentForm.name} onChange={(e) => setEquipmentForm((f) => ({ ...f, name: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="edit-type">Type</label>
                                        <select id="edit-type" className="form-input" value={equipmentForm.type} onChange={(e) => setEquipmentForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
                                            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="edit-manufacturer">Manufacturer</label>
                                        <input id="edit-manufacturer" className="form-input" type="text" placeholder="Enter manufacturer" value={equipmentForm.manufacturer} onChange={(e) => setEquipmentForm((f) => ({ ...f, manufacturer: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="edit-model">Model</label>
                                        <input id="edit-model" className="form-input" type="text" placeholder="Enter model" value={equipmentForm.model} onChange={(e) => setEquipmentForm((f) => ({ ...f, model: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="edit-serial">Serial Number</label>
                                        <input id="edit-serial" className="form-input" type="text" placeholder="Enter serial number" value={equipmentForm.serial_number} onChange={(e) => setEquipmentForm((f) => ({ ...f, serial_number: e.target.value }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="edit-purchase">Purchase Date</label>
                                        <input id="edit-purchase" className="form-input" type="date" value={equipmentForm.purchase_date} onChange={(e) => setEquipmentForm((f) => ({ ...f, purchase_date: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="edit-status">Status</label>
                                    <select id="edit-status" className="form-input" value={equipmentForm.status} onChange={(e) => setEquipmentForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}>
                                        {EQUIPMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="edit-location">Location</label>
                                    <input id="edit-location" className="form-input" type="text" placeholder="Enter current location" value={equipmentForm.location} onChange={(e) => setEquipmentForm((f) => ({ ...f, location: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="edit-notes">Notes (Optional)</label>
                                    <textarea id="edit-notes" className="form-input" placeholder="Additional notes..." rows={3} value={equipmentForm.notes} onChange={(e) => setEquipmentForm((f) => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditEquipment(null); }}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={equipmentSubmitLoading}>{equipmentSubmitLoading ? 'Saving...' : 'Save Changes'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Maintenance Modal */}
            {showMaintenanceModal && maintenanceEquipmentId && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Schedule Maintenance</h2>
                                <p className="modal-subtitle">Create a maintenance task for this equipment.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => { setShowMaintenanceModal(false); setMaintenanceEquipmentId(null); }} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {maintenanceFormError && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)' }}>{maintenanceFormError}</div>}
                            <form onSubmit={handleMaintenanceSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="maint-type">Type</label>
                                    <select id="maint-type" className="form-input" value={maintenanceForm.type} onChange={(e) => setMaintenanceForm((f) => ({ ...f, type: e.target.value as typeof f.type }))}>
                                        {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="maint-date">Scheduled Date</label>
                                    <input id="maint-date" className="form-input" type="date" required value={maintenanceForm.scheduled_at} onChange={(e) => setMaintenanceForm((f) => ({ ...f, scheduled_at: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <span className="form-label">Assigned To</span>
                                    {assignToSelf ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-1)' }}>
                                            <span style={{ fontWeight: 500 }}>{currentUserName || user?.email || 'You'}</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>(you)</span>
                                            {assignableUsers.length > 0 && (
                                                <button type="button" className="btn btn-secondary" style={{ fontSize: 'var(--font-sm)', padding: 'var(--space-1) var(--space-2)' }} onClick={() => setAssignToSelf(false)}>
                                                    Assign to someone else
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: 'var(--space-1)' }}>
                                            <select id="maint-assigned" className="form-input" value={maintenanceForm.assigned_to} onChange={(e) => setMaintenanceForm((f) => ({ ...f, assigned_to: e.target.value }))} required>
                                                <option value="">Select user...</option>
                                                {assignableUsers.map((u) => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                            <button type="button" className="btn btn-secondary" style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-2)' }} onClick={() => { setAssignToSelf(true); setMaintenanceForm((f) => ({ ...f, assigned_to: user?.id ?? '' })); }}>
                                                Assign to me
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="maint-hours">Estimated Hours</label>
                                    <input id="maint-hours" className="form-input" type="number" min={0} step={0.5} placeholder="0" value={maintenanceForm.estimated_hours} onChange={(e) => setMaintenanceForm((f) => ({ ...f, estimated_hours: e.target.value }))} />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => { setShowMaintenanceModal(false); setMaintenanceEquipmentId(null); }}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={maintenanceSubmitLoading}>{maintenanceSubmitLoading ? 'Saving...' : 'Schedule Maintenance'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule Maintenance Modal */}
            {rescheduleMaintenanceId && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Reschedule Maintenance</h2>
                                <p className="modal-subtitle">Choose a new date for this maintenance task.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setRescheduleMaintenanceId(null)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleRescheduleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reschedule-date">New date</label>
                                    <input id="reschedule-date" className="form-input" type="date" required value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setRescheduleMaintenanceId(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={rescheduleLoading}>{rescheduleLoading ? 'Saving...' : 'Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit schedule modal (Equipment Scheduled table) */}
            {showScheduleModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">{editSchedule ? 'Edit schedule' : 'Schedule equipment'}</h2>
                                <p className="modal-subtitle">{editSchedule ? 'Update schedule details.' : 'Assign equipment to a project and operator.'}</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => { setShowScheduleModal(false); setEditSchedule(null); }} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {scheduleFormError && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-3)', fontSize: 'var(--font-sm)' }}>{scheduleFormError}</div>}
                            {(projectsList.length === 0 || equipmentList.length === 0) && (
                                <p style={{ color: 'var(--warning)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)' }}>
                                    Add at least one project and one equipment first.
                                </p>
                            )}
                            <form onSubmit={handleScheduleSubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="schedule-project">Project</label>
                                    <select id="schedule-project" className="form-input" required value={scheduleForm.project_id} onChange={(e) => setScheduleForm((f) => ({ ...f, project_id: e.target.value }))} disabled={projectsList.length === 0}>
                                        <option value="">Select project...</option>
                                        {projectsList.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="schedule-equipment">Equipment</label>
                                    <select id="schedule-equipment" className="form-input" required value={scheduleForm.equipment_id} onChange={(e) => setScheduleForm((f) => ({ ...f, equipment_id: e.target.value }))} disabled={equipmentList.length === 0}>
                                        <option value="">Select equipment...</option>
                                        {equipmentList.map((eq) => (
                                            <option key={eq.id} value={eq.id}>{eq.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="schedule-operator">Operator name</label>
                                    <input id="schedule-operator" className="form-input" type="text" placeholder="Enter operator name" required value={scheduleForm.operator_name} onChange={(e) => setScheduleForm((f) => ({ ...f, operator_name: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                    <label className="form-label" htmlFor="schedule-date">Schedule date</label>
                                    <input id="schedule-date" className="form-input" type="date" required value={scheduleForm.schedule_date} onChange={(e) => setScheduleForm((f) => ({ ...f, schedule_date: e.target.value }))} />
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => { setShowScheduleModal(false); setEditSchedule(null); }}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={scheduleSubmitLoading || projectsList.length === 0 || equipmentList.length === 0}>{scheduleSubmitLoading ? 'Saving...' : editSchedule ? 'Save changes' : 'Add schedule'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete schedule confirmation */}
            {deleteScheduleConfirm && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Remove schedule</h2>
                            <button type="button" className="modal-close" onClick={() => setDeleteScheduleConfirm(null)} aria-label="Close"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p>Remove this schedule ({deleteScheduleConfirm.equipment_name} on {deleteScheduleConfirm.project_name})? This cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setDeleteScheduleConfirm(null)}>Cancel</button>
                            <button type="button" className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={handleDeleteSchedule}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel maintenance confirmation */}
            {cancelMaintenanceConfirm && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Cancel maintenance task</h2>
                            <button type="button" className="modal-close" onClick={() => setCancelMaintenanceConfirm(null)} aria-label="Close"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p>Cancel this maintenance task? It will be marked as cancelled.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setCancelMaintenanceConfirm(null)}>Keep</button>
                            <button type="button" className="btn btn-danger" onClick={() => handleCancelMaintenance(cancelMaintenanceConfirm)}>Cancel task</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            {deleteConfirm && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Delete Equipment</h2>
                            <button type="button" className="modal-close" onClick={() => setDeleteConfirm(null)} aria-label="Close"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete &quot;{deleteConfirm.name}&quot;? This cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button type="button" className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={handleDeleteEquipment}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Utilization Report modal */}
            {showUtilizationModal && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '720px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Utilization Report</h2>
                                <p className="modal-subtitle">Equipment list and availability summary.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setShowUtilizationModal(false)} aria-label="Close"><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {dashboard && (
                                <p style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                                    {dashboard.available} of {dashboard.total_equipment} units available
                                    {dashboard.under_maintenance > 0 && ` · ${dashboard.under_maintenance} under maintenance`}.
                                </p>
                            )}
                            <div className="data-table-wrapper">
                                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Name</th>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Type</th>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Status</th>
                                            <th style={{ textAlign: 'left', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>Last service</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {equipmentList.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ padding: 'var(--space-4)', color: 'var(--text-muted)' }}>No equipment.</td>
                                            </tr>
                                        ) : (
                                            equipmentList.map((eq) => (
                                                <tr key={eq.id}>
                                                    <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{eq.name}</td>
                                                    <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{eq.type}</td>
                                                    <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{eq.status}</td>
                                                    <td style={{ padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)' }}>{formatLastService(eq.last_service_at)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-primary" onClick={() => setShowUtilizationModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
