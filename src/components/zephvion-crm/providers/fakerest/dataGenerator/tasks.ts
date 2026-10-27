import { datatype, random } from "faker/locale/en_US";

import type { Task } from "../../../types";
import type { Db } from "./types";
import { TASK_TEMPLATES } from "./samples";
import { randomDate, weightedBoolean } from "./utils";

const DAY = 24 * 60 * 60 * 1000;

export const generateTasks = (db: Db) => {
  return Array.from(Array(70).keys()).map<Task>((id) => {
    const contact = random.arrayElement(db.contacts);
    const template = random.arrayElement(TASK_TEMPLATES);
    const due_date = randomDate(
      new Date(Date.now() - 10 * DAY),
      new Date(Date.now() + 30 * DAY),
    );
    const isDone = due_date.getTime() < Date.now() && weightedBoolean(60);
    contact.nb_tasks = (contact.nb_tasks ?? 0) + 1;
    return {
      id,
      contact_id: contact.id,
      type: template.type,
      text: `${template.text} with ${contact.first_name}`,
      due_date: due_date.toISOString(),
      done_date: isDone ? due_date.toISOString() : undefined,
      sales_id: datatype.number(2) === 0 ? 0 : contact.sales_id,
      created_at: randomDate(new Date(contact.first_seen)).toISOString(),
    };
  });
};
