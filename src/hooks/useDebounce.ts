import { useCallback, useRef, useEffect } from 'react';

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current && lastArgsRef.current) {
        clearTimeout(timeoutRef.current);
        callbackRef.current(...lastArgsRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = args;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        lastArgsRef.current = null;
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );
}
