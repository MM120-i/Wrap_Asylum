import { basename, dirname, isAbsolute, relative, resolve, sep } from "path";
import { realpath } from "fs/promises";

export class ProjectPathError extends Error {}

const isWithinProject = (root: string, target: string) => {
  const rel = relative(root, target);

  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  );
};

const assertWithinProject = (root: string, target: string) => {
  if (!isWithinProject(root, target)) {
    throw new ProjectPathError("Path is outside the project directory");
  }
};

export const resolveExistingProjectPath = async (
  cwd: string,
  requestedPath: string,
) => {
  const root = await realpath(cwd);
  const candidate = resolve(root, requestedPath);
  const target = await realpath(candidate);

  assertWithinProject(root, target);

  return { root, path: target };
};

export const resolveWritableProjectPath = async (
  cwd: string,
  requestedPath: string,
) => {
  const root = await realpath(cwd);
  const candidate = resolve(root, requestedPath);
  const missingSegments: string[] = [];
  let current = candidate;

  while (true) {
    try {
      const existingPath = await realpath(current);
      assertWithinProject(root, existingPath);

      const target = missingSegments.reduce(
        (parent, segment) => resolve(parent, segment),
        existingPath,
      );

      assertWithinProject(root, target);

      return { root, path: target };
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !["ENOENT", "ENOTDIR"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        )
      ) {
        throw error;
      }

      const parent = dirname(current);

      if (parent === current) {
        throw error;
      }

      missingSegments.unshift(basename(current));
      current = parent;
    }
  }
};
