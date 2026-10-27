#!/usr/bin/env node

import { globSync } from "glob";
import fs from "node:fs";
import path from "node:path";

const registryPath = "registry.json";

// Registry paths always use "/" (glob returns "\\" separators on Windows)
const toPosixPath = (filePath) => filePath.split(path.sep).join("/");
const findFiles = (...args) => globSync(...args).map(toPosixPath);
const basePath = "src";
const crmComponentsPath = path.posix.join(
  basePath,
  "components",
  "zephvion-crm",
);
const supabaseComponentsPath = path.posix.join(
  basePath,
  "components",
  "supabase",
);
const hooksPath = path.posix.join(basePath, "hooks");
const libPath = path.posix.join(basePath, "lib");

const excludedHooks = [
  "filter-context.tsx",
  "saved-queries.tsx",
  "use-mobile.ts",
  "useSupportCreateSuggestion.tsx",
];

const excludedLibFiles = [
  "field.type.ts",
  "genericMemo.ts",
  "i18nProvider.ts",
  "sanitizeInputRestProps.ts",
  "utils.ts",
];

const testFilePattern = "**/*.{test,spec}.*";
const storyFilePattern = "**/*.stories.*";

const crmComponents = findFiles(
  path.posix.join(crmComponentsPath, "**", "*.ts*"),
  { ignore: [testFilePattern, storyFilePattern] },
);
const supabaseComponents = findFiles(
  path.posix.join(supabaseComponentsPath, "**", "*.ts*"),
  { ignore: [testFilePattern, storyFilePattern] },
);
const hooks = findFiles(path.posix.join(hooksPath, "**", "*.ts*")).filter(
  (hook) => {
    return !excludedHooks.includes(path.basename(hook));
  },
);
const libFiles = findFiles(path.posix.join(libPath, "**", "*.ts*")).filter(
  (file) => {
    return !excludedLibFiles.includes(path.basename(file));
  },
);

const registryContent = JSON.parse(fs.readFileSync(registryPath, "utf-8"));

const files = [
  ...crmComponents.map((path) => {
    return {
      path,
      type: "registry:component",
    };
  }),
  ...supabaseComponents.map((path) => {
    return {
      path,
      type: "registry:component",
    };
  }),
  ...hooks.map((path) => {
    return {
      path,
      type: "registry:hook",
    };
  }),
  ...libFiles.map((path) => {
    return {
      path,
      type: "registry:lib",
    };
  }),
];

const newRegistryContent = {
  ...registryContent,
  items: registryContent.items.map((item) => {
    if (item.name === "zephvion-crm") {
      return {
        ...item,
        files,
      };
    }

    return item;
  }),
};

fs.writeFileSync(
  registryPath,
  JSON.stringify(newRegistryContent, null, 2),
  "utf-8",
);
