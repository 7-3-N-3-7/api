#!/usr/bin/env node
/**
 * Builds the standalone interactive Pan & Zoom vector diagram viewer
 * (docs/diagrams/diagram-oversigt.html) containing all 45 thesis diagrams:
 *   - 4 Mermaid diagrams in docs/diagrams/
 *   - 15 Mermaid diagrams + 1 PlantUML diagram in infrastructure/diagrams/
 *   - 25 Mermaid catalog diagrams in HOVEDOPGAVE_DIAGRAMMER.md
 */

import fs from "node:fs";
import path from "node:path";
import {
<<<<<<< HEAD
  DIAGRAM_FONT_FAMILY,
=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
  DOCS_DIAGRAMS_DIR,
  INFRA_DIAGRAMS_DIR,
  MERMAID_MIN_JS,
  ROOT_DIR,
  injectDefaultThemeIfMissing,
  launchBrowser,
  parseKatalogMermaidJobs,
} from "./render-diagrams-pdf.mjs";

const OUT_HTML_PATH = path.join(DOCS_DIAGRAMS_DIR, "diagram-oversigt.html");
const FONT_CSS_PREFIX =
<<<<<<< HEAD
  `svg, foreignObject, foreignObject div, foreignObject span, foreignObject p { font-family: ${DIAGRAM_FONT_FAMILY}; font-size: 14px; line-height: 1.45; } foreignObject { overflow: visible; } * { box-sizing: border-box; } `;
=======
  'svg { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.45; } * { box-sizing: border-box; } ';
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431

const DOCS_META = {
  "core-and-slice-class-diagram": {
    title: "Core & Vertical Slice Klassediagram",
    note: "Klassediagram der viser sammenhængen mellem det generiske 2-fils Core-lag (BaseDomainCore & BaseWebCore) og en package-private Vertical Slice (AppointmentFeature).",
  },
  "double-loop-tdd": {
    title: "Outside-In Double-Loop TDD",
    note: "Flowchart over Outside-In Double-Loop TDD-arbejdsgangen, der kobler det ydre BDD/Cucumber-loop (API-kontrakt & RFC 7807) med det indre JUnit 5/Mockito-loop (isoleret domænelogik).",
  },
  "fullstack-symmetry": {
    title: "1:1 Full-Stack Arkitektursymmetri",
    note: "Arkitekturdiagram der illustrerer 1:1 full-stack symmetrien mellem Java/Spring Boot-backenden og den todelte TypeScript/React-frontend (apps/landing Zero-Trust Gateway + apps/dashboard med 2-fils Core og rollebeskyttede Vertical Slices).",
  },
  "generic-sdlc-architecture": {
    title: "Generisk GitHub SDLC-Framework",
    note: "Arkitekturdiagram over det domæneuafhængige 2-fils SDLC Core (sdlc-domain.ts & sdlc-github.ts), GitHub Projects v2 tilstandsmaskine, træ-isomorfe branches, fælles specs/features/ og 100 % JaCoCo/Istanbul-gates.",
  },
};

const INFRA_META = {
  "activity-diagram": {
    title: "Aktivitetsdiagram (Dynamisk API-flow)",
    note: "Aktivitetsdiagram med lagdelte trin, der viser det dynamiske runtime-flow for et API-kald hele vejen fra Dual-App/BFF gennem BaseController, BaseService og BaseRepository ned til PostgreSQL, MongoDB, KillBill/Fineract, JGit, Redis og Kafka.",
  },
  "bdd-tdd-workflow": {
    title: "Generisk GitHub SDLC & BDD/TDD Workflow (9 trin)",
    note: "Procesdiagram over den lukkede udviklingslivscyklus fra GitHub Issue & Projects v2, træ-isomorf branch og fælles specs/features/ gennem Backend/Frontend 100 % gates til SDLC Full-Stack Gate & Living Spec synk.",
  },
  "class-diagram-backend": {
    title: "Samlet Backend Arkitekturoverblik",
    note: "Samlet backend-arkitekturoverblik (Java 17 / Spring Boot 3.3), der viser samspillet mellem 2-fils Core-laget, tværgående sikkerheds-/cache-/event-services og alle 7 indkapslede Vertical Slices inkl. FinanceFeature.",
  },
  "class-diagram-frontend": {
    title: "Frontend Dual-App & Slice Arkitektur",
    note: "Komponent- og arkitekturoverblik over Dual-App frontenden (apps/landing, apps/dashboard, Next.js BFF, 2-fils TypeScript/React Core og alle rollebeskyttede Vertical Slices).",
  },
  "class-diagram-swimlane-appointment": {
    title: "Swimlane 1: Appointment & Timefold AI",
    note: "Detaljeret UML-klassediagram for Swimlane 1: Tidsbestilling, kollisionskontrol og Timefold AI-planlægning (/api/v1/appointments) i AppointmentFeature.",
  },
  "class-diagram-swimlane-clinic-platform": {
    title: "Swimlane 5: Klinikplatform & Handshakes",
    note: "Detaljeret UML-klassediagram for Swimlane 5: Klinikplatform, CVR-organisationer, behandler-onboarding, ydelser og klient-terapeut-handshakes (/api/v1/clinic) i ClinicPlatformFeature.",
  },
  "class-diagram-swimlane-core": {
    title: "Swimlane 0: Generic 2-Fils Core Framework",
    note: "Detaljeret UML-klassediagram for Swimlane 0: Det generiske 2-fils Core-framework (BaseDomainCore og BaseWebCore) samt tværgående sikkerheds-, cache- og event-komponenter.",
  },
  "class-diagram-swimlane-finance": {
    title: "Swimlane 7: Økonomi, KillBill, Fineract & JGit",
    note: "Detaljeret UML-klassediagram for Swimlane 7: Økonomi, fakturering, klippekort, abonnementer, afdragsordninger og finansbogføring (/api/v1/finance) via KillBill, Apache Fineract og JGit i FinanceFeature.",
  },
  "class-diagram-swimlane-i18n": {
    title: "Swimlane 6: I18n & MongoDB Sprogordbog",
    note: "Detaljeret UML-klassediagram for Swimlane 6: Internationalisering og dynamiske sprogordbøger (/api/v1/i18n) persisteret i Spring Data MongoDB via I18nFeature.",
  },
  "class-diagram-swimlane-journal": {
    title: "Swimlane 2: Journal & JGit Versionsstyring",
    note: "Detaljeret UML-klassediagram for Swimlane 2: Patientjournaler, fortrolige terapeutnoter og uforanderlig JGit-versionsstyring (/api/v1/journals) i JournalFeature.",
  },
  "class-diagram-swimlane-psychotraumatology": {
    title: "Swimlane 3: Psykotraumatologi (PCL-5)",
    note: "Detaljeret UML-klassediagram for Swimlane 3: Psykotraumatologiske PCL-5-screeninger (score 0-80, klinisk grænseværdi 33) på /api/v1/psychotraumatology/tests.",
  },
  "class-diagram-swimlane-user": {
    title: "Swimlane 4: Bruger- & Profilhåndtering",
    note: "Detaljeret UML-klassediagram for Swimlane 4: Brugerstyring, profilopslag og sikkerhedsendpoints (/api/users, /api/v1/user/profile og /api/v1/public/health) i UserFeature.",
  },
  "deployment-diagram": {
    title: "Deployment-diagram (Cloud & Docker)",
    note: "Deployment-diagram over det samlede containeriserede cloud- og Docker-miljø med Traefik, OAuth2-Proxy, Keycloak IAM, Dual-App Frontend/BFF, Spring Boot API, KillBill, Apache Fineract, PostgreSQL, MongoDB, Redis, Kafka og JGit.",
  },
  "domain-model": {
    title: "Konceptuel Domænemodel",
    note: "Konceptuel domænemodel over forretningsbegreberne (Bruger, Klient, Terapeut, Organisation, Handshake, Ydelse, Aftale, Journalindlæg, Fortrolig Terapeutnote, PCL-5 Test, Faktura/Betaling, JGit-Versionshistorik og Sprogordbog).",
  },
  "eer-diagram": {
    title: "EER-Databasemodel (Polyglot Persistens)",
    note: "Enhanced Entity-Relationship (EER) databasemodel uden overflødige superklasse-pile, der viser polyglot-persistensen på tværs af PostgreSQL (kerne- og finansdatabaser), MongoDB (i18n) og JGit-revisionssporet.",
  },
};

const KATALOG_NOTES = {
  "katalog-01-gantt-projektforloeb":
    "Detaljeret Gantt-tidslinje rekonstrueret fra projektets Git-commits (september 2026 – januar 2027) og hovedopgavemilepæle.",
  "katalog-02-commit-tidslinje":
    "Visuel commit-tidslinje på tværs af Sprint 1–5 med centrale arkitektoniske milepæle.",
  "katalog-03-gitgraph-github-branches":
    "GitGraph over projektets udviklings-branches (main, dev og feature/*).",
  "katalog-04-gitgraph-jgit-patient-journal":
    "GitGraph over logiske patientjournal-branches i JournalFeature.JournalGitService (main, trauma-therapy, private-diary).",
  "katalog-05-cicd-pipeline-bdd-tdd":
    "Historisk katalogdiagram fra Sprint 1–5 over CI/CD- og sikkerhedspipeline (inkl. daværende TruffleHog- og Taiga-trin) frem til 100 % JaCoCo-gate og GHCR-udrulning.",
  "katalog-06-er-diagram-polyglot":
    "Komplet Polyglot ER-diagram for PostgreSQL (business-db), MongoDB (i18n_dictionaries) og Eclipse JGit (journal-repo).",
  "katalog-07-state-samtykke-handshake":
    "Tilstandsmaskine (stateDiagram-v2) for ClientTherapistHandshake og de fire sekventielle JGit-privatlivsfiltre.",
  "katalog-08-state-aftale-finans":
    "Tilstandsmaskine for aftale-livscyklus (Appointment) koblet med Kill Bill-fakturering og Apache Fineract-bogføring.",
  "katalog-09-class-fullstack-symmetry":
    "Klassediagram over 1:1 kode-symmetri mellem backend-kerne (BaseDomainCore/BaseWebCore) og frontend-kerne (baseDomainCore/baseUiCore).",
  "katalog-10-activity-core":
    "Aktivitetsdiagram for com.platform.core og standardiseret RFC 7807 ProblemDetail-fejlhåndtering.",
  "katalog-11-sequence-core":
    "Sekvensdiagram for BaseController → BaseService → ErrorCode.require() / ProblemDetail.",
  "katalog-12-activity-appointment":
    "Aktivitetsdiagram for AppointmentFeature (booking, konflikttjek, Timefold Solver og JGit).",
  "katalog-13-sequence-appointment":
    "Sekvensdiagram for AppointmentFeature (Timefold AI Solver, JGit commit, Redis cache-invalidering og Kafka-event).",
  "katalog-14-activity-clinic-platform":
    "Aktivitetsdiagram for ClinicPlatformFeature (CVR/IBAN-onboarding, ydelseskatalog og samtykke-handshakes).",
  "katalog-15-sequence-clinic-platform":
    "Sekvensdiagram for ClinicPlatformFeature inkl. Next.js BFF Keycloak rolle-synkronisering.",
  "katalog-16-activity-i18n":
    "Aktivitetsdiagram for I18nFeature (MongoDB sprogordbøger og HTTP/Redis-caching).",
  "katalog-17-sequence-i18n":
    "Sekvensdiagram for I18nFeature (opslag med fallback og opdatering af nøgle-værdi-træ i MongoDB).",
  "katalog-18-activity-journal":
    "Aktivitetsdiagram for JournalFeature (klientjournal, fortrolige terapeutnoter og JGit privatlivsfiltrering).",
  "katalog-19-sequence-journal":
    "Sekvensdiagram for JournalFeature (samtykkevalidering via HandshakePort og rollebaseret JGit-læsning).",
  "katalog-20-activity-psychotraumatology":
    "Aktivitetsdiagram for PsychotraumatologyFeature (DSM-5 PCL-5 scoring 0–80 og Zero-Trust ejerskabstjek).",
  "katalog-21-sequence-psychotraumatology":
    "Sekvensdiagram for PsychotraumatologyFeature (indsendelse og isoleret klientopslag af PCL-5 test).",
  "katalog-22-activity-user":
    "Aktivitetsdiagram for UserFeature og SecurityConfig OAuth2 JWT FilterChain.",
  "katalog-23-sequence-user":
    "Sekvensdiagram for UserFeature (brugeroprettelse med rollevalidering og JWT-profilopslag).",
  "katalog-24-architecture-dual-app-rbac":
    "Dual-App Frontend-arkitektur (apps/landing Port 5173 vs. apps/dashboard Port 5174) og RBAC via <RoleGuard />.",
  "katalog-25-sequence-landing-to-roleguard":
    "End-to-end frontend-sekvens fra LandingFeatureView og AuthGateway til <RoleGuard /> og modul-privat API-service.",
};

function cleanCatalogTitle(heading) {
  return heading
    .replace(/`/g, "")
    .replace(/\$\\rightarrow\$/g, "→")
    .replace(/\s+/g, " ")
    .trim();
}

function collectViewerJobs() {
  const jobs = [];

  const docsGroupLabel =
    "docs/diagrams/ — Kernearkitektur, Generisk SDLC, Full-Stack Symmetri & Double-Loop TDD (4)";
  const docsFiles = fs
    .readdirSync(DOCS_DIAGRAMS_DIR)
    .filter((f) => f.endsWith(".mmd"))
    .sort();
  for (const file of docsFiles) {
    const slug = path.basename(file, ".mmd");
    const meta = DOCS_META[slug];
    if (!meta) {
      throw new Error(`Missing DOCS_META entry for docs/diagrams/${file}`);
    }
    jobs.push({
      slug,
      groupId: "docs",
      groupLabel: docsGroupLabel,
      relPath: `docs/diagrams/${file}`,
      fileName: `${slug}.svg`,
      type: "MMD",
      title: meta.title,
      note: meta.note,
      code: injectDefaultThemeIfMissing(
        fs.readFileSync(path.join(DOCS_DIAGRAMS_DIR, file), "utf8")
      ),
    });
  }

  const infraGroupLabel =
    "infrastructure/diagrams/ — Systemarkitektur, UML, Swimlanes, EER & PlantUML (16)";
  const infraFiles = fs
    .readdirSync(INFRA_DIAGRAMS_DIR)
    .filter((f) => f.endsWith(".mmd"))
    .sort();
  for (const file of infraFiles) {
    const slug = path.basename(file, ".mmd");
    const meta = INFRA_META[slug];
    if (!meta) {
      throw new Error(`Missing INFRA_META entry for infrastructure/diagrams/${file}`);
    }
    jobs.push({
      slug,
      groupId: "infrastructure",
      groupLabel: infraGroupLabel,
      relPath: `infrastructure/diagrams/${file}`,
      fileName: `${slug}.svg`,
      type: "MMD",
      title: meta.title,
      note: meta.note,
      code: injectDefaultThemeIfMissing(
        fs.readFileSync(path.join(INFRA_DIAGRAMS_DIR, file), "utf8")
      ),
    });
  }

  jobs.push({
    slug: "backend_class_diagram",
    groupId: "infrastructure",
    groupLabel: infraGroupLabel,
    relPath: "infrastructure/diagrams/backend_class_diagram.puml",
    fileName: "backend_class_diagram.svg",
    type: "PUML",
    title: "Oprindeligt Samlet Backend-Klassediagram (PlantUML)",
    note: "Historisk PlantUML-klassediagram over den oprindelige Package-by-Layer backend-struktur (før Vertical Slice-konsolidering).",
    svgPath: path.join(INFRA_DIAGRAMS_DIR, "backend_class_diagram.svg"),
  });

  const katalogGroupLabel =
    "HOVEDOPGAVE_DIAGRAMMER.md — Bilag 17.4–17.5: Projektforløb, GitGraph, ER, State & Sekvensdiagrammer (25)";
  const katalogJobs = parseKatalogMermaidJobs();
  for (const kj of katalogJobs) {
    const note = KATALOG_NOTES[kj.slug];
    if (!note) {
      throw new Error(`Missing KATALOG_NOTES entry for ${kj.slug}`);
    }
    jobs.push({
      slug: kj.slug,
      groupId: "katalog",
      groupLabel: katalogGroupLabel,
      relPath: `HOVEDOPGAVE_DIAGRAMMER.md#${kj.slug}`,
      fileName: `${kj.slug}.svg`,
      type: "MMD",
      title: cleanCatalogTitle(kj.title),
      note,
      code: kj.code,
    });
  }

  return jobs;
}

function loadPlantUmlSvg(svgPath) {
  if (!fs.existsSync(svgPath)) {
    throw new Error(`Missing pre-rendered PlantUML SVG at ${svgPath}`);
  }
  const raw = fs.readFileSync(svgPath, "utf8");
  const svgStart = raw.indexOf("<svg");
  if (svgStart === -1) {
    throw new Error(`Missing <svg> root in ${svgPath}`);
  }
  const cleanSvg = raw.slice(svgStart).trim();
  const vbMatch = cleanSvg.match(/viewBox="([^"]+)"/i);
  if (!vbMatch) {
    throw new Error(`Missing viewBox attribute in ${svgPath}`);
  }
  const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid viewBox "${vbMatch[1]}" in ${svgPath}`);
  }
  return {
    origX: parts[0],
    origY: parts[1],
    origW: parts[2],
    origH: parts[3],
    rawSvg: cleanSvg,
  };
}

async function renderMermaidForViewer(page, index, diagramCode) {
  return page.evaluate(
    async ({ idx, code, fontCssPrefix }) => {
      const mermaid = window.mermaid;
      const stage = document.getElementById("stage");
      stage.innerHTML = "";

      const renderId = `mmd-diag-${idx}`;
      const { svg } = await mermaid.render(renderId, code);
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

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      svgEl.style.maxWidth = "none";
      svgEl.style.display = "block";

      const vb = svgEl.viewBox?.baseVal;
      if (vb && vb.width > 0 && vb.height > 0) {
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

      let bbox = null;
      try {
        bbox = svgEl.getBBox();
      } catch {
        bbox = null;
      }

      let origX = vb ? vb.x : 0;
      let origY = vb ? vb.y : 0;
      let origW = vb ? vb.width : 0;
      let origH = vb ? vb.height : 0;

      if ((!origW || !origH) && bbox && bbox.width > 0 && bbox.height > 0) {
        origX = bbox.x - 12;
        origY = bbox.y - 12;
        origW = bbox.width + 24;
        origH = bbox.height + 24;
        svgEl.setAttribute("viewBox", `${origX} ${origY} ${origW} ${origH}`);
      } else if (vb && bbox && bbox.width > 0 && bbox.height > 0) {
        const margin = 8;
        const minX = Math.min(vb.x, bbox.x - margin);
        const minY = Math.min(vb.y, bbox.y - margin);
        const maxX = Math.max(vb.x + vb.width, bbox.x + bbox.width + margin);
        const maxY = Math.max(vb.y + vb.height, bbox.y + bbox.height + margin);
        const newW = maxX - minX;
        const newH = maxY - minY;
        if (
          newW > vb.width + 1 ||
          newH > vb.height + 1 ||
          minX < vb.x - 1 ||
          minY < vb.y - 1
        ) {
          origX = minX;
          origY = minY;
          origW = newW;
          origH = newH;
          svgEl.setAttribute("viewBox", `${minX} ${minY} ${newW} ${newH}`);
        }
      }

      if (!origW || !origH) {
        const rect = svgEl.getBoundingClientRect();
        origX = 0;
        origY = 0;
        origW = Math.max(1, Math.ceil(rect.width));
        origH = Math.max(1, Math.ceil(rect.height));
        svgEl.setAttribute("viewBox", `0 0 ${origW} ${origH}`);
      }

      svgEl.setAttribute("width", "100%");
      svgEl.removeAttribute("height");
      svgEl.style.maxWidth = `${origW}px`;
      svgEl.style.removeProperty("display");

      let firstStyle = svgEl.querySelector("style");
      if (!firstStyle) {
        firstStyle = document.createElementNS("http://www.w3.org/2000/svg", "style");
        svgEl.insertBefore(firstStyle, svgEl.firstChild);
      }
      if (!firstStyle.textContent.includes("box-sizing: border-box")) {
        firstStyle.textContent = fontCssPrefix + firstStyle.textContent;
      }

      return {
        origX,
        origY,
        origW,
        origH,
        rawSvg: svgEl.outerHTML,
      };
    },
    { idx: index, code: diagramCode, fontCssPrefix: FONT_CSS_PREFIX }
  );
}

function buildHtmlDocument(diagrams) {
  const total = diagrams.length;
  const safeJson = JSON.stringify(diagrams)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Diagramoversigt — Interaktiv Vektorfremviser (${total} diagrammer)</title>
  <style>
    :root {
      --bg-app: #f8fafc;
      --bg-sidebar: #ffffff;
      --bg-header: #ffffff;
      --bg-canvas: #f1f5f9;
      --dot-canvas: #cbd5e1;
      --border: #e2e8f0;
      --border-strong: #cbd5e1;
      --text-main: #0f172a;
      --text-muted: #475569;
      --text-soft: #64748b;
      --accent: #2563eb;
      --accent-soft: #eff6ff;
      --accent-border: #bfdbfe;
      --note-bg: #fefce8;
      --note-border: #fde68a;
      --note-text: #713f12;
      --mmd-bg: #ecfdf5;
      --mmd-text: #065f46;
      --puml-bg: #f3e8ff;
      --puml-text: #6b21a8;
      --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
      --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
    }

    * { box-sizing: border-box; }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg-app);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.45;
    }

    .app-shell {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .sidebar {
      width: 340px;
      min-width: 340px;
      height: 100%;
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      transition: width 0.18s ease, min-width 0.18s ease;
      overflow: hidden;
      z-index: 10;
    }

    .app-shell.sidebar-hidden .sidebar {
      width: 0;
      min-width: 0;
      border-right: none;
    }

    .sidebar-top {
      padding: 14px 16px 12px;
      border-bottom: 1px solid var(--border);
      background: #ffffff;
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }

    .brand-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .count-pill {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      border: 1px solid var(--accent-border);
      white-space: nowrap;
    }

    .search-wrap {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 8px 30px 8px 10px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-main);
      background: #f8fafc;
      outline: none;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .search-input:focus {
      border-color: var(--accent);
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .search-clear {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: var(--text-soft);
      cursor: pointer;
      font-size: 14px;
      padding: 2px 5px;
      border-radius: 4px;
      display: none;
    }

    .search-clear.visible {
      display: block;
    }

    .search-clear:hover {
      background: var(--border);
      color: var(--text-main);
    }

    .sidebar-list {
      flex: 1;
      overflow-y: auto;
      padding: 10px 10px 16px;
    }

    .group-header {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-soft);
      padding: 10px 8px 6px;
      margin-top: 4px;
    }

    .group-header:first-child {
      margin-top: 0;
      padding-top: 4px;
    }

    .diagram-btn {
      width: 100%;
      text-align: left;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 9px 10px;
      margin-bottom: 4px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 3px;
      transition: background 0.12s ease, border-color 0.12s ease;
    }

    .diagram-btn:hover {
      background: #f1f5f9;
    }

    .diagram-btn.active {
      background: var(--accent-soft);
      border-color: var(--accent-border);
    }

    .diagram-btn-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .diagram-btn-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diagram-btn.active .diagram-btn-title {
      color: #1d4ed8;
    }

    .diagram-btn-sub {
      font-size: 11px;
      color: var(--text-soft);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .type-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.03em;
      flex-shrink: 0;
    }

    .type-MMD {
      background: var(--mmd-bg);
      color: var(--mmd-text);
    }

    .type-PUML {
      background: var(--puml-bg);
      color: var(--puml-text);
    }

    .sidebar-footer {
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      background: #ffffff;
    }

    .empty-state {
      padding: 24px 12px;
      text-align: center;
      color: var(--text-soft);
      font-size: 13px;
    }

    .main-area {
      flex: 1;
      min-width: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .topbar {
      background: var(--bg-header);
      border-bottom: 1px solid var(--border);
      padding: 10px 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: var(--shadow-sm);
      z-index: 5;
    }

    .topbar-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .title-block {
      display: flex;
      flex-direction: column;
      min-width: 220px;
      flex: 1;
    }

    .title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .active-title {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
      letter-spacing: -0.01em;
    }

    .meta-line {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--text-soft);
      margin-top: 2px;
    }

    .mono-path {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
      color: var(--text-muted);
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .btn-group {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }

    .btn-group .btn {
      border: none;
      border-right: 1px solid var(--border);
      border-radius: 0;
    }

    .btn-group .btn:last-child {
      border-right: none;
    }

    .btn {
      appearance: none;
      border: 1px solid var(--border-strong);
      background: #ffffff;
      color: var(--text-main);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    }

    .btn:hover:not(:disabled) {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .btn:active:not(:disabled) {
      background: #e2e8f0;
    }

    .btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
      border-color: #1d4ed8;
    }

    .zoom-readout {
      min-width: 56px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
      padding: 0 6px;
      border-right: 1px solid var(--border);
      user-select: none;
    }

    .note-box {
      background: var(--note-bg);
      border: 1px solid var(--note-border);
      color: var(--note-text);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .note-label {
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }

    .canvas-stage {
      position: relative;
      flex: 1;
      min-height: 0;
      background-color: var(--bg-canvas);
      background-image: radial-gradient(var(--dot-canvas) 1px, transparent 1px);
      background-size: 20px 20px;
      overflow: hidden;
    }

    #canvas-viewport {
      width: 100%;
      height: 100%;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      overflow: hidden;
    }

    #canvas-viewport.is-grabbing {
      cursor: grabbing;
    }

<<<<<<< HEAD
    #canvas-viewport svg foreignObject {
      overflow: visible;
    }

    #canvas-viewport svg,
    #canvas-viewport svg foreignObject,
    #canvas-viewport svg foreignObject div,
    #canvas-viewport svg foreignObject span,
    #canvas-viewport svg foreignObject p {
      font-family: ${DIAGRAM_FONT_FAMILY};
      line-height: 1.45;
    }

=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
    .hint-pill {
      position: absolute;
      right: 16px;
      bottom: 14px;
      background: rgba(15, 23, 42, 0.82);
      color: #f8fafc;
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 999px;
      box-shadow: var(--shadow-md);
      pointer-events: none;
      backdrop-filter: blur(4px);
    }

    @media (max-width: 900px) {
      .sidebar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        box-shadow: var(--shadow-md);
      }
      .app-shell.sidebar-hidden .sidebar {
        width: 0;
        min-width: 0;
      }
    }
  </style>
</head>
<body>
  <div class="app-shell" id="app-shell">
    <aside class="sidebar" id="sidebar" aria-label="Diagramnavigation">
      <div class="sidebar-top">
        <div class="brand-row">
          <div class="brand-title">Diagramoversigt</div>
          <span class="count-pill" id="count-pill">${total} / ${total}</span>
        </div>
        <div class="search-wrap">
          <input
            type="text"
            id="search-input"
            class="search-input"
            placeholder="Søg efter diagram eller emne..."
            autocomplete="off"
          >
          <button type="button" id="search-clear" class="search-clear" title="Ryd søgning" aria-label="Ryd søgning">×</button>
        </div>
      </div>

      <div class="sidebar-list" id="sidebar-list"></div>

      <div class="sidebar-footer">
        <button type="button" class="btn" id="btn-prev" title="Forrige diagram (Pil op)">← Forrige</button>
        <span id="nav-index" style="font-size: 12px; color: var(--text-soft); font-variant-numeric: tabular-nums;">1 / ${total}</span>
        <button type="button" class="btn" id="btn-next" title="Næste diagram (Pil ned)">Næste →</button>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <div class="topbar-row">
          <div class="title-block">
            <div class="title-line">
              <button type="button" class="btn" id="btn-toggle-sidebar" title="Skjul eller vis menu (B)">Skjul menu</button>
              <h1 class="active-title" id="active-title">Indlæser...</h1>
              <span class="type-badge type-MMD" id="active-badge">MMD</span>
            </div>
            <div class="meta-line">
              <span class="mono-path" id="active-path"></span>
              <span id="active-dims"></span>
            </div>
          </div>

          <div class="toolbar">
            <div class="btn-group">
              <button type="button" class="btn" id="btn-fit-all" title="Tilpas hele diagrammet til skærmen (0)">Tilpas skærm</button>
<<<<<<< HEAD
              <button type="button" class="btn" id="btn-fit-width" title="Tilpas bredden fra toppen (god til høje diagrammer) (W)">Tilpas bredde</button>
=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
              <button type="button" class="btn" id="btn-fit-height" title="Tilpas højden (god til brede diagrammer) (H)">Tilpas højde</button>
              <button type="button" class="btn" id="btn-zoom-100" title="Vis i 100% størrelse (1)">100%</button>
            </div>

            <div class="btn-group">
              <button type="button" class="btn" id="btn-zoom-out" title="Zoom ud (-)">−</button>
              <span class="zoom-readout" id="zoom-readout">100%</span>
              <button type="button" class="btn" id="btn-zoom-in" title="Zoom ind (+)">+</button>
            </div>

            <button type="button" class="btn" id="btn-copy-link" title="Kopiér direkte link til dette diagram">Kopiér link</button>
            <button type="button" class="btn btn-primary" id="btn-download" title="Download aktuelt diagram som vektor-.svg">Download .svg</button>
          </div>
        </div>

        <div class="note-box">
          <span class="note-label">Note</span>
          <span id="active-note"></span>
        </div>
      </header>

      <div class="canvas-stage">
        <div id="canvas-viewport" aria-label="Interaktivt diagramlærred"></div>
        <div class="hint-pill">Scroll: Zoom • Træk: Panorér • Dobbeltklik: 2× Zoom</div>
      </div>
    </main>
  </div>

  <script>
    const DIAGRAMS = ${safeJson};

    const appShell = document.getElementById('app-shell');
    const sidebarList = document.getElementById('sidebar-list');
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const countPill = document.getElementById('count-pill');
    const navIndexEl = document.getElementById('nav-index');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

    const activeTitleEl = document.getElementById('active-title');
    const activeBadgeEl = document.getElementById('active-badge');
    const activePathEl = document.getElementById('active-path');
    const activeDimsEl = document.getElementById('active-dims');
    const activeNoteEl = document.getElementById('active-note');

    const btnFitAll = document.getElementById('btn-fit-all');
<<<<<<< HEAD
    const btnFitWidth = document.getElementById('btn-fit-width');
=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
    const btnFitHeight = document.getElementById('btn-fit-height');
    const btnZoom100 = document.getElementById('btn-zoom-100');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const zoomReadout = document.getElementById('zoom-readout');
    const btnCopyLink = document.getElementById('btn-copy-link');
    const btnDownload = document.getElementById('btn-download');
    const viewport = document.getElementById('canvas-viewport');

    let activeIndex = 0;
    let activeSvg = null;
    let camX = 0;
    let camY = 0;
    let zoom = 1;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartCamX = 0;
    let dragStartCamY = 0;

    function getFilteredDiagrams() {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) return DIAGRAMS;
      return DIAGRAMS.filter((d) => {
        return (
          d.slug.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.relPath.toLowerCase().includes(q) ||
          d.note.toLowerCase().includes(q) ||
          d.groupLabel.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q)
        );
      });
    }

    function renderSidebar() {
      const filtered = getFilteredDiagrams();
      countPill.textContent = filtered.length + ' / ' + DIAGRAMS.length;
      searchClear.classList.toggle('visible', searchInput.value.length > 0);
      sidebarList.innerHTML = '';

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Ingen diagrammer matcher søgningen.';
        sidebarList.appendChild(empty);
        return;
      }

      let lastGroupId = null;
      for (const item of filtered) {
        if (item.groupId !== lastGroupId) {
          lastGroupId = item.groupId;
          const header = document.createElement('div');
          header.className = 'group-header';
          header.textContent = item.groupLabel;
          sidebarList.appendChild(header);
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'diagram-btn' + (item.index === activeIndex ? ' active' : '');
        btn.dataset.index = String(item.index);
        btn.innerHTML =
          '<div class="diagram-btn-row">' +
            '<span class="diagram-btn-title"></span>' +
            '<span class="type-badge type-' + item.type + '">' + item.type + '</span>' +
          '</div>' +
          '<div class="diagram-btn-sub"></div>';
        btn.querySelector('.diagram-btn-title').textContent = item.title;
        btn.querySelector('.diagram-btn-sub').textContent = item.relPath + ' (' + Math.round(item.origW) + '×' + Math.round(item.origH) + ')';
        btn.addEventListener('click', () => selectDiagram(item.index));
        sidebarList.appendChild(btn);
      }
    }

    function updateCamera() {
      if (!activeSvg) return;
      const vpW = Math.max(1, viewport.clientWidth);
      const vpH = Math.max(1, viewport.clientHeight);
      const vbW = vpW / zoom;
      const vbH = vpH / zoom;
      activeSvg.setAttribute('viewBox', camX + ' ' + camY + ' ' + vbW + ' ' + vbH);
      zoomReadout.textContent = Math.round(zoom * 100) + '%';
    }

    function fitAll() {
      const item = DIAGRAMS[activeIndex];
      const vpW = Math.max(1, viewport.clientWidth);
      const vpH = Math.max(1, viewport.clientHeight);
      const pad = 80;
      const availW = Math.max(40, vpW - pad);
      const availH = Math.max(40, vpH - pad);
      zoom = Math.max(0.02, Math.min(availW / item.origW, availH / item.origH, 1.5));
      camX = (item.origX + item.origW / 2) - (vpW / zoom) / 2;
      camY = (item.origY + item.origH / 2) - (vpH / zoom) / 2;
      updateCamera();
    }

    function fitHeight() {
      const item = DIAGRAMS[activeIndex];
      const vpH = Math.max(1, viewport.clientHeight);
      const availH = Math.max(40, vpH - 60);
      zoom = Math.max(0.02, Math.min(availH / item.origH, 4));
      camX = item.origX - 30 / zoom;
      camY = (item.origY + item.origH / 2) - (vpH / zoom) / 2;
      updateCamera();
    }

<<<<<<< HEAD
    function fitWidth() {
      const item = DIAGRAMS[activeIndex];
      const vpW = Math.max(1, viewport.clientWidth);
      const availW = Math.max(40, vpW - 60);
      zoom = Math.max(0.02, Math.min(availW / item.origW, 1.25));
      camX = (item.origX + item.origW / 2) - (vpW / zoom) / 2;
      camY = item.origY - 30 / zoom;
      updateCamera();
    }

    function fitReadable() {
      const item = DIAGRAMS[activeIndex];
      const vpW = Math.max(1, viewport.clientWidth);
      const vpH = Math.max(1, viewport.clientHeight);
      const allZoom = Math.min(Math.max(40, vpW - 80) / item.origW, Math.max(40, vpH - 80) / item.origH, 1.5);
      if (allZoom >= 0.55) {
        fitAll();
        return;
      }
      if (item.origH >= item.origW * 1.2) {
        const availW = Math.max(40, vpW - 60);
        zoom = Math.max(0.65, Math.min(availW / item.origW, 1.15));
        camX = (item.origX + item.origW / 2) - (vpW / zoom) / 2;
        camY = item.origY - 30 / zoom;
        updateCamera();
      } else {
        const availH = Math.max(40, vpH - 60);
        zoom = Math.max(0.65, Math.min(availH / item.origH, 1.15));
        camX = item.origX - 30 / zoom;
        camY = (item.origY + item.origH / 2) - (vpH / zoom) / 2;
        updateCamera();
      }
    }

    function autoFitForeignObjects(svgEl) {
      if (!svgEl) return;
      const fos = svgEl.querySelectorAll('foreignObject');
      fos.forEach((fo) => {
        const inner = fo.firstElementChild;
        if (!inner || !(inner.textContent || '').trim()) return;
        const foW = parseFloat(fo.getAttribute('width') || '0');
        const foH = parseFloat(fo.getAttribute('height') || '0');
        if (foW <= 0 || foH <= 0) return;
        const sw = inner.scrollWidth;
        const sh = inner.scrollHeight;
        if (sw <= foW + 1 && sh <= foH + 1) return;
        const isFreeLabel = Boolean(fo.closest('.edgeLabel, .cluster-label'));
        if (isFreeLabel) {
          const newW = Math.max(foW, Math.ceil(sw + 6));
          const newH = Math.max(foH, Math.ceil(sh + 2));
          const curX = parseFloat(fo.getAttribute('x') || '0');
          const curY = parseFloat(fo.getAttribute('y') || '0');
          fo.setAttribute('width', String(newW));
          fo.setAttribute('height', String(newH));
          if (fo.hasAttribute('x')) fo.setAttribute('x', String(curX - (newW - foW) / 2));
          if (fo.hasAttribute('y')) fo.setAttribute('y', String(curY - (newH - foH) / 2));
        } else {
          const scale = Math.max(0.75, Math.min(foW / Math.max(1, sw), foH / Math.max(1, sh), 1));
          inner.style.transformOrigin = 'center center';
          inner.style.transform = 'scale(' + scale.toFixed(4) + ')';
        }
      });
    }

=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
    function zoomAroundPoint(targetZoom, mx, my) {
      const clamped = Math.min(25, Math.max(0.02, targetZoom));
      const svgX = camX + mx / zoom;
      const svgY = camY + my / zoom;
      zoom = clamped;
      camX = svgX - mx / zoom;
      camY = svgY - my / zoom;
      updateCamera();
    }

    function zoom100() {
      zoomAroundPoint(1.0, viewport.clientWidth / 2, viewport.clientHeight / 2);
    }

    function selectDiagram(index) {
      if (index < 0 || index >= DIAGRAMS.length) return;
      activeIndex = index;
      const item = DIAGRAMS[index];

      activeTitleEl.textContent = item.title;
      activeBadgeEl.textContent = item.type;
      activeBadgeEl.className = 'type-badge type-' + item.type;
      activePathEl.textContent = item.relPath;
      activeDimsEl.textContent = (item.type === 'PUML' ? 'PlantUML Vektor' : 'Mermaid Vektor') + ' • Originalmål: ' + Math.round(item.origW) + ' × ' + Math.round(item.origH);
      activeNoteEl.textContent = item.note;
      navIndexEl.textContent = (index + 1) + ' / ' + DIAGRAMS.length;

      const svgStart = item.rawSvg.indexOf('<svg');
      viewport.innerHTML = svgStart >= 0 ? item.rawSvg.slice(svgStart) : item.rawSvg;
      activeSvg = viewport.querySelector('svg');

      if (activeSvg) {
        const paper = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        paper.setAttribute('x', String(item.origX - 24));
        paper.setAttribute('y', String(item.origY - 24));
        paper.setAttribute('width', String(item.origW + 48));
        paper.setAttribute('height', String(item.origH + 48));
        paper.setAttribute('rx', '10');
        paper.setAttribute('fill', '#FFFFFF');
        paper.setAttribute('stroke', '#CBD5E1');
        paper.setAttribute('stroke-width', '1.5');
        const firstG = activeSvg.querySelector('g');
        activeSvg.insertBefore(paper, firstG || activeSvg.firstChild);

        activeSvg.style.removeProperty('max-width');
        activeSvg.style.removeProperty('background');
        activeSvg.style.removeProperty('background-color');
        activeSvg.setAttribute('width', '100%');
        activeSvg.setAttribute('height', '100%');
        activeSvg.style.width = '100%';
        activeSvg.style.height = '100%';
        activeSvg.style.display = 'block';
        activeSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
<<<<<<< HEAD
        autoFitForeignObjects(activeSvg);
=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
      }

      const buttons = sidebarList.querySelectorAll('.diagram-btn');
      buttons.forEach((btn) => {
        const isActive = Number(btn.dataset.index) === index;
        btn.classList.toggle('active', isActive);
        if (isActive) {
          btn.scrollIntoView({ block: 'nearest' });
        }
      });

      try {
        history.replaceState(null, '', '#' + encodeURIComponent(item.slug));
      } catch (_) {}

<<<<<<< HEAD
      fitReadable();
=======
      fitAll();
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
    }

    function stepDiagram(delta) {
      const filtered = getFilteredDiagrams();
      if (filtered.length > 0) {
        const pos = filtered.findIndex((d) => d.index === activeIndex);
        if (pos !== -1) {
          const nextPos = (pos + delta + filtered.length) % filtered.length;
          selectDiagram(filtered[nextPos].index);
          return;
        }
      }
      const nextIndex = (activeIndex + delta + DIAGRAMS.length) % DIAGRAMS.length;
      selectDiagram(nextIndex);
    }

    function toggleSidebar() {
      const hidden = appShell.classList.toggle('sidebar-hidden');
      btnToggleSidebar.textContent = hidden ? 'Vis menu' : 'Skjul menu';
    }

    function resolveDiagramIndexFromLocation() {
      const hashRaw = location.hash && location.hash.length > 1 ? location.hash.slice(1) : '';
      const queryRaw = new URLSearchParams(location.search).get('diagram') || '';
      const candidate = hashRaw || queryRaw;
      if (!candidate) return -1;
      let decoded = candidate;
      try {
        decoded = decodeURIComponent(candidate);
      } catch (_) {}
      const cleaned = decoded.trim().replace(/\\.pdf$/i, '');
      return DIAGRAMS.findIndex(
        (d) =>
          d.slug === cleaned ||
          d.relPath === decoded ||
          d.relPath === cleaned ||
          d.fileName === decoded ||
          d.fileName === cleaned
      );
    }

    viewport.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (!activeSvg) return;
        const rect = viewport.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.006 : 0.0018));
        zoomAroundPoint(zoom * factor, mx, my);
      },
      { passive: false }
    );

    viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !activeSvg) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartCamX = camX;
      dragStartCamY = camY;
      viewport.classList.add('is-grabbing');
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    viewport.addEventListener('pointermove', (e) => {
      if (!isDragging || !activeSvg) return;
      camX = dragStartCamX - (e.clientX - dragStartX) / zoom;
      camY = dragStartCamY - (e.clientY - dragStartY) / zoom;
      updateCamera();
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      viewport.classList.remove('is-grabbing');
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    viewport.addEventListener('dblclick', (e) => {
      if (!activeSvg) return;
      const rect = viewport.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      zoomAroundPoint(zoom * (e.shiftKey ? 0.5 : 2), mx, my);
    });

    new ResizeObserver(() => {
      updateCamera();
    }).observe(viewport);

    searchInput.addEventListener('input', renderSidebar);
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      renderSidebar();
      searchInput.focus();
    });

    btnPrev.addEventListener('click', () => stepDiagram(-1));
    btnNext.addEventListener('click', () => stepDiagram(1));
    btnToggleSidebar.addEventListener('click', toggleSidebar);
    btnFitAll.addEventListener('click', fitAll);
<<<<<<< HEAD
    btnFitWidth.addEventListener('click', fitWidth);
=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
    btnFitHeight.addEventListener('click', fitHeight);
    btnZoom100.addEventListener('click', zoom100);
    btnZoomIn.addEventListener('click', () => zoomAroundPoint(zoom * 1.25, viewport.clientWidth / 2, viewport.clientHeight / 2));
    btnZoomOut.addEventListener('click', () => zoomAroundPoint(zoom / 1.25, viewport.clientWidth / 2, viewport.clientHeight / 2));

    let copyResetTimer = null;
    btnCopyLink.addEventListener('click', async () => {
      const url = location.href;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        btnCopyLink.textContent = 'Kopieret!';
        clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(() => {
          btnCopyLink.textContent = 'Kopiér link';
        }, 1600);
      } catch (_) {}
    });

    btnDownload.addEventListener('click', () => {
      const item = DIAGRAMS[activeIndex];
      const blob = new Blob([item.rawSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    document.addEventListener('keydown', (e) => {
      if (document.activeElement === searchInput) {
        if (e.key === 'Escape') {
          if (searchInput.value) {
            searchInput.value = '';
            renderSidebar();
          } else {
            searchInput.blur();
          }
        }
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        stepDiagram(-1);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        stepDiagram(1);
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomAroundPoint(zoom * 1.25, viewport.clientWidth / 2, viewport.clientHeight / 2);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomAroundPoint(zoom / 1.25, viewport.clientWidth / 2, viewport.clientHeight / 2);
      } else if (e.key === '0') {
        e.preventDefault();
        fitAll();
<<<<<<< HEAD
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        fitWidth();
=======
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        fitHeight();
      } else if (e.key === '1') {
        e.preventDefault();
        zoom100();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleSidebar();
      }
    });

    renderSidebar();
    const resolvedInitial = resolveDiagramIndexFromLocation();
    selectDiagram(resolvedInitial !== -1 ? resolvedInitial : 0);

    window.addEventListener('hashchange', () => {
      const idx = resolveDiagramIndexFromLocation();
      if (idx !== -1 && idx !== activeIndex) {
        selectDiagram(idx);
      }
    });
  </script>
</body>
</html>
`;
}

async function main() {
  if (!fs.existsSync(MERMAID_MIN_JS)) {
    throw new Error(`Missing Mermaid bundle at ${MERMAID_MIN_JS}. Run 'npm install' first.`);
  }
  const mermaidJsContent = fs.readFileSync(MERMAID_MIN_JS, "utf8");
  const jobs = collectViewerJobs();

  console.log(`Building interactive diagram viewer with ${jobs.length} diagrams...`);

  const browser = await launchBrowser();
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();

  const diagrams = [];
  const errors = [];

  try {
    await page.setViewportSize({ width: 2400, height: 1800 });
    await page.setContent(
<<<<<<< HEAD
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { box-sizing: border-box; }
            html, body, #stage, svg, foreignObject, foreignObject div, foreignObject span, foreignObject p {
              font-family: ${DIAGRAM_FONT_FAMILY};
              font-size: 14px;
              line-height: 1.45;
            }
            foreignObject { overflow: visible; }
          </style>
        </head>
        <body><div id="stage"></div></body>
      </html>`,
      { waitUntil: "domcontentloaded" }
    );
    await page.addScriptTag({ content: mermaidJsContent });
    await page.evaluate((fontFamily) => {
=======
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="stage"></div></body></html>',
      { waitUntil: "domcontentloaded" }
    );
    await page.addScriptTag({ content: mermaidJsContent });
    await page.evaluate(() => {
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        maxTextSize: 200000,
        maxEdges: 2000,
<<<<<<< HEAD
        fontFamily,
        flowchart: { htmlLabels: true, wrappingWidth: 360, padding: 16 },
        class: { htmlLabels: true },
      });
    }, DIAGRAM_FONT_FAMILY);
=======
        flowchart: { htmlLabels: true },
      });
    });
>>>>>>> d44e77c35dadb0fb5f786368805985c847f32431

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      try {
        let rendered;
        if (job.type === "PUML") {
          rendered = loadPlantUmlSvg(job.svgPath);
        } else {
          rendered = await renderMermaidForViewer(page, i, job.code);
        }

        diagrams.push({
          index: i,
          slug: job.slug,
          groupId: job.groupId,
          groupLabel: job.groupLabel,
          relPath: job.relPath,
          fileName: job.fileName,
          type: job.type,
          title: job.title,
          note: job.note,
          origX: rendered.origX,
          origY: rendered.origY,
          origW: rendered.origW,
          origH: rendered.origH,
          rawSvg: rendered.rawSvg,
        });

        console.log(
          `[${String(i + 1).padStart(2, "0")}/${jobs.length}] OK  ${job.slug} (${job.type}, ${Math.round(rendered.origW)}x${Math.round(rendered.origH)})`
        );
      } catch (err) {
        console.error(
          `[${String(i + 1).padStart(2, "0")}/${jobs.length}] ERR ${job.slug}: ${err.message}`
        );
        errors.push({ slug: job.slug, error: err.message });
      }
    }
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  if (errors.length > 0) {
    throw new Error(`Failed to render ${errors.length} diagram(s): ${errors.map((e) => e.slug).join(", ")}`);
  }

  const html = buildHtmlDocument(diagrams);
  fs.writeFileSync(OUT_HTML_PATH, html, "utf8");
  console.log(`\nWrote ${path.relative(ROOT_DIR, OUT_HTML_PATH)} (${diagrams.length} diagrams, ${html.length} bytes).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
