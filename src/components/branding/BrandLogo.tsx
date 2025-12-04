import { useState } from 'react';

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

const DEFAULT_LOGO_PATH = '/branding/logo.png';
const FALLBACK_LABEL = 'Base';

export const BrandLogo = ({ className = 'h-12 w-12 rounded-2xl', alt = 'Virksomhedslogo' }: BrandLogoProps) => {
  const [hasError, setHasError] = useState(false);
  const configuredPath = (import.meta.env.VITE_APP_LOGO_PATH || '').trim();
  const logoSrc = configuredPath || DEFAULT_LOGO_PATH;

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
