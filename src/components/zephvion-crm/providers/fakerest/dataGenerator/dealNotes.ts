import { random } from "faker/locale/en_US";

import type { DealNote } from "../../../types";
import type { Db } from "./types";
import { DEAL_NOTES } from "./samples";
import { randomDate } from "./utils";

/** One to three notes per deal, written for the stage the deal is in. */
export const generateDealNotes = (db: Db): DealNote[] => {
  const notes: DealNote[] = [];
  db.deals.forEach((deal) => {
    const candidates = DEAL_NOTES[deal.stage] ?? DEAL_NOTES.discovery;
    random
      .arrayElements(
        candidates,
        Math.min(candidates.length, random.arrayElement([1, 2, 3])),
      )
      .forEach((text) => {
        notes.push({
          id: notes.length,
          deal_id: deal.id,
          text,
          date: randomDate(new Date(deal.created_at)).toISOString(),
          sales_id: deal.sales_id,
        });
      });
  });
  return notes;
};
