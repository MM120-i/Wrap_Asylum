import { z } from "zod";
import { relative, join } from "path";
import { readdir, stat } from "fs/promises";
import { tool } from "ai";
import {
  ProjectPathError,
  resolveExistingProjectPath,
} from "./path-security";

export const createListDirectoryTool = (cwd: string) => {
  return tool({
    description:
      "List files and directories in a project directory. Returns names with type indicators.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Relative path to the directory to list (defaults to project root)",
        )
        .default("."),
    }),
    execute: async ({ path }: { path: string }) => {
      try {
        const { root, path: resolved } = await resolveExistingProjectPath(
          cwd,
          path,
        );
        const entries = await readdir(resolved);

        const results: {
          name: string;
          type: "file" | "directory";
        }[] = [];

        for (const entry of entries) {
          if (entry.startsWith(".") || entry === "node_modules") {
            continue;
          }

          try {
            const entryPath = join(resolved, entry);
            const info = await stat(entryPath);

            results.push({
              name: entry,
              type: info.isDirectory() ? "directory" : "file",
            });
          } catch {}

        }

        results.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }

          return a.name.localeCompare(b.name);
        });

        return {
          path: relative(root, resolved) || ".",
          entries: results,
        };
      } catch (error) {
        if (error instanceof ProjectPathError) {
          return { error: error.message };
        }

        const message = error instanceof Error ? error.message : String(error);
        return { error: `Failed to list directory: ${message}` };
      }
    },
  });
};
