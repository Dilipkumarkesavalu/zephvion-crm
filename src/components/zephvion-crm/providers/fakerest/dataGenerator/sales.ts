import type { Sale } from "../../../types";
import type { Db } from "./types";

const team = [
  {
    first_name: "Dilip",
    last_name: "Kumar",
    email: "dilip@zephvion.com",
    administrator: true,
  },
  {
    first_name: "Bhavani",
    last_name: "",
    email: "bhavani@zephvion.com",
    administrator: false,
  },
  {
    first_name: "Manjunath",
    last_name: "",
    email: "manjunath@zephvion.com",
    administrator: false,
  },
  {
    first_name: "Naren",
    last_name: "",
    email: "naren@zephvion.com",
    administrator: false,
  },
  {
    first_name: "Akhilesh",
    last_name: "",
    email: "akhilesh@zephvion.com",
    administrator: false,
  },
  {
    first_name: "Bhuvan",
    last_name: "",
    email: "bhuvan@zephvion.com",
    administrator: false,
  },
];

export const generateSales = (_: Db): Sale[] =>
  team.map((member, id) => ({
    id,
    user_id: `${id}`,
    ...member,
    secondary_emails: [],
    password: "demo",
    disabled: false,
  }));
