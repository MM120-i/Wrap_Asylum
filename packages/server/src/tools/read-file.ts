import { z } from "zod";
import { readFile } from "fs/promises";
import {
  ProjectPathError,
  resolveExistingProjectPath,
} from "./path-security";

const MAX_FILE_SIZE = 10_000;

export const createReadFileTool = (cwd: string) => {
  return {
    description:
      "Read the contents of a file in the project. Returns the file text, truncated if very large",
    inputSchema: z.object({
      path: z.string().describe("Relative path to the file to write"),
    }),
    execute: async ({ path }: { path: string }) => {
      try {
        const { path: resolved } = await resolveExistingProjectPath(cwd, path);
        const content = await readFile(resolved, "utf-8");

        if (content.length > MAX_FILE_SIZE) {
          return {
            content: content.slice(0, MAX_FILE_SIZE),
            truncated: true,
            totalLength: content.length,
          };
        }

        return {
          content,
          truncated: false,
          totalLength: content.length,
        };
      } catch (error) {
        if (error instanceof ProjectPathError) {
          return { error: error.message };
        }

        const message = error instanceof Error ? error.message : String(error);
        return { error: `Failed to read file: ${message}` };
      }
    },
  };
};
