import { useState } from 'react';

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

const DEFAULT_LOGO_PATH = '/branding/logo.png';
const FALLBACK_LABEL = 'Base';

const getRuntimeBasePath = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.BASE_URL ?? '/';
  }

  const baseEl = document.querySelector('base[href]');
  if (baseEl) {
    const href = baseEl.getAttribute('href') || '/';
    return href.endsWith('/') ? href.slice(0, -1) : href;
  }

  const appBase = import.meta.env.BASE_URL ?? '/';
  if (appBase && appBase !== '/') {
    return appBase.endsWith('/') ? appBase.slice(0, -1) : appBase;
  }

  return '';
};

const buildAssetPath = (path: string) => {
  if (/^(https?:)?\/\//.test(path)) {
    return path;
  }

  const basePath = getRuntimeBasePath();
  const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const finalPath = `${normalizedBase}/${normalizedPath}`;

  if (typeof window === 'undefined') {
    return finalPath;
  }

  const origin = window.location.origin ?? '';
  return `${origin}${finalPath.startsWith('/') ? finalPath : `/${finalPath}`}`;
};

export const BrandLogo = ({ className = 'h-12 w-12 rounded-2xl', alt = 'Virksomhedslogo' }: BrandLogoProps) => {
  const [hasError, setHasError] = useState(false);
  const configuredPath = (import.meta.env.VITE_APP_LOGO_PATH || '').trim();
  const logoSrc = buildAssetPath(configuredPath || DEFAULT_LOGO_PATH);

  if (hasError) {
    return (
      <div className={`grid place-items-center bg-blue-600 text-white font-semibold ${className}`}>
        {FALLBACK_LABEL.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`${className} object-contain`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
};

export default BrandLogo;
