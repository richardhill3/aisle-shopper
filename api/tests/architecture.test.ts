import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(apiRoot, "src");

const cleanLayerDirectories = [
  "domain",
  "application",
  "infrastructure",
  "presentation",
  "main",
];

const forbiddenOuterImports = [
  "express",
  "pg",
  "@supabase/supabase-js",
  "@shared",
  "../config",
  "../db",
  "../auth",
  "../routes",
  "../listsRepository",
  "../profilesRepository",
  "../presentation",
  "../infrastructure",
  "../main",
];

function tsFilesUnder(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return tsFilesUnder(entryPath);
    }

    return entryPath.endsWith(".ts") ? [entryPath] : [];
  });
}

function importedModules(source: string): string[] {
  const imports = source.matchAll(
    /import\s+(?:type\s+)?(?:[^'"]+\s+from\s+)?["']([^"']+)["']/g,
  );
  const exports = source.matchAll(/export\s+[^'"]+\s+from\s+["']([^"']+)["']/g);

  return [...imports, ...exports].map((match) => match[1]);
}

describe("clean architecture boundaries", () => {
  it("has the initial clean layer directories", () => {
    for (const directory of cleanLayerDirectories) {
      expect(
        existsSync(join(srcRoot, directory)),
        `${directory} layer directory should exist`,
      ).toBe(true);
    }
  });

  it("keeps domain and application imports independent of outer layers", () => {
    const files = [
      ...tsFilesUnder(join(srcRoot, "domain")),
      ...tsFilesUnder(join(srcRoot, "application")),
    ];

    const violations = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return importedModules(source)
        .filter((moduleName) =>
          forbiddenOuterImports.some((forbidden) =>
            moduleName === forbidden || moduleName.startsWith(`${forbidden}/`),
          ),
        )
        .map((moduleName) => ({
          file: relative(apiRoot, file).split(sep).join("/"),
          moduleName,
        }));
    });

    expect(violations).toEqual([]);
  });

  it("keeps migrated list-sharing routes off the legacy list repository", () => {
    const routesSource = readFileSync(join(srcRoot, "routes.ts"), "utf8");
    const legacyRepositoryImport =
      routesSource.match(/import\s+\{(?<imports>[\s\S]*?)\}\s+from\s+["']\.\/listsRepository["']/)
        ?.groups?.imports ?? "";
    const forbiddenLegacySharingImports = [
      "addListMember",
      "listMembers",
      "removeListMember",
    ];
    const violations = forbiddenLegacySharingImports.filter((exportName) =>
      legacyRepositoryImport
        .split(",")
        .map((importName) => importName.trim())
        .includes(exportName),
    );

    expect(violations).toEqual([]);
  });

  it("keeps migrated list-read routes off the legacy list repository", () => {
    const routesSource = readFileSync(join(srcRoot, "routes.ts"), "utf8");
    const legacyRepositoryImport =
      routesSource.match(/import\s+\{(?<imports>[\s\S]*?)\}\s+from\s+["']\.\/listsRepository["']/)
        ?.groups?.imports ?? "";
    const forbiddenLegacyReadImports = ["getList", "listSummaries"];
    const violations = forbiddenLegacyReadImports.filter((exportName) =>
      legacyRepositoryImport
        .split(",")
        .map((importName) => importName.trim())
        .includes(exportName),
    );

    expect(violations).toEqual([]);
  });

  it("keeps migrated top-level list write routes off the legacy list repository", () => {
    const routesSource = readFileSync(join(srcRoot, "routes.ts"), "utf8");
    const legacyRepositoryImport =
      routesSource.match(/import\s+\{(?<imports>[\s\S]*?)\}\s+from\s+["']\.\/listsRepository["']/)
        ?.groups?.imports ?? "";
    const forbiddenLegacyWriteImports = ["createList", "updateList", "deleteList"];
    const violations = forbiddenLegacyWriteImports.filter((exportName) =>
      legacyRepositoryImport
        .split(",")
        .map((importName) => importName.trim())
        .includes(exportName),
    );

    expect(violations).toEqual([]);
  });

  it("keeps legacy list repository free of migrated sharing exports", () => {
    const repositorySource = readFileSync(join(srcRoot, "listsRepository.ts"), "utf8");
    const forbiddenLegacySharingExports = [
      "export async function addListMember",
      "export async function listMembers",
      "export async function removeListMember",
    ];
    const violations = forbiddenLegacySharingExports.filter((exportSignature) =>
      repositorySource.includes(exportSignature),
    );

    expect(violations).toEqual([]);
  });

  it("keeps migrated profile routes off the legacy profile repository", () => {
    const routesSource = readFileSync(join(srcRoot, "routes.ts"), "utf8");

    expect(routesSource).not.toContain("./profilesRepository");
  });

  it("keeps auth middleware free of profile persistence SQL", () => {
    const authSource = readFileSync(join(srcRoot, "auth.ts"), "utf8");
    const forbiddenProfilePersistenceImports = [
      "./db",
      "node:crypto",
      "@supabase/supabase-js",
    ];
    const violations = importedModules(authSource).filter((moduleName) =>
      forbiddenProfilePersistenceImports.includes(moduleName),
    );

    expect(violations).toEqual([]);
    expect(authSource).not.toContain("INSERT INTO profiles");
  });
});
