/** DOST-aligned blues only (charts & accents) */
export const DOST = {
  navy: '#003875',
  primary: '#0057B7',
  mid: '#2E7AD1',
  soft: '#5B9BD5',
  pale: '#B8D4F0',
  wash: '#E8F2FC',
  white: '#FFFFFF',
} as const;

export const CHART_BLUES = [
  DOST.navy,
  DOST.primary,
  DOST.mid,
  DOST.soft,
  DOST.pale,
] as const;

export const CHART_DISTRICT = [DOST.primary, DOST.mid, DOST.soft] as const;
