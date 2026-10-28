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

// Role and department (ids from DEPARTMENT_SEED) per demo team member
const organisation: Record<string, Pick<Sale, "role" | "department_id">> = {
  Dilip: { role: "owner", department_id: 1 },
  Bhavani: { role: "head", department_id: 2 },
  Manjunath: { role: "manager", department_id: 3 },
  Naren: { role: "member", department_id: 5 },
  Akhilesh: { role: "member", department_id: 4 },
  Bhuvan: { role: "finance", department_id: 7 },
};

export const generateSales = (_: Db): Sale[] =>
  team.map((member, id) => ({
    id,
    user_id: `${id}`,
    ...member,
    ...organisation[member.first_name],
    secondary_emails: [],
    password: "demo",
    disabled: false,
  }));
