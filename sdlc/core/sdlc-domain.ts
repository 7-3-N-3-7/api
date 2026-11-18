export type ProjectStatus =
  | "Backlog"
  | "Spec Ready"
  | "Red (Outer BDD)"
  | "Inner TDD"
  | "Green Gate"
  | "Done"
  | "Regression";

export type SpecTarget = "@fullstack" | "@backend-only" | "@ui-only";

export interface BackendTargetConfig {
  cucumberJson: string;
  jacocoXml: string;
  minLineCoverage: number;
  minBranchCoverage: number;
  minInstructionCoverage: number;
  minComplexityCoverage: number;
  minMethodCoverage: number;
  minClassCoverage: number;
}

export interface FrontendTargetConfig {
  cucumberJson: string;
  vitestSummaryJson: string;
  minLineCoverage: number;
  minStatementCoverage: number;
  minFunctionCoverage: number;
  minBranchCoverage: number;
}

export interface RepositoryTargetsConfig {
  controlPlane: string;
  backend: string;
  frontend: string;
}

export interface SdlcConfig {
  projectTitle: string;
  repositories?: RepositoryTargetsConfig;
  branches: {
    release: string;
    integration: string;
    prefix: string;
  };
  specs: {
    rootDir: string;
    sharedDir: string;
    backendOnlyTag: string;
    frontendOnlyTag: string;
    fullstackTag: string;
    issueTagPrefix: string;
    parentTagPrefix: string;
    spawnSubIssueTag: string;
  };
  gates: {
    requireSecretScan: boolean;
    requireAllSubIssuesDone: boolean;
    targets: {
      backend: BackendTargetConfig;
      frontend: FrontendTargetConfig;
    };
  };
  projectBoard: {
    statuses: ProjectStatus[];
  };
}

export interface ParsedIssueSpec {
  issueId: number;
  title: string;
  slug: string;
  sliceSlug: string;
  target: SpecTarget;
  parentIssueId: number | null;
  rawGherkin: string;
  normalizedFeatureText: string;
  valid: boolean;
  validationErrors: string[];
}

export interface ScenarioBlock {
  title: string;
  tags: string[];
  hasSpawnSubIssueTag: boolean;
  issueIds: number[];
}

export interface FeatureMetadata {
  featureTitle: string;
  featureTags: string[];
  issueIds: number[];
  parentIds: number[];
  target: SpecTarget;
  scenarios: ScenarioBlock[];
  spawnCandidates: ScenarioBlock[];
}

export interface BranchPlan {
  issueId: number;
  branchName: string;
  baseBranch: string;
}

export interface JacocoCoverageMetrics {
  line: number;
  branch: number;
  instruction: number;
  complexity: number;
  method: number;
  clazz: number;
}

export interface IstanbulCoverageMetrics {
  line: number;
  statement: number;
  function: number;
  branch: number;
}

export interface CucumberIssueSummary {
  passed: number;
  failed: number;
}

export interface CucumberReportSummary {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  byIssue: Record<number, CucumberIssueSummary>;
  brokenIssueIds: number[];
}

export interface SdlcNodeStatus {
  issueId: number;
  title: string;
  status: ProjectStatus;
}

export interface TargetVerificationInput {
  cucumber: CucumberReportSummary | null;
  jacoco?: JacocoCoverageMetrics | null;
  istanbul?: IstanbulCoverageMetrics | null;
}

export interface SdlcEvaluationInput {
  issueId: number;
  target: SpecTarget;
  specValid: boolean;
  hasLinkedBranch: boolean;
  hasImplementationCommits: boolean;
  isPreviouslyDone: boolean;
  isMerged: boolean;
  secretScanPassed: boolean;
  subIssues: SdlcNodeStatus[];
  backend?: TargetVerificationInput;
  frontend?: TargetVerificationInput;
}

export interface SdlcEvaluationResult {
  status: ProjectStatus;
  canMerge: boolean;
  reasons: string[];
  brokenIssueIds: number[];
  backendPassed: boolean;
  frontendPassed: boolean;
  coveragePassed: boolean;
  summaryMarkdown: string;
}

export function slugifyTitle(input: string): string {
  const normalized = input
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return normalized || "spec";
}

function extractFormSection(body: string, heading: string): string | null {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `^###\\s+${escaped}\\s*$\\r?\\n([\\s\\S]*?)(?=^###\\s+|(?![\\s\\S]))`,
    "im"
  );
  const match = body.match(regex);
  if (!match) return null;
  const value = match[1].trim();
  return value === "_No response_" ? "" : value;
}

function extractFencedGherkin(text: string): string | null {
  const fenced = text.match(/```(?:gherkin)?\s*\r?\n([\s\S]*?)```/i);
  if (fenced) {
    return fenced[1].trim();
  }
  const featureIdx = text.search(/^\s*(?:@[^\r\n]+\r?\n)*Feature:/m);
  if (featureIdx >= 0) {
    return text.slice(featureIdx).trim();
  }
  return null;
}

function normalizeTarget(rawTarget: string | null, config: SdlcConfig): SpecTarget {
  const lower = (rawTarget || "").toLowerCase();
  if ((lower.includes("@backend-only") || lower.includes("backend")) && !lower.includes("fullstack")) {
    return config.specs.backendOnlyTag as SpecTarget;
  }
  if (
    (lower.includes("@ui-only") || lower.includes("frontend") || /\bui\b/.test(lower)) &&
    !lower.includes("fullstack")
  ) {
    return config.specs.frontendOnlyTag as SpecTarget;
  }
  return config.specs.fullstackTag as SpecTarget;
}

function parseIssueNumberList(tags: string[], prefix: string): number[] {
  const ids = new Set<number>();
  for (const tag of tags) {
    if (tag.startsWith(prefix)) {
      const num = Number.parseInt(tag.slice(prefix.length), 10);
      if (Number.isInteger(num) && num > 0) {
        ids.add(num);
      }
    }
  }
  return [...ids].sort((a, b) => a - b);
}

export function injectIssueTags(
  rawGherkin: string,
  requiredTags: string[]
): string {
  const lines = rawGherkin.replace(/\r\n/g, "\n").split("\n");
  const featureLineIdx = lines.findIndex((line) => /^\s*Feature:/i.test(line));
  if (featureLineIdx === -1) {
    return `${requiredTags.join(" ")}\nFeature: Unspecified\n${rawGherkin}`.trim();
  }

  let firstTagIdx = featureLineIdx;
  const existingTags: string[] = [];
  for (let i = featureLineIdx - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("@")) {
      firstTagIdx = i;
      existingTags.unshift(...trimmed.split(/\s+/));
    } else if (trimmed === "") {
      continue;
    } else {
      break;
    }
  }

  const mergedTags: string[] = [];
  for (const tag of [...requiredTags, ...existingTags]) {
    if (tag && !mergedTags.includes(tag)) {
      mergedTags.push(tag);
    }
  }

  const before = lines.slice(0, firstTagIdx);
  const after = lines.slice(featureLineIdx);
  return [...before, mergedTags.join(" "), ...after].join("\n").trim() + "\n";
}

export function parseIssueBody(
  issueNumber: number,
  title: string,
  body: string,
  config: SdlcConfig
): ParsedIssueSpec {
  const rawBody = body || "";
  const sliceRaw = extractFormSection(rawBody, "Vertical Slice") || "core";
  const targetRaw = extractFormSection(rawBody, "Target");
  const parentRaw = extractFormSection(rawBody, "Parent Issue");
  const gherkinSection = extractFormSection(rawBody, "Gherkin Specification");

  const sliceSlug = slugifyTitle(sliceRaw.split(/\s+/)[0]);
  const target = normalizeTarget(targetRaw, config);

  let parentIssueId: number | null = null;
  if (parentRaw) {
    const parentMatch = parentRaw.match(/#?(\d+)/);
    if (parentMatch) {
      const parsed = Number.parseInt(parentMatch[1], 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        parentIssueId = parsed;
      }
    }
  }

  const rawGherkin =
    extractFencedGherkin(gherkinSection || rawBody) || "";

  const validationErrors: string[] = [];
  if (!/^\s*Feature:/im.test(rawGherkin)) {
    validationErrors.push("Missing 'Feature:' header in Gherkin specification.");
  }
  if (!/^\s*Scenario(?: Outline)?:/im.test(rawGherkin)) {
    validationErrors.push("Missing at least one 'Scenario:' or 'Scenario Outline:'.");
  }
  if (!/^\s*(?:Given|When|Then)\s+\S+/im.test(rawGherkin)) {
    validationErrors.push("Missing Gherkin steps ('Given', 'When', or 'Then').");
  }

  const tags = [
    target,
    `@slice-${sliceSlug}`,
    `${config.specs.issueTagPrefix}${issueNumber}`,
  ];
  if (parentIssueId !== null) {
    tags.push(`${config.specs.parentTagPrefix}${parentIssueId}`);
  }

  const valid = validationErrors.length === 0;
  const normalizedFeatureText = valid
    ? injectIssueTags(rawGherkin, tags)
    : "";

  return {
    issueId: issueNumber,
    title,
    slug: slugifyTitle(title),
    sliceSlug,
    target,
    parentIssueId,
    rawGherkin,
    normalizedFeatureText,
    valid,
    validationErrors,
  };
}

export function extractFeatureMetadata(
  featureText: string,
  config: SdlcConfig
): FeatureMetadata {
  const lines = featureText.replace(/\r\n/g, "\n").split("\n");
  let pendingTags: string[] = [];
  let featureTitle = "";
  let featureTags: string[] = [];
  const scenarios: ScenarioBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    if (line.startsWith("@")) {
      pendingTags.push(...line.split(/\s+/).filter((t) => t.startsWith("@")));
      continue;
    }
    const featMatch = line.match(/^Feature:\s*(.+)$/i);
    if (featMatch) {
      featureTitle = featMatch[1].trim();
      featureTags = [...pendingTags];
      pendingTags = [];
      continue;
    }
    const scenMatch = line.match(/^Scenario(?: Outline)?:\s*(.+)$/i);
    if (scenMatch) {
      const scenarioTags = [...pendingTags];
      pendingTags = [];
      const combinedTags = [...featureTags, ...scenarioTags];
      scenarios.push({
        title: scenMatch[1].trim(),
        tags: scenarioTags,
        hasSpawnSubIssueTag: scenarioTags.includes(config.specs.spawnSubIssueTag),
        issueIds: parseIssueNumberList(combinedTags, config.specs.issueTagPrefix),
      });
      continue;
    }
    pendingTags = [];
  }

  const target: SpecTarget = featureTags.includes(config.specs.backendOnlyTag)
    ? (config.specs.backendOnlyTag as SpecTarget)
    : featureTags.includes(config.specs.frontendOnlyTag)
      ? (config.specs.frontendOnlyTag as SpecTarget)
      : (config.specs.fullstackTag as SpecTarget);

  return {
    featureTitle,
    featureTags,
    issueIds: parseIssueNumberList(featureTags, config.specs.issueTagPrefix),
    parentIds: parseIssueNumberList(featureTags, config.specs.parentTagPrefix),
    target,
    scenarios,
    spawnCandidates: scenarios.filter((s) => s.hasSpawnSubIssueTag),
  };
}

export function replaceSpawnSubIssueTag(
  featureText: string,
  scenarioTitle: string,
  childIssueId: number,
  parentIssueId: number,
  config: SdlcConfig
): string {
  const lines = featureText.replace(/\r\n/g, "\n").split("\n");
  const replacementTags = `${config.specs.issueTagPrefix}${childIssueId} ${config.specs.parentTagPrefix}${parentIssueId}`;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(/^Scenario(?: Outline)?:\s*(.+)$/i);
    if (match && match[1].trim() === scenarioTitle.trim()) {
      for (let j = i - 1; j >= 0; j--) {
        const trimmed = lines[j].trim();
        if (trimmed.startsWith("@")) {
          if (trimmed.includes(config.specs.spawnSubIssueTag)) {
            lines[j] = lines[j].replace(
              config.specs.spawnSubIssueTag,
              replacementTags
            );
            return lines.join("\n");
          }
        } else if (trimmed !== "") {
          break;
        }
      }
      const indent = lines[i].match(/^(\s*)/)![1];
      lines.splice(i, 0, `${indent}${replacementTags}`);
      return lines.join("\n");
    }
  }
  return lines.join("\n");
}

export function syncFeatureToIssueBody(
  originalIssueBody: string,
  updatedFeatureText: string
): string {
  const cleanFeature = updatedFeatureText.trim();
  const block = `\`\`\`gherkin\n${cleanFeature}\n\`\`\``;
  if (/```(?:gherkin)?\s*\r?\n[\s\S]*?```/i.test(originalIssueBody)) {
    return originalIssueBody.replace(
      /```(?:gherkin)?\s*\r?\n[\s\S]*?```/i,
      block
    );
  }
  return `${originalIssueBody.trimEnd()}\n\n### Gherkin Specification\n\n${block}\n`;
}

export function resolveBranchPlan(
  params: { issueId: number; title: string; parentBranch?: string | null },
  config: SdlcConfig
): BranchPlan {
  const slug = slugifyTitle(params.title);
  return {
    issueId: params.issueId,
    branchName: `${config.branches.prefix}/${params.issueId}-${slug}`,
    baseBranch: params.parentBranch || config.branches.integration,
  };
}

export function parseBranchIssueId(
  branchName: string,
  config: SdlcConfig
): number | null {
  const escapedPrefix = config.branches.prefix.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const match = branchName.match(new RegExp(`^${escapedPrefix}/(\\d+)(?:-|$)`));
  if (!match) return null;
  const id = Number.parseInt(match[1], 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function parseCucumberJsonReport(
  jsonText: string,
  config: SdlcConfig
): CucumberReportSummary {
  const parsed = JSON.parse(jsonText) as Array<{
    tags?: Array<{ name?: string }>;
    elements?: Array<{
      type?: string;
      tags?: Array<{ name?: string }>;
      steps?: Array<{ result?: { status?: string } }>;
    }>;
  }>;

  let totalScenarios = 0;
  let passedScenarios = 0;
  let failedScenarios = 0;
  const byIssue: Record<number, CucumberIssueSummary> = {};
  const brokenSet = new Set<number>();

  for (const feature of parsed) {
    const featureTags = (feature.tags || [])
      .map((t) => t.name || "")
      .filter(Boolean);
    for (const element of feature.elements || []) {
      if (element.type === "background") continue;
      totalScenarios++;
      const scenarioTags = (element.tags || [])
        .map((t) => t.name || "")
        .filter(Boolean);
      const steps = element.steps || [];
      const hasFailed =
        steps.length === 0 ||
        steps.some((step) => step.result?.status !== "passed");

      if (hasFailed) {
        failedScenarios++;
      } else {
        passedScenarios++;
      }

      const issueIds = parseIssueNumberList(
        [...featureTags, ...scenarioTags],
        config.specs.issueTagPrefix
      );
      for (const issueId of issueIds) {
        if (!byIssue[issueId]) {
          byIssue[issueId] = { passed: 0, failed: 0 };
        }
        if (hasFailed) {
          byIssue[issueId].failed++;
          brokenSet.add(issueId);
        } else {
          byIssue[issueId].passed++;
        }
      }
    }
  }

  return {
    totalScenarios,
    passedScenarios,
    failedScenarios,
    byIssue,
    brokenIssueIds: [...brokenSet].sort((a, b) => a - b),
  };
}

export function parseJacocoXmlReport(xmlText: string): JacocoCoverageMetrics {
  const withoutPackages = xmlText.replace(/<package\b[\s\S]*?<\/package>/g, "");
  const counters: Record<string, number> = {};
  const counterRegex = /<counter\b([^>]*)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = counterRegex.exec(withoutPackages)) !== null) {
    const attrs = match[1];
    const typeMatch = attrs.match(/\btype="([A-Z]+)"/);
    const missedMatch = attrs.match(/\bmissed="(\d+)"/);
    const coveredMatch = attrs.match(/\bcovered="(\d+)"/);
    if (typeMatch && missedMatch && coveredMatch) {
      const missed = Number.parseInt(missedMatch[1], 10);
      const covered = Number.parseInt(coveredMatch[1], 10);
      const total = missed + covered;
      counters[typeMatch[1]] = total === 0 ? 1 : covered / total;
    }
  }

  return {
    line: counters.LINE ?? 0,
    branch: counters.BRANCH ?? 0,
    instruction: counters.INSTRUCTION ?? 0,
    complexity: counters.COMPLEXITY ?? 0,
    method: counters.METHOD ?? 0,
    clazz: counters.CLASS ?? 0,
  };
}

export function parseIstanbulSummaryJson(jsonText: string): IstanbulCoverageMetrics {
  const parsed = JSON.parse(jsonText) as {
    total?: {
      lines?: { pct?: number };
      statements?: { pct?: number };
      functions?: { pct?: number };
      branches?: { pct?: number };
    };
  };
  const total = parsed.total || {};
  return {
    line: (total.lines?.pct ?? 0) / 100,
    statement: (total.statements?.pct ?? 0) / 100,
    function: (total.functions?.pct ?? 0) / 100,
    branch: (total.branches?.pct ?? 0) / 100,
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function evaluateSdlcState(
  input: SdlcEvaluationInput,
  config: SdlcConfig
): SdlcEvaluationResult {
  const reasons: string[] = [];
  const needBackend =
    input.target === config.specs.fullstackTag ||
    input.target === config.specs.backendOnlyTag;
  const needFrontend =
    input.target === config.specs.fullstackTag ||
    input.target === config.specs.frontendOnlyTag;

  const beBddOk =
    !needBackend ||
    Boolean(
      input.backend?.cucumber &&
        input.backend.cucumber.totalScenarios > 0 &&
        input.backend.cucumber.failedScenarios === 0
    );
  const feBddOk =
    !needFrontend ||
    Boolean(
      input.frontend?.cucumber &&
        input.frontend.cucumber.totalScenarios > 0 &&
        input.frontend.cucumber.failedScenarios === 0
    );

  const beCov = input.backend?.jacoco;
  const beRules = config.gates.targets.backend;
  const beCovOk =
    !needBackend ||
    Boolean(
      beCov &&
        beCov.line >= beRules.minLineCoverage &&
        beCov.branch >= beRules.minBranchCoverage &&
        beCov.instruction >= beRules.minInstructionCoverage &&
        beCov.complexity >= beRules.minComplexityCoverage &&
        beCov.method >= beRules.minMethodCoverage &&
        beCov.clazz >= beRules.minClassCoverage
    );

  const feCov = input.frontend?.istanbul;
  const feRules = config.gates.targets.frontend;
  const feCovOk =
    !needFrontend ||
    Boolean(
      feCov &&
        feCov.line >= feRules.minLineCoverage &&
        feCov.statement >= feRules.minStatementCoverage &&
        feCov.function >= feRules.minFunctionCoverage &&
        feCov.branch >= feRules.minBranchCoverage
    );

  if (needBackend && !beBddOk) {
    reasons.push("Backend Cucumber BDD scenarios not passing.");
  }
  if (needBackend && !beCovOk) {
    reasons.push(
      `Backend JaCoCo coverage below ${pct(beRules.minLineCoverage)} threshold across all 6 counters.`
    );
  }
  if (needFrontend && !feBddOk) {
    reasons.push("Frontend Cucumber BDD scenarios not passing.");
  }
  if (needFrontend && !feCovOk) {
    reasons.push(
      `Frontend Istanbul coverage below ${pct(feRules.minBranchCoverage)} threshold across all 4 counters.`
    );
  }

  const secretOk = !config.gates.requireSecretScan || input.secretScanPassed;
  if (!secretOk) {
    reasons.push("Secret scan failed (TruffleHog).");
  }

  const openSubIssues = input.subIssues.filter((sub) => sub.status !== "Done");
  const subIssuesOk =
    !config.gates.requireAllSubIssuesDone || openSubIssues.length === 0;
  if (!subIssuesOk) {
    reasons.push(
      `Waiting on ${openSubIssues.length} unfinished Sub-Issue(s): ${openSubIssues
        .map((s) => `#${s.issueId}`)
        .join(", ")}.`
    );
  }

  const brokenSet = new Set<number>([
    ...(input.backend?.cucumber?.brokenIssueIds ?? []),
    ...(input.frontend?.cucumber?.brokenIssueIds ?? []),
  ]);
  const brokenIssueIds = [...brokenSet].sort((a, b) => a - b);

  const canMerge =
    input.specValid && beBddOk && feBddOk && beCovOk && feCovOk && secretOk && subIssuesOk;

  const hasAnyPassingBdd =
    (needBackend && Boolean(input.backend?.cucumber && input.backend.cucumber.passedScenarios > 0)) ||
    (needFrontend && Boolean(input.frontend?.cucumber && input.frontend.cucumber.passedScenarios > 0));

  let status: ProjectStatus;
  if (
    input.isPreviouslyDone &&
    ((!beBddOk && needBackend) || (!feBddOk && needFrontend) || brokenIssueIds.includes(input.issueId))
  ) {
    status = "Regression";
  } else if (input.isMerged && canMerge) {
    status = "Done";
  } else if (canMerge) {
    status = "Green Gate";
  } else if (
    hasAnyPassingBdd ||
    input.hasImplementationCommits ||
    input.subIssues.length > 0
  ) {
    status = "Inner TDD";
  } else if (input.hasLinkedBranch && input.specValid) {
    status = "Red (Outer BDD)";
  } else if (input.specValid) {
    status = "Spec Ready";
  } else {
    status = "Backlog";
  }

  const summaryMarkdown = [
    `### SDLC Full-Stack Gate — Issue #${input.issueId} (${status})`,
    "",
    "| Check | Resultat | Detaljer |",
    "| :--- | :--- | :--- |",
    `| Backend BDD | ${needBackend ? (beBddOk ? "PASS" : "FAIL") : "N/A"} | ${input.backend?.cucumber ? `${input.backend.cucumber.passedScenarios}/${input.backend.cucumber.totalScenarios} scenarier` : "Ikke kørt"} |`,
    `| Backend JaCoCo (6 tællere) | ${needBackend ? (beCovOk ? "PASS" : "FAIL") : "N/A"} | ${beCov ? `L:${pct(beCov.line)} B:${pct(beCov.branch)} I:${pct(beCov.instruction)} C:${pct(beCov.complexity)} M:${pct(beCov.method)} Cl:${pct(beCov.clazz)}` : "Ikke kørt"} |`,
    `| Frontend BDD | ${needFrontend ? (feBddOk ? "PASS" : "FAIL") : "N/A"} | ${input.frontend?.cucumber ? `${input.frontend.cucumber.passedScenarios}/${input.frontend.cucumber.totalScenarios} scenarier` : "Ikke kørt"} |`,
    `| Frontend Istanbul (4 tællere) | ${needFrontend ? (feCovOk ? "PASS" : "FAIL") : "N/A"} | ${feCov ? `L:${pct(feCov.line)} S:${pct(feCov.statement)} F:${pct(feCov.function)} B:${pct(feCov.branch)}` : "Ikke kørt"} |`,
    `| Security (TruffleHog) | ${secretOk ? "PASS" : "FAIL"} | Secret scan |`,
    `| Hierarkiske Sub-Issues | ${subIssuesOk ? "PASS" : "BLOCKED"} | ${input.subIssues.length - openSubIssues.length}/${input.subIssues.length} Done |`,
  ].join("\n");

  return {
    status,
    canMerge,
    reasons,
    brokenIssueIds,
    backendPassed: beBddOk && beCovOk,
    frontendPassed: feBddOk && feCovOk,
    coveragePassed: beCovOk && feCovOk,
    summaryMarkdown,
  };
}

/**
 * Resolves which implementation repositories (`backend`, `frontend`) belong to a SpecTarget.
 */
export function resolveTargetRepositories(
  target: SpecTarget,
  config: SdlcConfig
): string[] {
  if (!config.repositories) return [];
  if (target === config.specs.backendOnlyTag) {
    return [config.repositories.backend];
  }
  if (target === config.specs.frontendOnlyTag) {
    return [config.repositories.frontend];
  }
  return [config.repositories.backend, config.repositories.frontend];
}
