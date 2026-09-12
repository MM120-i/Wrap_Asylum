import { tool } from "ai";
import { z } from "zod";
import { relative, resolve } from "path";
import { ProjectPathError, resolveExistingProjectPath } from "./path-security";

const MAX_MATCHES = 50;

export const createGrepTool = (cwd: string) => {
  return tool({
    description:
      "Search file contents using regex pattern. Returns matching lines with file paths and line numbers. Skips hidden directories, node_modules, and binary files",
    inputSchema: z.object({
      pattern: z.string().describe("Regex pattern to search for"),
      path: z
        .string()
        .describe("Relative directory to search in (defaults to project root)")
        .default("."),
      include: z
        .string()
        .describe("Glob pattern to filter files (e.g. '*.ts', '*.tsx'")
        .optional(),
    }),
    execute: async ({ pattern, path, include }) => {
      try {
        const { root, path: resolved } = await resolveExistingProjectPath(
          cwd,
          path,
        );

        let truncated = false;

        const args = [
          "-r",
          "-n",
          "--color=never",
          "--exclude-dir=node_modules",
          "--exclude-dir=.git",
          "-E",
        ];

        if (include) {
          args.push(`--include=${include}`);
        }

        args.push(pattern, ".");

        const proc = Bun.spawn(["grep", ...args], {
          stdout: "pipe",
          stderr: "pipe",
          stdin: "pipe",
          cwd: resolved,
        });

        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();

        await proc.exited;

        if (proc.exitCode !== 0 && proc.exitCode !== 1) {
          return {
            error: `grep failed: ${stderr.trim()}`,
          };
        }

        if (!stdout.trim()) {
          return {
            matches: [],
            message: "No matches found",
          };
        }

        const lines = stdout.trim().split("\n");

        const matches: {
          file: string;
          line: number;
          content: string;
        }[] = [];

        for (const line of lines) {
          if (matches.length >= MAX_MATCHES) {
            truncated = true;
            break;
          }

          const match = line.match(/^(.+?):(\d+):(.*)$/);

          if (match) {
            matches.push({
              file: relative(root, resolve(resolved, match[1]!)),
              line: parseInt(match[2]!, 10),
              content: match[3]!,
            });
          }
        }

        return {
          matches,
          ...(truncated ? { truncated: true, totalMatches: lines.length } : {}),
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
