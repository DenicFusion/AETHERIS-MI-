import React from 'react';
import { useConfig } from '@/contexts/GlobalConfigContext';

interface LogoProps {
  className?: string; // Additional classes for the container
  textClassName?: string;
  iconClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', textClassName = '', iconClassName = '' }) => {
  const { branding } = useConfig();
  const { mainLogoUrl, logoHeight } = branding;

  const logoSrc = mainLogoUrl || "/AEfavicon.png";

  return (
    <img 
      src={logoSrc} 
      alt="AETHERIS Logo" 
      style={{ height: `${logoHeight}px`, width: 'auto', imageRendering: 'auto' }}
      className={`object-contain transition-all duration-300 contrast-[1.05] drop-shadow-sm ${className}`}
      crossOrigin="anonymous"
      onError={(e) => {
        e.currentTarget.src = "/AEfavicon.png";
      }}
    />
  );
};
