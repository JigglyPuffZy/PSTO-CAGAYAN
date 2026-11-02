export type UserRole = 'admin' | 'superadmin';

export type AuthUser = {
  user_id: string;
  username: string;
  role: UserRole;
};

export type Firm = {
  firm_id: number;
  year: string;
  firm: string;
  beneficiary: string;
  project_title: string;
  amount_assisted: string;
  spin_no: string;
  sector: string;
  district: string;
  employee: string;
  proposal: string | null;
  equipment: string;
  trainings: string;
  project_status: string;
  status: string;
};

export type FirmLocation = {
  id: number;
  firm: string;
  beneficiary: string;
  project_title: string;
  amount: string;
  spin_no: string;
  employee: string;
  equipment: string;
  trainings: string;
  sector: string;
  district: string;
  latitude: string;
  longitude: string;
  photo?: string | null;
  proposal?: string | null;
};

export type DashboardStats = {
  year: number;
  totalFirms: number;
  districtTotals: { 1: number; 2: number; 3: number };
  monthlyCounts: number[];
  districtLabels: string[];
  districtCounts: number[];
  projectStatus: { labels: string[]; counts: number[] };
};
