'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export const useInfiniteScroll = (
  callback: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
) => {
  const { threshold = 0.1, rootMargin = '0px', enabled = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && enabled && !isLoading) {
        setIsLoading(true);
        Promise.resolve()
          .then(callback)
          .finally(() => setIsLoading(false));
      }
    },
    [callback, enabled, isLoading]
  );

  useEffect(() => {
    if (elementRef.current) {
      observerRef.current = new IntersectionObserver(handleObserver, {
        threshold,
        rootMargin,
      });
      observerRef.current.observe(elementRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold, rootMargin]);

  return { elementRef, isLoading };
};
