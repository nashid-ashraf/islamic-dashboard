/** Shared design tokens consumed by both web (CSS vars) and mobile (StyleSheet). */
export const colors = {
  background: '#0f1b2d',
  card: '#172033',
  accent: '#3ecf8e',
  gold: '#f5c542',
  text: '#e2e8f0',
  muted: '#94a3b8',
  error: '#e74c3c',
  green: '#1e7e5a',
  border: '#1e3050',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 12,
  lg: 20,
} as const;
