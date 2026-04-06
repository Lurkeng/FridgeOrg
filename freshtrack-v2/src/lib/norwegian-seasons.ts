import type { FoodCategory } from "@/types";

// ── Holiday Shopping Lists ─────────────────────────────────────────────────

export interface HolidayList {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Approximate month(s) when the holiday occurs (1-12) */
  months: number[];
  items: { name: string; category: FoodCategory; quantity: number; unit: string }[];
}

export const NORWEGIAN_HOLIDAYS: HolidayList[] = [
  {
    id: "jul",
    name: "Jul (Christmas)",
    emoji: "🎄",
    description: "Traditional Norwegian Christmas dinner",
    months: [12],
    items: [
      { name: "Ribbe (svineribbe)", category: "meat", quantity: 2, unit: "kg" },
      { name: "Pinnekjøtt", category: "meat", quantity: 1, unit: "kg" },
      { name: "Medisterkaker", category: "meat", quantity: 500, unit: "g" },
      { name: "Surkål", category: "produce", quantity: 1, unit: "stk" },
      { name: "Rødkål", category: "produce", quantity: 1, unit: "stk" },
      { name: "Poteter", category: "produce", quantity: 2, unit: "kg" },
      { name: "Tyttebær", category: "condiments", quantity: 1, unit: "glass" },
      { name: "Julebrus", category: "beverages", quantity: 4, unit: "flasker" },
      { name: "Riskrem", category: "dairy", quantity: 1, unit: "l" },
      { name: "Pepperkaker", category: "snacks", quantity: 1, unit: "pk" },
      { name: "Smør", category: "dairy", quantity: 500, unit: "g" },
      { name: "Mandler", category: "snacks", quantity: 200, unit: "g" },
    ],
  },
  {
    id: "påske",
    name: "Påske (Easter)",
    emoji: "🐣",
    description: "Norwegian Easter cabin & chocolate traditions",
    months: [3, 4],
    items: [
      { name: "Påskeegg (sjokolade)", category: "snacks", quantity: 3, unit: "stk" },
      { name: "Kvikk Lunsj", category: "snacks", quantity: 5, unit: "stk" },
      { name: "Appelsiner", category: "produce", quantity: 2, unit: "kg" },
      { name: "Lam", category: "meat", quantity: 1, unit: "kg" },
      { name: "Poteter", category: "produce", quantity: 1, unit: "kg" },
      { name: "Gulrot", category: "produce", quantity: 500, unit: "g" },
      { name: "Fløte", category: "dairy", quantity: 3, unit: "dl" },
      { name: "Solo", category: "beverages", quantity: 2, unit: "flasker" },
      { name: "Brød", category: "grains", quantity: 2, unit: "stk" },
      { name: "Brunost", category: "dairy", quantity: 1, unit: "stk" },
    ],
  },
  {
    id: "17mai",
    name: "17. mai (Grunnlovsdagen)",
    emoji: "🇳🇴",
    description: "Norwegian Constitution Day celebration",
    months: [5],
    items: [
      { name: "Pølser", category: "meat", quantity: 10, unit: "stk" },
      { name: "Pølsebrød", category: "grains", quantity: 10, unit: "stk" },
      { name: "Ketchup", category: "condiments", quantity: 1, unit: "flaske" },
      { name: "Sennep", category: "condiments", quantity: 1, unit: "tube" },
      { name: "Is (iskrem)", category: "dairy", quantity: 2, unit: "l" },
      { name: "Jordbær", category: "produce", quantity: 500, unit: "g" },
      { name: "Brus", category: "beverages", quantity: 6, unit: "flasker" },
      { name: "Rømme", category: "dairy", quantity: 3, unit: "dl" },
      { name: "Vaffelrøre", category: "grains", quantity: 1, unit: "pk" },
      { name: "Bløtkake", category: "snacks", quantity: 1, unit: "stk" },
    ],
  },
  {
    id: "midsommer",
    name: "Sankthans (Midsummer)",
    emoji: "☀️",
    description: "Midsummer grilling and outdoor celebrations",
    months: [6],
    items: [
      { name: "Grillpølser", category: "meat", quantity: 8, unit: "stk" },
      { name: "Kyllingfilet", category: "poultry", quantity: 500, unit: "g" },
      { name: "Marinert laks", category: "seafood", quantity: 400, unit: "g" },
      { name: "Mais", category: "produce", quantity: 4, unit: "stk" },
      { name: "Salat", category: "produce", quantity: 1, unit: "stk" },
      { name: "Tomat", category: "produce", quantity: 4, unit: "stk" },
      { name: "Agurk", category: "produce", quantity: 1, unit: "stk" },
      { name: "Øl", category: "beverages", quantity: 6, unit: "flasker" },
      { name: "Jordbær", category: "produce", quantity: 500, unit: "g" },
      { name: "Fløte", category: "dairy", quantity: 3, unit: "dl" },
    ],
  },
];

// ── Seasonal Produce Calendar ──────────────────────────────────────────────

export interface SeasonalItem {
  name: string;
  emoji: string;
  category: FoodCategory;
  /** Months when in season (1-12) */
  months: number[];
  tip?: string;
}

export const NORWEGIAN_SEASONAL_PRODUCE: SeasonalItem[] = [
  { name: "Jordbær", emoji: "🍓", category: "produce", months: [6, 7], tip: "Norske jordbær er søtere og billigere i juni-juli" },
  { name: "Bringebær", emoji: "🫐", category: "produce", months: [7, 8], tip: "Plukk selv for best pris" },
  { name: "Blåbær", emoji: "🫐", category: "produce", months: [7, 8, 9], tip: "Norsk sesong gir beste smak" },
  { name: "Epler", emoji: "🍎", category: "produce", months: [8, 9, 10], tip: "Gravenstein i august, Aroma i september" },
  { name: "Plommer", emoji: "🟣", category: "produce", months: [8, 9] },
  { name: "Rips", emoji: "🔴", category: "produce", months: [7, 8] },
  { name: "Kirsebær", emoji: "🍒", category: "produce", months: [7, 8] },
  { name: "Asparges", emoji: "🌿", category: "produce", months: [5, 6] },
  { name: "Rabarbra", emoji: "🌱", category: "produce", months: [5, 6, 7] },
  { name: "Nypoteter", emoji: "🥔", category: "produce", months: [6, 7, 8] },
  { name: "Gulrot", emoji: "🥕", category: "produce", months: [7, 8, 9, 10] },
  { name: "Kålrot", emoji: "🟤", category: "produce", months: [9, 10, 11] },
  { name: "Brokkoli", emoji: "🥦", category: "produce", months: [7, 8, 9] },
  { name: "Blomkål", emoji: "🤍", category: "produce", months: [7, 8, 9] },
  { name: "Hodekål", emoji: "🥬", category: "produce", months: [8, 9, 10, 11] },
  { name: "Mais", emoji: "🌽", category: "produce", months: [8, 9] },
  { name: "Gresskar", emoji: "🎃", category: "produce", months: [9, 10] },
  { name: "Tomater", emoji: "🍅", category: "produce", months: [7, 8, 9] },
  { name: "Agurk", emoji: "🥒", category: "produce", months: [6, 7, 8, 9] },
];

/** Get items currently in season */
export function getInSeasonNow(month?: number): SeasonalItem[] {
  const m = month ?? new Date().getMonth() + 1;
  return NORWEGIAN_SEASONAL_PRODUCE.filter((item) => item.months.includes(m));
}

/** Get upcoming holiday lists (within the next 2 months) */
export function getUpcomingHolidays(currentMonth?: number): HolidayList[] {
  const m = currentMonth ?? new Date().getMonth() + 1;
  return NORWEGIAN_HOLIDAYS.filter((h) =>
    h.months.some((hm) => hm === m || hm === (m % 12) + 1),
  );
}
