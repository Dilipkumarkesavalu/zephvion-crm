/** Dot colour per department colour name (Tailwind classes). */
export const DEPARTMENT_COLORS: Record<string, string> = {
  slate: "bg-slate-500",
  blue: "bg-blue-500",
  teal: "bg-teal-500",
  pink: "bg-pink-500",
  violet: "bg-violet-500",
  orange: "bg-orange-500",
  green: "bg-green-500",
  amber: "bg-amber-500",
  gray: "bg-gray-400",
  red: "bg-red-500",
};

export const departmentColorChoices = Object.keys(DEPARTMENT_COLORS).map(
  (color) => ({ id: color, name: color[0].toUpperCase() + color.slice(1) }),
);

export const departmentDotClass = (color?: string) =>
  DEPARTMENT_COLORS[color ?? ""] ?? DEPARTMENT_COLORS.gray;
