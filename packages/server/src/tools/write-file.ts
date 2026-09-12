import { z } from "zod";
import { relative, dirname } from "path";
import { writeFile, mkdir } from "fs/promises";
import {
  ProjectPathError,
  resolveWritableProjectPath,
} from "./path-security";

export const createWriteFileTool = (cwd: string) => {
  return {
    description:
      "Create or overwrite a file in the project. Creates parent directories if they do not exist",
    inputSchema: z.object({
      path: z.string().describe("Relative path to the file to write"),
      content: z.string().describe("The full content to write to the file"),
    }),
    execute: async ({ path, content }: { path: string; content: string }) => {
      try {
        const { root, path: resolved } = await resolveWritableProjectPath(
          cwd,
          path,
        );
        await mkdir(dirname(resolved), { recursive: true });
        await writeFile(resolved, content, "utf-8");

        return {
          success: true as const,
          path: relative(root, resolved),
          bytesWritten: Buffer.byteLength(content, "utf-8"),
        };
      } catch (error) {
        if (error instanceof ProjectPathError) {
          return { error: error.message };
        }

        const message = error instanceof Error ? error.message : String(error);
        return { error: `Failed to write file: ${message}` };
      }
    },
  };
};
