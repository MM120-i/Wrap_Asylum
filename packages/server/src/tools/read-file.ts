import { z } from "zod";
import { resolve, relative } from "path";
import { readFile } from "fs/promises";

const MAX_FILE_SIZE = 10_000;

export const createReadFileTool = (cwd: string) => {
  return {
    description:
      "Read the contents of a file in the project. Returns the file text, truncated if very large",
    inputSchema: z.object({
      path: z.string().describe("Relative path to the file to write"),
    }),
    execute: async ({ path }: { path: string }) => {
      const resolved = resolve(cwd, path);
      const rel = relative(cwd, resolved);

      if (
        rel.startsWith("..") ||
        (resolve(resolved) !== resolved && rel.startsWith(".."))
      ) {
        return { error: "Path is outside the project directory" };
      }

      if (!resolved.startsWith(cwd)) {
        return { error: "Path is outside the project directory" };
      }

      try {
        const content = await readFile(resolved, "utf-8");

        if (content.length > MAX_FILE_SIZE) {
          return {
            content: content.slice(0, MAX_FILE_SIZE),
            truncated: true,
            totalLength: content.length,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { error: `Failed to write file: ${message}` };
      }
    },
  };
};
