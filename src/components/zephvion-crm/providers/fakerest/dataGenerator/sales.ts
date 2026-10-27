import type { Sale } from "../../../types";
import type { Db } from "./types";

const team = [
  {
    first_name: "Dilip",
    last_name: "Kumar",
    email: "admin@zephvion.com",
    administrator: true,
  },
  {
    first_name: "Priya",
    last_name: "Raman",
    email: "priya@zephvion.com",
    administrator: false,
  },
  {
    first_name: "Arjun",
    last_name: "Mehta",
    email: "arjun@zephvion.com",
    administrator: false,
  },
  {
    first_name: "Sneha",
    last_name: "Kulkarni",
    email: "sneha@zephvion.com",
    administrator: false,
  },
  {
    first_name: "Rahul",
    last_name: "Nair",
    email: "rahul@zephvion.com",
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
