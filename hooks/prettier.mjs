import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

async function readInput() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

const PRETTIER_EXTENSIONS = /\.(js|jsx|ts|tsx|json|css|scss|html|md|mdx|yaml|yml)$/;
const BLACK_EXTENSIONS = /\.py$/;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const input = await readInput();
  const file = input.tool_response?.filePath || input.tool_input?.file_path;

  if (!file) process.exit(0);

  if (PRETTIER_EXTENSIONS.test(file)) {
    try {
      execSync(`npx prettier --write "${file}"`, { cwd: ROOT, stdio: "pipe" });
    } catch (e) {
      console.error(`prettier failed for ${file}: ${e.message}`);
    }
  } else if (BLACK_EXTENSIONS.test(file)) {
    try {
      execSync(`black "${file}"`, { cwd: ROOT, stdio: "pipe" });
    } catch (e) {
      console.error(`black failed for ${file}: ${e.message}`);
    }
  }

  process.exit(0);
}

main();
