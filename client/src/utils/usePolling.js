import { useEffect, useRef } from "react";

/**
 * enabled가 true인 동안 intervalMs 주기로 fn을 호출한다.
 * enabled가 false로 바뀌거나 컴포넌트가 언마운트되면 자동으로 폴링을 중단한다. (F-14)
 */
export function usePolling(fn, intervalMs, enabled) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await fnRef.current();
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs]);
}
