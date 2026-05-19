import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pdfPath = path.join(rootDir, "docs/showcase/renovation_planning_prototype_5page.pdf");
const viteBinPath = path.join(rootDir, "node_modules/vite/bin/vite.js");
const showcaseSourcePaths = [
  path.join(rootDir, "src/features/showcase/showcaseData.ts"),
  path.join(rootDir, "src/features/showcase/ShowcaseRoute.tsx"),
];
const port = Number(process.env.SHOWCASE_PORT ?? 4177);
const showcaseUrl = `http://127.0.0.1:${port}/showcase`;

const forbiddenPatterns = [
  /Sch[oö]nseer/i,
  /Oberviechtach/i,
  /\bDEBY\b/i,
  /\bEPSG\b/i,
  /\bUTM\b/i,
  /\bparcel\b/i,
  /\bFlurkarte\b/i,
  /\bcadastral\b/i,
  /\blatitude\b/i,
  /\blongitude\b/i,
  /\/home\/johannes\//i,
];

function assertSafeSource() {
  const source = showcaseSourcePaths.map((sourcePath) => {
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing showcase source: ${sourcePath}`);
    }
    return readFileSync(sourcePath, "utf8");
  }).join("\n");

  const matches = forbiddenPatterns
    .filter((pattern) => pattern.test(source))
    .map((pattern) => pattern.toString());

  if (matches.length > 0) {
    throw new Error(`Showcase route source contains forbidden private-location patterns: ${matches.join(", ")}`);
  }
}

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_BIN,
    "chromium",
    "chromium-browser",
    "google-chrome",
    "google-chrome-stable",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return execFileSync("which", [candidate], { encoding: "utf8" }).trim();
    } catch {
      // Try the next common binary name.
    }
  }

  throw new Error("No Chromium/Chrome executable found. Set CHROMIUM_BIN to regenerate the showcase PDF.");
}

function countPdfPages(pdfBuffer) {
  const pdfText = pdfBuffer.toString("latin1");
  return (pdfText.match(/\/Type\s*\/Page\b/g) ?? []).length;
}

function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      }).on("error", retry);
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for Vite showcase route at ${url}`));
        return;
      }
      setTimeout(attempt, 250);
    };

    attempt();
  });
}

assertSafeSource();

execFileSync("npm", ["run", "build"], { cwd: rootDir, stdio: "pipe" });

const vite = spawn(
  process.execPath,
  [viteBinPath, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: rootDir, stdio: "pipe" },
);

try {
  await waitForServer(showcaseUrl);

  const chromium = findChromium();
  execFileSync(
    chromium,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=1000",
      "--window-size=1440,900",
      `--print-to-pdf=${pdfPath}`,
      showcaseUrl,
    ],
    { stdio: "pipe", timeout: 60000 },
  );

  const pdfBuffer = readFileSync(pdfPath);
  const pdfPages = countPdfPages(pdfBuffer);
  if (pdfPages !== 5) {
    throw new Error(`Expected exactly 5 PDF pages, found ${pdfPages}.`);
  }

  const sizeKb = Math.round(statSync(pdfPath).size / 1024);
  console.log(`Generated ${path.relative(rootDir, pdfPath)} from ${showcaseUrl} (${pdfPages} pages, ${sizeKb} KB).`);
} finally {
  vite.kill("SIGTERM");
}
