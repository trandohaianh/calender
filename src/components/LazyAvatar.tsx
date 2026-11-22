import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LazyAvatarProps {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
  size?: 'sm' | 'md';
}

const sizeClass = { sm: 'h-9 w-9 text-sm', md: 'h-10 w-10 text-base' };

/** Avatar với lazy loading ảnh; fallback chữ cái đầu */
export function LazyAvatar({ src, alt, fallback, className, size = 'sm' }: LazyAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-gradient-to-br from-primary to-emerald-500 font-semibold text-primary-foreground',
        sizeClass[size],
        className
      )}
      title={alt}
      role="img"
      aria-label={alt}
    >
      {!showImage && <span aria-hidden>{fallback}</span>}
      {showImage && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
}
