export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const TOKEN_KEY = 'korvon_token';

/** палитра графиков — см. dataviz reference palette */
export const CHART = {
  series1: '#2a78d6',
  series2: '#1baf7a',
  grid: '#e1e0d9',
  muted: '#898781',
  ink: '#52514e',
} as const;
