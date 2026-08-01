'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RouteProgress() {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);

  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setAnimating(true);
  }

  useEffect(() => {
    if (!animating) return;
    const timer = setTimeout(() => setAnimating(false), 400);
    return () => clearTimeout(timer);
  }, [animating]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5">
      <div
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{
          width: animating ? '100%' : '0%',
          opacity: animating ? 1 : 0,
        }}
      />
    </div>
  );
}
