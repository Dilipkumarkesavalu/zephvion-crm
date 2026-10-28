import type { Deal, DealStage } from "../types";

const CLOSED_STAGES = ["won", "lost"];

/** A deal with no change for this long needs a nudge. */
export const STALE_AFTER_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

// Chance of closing from each default stage; other stages are spread evenly
const STAGE_PROBABILITY: Record<string, number> = {
  lead: 0.1,
  discovery: 0.25,
  "proposal-sent": 0.5,
  "in-negociation": 0.75,
  won: 1,
  lost: 0,
};

export const getStageProbability = (
  stage: string,
  stages: DealStage[],
): number => {
  if (stage in STAGE_PROBABILITY) return STAGE_PROBABILITY[stage];
  const open = stages.filter(({ value }) => !CLOSED_STAGES.includes(value));
  const index = open.findIndex(({ value }) => value === stage);
  return index < 0 ? 0 : (index + 1) / (open.length + 1);
};

const isOpen = (deal: Deal) =>
  !deal.archived_at && !CLOSED_STAGES.includes(deal.stage);

export const getDealIdleDays = (deal: Deal, today: Date = new Date()) =>
  Math.floor(
    (today.getTime() - new Date(deal.updated_at || deal.created_at).getTime()) /
      DAY_MS,
  );

export const isStaleDeal = (deal: Deal, today: Date = new Date()) =>
  isOpen(deal) && getDealIdleDays(deal, today) >= STALE_AFTER_DAYS;

export interface ForecastMonth {
  /** First day of the month, YYYY-MM-01 */
  month: string;
  weighted: number;
  bestCase: number;
  count: number;
}

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

/**
 * Open deals by expected closing month, weighted by their stage's chance of
 * closing. Deals whose closing date has passed count in the current month.
 */
export const computeForecast = (
  deals: Deal[],
  stages: DealStage[],
  today: Date = new Date(),
  months = 3,
): ForecastMonth[] => {
  const buckets = Array.from({ length: months }, (_, offset) => {
    const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    return { month: monthKey(date), weighted: 0, bestCase: 0, count: 0 };
  });
  const currentMonth = buckets[0].month;

  for (const deal of deals.filter(isOpen)) {
    if (!deal.expected_closing_date) continue;
    const closing = new Date(deal.expected_closing_date);
    const key =
      monthKey(closing) < currentMonth ? currentMonth : monthKey(closing);
    const bucket = buckets.find((candidate) => candidate.month === key);
    if (!bucket) continue;
    const amount = Number(deal.amount) || 0;
    bucket.weighted += amount * getStageProbability(deal.stage, stages);
    bucket.bestCase += amount;
    bucket.count += 1;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    weighted: Math.round(bucket.weighted),
  }));
};
