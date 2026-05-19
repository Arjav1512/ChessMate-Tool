/**
 * Browser and device compatibility utilities
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  features: {
    webWorkers: boolean;
    localStorage: boolean;
    fetch: boolean;
    promises: boolean;
    es6: boolean;
    cssGrid: boolean;
    flexbox: boolean;
  };
}

/**
 * Detect browser capabilities and compatibility
 */
export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
  const isEdge = /Edg/.test(userAgent);
  
  let name = 'Unknown';
  let version = '0';
  let isSupported = false;
  
  if (isChrome) {
    name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : '0';
    isSupported = parseInt(version) >= 80;
  } else if (isFirefox) {
    name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    version = match ? match[1] : '0';
    isSupported = parseInt(version) >= 75;
  } else if (isSafari) {
    name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : '0';
    isSupported = parseInt(version) >= 13;
  } else if (isEdge) {
    name = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : '0';
    isSupported = parseInt(version) >= 80;
  }
  
  return {
    name,
    version,
    isSupported,
    features: {
      webWorkers: typeof Worker !== 'undefined',
      localStorage: typeof Storage !== 'undefined' && localStorage !== null,
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      es6: typeof Symbol !== 'undefined' && typeof Map !== 'undefined',
      cssGrid: CSS.supports('display', 'grid'),
      flexbox: CSS.supports('display', 'flex'),
    },
  };
}

/**
 * Check if the current environment supports all required features
 */
export function checkCompatibility(): { supported: boolean; missingFeatures: string[] } {
  const browser = detectBrowser();
  const missingFeatures: string[] = [];
  
  if (!browser.isSupported) {
    missingFeatures.push(`Unsupported browser: ${browser.name} ${browser.version}`);
  }
  
  if (!browser.features.webWorkers) {
    missingFeatures.push('Web Workers (required for Stockfish analysis)');
  }
  
  if (!browser.features.localStorage) {
    missingFeatures.push('Local Storage (required for theme preferences)');
  }
  
  if (!browser.features.fetch) {
    missingFeatures.push('Fetch API (required for API calls)');
  }
  
  if (!browser.features.promises) {
    missingFeatures.push('Promises (required for async operations)');
  }
  
  if (!browser.features.es6) {
    missingFeatures.push('ES6 features (required for modern JavaScript)');
  }
  
  if (!browser.features.cssGrid) {
    missingFeatures.push('CSS Grid (required for layout)');
  }
  
  if (!browser.features.flexbox) {
    missingFeatures.push('CSS Flexbox (required for layout)');
  }
  
  return {
    supported: missingFeatures.length === 0,
    missingFeatures,
  };
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: string;
  orientation: 'portrait' | 'landscape';
} {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  
  let screenSize = 'unknown';
  if (isMobile) screenSize = 'mobile';
  else if (isTablet) screenSize = 'tablet';
  else if (isDesktop) screenSize = 'desktop';
  
  const orientation = height > width ? 'portrait' : 'landscape';
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    screenSize,
    orientation,
  };
}

/**
 * Check if the app should run in reduced mode due to device limitations
 */
export function shouldUseReducedMode(): boolean {
  const device = getDeviceInfo();
  const browser = detectBrowser();
  
  // Use reduced mode on very small screens or old browsers
  return device.isMobile && window.innerWidth < 480 || 
         !browser.isSupported || 
         !browser.features.webWorkers;
}
