import { useLocalStorage } from './useLocalStorage';

const PREFIX = 'arcade';

export function useAppStorage<T>(appId: string, key: string, defaultValue: T) {
  return useLocalStorage<T>(`${PREFIX}:${appId}:${key}`, defaultValue);
}

export function useGlobalStorage<T>(key: string, defaultValue: T) {
  return useLocalStorage<T>(`${PREFIX}:global:${key}`, defaultValue);
}
