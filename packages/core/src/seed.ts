import { Caterer, Dish, Drop, Employee, Invoice, Office, Order } from './types';

// All company names are deliberately fictional ("Contoh" and "Sampel" are Malay for "example" / "sample").
export const caterers: Caterer[] = [
  { id: 'c1', name: 'Dapur Contoh Catering', area: 'Kampung Kerinchi', halalCertOnFile: true },
  { id: 'c2', name: 'Rasa Sampel Kitchen', area: 'Brickfields', halalCertOnFile: false },
];

export const dishes: Dish[] = [
  { id: 'd1', catererId: 'c1', name: 'Nasi Ayam Hainan', description: 'Roasted chicken, chicken-stock rice, chilli-ginger sauce, sup sayur', priceSen: 1390, tags: ['Mild'] },
  { id: 'd2', catererId: 'c1', name: 'Nasi Lemak Ayam Berempah', description: 'Spiced fried chicken, sambal, ikan bilis, egg, cucumber', priceSen: 1450, tags: ['Spicy'] },
  { id: 'd3', catererId: 'c2', name: 'Mee Goreng Mamak', description: 'Wok-fried yellow noodles, tofu, prawn fritter, lime', priceSen: 1150, tags: ['Medium'] },
  { id: 'd4', catererId: 'c2', name: 'Vegetable Briyani Set', description: 'Basmati briyani, dhal, three vegetables, raita', priceSen: 1250, tags: ['Vegetarian'] },
  { id: 'd5', catererId: 'c1', name: 'Nasi Kandar Ayam Madu', description: 'Honey-glazed chicken, mixed curry, cabbage, papadom', priceSen: 1790, tags: ['Medium'] },
];

export const offices: Office[] = [
  { id: 'o1', company: 'Contoh Capital Sdn Bhd', building: 'Tower B, Bangsar South City', district: 'Bangsar South', dropSpot: 'Level 12 pantry', headcount: 34, dailyBudgetSen: 50000, monthlyBudgetSen: 1100000, dropCode: 'A' },
  { id: 'o2', company: 'Sampel Systems Berhad', building: 'Block 3, KL Sentral', district: 'KL Sentral', dropSpot: 'Level 8 reception', headcount: 26, dailyBudgetSen: 36000, monthlyBudgetSen: 800000, dropCode: 'B' },
  { id: 'o3', company: 'Dummy Dynamics Sdn Bhd', building: 'Tower A, Bangsar South City', district: 'Bangsar South', dropSpot: 'Level 5 lobby', headcount: 18, dailyBudgetSen: 25000, monthlyBudgetSen: 560000, dropCode: 'C' },
];

const first = ['Hafiz','Mei Ling','Arvind','Nurul','Jason','Siti','Kumar','Wei Jie','Farah','Daniel','Priya','Amir','Joanne','Izzat','Kavitha','Zul','Yee Ting','Rashid','Michelle','Haziq','Aisyah','Ganesh','Chloe','Syafiq','Deepa','Ken','Liyana','Ravi','Shu Fen','Imran','Hannah','Faizal','Yvonne','Adam','Sharmila','Boon Keat','Nadia','Lokman'];
const last = ['Rahman','Tan','Subramaniam','Ismail','Lim','Abdullah','Raj','Wong','Hassan','Ong','Nair','Yusof','Chong','Kamal','Pillai','Ahmad','Lee','Osman','Teoh','Zainal'];

function seededEmployees(): Employee[] {
  const out: Employee[] = [
    // The demo user. Floor and desk are stored on the profile, so they survive every session.
    { id: 'me', officeId: 'o1', name: 'Aina Rahman', floor: 'Level 12', desk: 'Desk 12-07' },
  ];
  let k = 0;
  for (const o of offices) {
    const n = o.id === 'o1' ? o.headcount - 1 : o.headcount;
    for (let i = 0; i < n; i++, k++) {
      const floorNo = o.dropSpot.match(/\d+/)?.[0] ?? '1';
      out.push({ id: `e${k}`, officeId: o.id, name: `${first[k % first.length]} ${last[(k * 7) % last.length]}`, floor: `Level ${floorNo}`, desk: `Desk ${floorNo}-${String((i % 30) + 1).padStart(2, '0')}` });
    }
  }
  return out;
}
export const employees = seededEmployees();

// Deterministic pre-existing orders: most staff have ordered, a few have not (so the admin can nudge them).
export function seedOrders(): Order[] {
  const orders: Order[] = [];
  const mix: Record<string, string[]> = {
    o1: ['d1','d1','d2','d3','d1','d2','d4','d1','d3','d2'],
    o2: ['d3','d1','d3','d4','d2','d3','d1'],
    o3: ['d2','d1','d4','d3','d2'],
  };
  const skip: Record<string, number> = { o1: 6, o2: 4, o3: 2 }; // staff (besides "me") who have not ordered yet
  for (const o of offices) {
    const staff = employees.filter(e => e.officeId === o.id && e.id !== 'me');
    staff.slice(0, staff.length - skip[o.id]).forEach((e, i) => {
      orders.push({ id: `ord-${e.id}`, employeeId: e.id, officeId: o.id, dishId: mix[o.id][i % mix[o.id].length], placedAt: 8 * 3600 + i * 97 });
    });
  }
  return orders;
}

export const DEMO_START = 9 * 3600 + 18 * 60; // 09:18
export const CUTOFF = 10 * 3600 + 30 * 60; // 10:30
export const DUE = 12 * 3600 + 15 * 60; // 12:15
// What the company pays per person per day. Anything above it is a staff top-up.
export const ALLOWANCE_SEN = 1500;
export const DROP_FEE_SEN = 900; // per drop, per office (Pack B: RM8-9.20)

export function seedDrops(): Drop[] {
  return offices.map((o, i) => ({ officeId: o.id, catererId: 'c1', stage: 0, dueAt: DUE + i * 600, delayMin: 0, delayNotifiedAt: null, deliveredAt: null, rider: ['Rider 07 · Faiz', 'Rider 03 · Hong', 'Rider 07 · Faiz'][i] }));
}

export function seedInvoice(): Invoice {
  return {
    id: 'MH-INV-2026-10-0012', officeId: 'o1', period: 'October 2026', issuedOn: '31 Oct 2026', dueOn: '14 Nov 2026',
    lines: [
      { label: 'Lunch orders', detail: '612 meals across 21 working days', amountSen: 821460 },
      { label: 'Office drops', detail: '21 drops × RM 9.00', amountSen: 21 * DROP_FEE_SEN },
      { label: 'Platform fee', detail: '6% of lunch orders', amountSen: 49288 },
      { label: 'Subsidy credit', detail: 'Launch-month credit', amountSen: -20000 },
    ],
    status: 'unpaid', paidRef: null, paidVia: null,
  };
}
