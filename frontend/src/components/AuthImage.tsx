import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

/** Renders an image from an API endpoint that requires auth (Bearer token). */
export default function AuthImage({
  projectId,
  photoId,
  alt = '',
  className = '',
  style = {},
}: {
  projectId: string;
  photoId: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId || !photoId) return;
    let cancelled = false;
    api
      .get(`/projects/${projectId}/photos/${photoId}/file`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        const blob = res.data as Blob;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setSrc(url);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setSrc(null);
    };
  }, [projectId, photoId]);

  if (failed) {
    return (
      <div className={className} style={{ ...style, background: 'var(--border-light)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-sm)' }}>
        Failed to load
      </div>
    );
  }
  if (!src) {
    return (
      <div className={className} style={{ ...style, background: 'var(--border-light)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        …
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} style={style} />;
}
