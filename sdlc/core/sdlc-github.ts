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
  type SeedFeatureSpec,
  type SpecTarget,
  buildSeedFieldValues,
  buildStatusOptionInputs,
  evaluateSdlcState,
  extractFeatureMetadata,
  extractSeedFeatureFromGherkin,
  formatSeedParentIssueBody,
  formatSeedSubIssueBody,
  injectSeedIssueTags,
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

export interface ProjectV2Meta {
  id: string;
  number: number;
  url: string;
  statusFieldId: string | null;
  statusOptionIds: Record<string, string>;
  textFieldIds: Record<string, string>;
}

export interface SeedFeaturesOptions {
  rootDir: string;
  updateFeatureTags?: boolean;
  closeIssues?: boolean;
}

export interface SeededFeatureResult {
  parentIssueId: number;
  title: string;
  slice: string;
  target: SpecTarget;
  featureRelPath: string | null;
  subIssues: Array<{ issueId: number; title: string; target: SpecTarget }>;
}

export interface SeedFeaturesOutput {
  dryRun: boolean;
  features: SeededFeatureResult[];
  totalParents: number;
  totalSubIssues: number;
  totalItems: number;
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
      "GraphQL-Features": "sub_issues",
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

function resolveContext(rootDir: string, deps: SdlcAdapterDeps) {
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

interface RawProjectFieldNode {
  id?: string;
  name?: string;
  options?: Array<{ id?: string; name?: string }>;
}

interface RawProjectNode {
  id: string;
  number: number;
  url: string;
  title: string;
  fields?: { nodes?: RawProjectFieldNode[] };
}

function extractProjectMeta(project: RawProjectNode): ProjectV2Meta {
  let statusFieldId: string | null = null;
  const statusOptionIds: Record<string, string> = {};
  const textFieldIds: Record<string, string> = {};

  for (const field of project.fields?.nodes || []) {
    if (!field.id || !field.name) continue;
    if (field.name === "Status") {
      statusFieldId = field.id;
      for (const opt of field.options || []) {
        if (opt.id && opt.name) {
          statusOptionIds[opt.name] = opt.id;
        }
      }
    } else {
      textFieldIds[field.name] = field.id;
    }
  }

  return {
    id: project.id,
    number: project.number,
    url: project.url,
    statusFieldId,
    statusOptionIds,
    textFieldIds,
  };
}

async function upsertProjectV2ItemWithFields(
  ctx: ReturnType<typeof resolveContext>,
  projectMeta: ProjectV2Meta,
  contentId: string,
  status: ProjectStatus,
  textFields: Record<string, string>
): Promise<string> {
  const addRes = await ctx.graphql<{
    addProjectV2ItemById: { item: { id: string } };
  }>(
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }`,
    { projectId: projectMeta.id, contentId },
    ctx.token
  );
  const itemId = addRes.addProjectV2ItemById.item.id;

  const statusOptionId = projectMeta.statusOptionIds[status];
  if (projectMeta.statusFieldId && statusOptionId) {
    await ctx.graphql(
      `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { singleSelectOptionId: $optionId }
          }
        ) {
          projectV2Item { id }
        }
      }`,
      {
        projectId: projectMeta.id,
        itemId,
        fieldId: projectMeta.statusFieldId,
        optionId: statusOptionId,
      },
      ctx.token
    );
  }

  for (const [fieldName, textValue] of Object.entries(textFields)) {
    const fieldId = projectMeta.textFieldIds[fieldName];
    if (!fieldId) continue;
    await ctx.graphql(
      `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $text: String!) {
        updateProjectV2ItemFieldValue(
          input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: { text: $text }
          }
        ) {
          projectV2Item { id }
        }
      }`,
      {
        projectId: projectMeta.id,
        itemId,
        fieldId,
        text: textValue,
      },
      ctx.token
    );
  }

  return itemId;
}

async function syncIssueOnProjectV2(
  config: SdlcConfig,
  ctx: ReturnType<typeof resolveContext>,
  issueId: number,
  status: ProjectStatus,
  textFields: Record<string, string>
): Promise<void> {
  const data = await ctx.graphql<{
    repository: {
      issue: { id: string } | null;
      projectsV2?: { nodes?: RawProjectNode[] };
    };
  }>(
    `query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) { id }
        projectsV2(first: 20) {
          nodes {
            id
            number
            url
            title
            fields(first: 50) {
              nodes {
                ... on ProjectV2Field { id name }
                ... on ProjectV2SingleSelectField { id name options { id name } }
              }
            }
          }
        }
      }
    }`,
    { owner: ctx.owner, repo: ctx.repo, issueNumber: issueId },
    ctx.token
  );
  const issueNodeId = data.repository.issue?.id;
  const projectNode = data.repository.projectsV2?.nodes?.find(
    (p) => p.title === config.projectTitle
  );
  if (!issueNodeId || !projectNode) return;
  await upsertProjectV2ItemWithFields(
    ctx,
    extractProjectMeta(projectNode),
    issueNodeId,
    status,
    textFields
  );
}

export async function bootstrapProject(
  options: BootstrapOptions,
  deps: SdlcAdapterDeps = {}
): Promise<{
  projectTitle: string;
  dryRun: boolean;
  operations: SdlcDryRunOperation[];
  projectMeta?: ProjectV2Meta;
}> {
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
        nodes?: RawProjectNode[];
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
              nodes {
                ... on ProjectV2Field { id name }
                ... on ProjectV2SingleSelectField { id name options { id name } }
              }
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

  let targetProjectNode: RawProjectNode;
  if (existingProject) {
    targetProjectNode = existingProject;
  } else {
    const created = await ctx.graphql<{
      createProjectV2: { projectV2: RawProjectNode };
    }>(
      `mutation($ownerId: ID!, $title: String!, $repositoryId: ID!) {
        createProjectV2(input: { ownerId: $ownerId, title: $title, repositoryId: $repositoryId }) {
          projectV2 {
            id
            number
            url
            title
            fields(first: 50) {
              nodes {
                ... on ProjectV2Field { id name }
                ... on ProjectV2SingleSelectField { id name options { id name } }
              }
            }
          }
        }
      }`,
      {
        ownerId: ownerData.repository.owner.id,
        title: config.projectTitle,
        repositoryId: ownerData.repository.id,
      },
      ctx.token
    );
    targetProjectNode = created.createProjectV2.projectV2;
  }

  const projectMeta = extractProjectMeta(targetProjectNode);
  for (const field of customFields) {
    if (projectMeta.textFieldIds[field.name]) continue;
    const createdField = await ctx.graphql<{
      createProjectV2Field?: { projectV2Field?: { id?: string; name?: string } };
    }>(
      `mutation($projectId: ID!, $name: String!, $dataType: ProjectV2CustomFieldType!) {
        createProjectV2Field(input: { projectId: $projectId, name: $name, dataType: $dataType }) {
          projectV2Field { ... on ProjectV2Field { id name } }
        }
      }`,
      { projectId: projectMeta.id, name: field.name, dataType: field.dataType },
      ctx.token
    );
    const createdInfo = createdField.createProjectV2Field?.projectV2Field;
    if (createdInfo?.id && createdInfo.name) {
      projectMeta.textFieldIds[createdInfo.name] = createdInfo.id;
    }
  }

  if (projectMeta.statusFieldId) {
    const missingStatuses = config.projectBoard.statuses.filter(
      (s) => !projectMeta.statusOptionIds[s]
    );
    if (missingStatuses.length > 0) {
      const existingOptions = Object.entries(projectMeta.statusOptionIds).map(([name, id]) => ({
        id,
        name,
      }));
      const optionInputs = buildStatusOptionInputs(config.projectBoard.statuses, existingOptions);
      const updatedField = await ctx.graphql<{
        updateProjectV2Field?: {
          projectV2Field?: { options?: Array<{ id?: string; name?: string }> };
        };
      }>(
        `mutation($fieldId: ID!, $singleSelectOptions: [ProjectV2SingleSelectFieldOptionInput!]!) {
          updateProjectV2Field(input: { fieldId: $fieldId, singleSelectOptions: $singleSelectOptions }) {
            projectV2Field {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }`,
        { fieldId: projectMeta.statusFieldId, singleSelectOptions: optionInputs },
        ctx.token
      );
      for (const opt of updatedField.updateProjectV2Field?.projectV2Field?.options || []) {
        if (opt.id && opt.name) {
          projectMeta.statusOptionIds[opt.name] = opt.id;
        }
      }
    }
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

  ctx.log(`Bootstrapped GitHub Project v2 #${projectMeta.number}: ${projectMeta.url}`);
  return { projectTitle: config.projectTitle, dryRun: false, operations, projectMeta };
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
    try {
      await syncIssueOnProjectV2(config, ctx, options.issueId, nextStatus, {
        Slice: parsed.sliceSlug,
        Target: parsed.target,
        "Linked Branch": branchPlan.branchName,
      });
    } catch (err) {
      ctx.log(`Project v2 sync skipped for Issue #${options.issueId}: ${String(err)}`);
    }
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
    try {
      const subIssues = options.subIssues || [];
      const subCount = subIssues.length;
      const doneCount = subIssues.filter((s) => s.status === "Done").length;
      await syncIssueOnProjectV2(config, ctx, issueId, evaluation.status, {
        Target: options.target || (config.specs.fullstackTag as SpecTarget),
        "Backend BDD": evaluation.backendPassed ? "PASS" : "FAIL",
        "Frontend BDD": evaluation.frontendPassed ? "PASS" : "FAIL",
        "Coverage Gate": evaluation.coveragePassed ? "PASS (100%)" : "FAIL",
        "Sub-Issues": `${doneCount}/${subCount} Done`,
        "Linked Branch": options.branch,
      });
      for (const brokenId of evaluation.brokenIssueIds) {
        if (brokenId !== issueId) {
          await syncIssueOnProjectV2(config, ctx, brokenId, "Regression", {
            "Linked Branch": options.branch,
          });
        }
      }
    } catch (err) {
      ctx.log(`Project v2 sync skipped for Issue #${issueId}: ${String(err)}`);
    }
  }

  ctx.log(evaluation.summaryMarkdown);
  return { issueId, branch: options.branch, evaluation, operations };
}

const SDLC_SEED_LABELS = [
  { name: "sdlc:feature", color: "0e8a16", description: "Parent vertical-slice SDLC feature specification" },
  { name: "sdlc:sub-issue", color: "1d76db", description: "Hierarchical scenario Sub-Issue linked to a parent feature" },
  { name: "sdlc:done", color: "2da44e", description: "Verified and completed SDLC requirement" },
  { name: "sdlc:seeded", color: "5319e7", description: "Seeded from verified baseline specifications" },
  { name: "sdlc:spec-ready", color: "0075ca", description: "Valid Gherkin specification ready for branch sync" },
];

function collectSeedSpecs(rootDir: string, config: SdlcConfig): SeedFeatureSpec[] {
  const featureFiles = collectFeatureFiles(path.join(rootDir, config.specs.rootDir)).sort((a, b) =>
    path.relative(rootDir, a).replace(/\\/g, "/").localeCompare(path.relative(rootDir, b).replace(/\\/g, "/"))
  );
  const specs: SeedFeatureSpec[] = featureFiles.map((absPath) => {
    const relPath = path.relative(rootDir, absPath).replace(/\\/g, "/");
    return extractSeedFeatureFromGherkin(relPath, fs.readFileSync(absPath, "utf8"), config);
  });
  for (const decl of config.declarativeFeatures || []) {
    specs.push({
      featureTitle: decl.title,
      slice: decl.slice,
      target: decl.target,
      featureRelPath: null,
      rawFeatureText: null,
      description: decl.description,
      scenarios: decl.subIssues.map((sub) => ({
        title: sub.title,
        target: sub.target,
        rawBlock: "",
        description: sub.description,
      })),
    });
  }
  return specs;
}

interface ExistingIssueRef {
  number: number;
  id: string;
  state: string;
}

async function ensureSeededIssue(
  ctx: ReturnType<typeof resolveContext>,
  existingByTitle: Map<string, ExistingIssueRef>,
  title: string,
  body: string,
  labels: string[]
): Promise<ExistingIssueRef> {
  const existing = existingByTitle.get(title);
  if (existing) {
    return existing;
  }
  const createdUrl = ctx.runGh([
    "issue",
    "create",
    "--repo",
    `${ctx.owner}/${ctx.repo}`,
    "--title",
    title,
    "--body",
    body,
    "--label",
    labels.join(","),
  ]);
  const idMatch = createdUrl.match(/\/issues\/(\d+)/);
  if (!idMatch) {
    throw new Error(`Could not parse issue number from gh output: '${createdUrl}'`);
  }
  const number = Number.parseInt(idMatch[1], 10);
  const nodeData = await ctx.graphql<{
    repository: { issue: { id: string } };
  }>(
    `query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) { id }
      }
    }`,
    { owner: ctx.owner, repo: ctx.repo, issueNumber: number },
    ctx.token
  );
  const created: ExistingIssueRef = {
    number,
    id: nodeData.repository.issue.id,
    state: "OPEN",
  };
  existingByTitle.set(title, created);
  return created;
}

/**
 * Seeds existing `.feature` files and declarative features into GitHub Issues, native Sub-Issues,
 * and GitHub Projects v2 items with `Done` status and full custom field values.
 */
export async function seedExistingFeatures(
  options: SeedFeaturesOptions,
  deps: SdlcAdapterDeps = {}
): Promise<SeedFeaturesOutput> {
  const config = loadSdlcConfig(options.rootDir);
  const ctx = resolveContext(options.rootDir, deps);
  const updateFeatureTags = options.updateFeatureTags ?? true;
  const closeIssues = options.closeIssues ?? true;
  const specs = collectSeedSpecs(options.rootDir, config);

  const operations: SdlcDryRunOperation[] = [
    {
      action: "bootstrap_project_v2",
      details: { title: config.projectTitle, statuses: config.projectBoard.statuses },
    },
    {
      action: "ensure_labels",
      details: { labels: SDLC_SEED_LABELS.map((l) => l.name) },
    },
  ];

  let projectMeta!: ProjectV2Meta;
  const existingByTitle = new Map<string, ExistingIssueRef>();

  if (!ctx.dryRun) {
    const boot = await bootstrapProject({ rootDir: options.rootDir }, deps);
    projectMeta = boot.projectMeta!;
    for (const label of SDLC_SEED_LABELS) {
      ctx.runGh([
        "label",
        "create",
        label.name,
        "--repo",
        `${ctx.owner}/${ctx.repo}`,
        "--color",
        label.color,
        "--description",
        label.description,
        "--force",
      ]);
    }
    const rawList = ctx.runGh([
      "issue",
      "list",
      "--repo",
      `${ctx.owner}/${ctx.repo}`,
      "--state",
      "all",
      "--limit",
      "500",
      "--json",
      "number,id,title,state",
    ]);
    const existingList = JSON.parse(rawList) as Array<{
      number: number;
      id: string;
      title: string;
      state: string;
    }>;
    for (const item of existingList) {
      existingByTitle.set(item.title, {
        number: item.number,
        id: item.id,
        state: item.state,
      });
    }
  }

  let previewCounter = 1;
  const seededFeatures: SeededFeatureResult[] = [];
  let totalSubIssues = 0;

  for (const spec of specs) {
    const parentTitle = `[SDLC Feature]: ${spec.featureTitle}`;
    const parentBody = formatSeedParentIssueBody(spec);
    const parentRef: ExistingIssueRef = ctx.dryRun
      ? { number: previewCounter++, id: "PREVIEW", state: "OPEN" }
      : await ensureSeededIssue(ctx, existingByTitle, parentTitle, parentBody, [
          "sdlc:feature",
          "sdlc:done",
          "sdlc:seeded",
        ]);

    operations.push({
      action: "create_parent_issue",
      details: {
        issueId: parentRef.number,
        title: parentTitle,
        slice: spec.slice,
        target: spec.target,
        featureRelPath: spec.featureRelPath,
      },
    });

    const scenarioIssueIds: Record<string, number> = {};
    const childResults: Array<{ issueId: number; title: string; target: SpecTarget }> = [];
    const hasFeatureFile = Boolean(spec.featureRelPath);

    for (const scenario of spec.scenarios) {
      const childTitle = `[Sub-Issue]: ${scenario.title}`;
      const childBody = formatSeedSubIssueBody(spec, scenario, parentRef.number);
      const childRef: ExistingIssueRef = ctx.dryRun
        ? { number: previewCounter++, id: "PREVIEW", state: "OPEN" }
        : await ensureSeededIssue(ctx, existingByTitle, childTitle, childBody, [
            "sdlc:sub-issue",
            "sdlc:done",
            "sdlc:seeded",
          ]);

      scenarioIssueIds[scenario.title] = childRef.number;
      childResults.push({ issueId: childRef.number, title: childTitle, target: scenario.target });
      totalSubIssues++;

      const childFields = buildSeedFieldValues({
        slice: spec.slice,
        target: scenario.target,
        hasFeatureFile,
        subIssueSummary: `Parent #${parentRef.number}`,
        linkedBranch: config.branches.release,
      });

      operations.push(
        {
          action: "create_sub_issue",
          details: {
            issueId: childRef.number,
            parentIssueId: parentRef.number,
            title: childTitle,
            slice: spec.slice,
            target: scenario.target,
          },
        },
        {
          action: "link_native_sub_issue",
          details: { parentIssueId: parentRef.number, childIssueId: childRef.number },
        },
        {
          action: "upsert_project_v2_item",
          details: { issueId: childRef.number, status: "Done", fields: childFields },
        }
      );

      if (!ctx.dryRun) {
        await ctx.graphql(
          `mutation($issueId: ID!, $subIssueId: ID!) {
            addSubIssue(input: { issueId: $issueId, subIssueId: $subIssueId, replaceParent: true }) {
              issue { id }
              subIssue { id }
            }
          }`,
          { issueId: parentRef.id, subIssueId: childRef.id },
          ctx.token
        );
        await upsertProjectV2ItemWithFields(ctx, projectMeta, childRef.id, "Done", childFields);
      }

      if (closeIssues) {
        operations.push({
          action: "close_issue",
          details: { issueId: childRef.number, reason: "completed" },
        });
        if (!ctx.dryRun && childRef.state !== "CLOSED") {
          ctx.runGh([
            "issue",
            "close",
            String(childRef.number),
            "--repo",
            `${ctx.owner}/${ctx.repo}`,
            "--reason",
            "completed",
          ]);
        }
      }
    }

    const parentFields = buildSeedFieldValues({
      slice: spec.slice,
      target: spec.target,
      hasFeatureFile,
      subIssueSummary: `${spec.scenarios.length}/${spec.scenarios.length} Done`,
      linkedBranch: config.branches.release,
    });

    operations.push({
      action: "upsert_project_v2_item",
      details: { issueId: parentRef.number, status: "Done", fields: parentFields },
    });

    if (!ctx.dryRun) {
      await upsertProjectV2ItemWithFields(ctx, projectMeta, parentRef.id, "Done", parentFields);
    }

    if (closeIssues) {
      operations.push({
        action: "close_issue",
        details: { issueId: parentRef.number, reason: "completed" },
      });
      if (!ctx.dryRun && parentRef.state !== "CLOSED") {
        ctx.runGh([
          "issue",
          "close",
          String(parentRef.number),
          "--repo",
          `${ctx.owner}/${ctx.repo}`,
          "--reason",
          "completed",
        ]);
      }
    }

    if (updateFeatureTags && spec.featureRelPath) {
      const absFeaturePath = path.join(options.rootDir, spec.featureRelPath);
      const tagged = injectSeedIssueTags(
        fs.readFileSync(absFeaturePath, "utf8"),
        parentRef.number,
        scenarioIssueIds,
        config
      );
      operations.push({
        action: "tag_feature_file",
        details: {
          featureRelPath: spec.featureRelPath,
          parentIssueId: parentRef.number,
          taggedScenarios: spec.scenarios.length,
        },
      });
      if (!ctx.dryRun) {
        fs.writeFileSync(absFeaturePath, tagged, "utf8");
      }
    }

    seededFeatures.push({
      parentIssueId: parentRef.number,
      title: parentTitle,
      slice: spec.slice,
      target: spec.target,
      featureRelPath: spec.featureRelPath,
      subIssues: childResults,
    });
  }

  recordOperations(options.rootDir, ctx.dryRunLogPath, operations, ctx.dryRun);

  const totalItems = seededFeatures.length + totalSubIssues;
  const modeTag = ctx.dryRun ? "[DRY-RUN] " : "";
  const summaryLines = [
    `${modeTag}SDLC Seed Plan: ${seededFeatures.length} Parent Issues + ${totalSubIssues} Sub-Issues = ${totalItems} total Project v2 items`,
    "",
    "| # | Slice | Target | Sub-Issues | Spec File | Title |",
    "| :--- | :--- | :--- | ---: | :--- | :--- |",
    ...seededFeatures.map(
      (f) =>
        `| #${f.parentIssueId} | ${f.slice} | ${f.target} | ${f.subIssues.length} | ${f.featureRelPath || "(declarative)"} | ${f.title} |`
    ),
    "",
    ...seededFeatures.flatMap((f) => [
      `### #${f.parentIssueId} ${f.title} (${f.slice} / ${f.target})`,
      ...f.subIssues.map((s) => `  - #${s.issueId} ${s.title} (${s.target})`),
    ]),
  ];
  ctx.log(summaryLines.join("\n"));

  return {
    dryRun: ctx.dryRun,
    features: seededFeatures,
    totalParents: seededFeatures.length,
    totalSubIssues,
    totalItems,
    operations,
  };
}

function getArg(args: string[], flag: string, fallback: string): string {
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

  if (command === "seed") {
    await seedExistingFeatures(
      { rootDir, updateFeatureTags: !rest.includes("--no-tag-files") },
      effectiveDeps
    );
    return 0;
  }

  (effectiveDeps.log || console.error)(
    `Unknown SDLC command '${command || ""}'. Use: bootstrap | sync-issue | spawn | verify | status | seed`
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
