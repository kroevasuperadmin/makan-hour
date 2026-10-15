// Domain types. These mirror the tables a Supabase backend would expose later
// (caterers, dishes, offices, employees, orders, drops, invoices).
export type Role = 'employee' | 'admin' | 'caterer';

export interface Caterer { id: string; name: string; area: string; halalCertOnFile: boolean; }
export interface Dish { id: string; catererId: string; name: string; description: string; priceSen: number; tags: string[]; }
export interface Office {
  id: string; company: string; building: string; district: 'Bangsar South' | 'KL Sentral';
  dropSpot: string; headcount: number; dailyBudgetSen: number; monthlyBudgetSen: number; dropCode: string;
}
export interface Employee { id: string; officeId: string; name: string; floor: string; desk: string; }
export interface Order { id: string; employeeId: string; officeId: string; dishId: string; placedAt: number; }

export type DropStage = 0 | 1 | 2 | 3 | 4; // awaiting cutoff, batch confirmed, preparing, out, delivered
export interface Drop {
  officeId: string; catererId: string; stage: DropStage; dueAt: number; // seconds since midnight
  delayMin: number; delayNotifiedAt: number | null; deliveredAt: number | null; rider: string;
}
export interface InvoiceLine { label: string; detail: string; amountSen: number; }
export interface Invoice {
  id: string; officeId: string; period: string; issuedOn: string; dueOn: string;
  lines: InvoiceLine[]; status: 'unpaid' | 'paid'; paidRef: string | null; paidVia: string | null;
}
