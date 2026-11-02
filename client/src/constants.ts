export const SECTORS = [
  'Agriculture',
  'Aquaculture',
  'Gift, Houseware & Decor',
  'Metals & Engineering',
  'Food Processing',
  'Furniture',
] as const;

export const PROJECT_STATUSES = [
  'Regular Due',
  'Unpaid Penalties',
  'Past Due',
  'Fully Paid Projects',
  'Endorsed to OSG',
] as const;

export const FIRM_STATUSES = [
  'Pending',
  'Updated',
  'Fully Paid',
  'Due and Demandable',
  'Delinquent',
] as const;

export const DISTRICTS = ['1', '2', '3'] as const;

/** Roadmap modules not built in the React app yet. */
export const PLANNED_FEATURES = [
  'Excel sync / preview',
  'PDF report generator',
  'User settings & profile',
] as const;
