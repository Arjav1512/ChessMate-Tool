import { useState, useEffect } from 'react';
import { getDeviceInfo } from '../utils/compatibility';

export interface ResponsiveInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: string;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
}

/**
 * Hook for responsive design and device detection
 */
export function useResponsive(): ResponsiveInfo {
  const [deviceInfo, setDeviceInfo] = useState<ResponsiveInfo>(() => {
    const info = getDeviceInfo();
    return {
      ...info,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const info = getDeviceInfo();
      setDeviceInfo({
        ...info,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}

/**
 * Hook for responsive breakpoints
 */
export function useBreakpoint() {
  const { width } = useResponsive();
  
  return {
    isXs: width < 480,
    isSm: width >= 480 && width < 768,
    isMd: width >= 768 && width < 1024,
    isLg: width >= 1024 && width < 1280,
    isXl: width >= 1280,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
  };
}
