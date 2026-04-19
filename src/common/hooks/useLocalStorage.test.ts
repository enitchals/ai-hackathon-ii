import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('returns the default value when key is not set', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('persists values to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    act(() => result.current[1]('updated'));
    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(localStorage.getItem('test-key')!)).toBe('updated');
  });

  it('reads existing values from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('existing'));
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('existing');
  });

  it('supports function updater', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(1);
  });

  it('handles objects', () => {
    const { result } = renderHook(() =>
      useLocalStorage('obj', { name: 'test', scores: [1, 2, 3] }),
    );
    expect(result.current[0]).toEqual({ name: 'test', scores: [1, 2, 3] });

    act(() => result.current[1]({ name: 'updated', scores: [4, 5] }));
    expect(result.current[0]).toEqual({ name: 'updated', scores: [4, 5] });
  });

  it('falls back to default on corrupted JSON', () => {
    localStorage.setItem('bad-key', '{invalid json');
    const { result } = renderHook(() => useLocalStorage('bad-key', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});
