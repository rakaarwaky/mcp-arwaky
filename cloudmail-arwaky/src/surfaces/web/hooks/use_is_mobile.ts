import { useState, useEffect } from 'react';

export function useIsMobile(initialValue = false, breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(initialValue);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}
