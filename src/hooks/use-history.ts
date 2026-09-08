import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 50;

export interface UseHistoryReturn<T> {
  state: T;
  set: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: (initial: T) => void;
}

export function useHistory<T>(initial: T): UseHistoryReturn<T> {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setPresent((prev) => {
      past.current = [...past.current.slice(-(MAX_HISTORY - 1)), prev];
      future.current = [];
      return typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
    });
  }, []);

  const undo = useCallback(() => {
    setPresent((prev) => {
      if (past.current.length === 0) return prev;
      const previous = past.current[past.current.length - 1];
      past.current = past.current.slice(0, -1);
      future.current = [prev, ...future.current];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setPresent((prev) => {
      if (future.current.length === 0) return prev;
      const next = future.current[0];
      future.current = future.current.slice(1);
      past.current = [...past.current, prev];
      return next;
    });
  }, []);

  const reset = useCallback((initial: T) => {
    past.current = [];
    future.current = [];
    setPresent(initial);
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    reset,
  };
}
