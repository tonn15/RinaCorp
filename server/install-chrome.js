const { rmSync, existsSync } = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const chromeDir = path.join(
  process.env.HOME || process.env.USERPROFILE || "/opt/render",
  ".cache",
  "puppeteer",
  "chrome"
);

if (existsSync(chromeDir)) {
  console.log("  -> Cleaning corrupted Chrome cache...");
  rmSync(chromeDir, { recursive: true, force: true });
}

console.log("  -> Installing Chrome...");
execSync("npx puppeteer browsers install chrome", { stdio: "inherit" });
