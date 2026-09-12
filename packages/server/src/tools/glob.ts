import { tool } from "ai";
import { z } from "zod";
import { relative, resolve } from "path";
import { ProjectPathError, resolveExistingProjectPath } from "./path-security";

const MAX_RESULTS = 200;

export const createGlobTool = (cwd: string) => {
  return tool({
    description:
      "Find files matching a glob pattern. Returns file path relative to the project root. Skips node_modules and hidden directories",
    inputSchema: z.object({
      pattern: z
        .string()
        .describe("Glob pattern to match (e.g '**/*.ts', 'src/**/*.tsx'"),
      path: z
        .string()
        .describe("Relative directory to search in (defaults to project root)")
        .default("."),
    }),
    execute: async ({ pattern, path }) => {
      try {
        const { root, path: resolved } = await resolveExistingProjectPath(
          cwd,
          path,
        );

        const glob = new Bun.Glob(pattern);
        const files: string[] = [];
        let truncated = false;

        for await (const match of glob.scan({
          cwd: resolved,
          dot: false,
          onlyFiles: true,
        })) {
          if (match.includes("node_modules")) {
            continue;
          }

          if (files.length >= MAX_RESULTS) {
            truncated = true;
            break;
          }

          const absoluteMatch = resolve(resolved, match);
          files.push(relative(root, absoluteMatch));
        }

        files.sort();

        return {
          files,
          ...(truncated ? { truncated: true } : {}),
        };
      } catch (error) {
        if (error instanceof ProjectPathError) {
          return { error: error.message };
        }

        const message = error instanceof Error ? error.message : String(error);
        return { error: `Failed to execute command: ${message}` };
      }
    },
  });
};
