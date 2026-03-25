// Facebook Pixel utility functions for custom event tracking
// Use window.fbq directly for standard events, or import these helpers

// Track a standard Facebook Pixel event
export const trackEvent = (name, options = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', name, options);
  }
};

// Track a custom Facebook Pixel event
export const trackCustomEvent = (name, options = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('trackCustom', name, options);
  }
};
