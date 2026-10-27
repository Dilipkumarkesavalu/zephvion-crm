import type { Db } from "./types";
import { TAGS } from "./samples";

export const generateTags = (_: Db) => {
  return [...TAGS];
};
