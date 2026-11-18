import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  type BranchPlan,
  type CucumberReportSummary,
  type IstanbulCoverageMetrics,
  type JacocoCoverageMetrics,
  type ProjectStatus,
  type SdlcConfig,
  type SdlcEvaluationResult,
  type SdlcNodeStatus,
  type SpecTarget,
  evaluateSdlcState,
  extractFeatureMetadata,
  parseBranchIssueId,
  parseCucumberJsonReport,
  parseIssueBody,
  parseIstanbulSummaryJson,
  parseJacocoXmlReport,
  replaceSpawnSubIssueTag,
  resolveBranchPlan,
  resolveTargetRepositories,
  syncFeatureToIssueBody,
} from "./sdlc-domain.ts";

export interface SdlcDryRunOperation {
  action: string;
  details: Record<string, unknown>;
}

export interface SdlcAdapterDeps {
  token?: string;
  dryRun?: boolean;
  repoOwner?: string;
  repoName?: string;
  dryRunLogPath?: string;
  runGh?: (args: string[]) => string;
  graphql?: <T>(query: string, variables: Record<string, unknown>, token: string) => Promise<T>;
  log?: (msg: string) => void;
}

export interface BootstrapOptions {
  rootDir: string;
}

export interface SyncIssueOptions {
  rootDir: string;
  issueId: number;
  title: string;
  body: string;
  parentBranch?: string | null;
}

export interface SpawnSubIssuesOptions {
  rootDir: string;
  parentIssueId: number;
  parentBranch: string;
  featureFileRelPath?: string;
}

export interface VerifyWorkspaceOptions {
  rootDir: string;
  branch: string;
  issueId?: number;
  target?: SpecTarget;
  secretScanPassed?: boolean;
  isPreviouslyDone?: boolean;
  isMerged?: boolean;
  hasImplementationCommits?: boolean;
  subIssues?: SdlcNodeStatus[];
}

export interface VerifyWorkspaceOutput {
  issueId: number | null;
  branch: string;
  evaluation: SdlcEvaluationResult;
  operations: SdlcDryRunOperation[];
}

export function loadSdlcConfig(rootDir: string): SdlcConfig {
  const configPath = path.join(rootDir, "sdlc.config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as SdlcConfig;
}

function defaultRunGh(args: string[]): string {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

async function defaultGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  token: string
): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!res.ok || payload.errors?.length) {
    const errText = payload.errors?.map((e) => e.message).join("; ") || res.statusText;
    throw new Error(`GitHub GraphQL error: ${errText}`);
  }
  return payload.data as T;
}

function resolveContext(rootDir: string, deps: SdlcAdapterDeps = {}) {
  const token =
    deps.token ?? process.env.SDLC_PROJECT_TOKEN ?? process.env.GITHUB_TOKEN ?? "";
  const dryRun = deps.dryRun ?? !token;
  const repoSlug = process.env.GITHUB_REPOSITORY || "";
  const [envOwner, envName] = repoSlug.includes("/") ? repoSlug.split("/") : ["7-3-N-3-7", "api"];
  return {
    token,
    dryRun,
    owner: deps.repoOwner || envOwner,
    repo: deps.repoName || envName,
    dryRunLogPath: deps.dryRunLogPath || path.join(rootDir, ".sdlc-dry-run-log.json"),
    runGh: deps.runGh || defaultRunGh,
    graphql: deps.graphql || defaultGraphql,
    log: deps.log || ((msg: string) => console.log(msg)),
  };
}

function ensureDir(dirPath: string): void {
  const missing: string[] = [];
  let current = path.resolve(dirPath);
  while (!fs.existsSync(current)) {
    missing.push(current);
    current = path.dirname(current);
  }
  for (let i = missing.length - 1; i >= 0; i--) {
    fs.mkdirSync(missing[i]);
  }
}

function recordOperations(
  rootDir: string,
  dryRunLogPath: string,
  operations: SdlcDryRunOperation[],
  dryRun: boolean
): void {
  if (!dryRun) return;
  let existing: SdlcDryRunOperation[] = [];
  if (fs.existsSync(dryRunLogPath)) {
    existing = JSON.parse(fs.readFileSync(dryRunLogPath, "utf8")) as SdlcDryRunOperation[];
  }
  ensureDir(path.dirname(path.resolve(rootDir, dryRunLogPath)));
  fs.writeFileSync(dryRunLogPath, JSON.stringify([...existing, ...operations], null, 2), "utf8");
}

function readOptionalFile(filePath: string): string | null {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function collectFeatureFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFeatureFiles(full));
    } else if (entry.name.endsWith(".feature")) {
      results.push(full);
    }
  }
  return results.sort();
}

export async function bootstrapProject(
  options: BootstrapOptions,
  deps: SdlcAdapterDeps = {}
): Promise<{ projectTitle: string; dryRun: boolean; operations: SdlcDryRunOperation[] }> {
  const config = loadSdlcConfig(options.rootDir);
  const ctx = resolveContext(options.rootDir, deps);
  const customFields = [
    { name: "Slice", dataType: "TEXT" },
    { name: "Target", dataType: "TEXT" },
    { name: "Backend BDD", dataType: "TEXT" },
    { name: "Frontend BDD", dataType: "TEXT" },
    { name: "Coverage Gate", dataType: "TEXT" },
    { name: "Sub-Issues", dataType: "TEXT" },
    { name: "Linked Branch", dataType: "TEXT" },
  ];

  const operations: SdlcDryRunOperation[] = [
    {
      action: "project_v2_create",
      details: { owner: ctx.owner, repo: ctx.repo, title: config.projectTitle, statuses: config.projectBoard.statuses },
    },
    { action: "project_v2_fields", details: { fields: customFields } },
    {
      action: "actions_workflow_permissions",
      details: { endpoint: `repos/${ctx.owner}/${ctx.repo}/actions/permissions/workflow`, default_workflow_permissions: "write" },
    },
    {
      action: "branch_protection",
      details: {
        branches: [config.branches.integration, config.branches.release],
        requiredCheck: "SDLC Full-Stack Gate",
      },
    },
  ];

  if (ctx.dryRun) {
    recordOperations(options.rootDir, ctx.dryRunLogPath, operations, true);
    ctx.log(`[DRY-RUN] Bootstrapped GitHub Projects v2 plan for '${config.projectTitle}'.`);
    return { projectTitle: config.projectTitle, dryRun: true, operations };
  }

  const ownerData = await ctx.graphql<{
    repository: {
      id: string;
      owner: { id: string };
      projectsV2?: {
        nodes?: Array<{
          id: string;
          number: number;
          url: string;
          title: string;
          fields?: { nodes?: Array<{ id?: string; name?: string }> };
        }>;
      };
    };
  }>(
    `query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        owner { id }
        projectsV2(first: 20) {
          nodes {
            id
            number
            url
            title
            fields(first: 50) {
              nodes { ... on ProjectV2Field { id name } }
            }
          }
        }
      }
    }`,
    { owner: ctx.owner, repo: ctx.repo },
    ctx.token
  );

  const existingProject = ownerData.repository.projectsV2?.nodes?.find(
    (p) => p.title === config.projectTitle
  );

  let targetProject: { id: string; number: number; url: string };
  if (existingProject) {
    targetProject = {
      id: existingProject.id,
      number: existingProject.number,
      url: existingProject.url,
    };
  } else {
    const created = await ctx.graphql<{
      createProjectV2: { projectV2: { id: string; number: number; url: string } };
    }>(
      `mutation($ownerId: ID!, $title: String!, $repositoryId: ID!) {
        createProjectV2(input: { ownerId: $ownerId, title: $title, repositoryId: $repositoryId }) {
          projectV2 { id number url }
        }
      }`,
      {
        ownerId: ownerData.repository.owner.id,
        title: config.projectTitle,
        repositoryId: ownerData.repository.id,
      },
      ctx.token
    );
    targetProject = created.createProjectV2.projectV2;
  }

  const existingFieldNames = new Set(
    (existingProject?.fields?.nodes || []).map((f) => f.name || "")
  );
  const projectId = targetProject.id;
  for (const field of customFields) {
    if (existingFieldNames.has(field.name)) continue;
    await ctx.graphql(
      `mutation($projectId: ID!, $name: String!, $dataType: ProjectV2CustomFieldType!) {
        createProjectV2Field(input: { projectId: $projectId, name: $name, dataType: $dataType }) {
          projectV2Field { ... on ProjectV2Field { id name } }
        }
      }`,
      { projectId, name: field.name, dataType: field.dataType },
      ctx.token
    );
  }

  try {
    ctx.runGh([
      "api",
      "--method",
      "PUT",
      `repos/${ctx.owner}/${ctx.repo}/actions/permissions/workflow`,
      "-f",
      "default_workflow_permissions=write",
      "-F",
      "can_approve_pull_request_reviews=true",
    ]);
  } catch {
    ctx.log(
      "Organization policy manages default GITHUB_TOKEN workflow permissions; relying on explicit workflow permissions and SDLC_PROJECT_TOKEN."
    );
  }

  ctx.log(`Bootstrapped GitHub Project v2 #${targetProject.number}: ${targetProject.url}`);
  return { projectTitle: config.projectTitle, dryRun: false, operations };
}

function syncChildRepoBranches(
  target: SpecTarget,
  branchPlan: BranchPlan,
  config: SdlcConfig,
  ctx: ReturnType<typeof resolveContext>
): SdlcDryRunOperation[] {
  const repos = resolveTargetRepositories(target, config);
  const ops: SdlcDryRunOperation[] = [];
  for (const childRepo of repos) {
    ops.push({
      action: "sync_child_repo_branch",
      details: {
        repo: childRepo,
        branchName: branchPlan.branchName,
        baseBranch: branchPlan.baseBranch,
      },
    });
    if (!ctx.dryRun) {
      let baseSha = "";
      try {
        baseSha = ctx.runGh([
          "api",
          `repos/${childRepo}/git/ref/heads/${branchPlan.baseBranch}`,
          "--jq",
          ".object.sha",
        ]);
      } catch {
        baseSha = ctx.runGh([
          "api",
          `repos/${childRepo}/git/ref/heads/${config.branches.integration}`,
          "--jq",
          ".object.sha",
        ]);
      }
      try {
        ctx.runGh([
          "api",
          "--method",
          "POST",
          `repos/${childRepo}/git/refs`,
          "-f",
          `ref=refs/heads/${branchPlan.branchName}`,
          "-f",
          `sha=${baseSha}`,
        ]);
      } catch {
        ctx.log(
          `Branch '${branchPlan.branchName}' already exists or could not be created in '${childRepo}'.`
        );
      }
    }
  }
  return ops;
}

export async function syncIssueToFeature(
  options: SyncIssueOptions,
  deps: SdlcAdapterDeps = {}
): Promise<{
  featurePath: string;
  branchPlan: BranchPlan;
  nextStatus: ProjectStatus;
  operations: SdlcDryRunOperation[];
}> {
  const config = loadSdlcConfig(options.rootDir);
  const ctx = resolveContext(options.rootDir, deps);
  const parsed = parseIssueBody(options.issueId, options.title, options.body, config);
  if (!parsed.valid) {
    throw new Error(`Invalid Gherkin in Issue #${options.issueId}: ${parsed.validationErrors.join(" ")}`);
  }

  const baseBranch =
    options.parentBranch ||
    (parsed.parentIssueId
      ? `${config.branches.prefix}/${parsed.parentIssueId}-parent`
      : config.branches.integration);
  const branchPlan = resolveBranchPlan(
    { issueId: options.issueId, title: options.title, parentBranch: baseBranch },
    config
  );

  const featureRelPath = path.posix.join(
    config.specs.sharedDir,
    `issue_${options.issueId}_${parsed.slug}.feature`
  );
  const featureAbsPath = path.join(options.rootDir, featureRelPath);
  ensureDir(path.dirname(featureAbsPath));
  fs.writeFileSync(featureAbsPath, parsed.normalizedFeatureText, "utf8");

  const nextStatus: ProjectStatus = "Red (Outer BDD)";
  const childOps = syncChildRepoBranches(parsed.target, branchPlan, config, ctx);
  const operations: SdlcDryRunOperation[] = [
    { action: "write_feature_file", details: { featurePath: featureRelPath, target: parsed.target } },
    { action: "create_linked_branch", details: { branchPlan } },
    { action: "set_project_status", details: { issueId: options.issueId, status: nextStatus } },
    ...childOps,
  ];

  if (ctx.dryRun) {
    recordOperations(options.rootDir, ctx.dryRunLogPath, operations, true);
    ctx.log(`[DRY-RUN] Synced Issue #${options.issueId} -> ${featureRelPath} on ${branchPlan.branchName}`);
  } else {
    ctx.runGh([
      "issue",
      "develop",
      String(options.issueId),
      "--repo",
      `${ctx.owner}/${ctx.repo}`,
      "--name",
      branchPlan.branchName,
      "--base",
      branchPlan.baseBranch,
    ]);
  }

  return { featurePath: featureRelPath, branchPlan, nextStatus, operations };
}

export async function spawnSubIssues(
  options: SpawnSubIssuesOptions,
  deps: SdlcAdapterDeps = {}
): Promise<{
  spawned: Array<{ scenarioTitle: string; childIssueId: number; childBranch: string }>;
  operations: SdlcDryRunOperation[];
}> {
  const config = loadSdlcConfig(options.rootDir);
  const ctx = resolveContext(options.rootDir, deps);
  const files = options.featureFileRelPath
    ? [path.join(options.rootDir, options.featureFileRelPath)]
    : collectFeatureFiles(path.join(options.rootDir, config.specs.rootDir));

  const spawned: Array<{ scenarioTitle: string; childIssueId: number; childBranch: string }> = [];
  const operations: SdlcDryRunOperation[] = [];
  let syntheticId = options.parentIssueId * 100 + 1;

  for (const filePath of files) {
    let text = fs.readFileSync(filePath, "utf8");
    const meta = extractFeatureMetadata(text, config);
    if (meta.spawnCandidates.length === 0) continue;

    for (const candidate of meta.spawnCandidates) {
      let childIssueId = syntheticId++;
      if (!ctx.dryRun) {
        const createdUrl = ctx.runGh([
          "issue",
          "create",
          "--repo",
          `${ctx.owner}/${ctx.repo}`,
          "--title",
          candidate.title,
          "--body",
          `Parent Issue: #${options.parentIssueId}\n\n\`\`\`gherkin\nFeature: ${candidate.title}\n  Scenario: ${candidate.title}\n    Given parent issue #${options.parentIssueId} branch exists\n\`\`\``,
        ]);
        const idMatch = createdUrl.match(/\/issues\/(\d+)/);
        if (idMatch) childIssueId = Number.parseInt(idMatch[1], 10);
      }

      const plan = resolveBranchPlan(
        { issueId: childIssueId, title: candidate.title, parentBranch: options.parentBranch },
        config
      );
      text = replaceSpawnSubIssueTag(
        text,
        candidate.title,
        childIssueId,
        options.parentIssueId,
        config
      );

      spawned.push({ scenarioTitle: candidate.title, childIssueId, childBranch: plan.branchName });
      operations.push(
        {
          action: "spawn_sub_issue",
          details: { parentIssueId: options.parentIssueId, childIssueId, branchPlan: plan },
        },
        ...syncChildRepoBranches(meta.target, plan, config, ctx)
      );
    }

    fs.writeFileSync(filePath, text, "utf8");
  }

  recordOperations(options.rootDir, ctx.dryRunLogPath, operations, ctx.dryRun);
  return { spawned, operations };
}

export async function verifyWorkspaceAndSync(
  options: VerifyWorkspaceOptions,
  deps: SdlcAdapterDeps = {}
): Promise<VerifyWorkspaceOutput> {
  const config = loadSdlcConfig(options.rootDir);
  const ctx = resolveContext(options.rootDir, deps);

  const issueId = options.issueId ?? parseBranchIssueId(options.branch, config);
  const isTrunkBranch =
    options.branch === config.branches.integration ||
    options.branch === config.branches.release;
  const beCucumberRaw = readOptionalFile(
    path.join(options.rootDir, config.gates.targets.backend.cucumberJson)
  );
  const beJacocoRaw = readOptionalFile(
    path.join(options.rootDir, config.gates.targets.backend.jacocoXml)
  );
  const feCucumberRaw = readOptionalFile(
    path.join(options.rootDir, config.gates.targets.frontend.cucumberJson)
  );
  const feIstanbulRaw = readOptionalFile(
    path.join(options.rootDir, config.gates.targets.frontend.vitestSummaryJson)
  );

  const beCucumber: CucumberReportSummary | null = beCucumberRaw
    ? parseCucumberJsonReport(beCucumberRaw, config)
    : null;
  const beJacoco: JacocoCoverageMetrics | null = beJacocoRaw
    ? parseJacocoXmlReport(beJacocoRaw)
    : null;
  const feCucumber: CucumberReportSummary | null = feCucumberRaw
    ? parseCucumberJsonReport(feCucumberRaw, config)
    : null;
  const feIstanbul: IstanbulCoverageMetrics | null = feIstanbulRaw
    ? parseIstanbulSummaryJson(feIstanbulRaw)
    : null;

  const evaluation = evaluateSdlcState(
    {
      issueId: issueId ?? 0,
      target: options.target || (config.specs.fullstackTag as SpecTarget),
      specValid: isTrunkBranch || issueId !== null,
      hasLinkedBranch: Boolean(options.branch),
      hasImplementationCommits: options.hasImplementationCommits ?? true,
      isPreviouslyDone: options.isPreviouslyDone ?? false,
      isMerged: options.isMerged ?? false,
      secretScanPassed: options.secretScanPassed ?? true,
      subIssues: options.subIssues ?? [],
      backend: { cucumber: beCucumber, jacoco: beJacoco },
      frontend: { cucumber: feCucumber, istanbul: feIstanbul },
    },
    config
  );

  const operations: SdlcDryRunOperation[] = [
    {
      action: "update_project_v2_status",
      details: {
        issueId,
        branch: options.branch,
        status: evaluation.status,
        canMerge: evaluation.canMerge,
        brokenIssueIds: evaluation.brokenIssueIds,
      },
    },
  ];

  if (options.isMerged && issueId) {
    const syncedBody = syncFeatureToIssueBody(
      `Synced from branch \`${options.branch}\``,
      `Feature: Issue #${issueId} Verified Spec`
    );
    operations.push({ action: "living_spec_sync_to_issue", details: { issueId, bodyLength: syncedBody.length } });
  }

  for (const brokenId of evaluation.brokenIssueIds) {
    operations.push({
      action: "mark_regression",
      details: { issueId: brokenId, status: "Regression" },
    });
  }

  if (ctx.dryRun) {
    recordOperations(options.rootDir, ctx.dryRunLogPath, operations, true);
  } else if (issueId) {
    ctx.runGh([
      "issue",
      "comment",
      String(issueId),
      "--repo",
      `${ctx.owner}/${ctx.repo}`,
      "--body",
      evaluation.summaryMarkdown,
    ]);
  }

  ctx.log(evaluation.summaryMarkdown);
  return { issueId, branch: options.branch, evaluation, operations };
}

function getArg(args: string[], flag: string, fallback = ""): string {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : fallback;
}

export async function runCli(
  argv: string[],
  deps: SdlcAdapterDeps = {}
): Promise<number> {
  const [command, ...rest] = argv;
  const rootDir = path.resolve(getArg(rest, "--root", process.cwd()));
  const dryRun = rest.includes("--dry-run") ? true : deps.dryRun;
  const dryRunLogFlag = getArg(rest, "--dry-run-log", "");
  const effectiveDeps: SdlcAdapterDeps = {
    ...deps,
    dryRun,
    ...(dryRunLogFlag ? { dryRunLogPath: path.resolve(dryRunLogFlag) } : {}),
  };

  if (command === "bootstrap") {
    await bootstrapProject({ rootDir }, effectiveDeps);
    return 0;
  }

  if (command === "sync-issue") {
    const issueId = Number.parseInt(getArg(rest, "--issue", "1"), 10);
    const title = getArg(rest, "--title", `Feature #${issueId}`);
    const bodyFile = getArg(rest, "--body-file", "");
    const body = bodyFile
      ? fs.readFileSync(bodyFile, "utf8")
      : getArg(
          rest,
          "--body",
          "### Vertical Slice\ncore\n### Target\n@fullstack\n### Gherkin Specification\n```gherkin\nFeature: CLI Sync\n  Scenario: Synced via CLI\n    Given a requirement exists\n    When synced\n    Then a branch is created\n```"
        );
    await syncIssueToFeature({ rootDir, issueId, title, body }, effectiveDeps);
    return 0;
  }

  if (command === "spawn") {
    const parentIssueId = Number.parseInt(getArg(rest, "--parent", "1"), 10);
    const parentBranch = getArg(rest, "--branch", "feature/1-parent");
    await spawnSubIssues({ rootDir, parentIssueId, parentBranch }, effectiveDeps);
    return 0;
  }

  if (command === "verify" || command === "status") {
    const branch = getArg(rest, "--branch", "feature/1-generic-sdlc-framework");
    const targetRaw = getArg(rest, "--target", "@fullstack") as SpecTarget;
    const isMerged = rest.includes("--merged");
    const result = await verifyWorkspaceAndSync(
      { rootDir, branch, target: targetRaw, isMerged },
      effectiveDeps
    );
    return command === "verify" && !result.evaluation.canMerge ? 1 : 0;
  }

  (effectiveDeps.log || console.error)(
    `Unknown SDLC command '${command || ""}'. Use: bootstrap | sync-issue | spawn | verify | status`
  );
  return 2;
}

export async function maybeRunMain(
  metaUrl = import.meta.url,
  argv = process.argv,
  deps: SdlcAdapterDeps = {}
): Promise<boolean> {
  const entryScript = argv[1] ? path.resolve(argv[1]) : "";
  if (!entryScript || metaUrl !== pathToFileURL(entryScript).href) {
    return false;
  }
  try {
    const code = await runCli(argv.slice(2), deps);
    process.exit(code);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  return true;
}

void maybeRunMain();
