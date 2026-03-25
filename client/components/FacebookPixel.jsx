"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

const FacebookPixel = ({ pixelId }) => {
  const pathname = usePathname();
  const pixelIdRef = useRef(pixelId);

  useEffect(() => {
    pixelIdRef.current = pixelId;
  }, [pixelId]);

  useEffect(() => {
    if (!pixelId) return;

    if (window.fbq) {
      // Prevent duplicate initialization across component remounts
      if (!window.fbq.__pixelInitialized) {
        window.fbq('init', pixelId);
        window.fbq.__pixelInitialized = true;
      }
      window.fbq('track', 'PageView');
    }
  }, [pathname, pixelId]);

  if (!pixelId) return null;

  return (
    <>
      <Script
        id="fb-pixel-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.fbq = window.fbq || function() {
              if (window.fbq.loaded) return;
              window.fbq.loaded = true;
              window.fbq.methods = ['track', 'trackCustom'];
              window.fbq.method = function() {
                var args = arguments;
                if (window.fbq.callMethod) {
                  window.fbq.callMethod.apply(window.fbq, args);
                } else {
                  window.fbq.queue.push(args);
                }
              };
              window.fbq.addEventListener = function(event, fn) {
                if (!window.fbq.callbacks) window.fbq.callbacks = [];
                window.fbq.callbacks.push([event, fn]);
              };
              window.fbq.ifReady = function() {
                if (window.fbq.callbacks) {
                  window.fbq.callbacks.forEach(function(fn) { fn[0](fn[1]); });
                }
              };
              window.fbq.queue = [];
              for (var i = 0; i < window.fbq.methods.length; i++) {
                window.fbq(window.fbq.methods[i], window.fbq.methods[i]);
              }
            };
          `
        }}
      />
      <Script
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
      />
    </>
  );
};

export default FacebookPixel;
