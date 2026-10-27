import { datatype, random } from "faker/locale/en_US";

import { defaultNoteStatuses } from "../../../root/defaultConfiguration";
import type { Contact } from "../../../types";
import type { Db } from "./types";
import {
  CONTACT_BACKGROUNDS,
  FEMALE_FIRST_NAMES,
  JOB_TITLES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
} from "./samples";
import { randomDate, weightedBoolean } from "./utils";

const contactsPerCompany = { 1: 1, 10: 2, 50: 3, 250: 4, 500: 4 };

const mobileNumber = () =>
  `+91 ${datatype.number({ min: 70000, max: 99999 })} ${datatype.number({ min: 10000, max: 99999 })}`;

export const generateContacts = (db: Db): Required<Contact>[] => {
  const contacts: Required<Contact>[] = [];
  db.companies.forEach((company) => {
    const count = contactsPerCompany[company.size];
    const titles = random.arrayElements(JOB_TITLES, count);
    titles.forEach((title) => {
      const gender = weightedBoolean(50) ? "male" : "female";
      const first_name = random.arrayElement(
        gender === "male" ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES,
      );
      const last_name = random.arrayElement(LAST_NAMES);
      const domain = company.website.replace(/^https?:\/\/(www\.)?/, "");
      const first_seen = randomDate(new Date(company.created_at)).toISOString();
      company.nb_contacts = (company.nb_contacts ?? 0) + 1;
      contacts.push({
        id: contacts.length,
        first_name,
        last_name,
        gender,
        title,
        company_id: company.id,
        company_name: company.name,
        email_jsonb: [
          {
            email: `${first_name}.${last_name}@${domain}`.toLowerCase(),
            type: "Work",
          },
        ],
        phone_jsonb: [{ number: mobileNumber(), type: "Work" }],
        background: random.arrayElement(CONTACT_BACKGROUNDS),
        avatar: {},
        first_seen,
        last_seen: first_seen,
        has_newsletter: weightedBoolean(30),
        status: random.arrayElement(defaultNoteStatuses).value,
        tags: random
          .arrayElements(db.tags, random.arrayElement([0, 0, 1, 1, 2]))
          .map((tag) => tag.id),
        sales_id: company.sales_id!,
        nb_tasks: 0,
        linkedin_url: null,
      });
    });
  });
  return contacts;
};
