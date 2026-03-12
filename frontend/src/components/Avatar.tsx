import { useState } from 'react'
import { apiBaseURL } from '../utils/api'

type AvatarSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<AvatarSize, number> = {
    sm: 28,
    md: 40,
    lg: 56,
}

function getInitials(name?: string, email?: string): string {
    if (name && name.trim()) {
        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name.slice(0, 2).toUpperCase()
    }
    if (email) {
        return email.slice(0, 2).toUpperCase()
    }
    return '?'
}

interface AvatarProps {
    userId: string
    name?: string
    email?: string
    size?: AvatarSize
    className?: string
    /** When true, skip loading image and show initials (avoids 404 for users without avatar) */
    skipImage?: boolean
}

function AvatarFallback({ initials, px, size, className }: { initials: string; px: number; size: AvatarSize; className: string }) {
    return (
        <span
            className={`avatar avatar-fallback avatar-${size} ${className}`.trim()}
            style={{
                width: px,
                height: px,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--sidebar-bg-hover, #312e81)',
                color: 'var(--sidebar-text-active, #fff)',
                fontSize: size === 'sm' ? 10 : size === 'md' ? 14 : 18,
                fontWeight: 600,
            }}
        >
            {initials}
        </span>
    )
}

export default function Avatar({ userId, name, email, size = 'md', className = '', skipImage = false }: AvatarProps) {
    const [imgError, setImgError] = useState(false)
    const px = sizeMap[size]
    const avatarUrl = `${apiBaseURL}/users/${userId}/avatar`
    const initials = getInitials(name, email)

    if (skipImage || imgError) {
        return <AvatarFallback initials={initials} px={px} size={size} className={className} />
    }

    return (
        <img
            src={avatarUrl}
            alt={name || 'Avatar'}
            className={`avatar avatar-${size} ${className}`.trim()}
            style={{ width: px, height: px, borderRadius: '50%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
        />
    )
}
