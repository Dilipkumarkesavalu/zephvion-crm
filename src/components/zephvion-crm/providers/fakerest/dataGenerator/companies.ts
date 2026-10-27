import { datatype, random } from "faker/locale/en_US";

import { randomDate } from "./utils";
import { CITIES, COMPANIES } from "./samples";
import type { Company, RAFile } from "../../../types";
import type { Db } from "./types";

const randomDigits = (length: number) =>
  Array.from({ length }, () => datatype.number(9)).join("");

const randomLetters = (length: number) =>
  Array.from({ length }, () =>
    String.fromCharCode(65 + datatype.number(25)),
  ).join("");

/** Format-valid but fictional GSTIN: state code + PAN + entity + Z + check. */
const fakeGstin = (stateCode: string) =>
  `${stateCode}${randomLetters(5)}${randomDigits(4)}${randomLetters(1)}1Z${randomDigits(1)}`;

export const generateCompanies = (db: Db): Required<Company>[] =>
  COMPANIES.map((sample, id) => {
    const location = random.arrayElement(CITIES);
    return {
      id,
      name: sample.name,
      logo: { title: sample.name, src: "" } as RAFile,
      sector: sample.sector,
      size: sample.size,
      linkedin_url: `https://www.linkedin.com/company/${sample.domain.split(".")[0]}`,
      website: `https://www.${sample.domain}`,
      phone_number: `+91 ${datatype.number({ min: 70000, max: 99999 })} ${randomDigits(5)}`,
      address: sample.street,
      zipcode: location.zipcode,
      city: location.city,
      state_abbr: location.state,
      nb_contacts: 0,
      nb_deals: 0,
      // at least 1/3rd of companies for the admin
      sales_id: datatype.number(2) === 0 ? 0 : random.arrayElement(db.sales).id,
      created_at: randomDate().toISOString(),
      description: sample.description,
      revenue: sample.revenue,
      tax_identifier: fakeGstin(location.stateCode),
      country: "India",
      context_links: [],
    };
  });
