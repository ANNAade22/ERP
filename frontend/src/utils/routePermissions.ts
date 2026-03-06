/**
 * Role-based route access. Must stay in sync with Sidebar menu visibility.
 * Used by RoleGuard to redirect users who navigate directly to a URL they can't access.
 */

export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'SITE_ENGINEER' | 'ACCOUNTANT' | 'STORE_OFFICER'

/** Path prefixes each role is allowed to access (e.g. /projects includes /projects/123). */
const ALLOWED_PREFIXES_BY_ROLE: Record<Role, string[]> = {
    ADMIN: ['/dashboard', '/equipment', '/projects', '/vendors', '/inventory', '/finance', '/attendance', '/registry', '/settings'],
    PROJECT_MANAGER: ['/dashboard', '/equipment', '/projects', '/vendors', '/inventory', '/finance', '/attendance', '/settings'],
    SITE_ENGINEER: ['/dashboard', '/projects', '/inventory', '/attendance', '/settings'],
    ACCOUNTANT: ['/dashboard', '/vendors', '/finance', '/settings'],
    STORE_OFFICER: ['/dashboard', '/vendors', '/inventory', '/settings'],
}

/**
 * Returns true if the given pathname is allowed for the role.
 * If role is undefined/null, allows access (e.g. during auth load).
 */
export function isPathAllowedForRole(pathname: string, role: string | undefined): boolean {
    const normalized = pathname.replace(/\/$/, '') || '/'
    if (!role) return true
    if (normalized === '' || normalized === '/') return true
    const roleKey = role as Role
    if (!ALLOWED_PREFIXES_BY_ROLE[roleKey]) return true
    const prefixes = ALLOWED_PREFIXES_BY_ROLE[roleKey]
    return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(prefix + '/'))
}
