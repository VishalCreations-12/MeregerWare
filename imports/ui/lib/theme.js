import { ReactiveVar } from 'meteor/reactive-var';

const STORAGE_KEY = 'jtdl-theme';

function detectPreferred() {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (e) {
    void e;
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const themeMode = new ReactiveVar(detectPreferred());

export function initThemeDocument() {
  const mode = detectPreferred();
  themeMode.set(mode);
  document.documentElement.dataset.theme = mode;
}

export function toggleTheme() {
  const next = themeMode.get() === 'dark' ? 'light' : 'dark';
  themeMode.set(next);
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch (e) {
    void e;
  }
}
