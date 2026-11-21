#!/usr/bin/env node
/**
 * Renders all project diagrams (infrastructure/diagrams, docs/diagrams, and
 * HOVEDOPGAVE_DIAGRAMMER.md) into cropped, vector-normalized 1-page PDF files
 * ready for standard Overleaf (pdflatex) compilation.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "..");
export const INFRA_DIAGRAMS_DIR = path.join(ROOT_DIR, "infrastructure", "diagrams");
export const DOCS_DIAGRAMS_DIR = path.join(ROOT_DIR, "docs", "diagrams");
export const CATALOG_MD_PATH = path.join(ROOT_DIR, "HOVEDOPGAVE_DIAGRAMMER.md");
const OUT_DIR = path.join(ROOT_DIR, "overleaf-export", "diagrams");
const MANIFEST_PATH = path.join(ROOT_DIR, "overleaf-export", "diagrams-manifest.json");
export const MERMAID_MIN_JS = path.join(ROOT_DIR, "node_modules", "mermaid", "dist", "mermaid.min.js");

const MAX_PDF_DIM_PX = 1600;
const PAD_PX = 16;
const LANDSCAPE_ASPECT_THRESHOLD = 1.35;
const REFRESH_PUML = process.argv.includes("--refresh-puml");

export const DEFAULT_THEME_INIT =
  "%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#EFF6FF', 'primaryTextColor': '#0F172A', 'primaryBorderColor': '#2563EB', 'lineColor': '#334155', 'secondaryColor': '#F8FAFC', 'tertiaryColor': '#FEFCE8', 'fontFamily': 'Segoe UI, Arial, sans-serif', 'fontSize': '14px'}}}%%";

export const KATALOG_SLUGS = [
  "katalog-01-gantt-projektforloeb",
  "katalog-02-commit-tidslinje",
  "katalog-03-gitgraph-github-branches",
  "katalog-04-gitgraph-jgit-patient-journal",
  "katalog-05-cicd-pipeline-bdd-tdd",
  "katalog-06-er-diagram-polyglot",
  "katalog-07-state-samtykke-handshake",
  "katalog-08-state-aftale-finans",
  "katalog-09-class-fullstack-symmetry",
  "katalog-10-activity-core",
  "katalog-11-sequence-core",
  "katalog-12-activity-appointment",
  "katalog-13-sequence-appointment",
  "katalog-14-activity-clinic-platform",
  "katalog-15-sequence-clinic-platform",
  "katalog-16-activity-i18n",
  "katalog-17-sequence-i18n",
  "katalog-18-activity-journal",
  "katalog-19-sequence-journal",
  "katalog-20-activity-psychotraumatology",
  "katalog-21-sequence-psychotraumatology",
  "katalog-22-activity-user",
  "katalog-23-sequence-user",
  "katalog-24-architecture-dual-app-rbac",
  "katalog-25-sequence-landing-to-roleguard",
];

export function sanitizeFlowchartPlaceholders(code) {
  const withoutInit = code.replace(/^\s*%%\{[\s\S]*?\}%%\s*/u, "").trimStart();
  if (!/^(?:flowchart|graph)\b/i.test(withoutInit)) {
    return code;
  }
  const htmlTags = /^(?:\/?(?:b|i|u|br|hr|code|small|strong|em|sub|sup|p|div|span))(?:\s|$|\/)/i;
  return code.replace(/<([A-Za-z_][^\n<>`"]*?)>/g, (full, inner) => {
    if (htmlTags.test(inner)) {
      return full;
    }
    return `&lt;${inner}&gt;`;
  });
}

export function injectDefaultThemeIfMissing(source) {
  const trimmed = source.replace(/^\uFEFF/, "").trimStart();
  const themed =
    trimmed.startsWith("%%{init:") || trimmed.startsWith("%%{ init:")
      ? trimmed
      : `${DEFAULT_THEME_INIT}\n${trimmed}`;
  return sanitizeFlowchartPlaceholders(themed);
}

export function parseKatalogMermaidJobs() {
  const md = fs.readFileSync(CATALOG_MD_PATH, "utf8");
  const blockRegex = /```mermaid\s*\r?\n([\s\S]*?)```/g;
  const jobs = [];
  let match;
  let idx = 0;

  while ((match = blockRegex.exec(md)) !== null) {
    const before = md.slice(0, match.index);
    const headings = [...before.matchAll(/^#{1,4}\s+(.+)$/gm)];
    const heading = headings.length > 0 ? headings[headings.length - 1][1].trim() : `Katalog Diagram ${idx + 1}`;
    const slug = KATALOG_SLUGS[idx];
    if (!slug) {
      throw new Error(`Unexpected extra Mermaid block #${idx + 1} in HOVEDOPGAVE_DIAGRAMMER.md`);
    }
    jobs.push({
      slug,
      kind: "mermaid",
      group: "HOVEDOPGAVE_DIAGRAMMER.md",
      source: "HOVEDOPGAVE_DIAGRAMMER.md",
      title: heading,
      code: injectDefaultThemeIfMissing(match[1]),
    });
    idx += 1;
  }

  if (jobs.length !== KATALOG_SLUGS.length) {
    throw new Error(`Expected ${KATALOG_SLUGS.length} Mermaid blocks in HOVEDOPGAVE_DIAGRAMMER.md, found ${jobs.length}`);
  }
  return jobs;
}

function collectJobs() {
  const jobs = [];

  // Group A: infrastructure/diagrams/*.mmd + unique *.puml without matching .mmd
  const infraFiles = fs.readdirSync(INFRA_DIAGRAMS_DIR).sort();
  const mmdBases = new Set(
    infraFiles.filter((f) => f.endsWith(".mmd")).map((f) => path.basename(f, ".mmd"))
  );

  for (const file of infraFiles) {
    if (file.endsWith(".mmd")) {
      const slug = path.basename(file, ".mmd");
      const fullPath = path.join(INFRA_DIAGRAMS_DIR, file);
      jobs.push({
        slug,
        kind: "mermaid",
        group: "infrastructure/diagrams",
        source: `infrastructure/diagrams/${file}`,
        title: slug,
        code: injectDefaultThemeIfMissing(fs.readFileSync(fullPath, "utf8")),
      });
    }
  }

  for (const file of infraFiles) {
    if (file.endsWith(".puml")) {
      const slug = path.basename(file, ".puml");
      if (!mmdBases.has(slug)) {
        const pumlPath = path.join(INFRA_DIAGRAMS_DIR, file);
        const svgPath = path.join(INFRA_DIAGRAMS_DIR, `${slug}.svg`);
        jobs.push({
          slug,
          kind: "plantuml",
          group: "infrastructure/diagrams",
          source: `infrastructure/diagrams/${file}`,
          title: slug,
          pumlPath,
          svgPath,
        });
      }
    }
  }

  // Group B: docs/diagrams/*.mmd
  const docsFiles = fs.readdirSync(DOCS_DIAGRAMS_DIR).sort();
  for (const file of docsFiles) {
    if (file.endsWith(".mmd")) {
      const slug = path.basename(file, ".mmd");
      const fullPath = path.join(DOCS_DIAGRAMS_DIR, file);
      jobs.push({
        slug,
        kind: "mermaid",
        group: "docs/diagrams",
        source: `docs/diagrams/${file}`,
        title: slug,
        code: injectDefaultThemeIfMissing(fs.readFileSync(fullPath, "utf8")),
      });
    }
  }

  // Group C: HOVEDOPGAVE_DIAGRAMMER.md
  jobs.push(...parseKatalogMermaidJobs());

  return jobs;
}

async function resolvePlantUmlSvg(job) {
  if (!REFRESH_PUML && fs.existsSync(job.svgPath)) {
    const existing = fs.readFileSync(job.svgPath, "utf8");
    if (existing.includes("<svg") && !existing.includes("An error has occured")) {
      return existing;
    }
  }
  const pumlCode = fs.readFileSync(job.pumlPath, "utf8");
  const res = await fetch("https://kroki.io/plantuml/svg", {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: pumlCode,
  });
  if (!res.ok) {
    throw new Error(`Kroki PlantUML render failed for ${job.source}: HTTP ${res.status}`);
  }
  const svg = await res.text();
  if (!svg.includes("<svg") || svg.includes("An error has occured")) {
    throw new Error(`Invalid PlantUML SVG returned for ${job.source}`);
  }
  return svg;
}

function countPdfPages(pdfBuffer) {
  // Match leaf page dictionaries: /Type /Page not followed by 's' (/Pages)
  const raw = pdfBuffer.toString("latin1");
  const matches = raw.match(/\/Type\s*\/Page(?!s)\b/g);
  return matches ? matches.length : 0;
}

function findLargeRasterImages(pdfBuffer) {
  const raw = pdfBuffer.toString("latin1");
  const matches = raw.match(/<<[^>]*?\/Subtype\s*\/Image[^>]*?>>/g) || [];
  const large = [];
  for (const dict of matches) {
    const w = Number((dict.match(/\/Width\s+(\d+)/) || [])[1] || 0);
    const h = Number((dict.match(/\/Height\s+(\d+)/) || [])[1] || 0);
    if (w > 128 || h > 128) {
      large.push(`${w}x${h}`);
    }
  }
  return { totalImages: matches.length, largeImages: large };
}

function hasVectorContent(pdfBuffer) {
  const raw = pdfBuffer.toString("latin1");
  return /\/Type\s*\/Font\b/.test(raw) || pdfBuffer.length > 1000;
}

export async function launchBrowser() {
  const require = createRequire(import.meta.url);
  const { chromium } = require(path.join(ROOT_DIR, "frontend", "node_modules", "playwright", "index.js"));
  const candidates = [
    undefined,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  let lastErr;
  for (const executablePath of candidates) {
    if (executablePath && !fs.existsSync(executablePath)) continue;
    try {
      const browser = await chromium.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
      });
      return browser;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("Unable to launch Chromium/Chrome/Edge for PDF rendering.");
}

async function renderMermaidSvgInPage(context, mermaidJsContent, job) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 2400, height: 1800 });
    await page.setContent(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              overflow: visible;
            }
            #stage {
              display: inline-block;
              background: #ffffff;
              padding: ${PAD_PX}px;
              margin: 0;
            }
            #stage svg {
              display: block;
              max-width: none !important;
              max-height: none !important;
            }
          </style>
        </head>
        <body><div id="stage"></div></body>
      </html>`,
      { waitUntil: "domcontentloaded" }
    );

    await page.addScriptTag({ content: mermaidJsContent });

    const dims = await page.evaluate(async (diagramCode) => {
      const mermaid = window.mermaid;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        maxTextSize: 200000,
        maxEdges: 2000,
        flowchart: { htmlLabels: true },
      });

      const { svg } = await mermaid.render("diagram-render", diagramCode);
      const stage = document.getElementById("stage");
      stage.innerHTML = svg;

      const svgEl = stage.querySelector("svg");
      if (!svgEl) {
        throw new Error("Mermaid produced no <svg> element.");
      }

      const errorText = svgEl.textContent || "";
      if (
        svgEl.getAttribute("aria-roledescription") === "error" ||
        svgEl.querySelector(".error-icon") ||
        errorText.includes("Syntax error in text")
      ) {
        throw new Error(`Mermaid syntax error: ${errorText.slice(0, 300)}`);
      }

      svgEl.style.maxWidth = "none";
      svgEl.style.maxHeight = "none";
      svgEl.style.display = "block";

      // Strip SVG drop-shadow/blur filters so Chromium Skia PDF emits 100% vector paths & fonts
      svgEl.querySelectorAll("filter").forEach((f) => f.remove());
      svgEl.querySelectorAll("[filter]").forEach((el) => el.removeAttribute("filter"));
      svgEl.querySelectorAll("style").forEach((st) => {
        st.textContent = st.textContent.replace(/filter\s*:[^;}]+;?/gi, "");
      });
      const styleOverride = document.createElement("style");
      styleOverride.textContent =
        "* { filter: none !important; backdrop-filter: none !important; box-shadow: none !important; }";
      document.head.appendChild(styleOverride);

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const vb = svgEl.viewBox?.baseVal;
      if (vb && vb.width > 0 && vb.height > 0) {
        // Ensure percentage widths (e.g. gantt width="100%") expand to true viewBox pixels
        const attrW = svgEl.getAttribute("width") || "";
        const attrH = svgEl.getAttribute("height") || "";
        if (!attrW || attrW.includes("%")) {
          svgEl.setAttribute("width", `${vb.width}`);
        }
        if (!attrH || attrH.includes("%")) {
          svgEl.setAttribute("height", `${vb.height}`);
        }
      }

      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      let rect = svgEl.getBoundingClientRect();
      let bbox;
      try {
        bbox = svgEl.getBBox();
      } catch {
        bbox = null;
      }

      // Expand viewBox gently if Mermaid text overflows the declared viewBox
      if (vb && bbox && bbox.width > 0 && bbox.height > 0) {
        const margin = 8;
        const minX = Math.min(vb.x, bbox.x - margin);
        const minY = Math.min(vb.y, bbox.y - margin);
        const maxX = Math.max(vb.x + vb.width, bbox.x + bbox.width + margin);
        const maxY = Math.max(vb.y + vb.height, bbox.y + bbox.height + margin);
        const newW = maxX - minX;
        const newH = maxY - minY;
        if (newW > vb.width + 1 || newH > vb.height + 1 || minX < vb.x - 1 || minY < vb.y - 1) {
          svgEl.setAttribute("viewBox", `${minX} ${minY} ${newW} ${newH}`);
          svgEl.setAttribute("width", `${newW}`);
          svgEl.setAttribute("height", `${newH}`);
          svgEl.style.width = `${newW}px`;
          svgEl.style.height = `${newH}px`;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          );
          rect = svgEl.getBoundingClientRect();
        }
      }

      const rawWidth = Math.max(1, Math.ceil(rect.width));
      const rawHeight = Math.max(1, Math.ceil(rect.height));
      return { rawWidth, rawHeight };
    }, job.code);

    const totalW = dims.rawWidth + PAD_PX * 2;
    const totalH = dims.rawHeight + PAD_PX * 2;
    const scale = Math.min(1, MAX_PDF_DIM_PX / Math.max(totalW, totalH));
    // Chromium printToPDF scale range is [0.1, 2.0]
    const clampedScale = Math.max(0.1, scale);

    let extraPad = 4;
    let pdfBuffer;
    let pageCount = 0;

    for (let attempt = 0; attempt < 3; attempt++) {
      const pdfW = Math.ceil(totalW * clampedScale) + extraPad;
      const pdfH = Math.ceil(totalH * clampedScale) + extraPad;

      pdfBuffer = await page.pdf({
        width: `${pdfW}px`,
        height: `${pdfH}px`,
        scale: clampedScale,
        printBackground: true,
        margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      });

      pageCount = countPdfPages(pdfBuffer);
      if (pageCount === 1) {
        return {
          pdfBuffer,
          rawWidth: dims.rawWidth,
          rawHeight: dims.rawHeight,
          pdfWidthPx: pdfW,
          pdfHeightPx: pdfH,
          scale: clampedScale,
        };
      }
      extraPad += 12;
    }

    throw new Error(`Expected 1 PDF page for ${job.slug}, got ${pageCount} pages`);
  } finally {
    await page.close();
  }
}

async function renderPlantUmlSvgInPage(context, rawSvgText, job) {
  const page = await context.newPage();
  try {
    await page.setContent(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            #stage {
              display: inline-block;
              background: #ffffff;
              padding: ${PAD_PX}px;
              margin: 0;
            }
          </style>
        </head>
        <body><div id="stage">${rawSvgText}</div></body>
      </html>`,
      { waitUntil: "domcontentloaded" }
    );

    const dims = await page.evaluate(async ({ maxDim, padPx }) => {
      const svgEl = document.querySelector("#stage svg");
      if (!svgEl) throw new Error("Missing <svg> for PlantUML diagram.");
      const vbAttr = svgEl.getAttribute("viewBox");
      let rawW = 0;
      let rawH = 0;
      if (vbAttr) {
        const parts = vbAttr.trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
          rawW = parts[2];
          rawH = parts[3];
        }
      }
      if (!rawW || !rawH) {
        const r = svgEl.getBoundingClientRect();
        rawW = r.width;
        rawH = r.height;
      }

      const scale = Math.min(1, (maxDim - padPx * 2) / Math.max(rawW, rawH));
      const scaledW = Math.max(1, Math.round(rawW * scale));
      const scaledH = Math.max(1, Math.round(rawH * scale));

      // Resize vector SVG directly in CSS space (pure SVG without foreignObject)
      svgEl.setAttribute("width", `${scaledW}px`);
      svgEl.setAttribute("height", `${scaledH}px`);
      svgEl.style.width = `${scaledW}px`;
      svgEl.style.height = `${scaledH}px`;
      svgEl.style.maxWidth = "none";
      svgEl.style.display = "block";

      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );

      return {
        rawWidth: Math.ceil(rawW),
        rawHeight: Math.ceil(rawH),
        scaledW,
        scaledH,
        scale,
      };
    }, { maxDim: MAX_PDF_DIM_PX, padPx: PAD_PX });

    let extraPad = 4;
    let pdfBuffer;
    let pageCount = 0;

    for (let attempt = 0; attempt < 3; attempt++) {
      const pdfW = dims.scaledW + PAD_PX * 2 + extraPad;
      const pdfH = dims.scaledH + PAD_PX * 2 + extraPad;

      pdfBuffer = await page.pdf({
        width: `${pdfW}px`,
        height: `${pdfH}px`,
        scale: 1,
        printBackground: true,
        margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      });

      pageCount = countPdfPages(pdfBuffer);
      if (pageCount === 1) {
        return {
          pdfBuffer,
          rawWidth: dims.rawWidth,
          rawHeight: dims.rawHeight,
          pdfWidthPx: pdfW,
          pdfHeightPx: pdfH,
          scale: dims.scale,
        };
      }
      extraPad += 12;
    }

    throw new Error(`Expected 1 PDF page for ${job.slug}, got ${pageCount} pages`);
  } finally {
    await page.close();
  }
}

async function main() {
  if (!fs.existsSync(MERMAID_MIN_JS)) {
    throw new Error(`Missing Mermaid bundle at ${MERMAID_MIN_JS}. Run 'npm install' first.`);
  }
  const mermaidJsContent = fs.readFileSync(MERMAID_MIN_JS, "utf8");
  const jobs = collectJobs();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Rendering ${jobs.length} diagrams to vector PDF in ${path.relative(ROOT_DIR, OUT_DIR)}...`);

  const browser = await launchBrowser();
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const manifest = [];
  const errors = [];

  try {
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const outPath = path.join(OUT_DIR, `${job.slug}.pdf`);
      try {
        let res;
        if (job.kind === "mermaid") {
          res = await renderMermaidSvgInPage(context, mermaidJsContent, job);
        } else {
          const rawSvg = await resolvePlantUmlSvg(job);
          res = await renderPlantUmlSvgInPage(context, rawSvg, job);
        }

        const { totalImages, largeImages } = findLargeRasterImages(res.pdfBuffer);
        if (largeImages.length > 0) {
          throw new Error(
            `Rendered PDF for ${job.slug} contains large raster /Image objects (${largeImages.join(", ")})!`
          );
        }
        if (!hasVectorContent(res.pdfBuffer)) {
          throw new Error(`Rendered PDF for ${job.slug} lacks vector font/path content!`);
        }

        fs.writeFileSync(outPath, res.pdfBuffer);
        const pdfWidthPt = Number((res.pdfWidthPx * 0.75).toFixed(2));
        const pdfHeightPt = Number((res.pdfHeightPx * 0.75).toFixed(2));
        const aspectRatio = Number((pdfWidthPt / pdfHeightPt).toFixed(3));
        const orientation = aspectRatio >= LANDSCAPE_ASPECT_THRESHOLD ? "landscape" : "portrait";

        manifest.push({
          slug: job.slug,
          file: `${job.slug}.pdf`,
          source: job.source,
          group: job.group,
          title: job.title,
          kind: job.kind,
          rawWidth: res.rawWidth,
          rawHeight: res.rawHeight,
          pdfWidthPt,
          pdfHeightPt,
          aspectRatio,
          orientation,
          rasterImageCount: totalImages,
          bytes: res.pdfBuffer.length,
        });

        console.log(
          `[${String(i + 1).padStart(2, "0")}/${jobs.length}] OK  ${job.slug}.pdf (${res.rawWidth}x${res.rawHeight}px -> ${pdfWidthPt}x${pdfHeightPt}pt, ${orientation})`
        );
      } catch (err) {
        console.error(`[${String(i + 1).padStart(2, "0")}/${jobs.length}] ERR ${job.slug}: ${err.message}`);
        errors.push({ slug: job.slug, source: job.source, error: err.message });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\nWrote manifest: ${path.relative(ROOT_DIR, MANIFEST_PATH)} (${manifest.length}/${jobs.length} succeeded)`);

  if (errors.length > 0) {
    console.error("\nFailed diagrams:");
    for (const e of errors) {
      console.error(`  - ${e.slug} (${e.source}): ${e.error}`);
    }
    process.exit(1);
  }
}

const isDirectEntry =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectEntry) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
