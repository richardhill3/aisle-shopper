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
});
