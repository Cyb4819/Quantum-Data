import fs from "node:fs";
import path from "node:path";

let fileValues: Record<string, string> | undefined;

function readBackendEnvFile(): Record<string, string> {
  if (fileValues) {
    return fileValues;
  }

  const envPath = path.resolve(process.cwd(), "../backend/.env");
  if (!fs.existsSync(envPath)) {
    fileValues = {};
    return fileValues;
  }

  const envFile = fs.readFileSync(envPath, "utf8");
  fileValues = Object.fromEntries(
    envFile
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return ["", ""];

        const key = line.slice(0, separator).trim();
        const value = line
          .slice(separator + 1)
          .trim()
          .replace(/^(['"])(.*)\1$/, "$2");
        return [key, value];
      })
      .filter(([key]) => key)
  );
  return fileValues;
}

export function getBackendEnv(name: string): string | undefined {
  return process.env[name] || readBackendEnvFile()[name];
}
