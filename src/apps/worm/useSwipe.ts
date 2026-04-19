import { useRef, useCallback } from 'react';
import type { Direction } from './wormLogic';

const MIN_SWIPE_DISTANCE = 30;

export function useSwipe(onSwipe: (dir: Direction) => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Ignore if the touch started on a d-pad button
    const target = e.target as HTMLElement;
    if (target.closest('.dpad-btn')) return;

    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      touchStart.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < MIN_SWIPE_DISTANCE) return;

      if (absDx > absDy) {
        onSwipe(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        onSwipe(dy > 0 ? 'DOWN' : 'UP');
      }
    },
    [onSwipe],
  );

  return { handleTouchStart, handleTouchEnd };
}
