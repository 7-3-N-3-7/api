// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type SdlcConfig,
  buildSeedFieldValues,
  buildStatusOptionInputs,
  deriveSliceFromFeaturePath,
  evaluateSdlcState,
  extractFeatureMetadata,
  extractSeedFeatureFromGherkin,
  formatSeedParentIssueBody,
  formatSeedSubIssueBody,
  injectIssueTags,
  injectSeedIssueTags,
  parseBranchIssueId,
  parseCucumberJsonReport,
  parseIssueBody,
  parseIstanbulSummaryJson,
  parseJacocoXmlReport,
  replaceSpawnSubIssueTag,
  resolveBranchPlan,
  resolveTargetRepositories,
  slugifyTitle,
  syncFeatureToIssueBody,
} from "./sdlc-domain.ts";
import {
  bootstrapProject,
  loadSdlcConfig,
  maybeRunMain,
  runCli,
  seedExistingFeatures,
  spawnSubIssues,
  syncIssueToFeature,
  verifyWorkspaceAndSync,
} from "./sdlc-github.ts";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn((_cmd: string, args: string[]) => {
    if (args[0] === "issue" && args[1] === "create") {
      return "https://github.com/7-3-N-3-7/api/issues/777";
    }
    return "ok";
  }),
}));

const baseConfig: SdlcConfig = {
  projectTitle: "EduJournal — Generic Full-Stack SDLC",
  branches: {
    release: "main",
    integration: "dev",
    prefix: "feature",
  },
  specs: {
    rootDir: "specs/features",
    sharedDir: "specs/features/shared",
    backendOnlyTag: "@backend-only",
    frontendOnlyTag: "@ui-only",
    fullstackTag: "@fullstack",
    issueTagPrefix: "@issue-",
    parentTagPrefix: "@parent-",
    spawnSubIssueTag: "@spawn-subissue",
  },
  gates: {
    requireAllSubIssuesDone: true,
    targets: {
      backend: {
        cucumberJson: "backend/target/cucumber-reports/cucumber-report.json",
        jacocoXml: "backend/target/site/jacoco/jacoco.xml",
        minLineCoverage: 1.0,
        minBranchCoverage: 1.0,
        minInstructionCoverage: 1.0,
        minComplexityCoverage: 1.0,
        minMethodCoverage: 1.0,
        minClassCoverage: 1.0,
      },
      frontend: {
        cucumberJson: "frontend/reports/cucumber-report.json",
        vitestSummaryJson: "frontend/coverage/coverage-summary.json",
        minLineCoverage: 1.0,
        minStatementCoverage: 1.0,
        minFunctionCoverage: 1.0,
        minBranchCoverage: 1.0,
      },
    },
  },
  projectBoard: {
    statuses: [
      "Backlog",
      "Spec Ready",
      "Red (Outer BDD)",
      "Inner TDD",
      "Green Gate",
      "Done",
      "Regression",
    ],
  },
};

function makeDirs(dirPath: string): void {
  const missing: string[] = [];
  let current = path.resolve(dirPath);
  while (!fs.existsSync(current)) {
    missing.push(current);
    current = path.dirname(current);
  }
  for (let i = missing.length - 1; i >= 0; i--) fs.mkdirSync(missing[i]);
}

function makeTempWorkspace(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sdlc-test-"));
  fs.writeFileSync(
    path.join(dir, "sdlc.config.json"),
    JSON.stringify(baseConfig, null, 2),
    "utf8"
  );
  return dir;
}

function removeTree(dirPath: string): void {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const child = path.join(dirPath, entry.name);
    if (entry.isDirectory()) removeTree(child);
    else fs.unlinkSync(child);
  }
  fs.rmdirSync(dirPath);
}

const tempDirs: string[] = [];

function trackTempDir(): string {
  const d = makeTempWorkspace();
  tempDirs.push(d);
  return d;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  while (tempDirs.length > 0) {
    removeTree(tempDirs.pop()!);
  }
  delete process.env.SDLC_PROJECT_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_REPOSITORY;
});

describe("sdlc-domain pure contract & state machine", () => {
  it("slugifies Danish titles, empty strings, and truncates cleanly", () => {
    expect(slugifyTitle("Ægte Øl & Åben Klinik!!!") ).toBe("aegte-oel-aaben-klinik");
    expect(slugifyTitle("---")).toBe("spec");
    expect(slugifyTitle("a".repeat(60))).toHaveLength(48);
  });

  it("injects tags above Feature header and handles missing Feature headers", () => {
    const raw = "# comment\n@api @fullstack\n\nFeature: Demo\n  Scenario: S1\n    Given x";
    const tagged = injectIssueTags(raw, ["@fullstack", "@issue-7"]);
    expect(tagged).toContain("@fullstack @issue-7 @api\nFeature: Demo");

    const noFeature = injectIssueTags("Scenario: Loose", ["@fullstack"]);
    expect(noFeature).toContain("@fullstack\nFeature: Unspecified");
  });

  it("parses structured Issue forms, Parent Issues, bare Feature blocks, and invalid bodies", () => {
    const body = [
      "### Parent Issue",
      "#12",
      "### Vertical Slice",
      "finance",
      "### Target",
      "@fullstack",
      "### Gherkin Specification",
      "```gherkin",
      "Feature: Invoice ledger",
      "  Scenario: Post voucher",
      "    Given a valid ledger",
      "    When an invoice posts",
      "    Then JGit records the commit",
      "```",
    ].join("\n");

    const parsed = parseIssueBody(42, "Post Invoice Ledger", body, baseConfig);
    expect(parsed.valid).toBe(true);
    expect(parsed.sliceSlug).toBe("finance");
    expect(parsed.target).toBe("@fullstack");
    expect(parsed.parentIssueId).toBe(12);
    expect(parsed.normalizedFeatureText).toContain("@fullstack @slice-finance @issue-42 @parent-12");

    const backendBody = [
      "### Parent Issue",
      "_No response_",
      "### Vertical Slice",
      "  ",
      "### Target",
      "@backend-only",
      "Feature: Bare API rule",
      "  Scenario Outline: Rule check",
      "    When checking rule",
      "    Then it holds",
    ].join("\n");
    const parsedBe = parseIssueBody(15, "API Rule", backendBody, baseConfig);
    expect(parsedBe.valid).toBe(true);
    expect(parsedBe.target).toBe("@backend-only");
    expect(parsedBe.parentIssueId).toBeNull();
    expect(parsedBe.sliceSlug).toBe("core");

    const uiBody = "### Target\n@ui-only\nFeature: UI Flow\n  Scenario: Open\n    Then button shows";
    expect(parseIssueBody(16, "UI Flow", uiBody, baseConfig).target).toBe("@ui-only");

    const invalid = parseIssueBody(17, "Empty", "just prose", baseConfig);
    expect(invalid.valid).toBe(false);
    expect(invalid.validationErrors).toHaveLength(3);

    const nullBody = parseIssueBody(18, "Null", "" as unknown as string, baseConfig);
    expect(nullBody.valid).toBe(false);
  });

  it("extracts metadata, replaces @spawn-subissue tags, and syncs issue markdown", () => {
    const feature = [
      "# header comment",
      "@ui-only @issue-5 @parent-2 @orphan",
      "Plain ignored line before feature",
      "@backend-only @issue-9",
      "Feature: Parent Work",
      "  @spawn-subissue",
      "  Scenario: Split child task",
      "    Given step one",
      "",
      "  Scenario: Normal task",
      "    Then done",
    ].join("\n");

    const meta = extractFeatureMetadata(feature, baseConfig);
    expect(meta.target).toBe("@backend-only");
    expect(meta.issueIds).toEqual([9]);
    expect(meta.spawnCandidates).toHaveLength(1);
    expect(meta.spawnCandidates[0].title).toBe("Split child task");

    const uiFeature = "@ui-only @parent-1\nFeature: UI Only\n  Scenario: A\n    Given b";
    expect(extractFeatureMetadata(uiFeature, baseConfig).target).toBe("@ui-only");

    const replaced = replaceSpawnSubIssueTag(feature, "Split child task", 901, 9, baseConfig);
    expect(replaced).toContain("@issue-901 @parent-9");
    expect(replaced).not.toContain("@spawn-subissue");

    const inserted = replaceSpawnSubIssueTag(feature, "Normal task", 902, 9, baseConfig);
    expect(inserted).toContain("  @issue-902 @parent-9\n  Scenario: Normal task");

    expect(replaceSpawnSubIssueTag(feature, "Unknown", 903, 9, baseConfig)).toBe(feature);

    const syncedExisting = syncFeatureToIssueBody(
      "Text\n```gherkin\nFeature: Old\n```",
      "Feature: Updated"
    );
    expect(syncedExisting).toContain("Feature: Updated");

    const syncedAppended = syncFeatureToIssueBody("Plain description", "Feature: Appended");
    expect(syncedAppended).toContain("### Gherkin Specification");
    expect(syncedAppended).toContain("Feature: Appended");
  });

  it("resolves hierarchical branches and parses issue numbers from branches", () => {
    expect(resolveBranchPlan({ issueId: 10, title: "Main Slice" }, baseConfig)).toEqual({
      issueId: 10,
      branchName: "feature/10-main-slice",
      baseBranch: "dev",
    });
    expect(
      resolveBranchPlan(
        { issueId: 11, title: "Sub Slice", parentBranch: "feature/10-main-slice" },
        baseConfig
      )
    ).toEqual({
      issueId: 11,
      branchName: "feature/11-sub-slice",
      baseBranch: "feature/10-main-slice",
    });

    expect(parseBranchIssueId("feature/42-klinik-flow", baseConfig)).toBe(42);
    expect(parseBranchIssueId("feature/0-zero", baseConfig)).toBeNull();
    expect(parseBranchIssueId("dev", baseConfig)).toBeNull();
  });

  it("parses Cucumber JSON, JaCoCo XML (6 bundle counters), and Istanbul JSON", () => {
    const cucumberJson = JSON.stringify([
      {
        tags: [{ name: "@issue-10" }, {}],
        elements: [
          { type: "background", steps: [{ result: { status: "passed" } }] },
          { type: "scenario", tags: [{}], steps: [{ result: { status: "passed" } }] },
          { type: "scenario", tags: [{ name: "@issue-20" }], steps: [{ result: { status: "failed" } }] },
          { type: "scenario", tags: [{ name: "@issue-30" }], steps: [] },
        ],
      },
      { elements: [{ type: "scenario" }] },
      {},
    ]);
    const summary = parseCucumberJsonReport(cucumberJson, baseConfig);
    expect(summary.totalScenarios).toBe(4);
    expect(summary.passedScenarios).toBe(1);
    expect(summary.failedScenarios).toBe(3);
    expect(summary.brokenIssueIds).toEqual([10, 20, 30]);

    const jacocoXml = `
      <report name="backend">
        <package name="com/platform">
          <counter type="LINE" missed="50" covered="50"/>
        </package>
        <counter foo="bar"/>
        <counter type="INSTRUCTION" missed="10" covered="990"/>
        <counter type="BRANCH" missed="2" covered="98"/>
        <counter type="LINE" missed="1" covered="99"/>
        <counter type="COMPLEXITY" missed="1" covered="99"/>
        <counter type="METHOD" missed="0" covered="50"/>
        <counter type="CLASS" missed="0" covered="0"/>
      </report>`;
    expect(parseJacocoXmlReport(jacocoXml)).toEqual({
      instruction: 0.99,
      branch: 0.98,
      line: 0.99,
      complexity: 0.99,
      method: 1,
      clazz: 1,
    });
    expect(parseJacocoXmlReport("<report></report>")).toEqual({
      instruction: 0,
      branch: 0,
      line: 0,
      complexity: 0,
      method: 0,
      clazz: 0,
    });

    const istanbul = parseIstanbulSummaryJson(
      JSON.stringify({
        total: {
          lines: { pct: 99.5 },
          statements: { pct: 99.1 },
          functions: { pct: 98.9 },
          branches: { pct: 98.2 },
        },
      })
    );
    expect(istanbul.line).toBeCloseTo(0.995, 5);
    expect(istanbul.statement).toBeCloseTo(0.991, 5);
    expect(istanbul.function).toBeCloseTo(0.989, 5);
    expect(istanbul.branch).toBeCloseTo(0.982, 5);
    expect(parseIstanbulSummaryJson("{}")).toEqual({ line: 0, statement: 0, function: 0, branch: 0 });
  });

  it("evaluates all 7 SDLC FSM statuses and enforces 100% gates & Sub-Issue locks", () => {
    const passCuc = {
      totalScenarios: 2,
      passedScenarios: 2,
      failedScenarios: 0,
      byIssue: { 1: { passed: 2, failed: 0 } },
      brokenIssueIds: [],
    };
    const passJaCoCo = { line: 1, branch: 1, instruction: 1, complexity: 1, method: 1, clazz: 1 };
    const passIstanbul = { line: 1, statement: 1, function: 1, branch: 1 };

    expect(
      evaluateSdlcState(
        {
          issueId: 1,
          target: "@fullstack",
          specValid: false,
          hasLinkedBranch: false,
          hasImplementationCommits: false,
          isPreviouslyDone: false,
          isMerged: false,
          subIssues: [],
        },
        baseConfig
      ).status
    ).toBe("Backlog");

    expect(
      evaluateSdlcState(
        {
          issueId: 1,
          target: "@fullstack",
          specValid: true,
          hasLinkedBranch: false,
          hasImplementationCommits: false,
          isPreviouslyDone: false,
          isMerged: false,
          subIssues: [],
        },
        baseConfig
      ).status
    ).toBe("Spec Ready");

    expect(
      evaluateSdlcState(
        {
          issueId: 1,
          target: "@fullstack",
          specValid: true,
          hasLinkedBranch: true,
          hasImplementationCommits: false,
          isPreviouslyDone: false,
          isMerged: false,
          subIssues: [],
        },
        baseConfig
      ).status
    ).toBe("Red (Outer BDD)");

    const blockedBySub = evaluateSdlcState(
      {
        issueId: 1,
        target: "@backend-only",
        specValid: true,
        hasLinkedBranch: true,
        hasImplementationCommits: true,
        isPreviouslyDone: false,
        isMerged: false,
        subIssues: [{ issueId: 2, title: "Child", status: "Inner TDD" }],
        backend: { cucumber: passCuc, jacoco: passJaCoCo },
      },
      baseConfig
    );
    expect(blockedBySub.status).toBe("Inner TDD");
    expect(blockedBySub.canMerge).toBe(false);
    expect(blockedBySub.reasons).toEqual([
      "Waiting on 1 unfinished Sub-Issue(s): #2.",
    ]);

    const greenUiOnly = evaluateSdlcState(
      {
        issueId: 1,
        target: "@ui-only",
        specValid: true,
        hasLinkedBranch: true,
        hasImplementationCommits: true,
        isPreviouslyDone: false,
        isMerged: false,
        subIssues: [],
        frontend: { cucumber: passCuc, istanbul: passIstanbul },
      },
      baseConfig
    );
    expect(greenUiOnly.status).toBe("Green Gate");
    expect(greenUiOnly.canMerge).toBe(true);

    const mergedDone = evaluateSdlcState(
      {
        issueId: 1,
        target: "@fullstack",
        specValid: true,
        hasLinkedBranch: true,
        hasImplementationCommits: true,
        isPreviouslyDone: false,
        isMerged: true,
        subIssues: [],
        backend: { cucumber: passCuc, jacoco: passJaCoCo },
        frontend: { cucumber: passCuc, istanbul: passIstanbul },
      },
      baseConfig
    );
    expect(mergedDone.status).toBe("Done");

    const regression = evaluateSdlcState(
      {
        issueId: 1,
        target: "@fullstack",
        specValid: true,
        hasLinkedBranch: true,
        hasImplementationCommits: true,
        isPreviouslyDone: true,
        isMerged: true,
        subIssues: [],
        backend: {
          cucumber: { ...passCuc, passedScenarios: 1, failedScenarios: 1, brokenIssueIds: [1] },
          jacoco: passJaCoCo,
        },
        frontend: { cucumber: passCuc, istanbul: passIstanbul },
      },
      baseConfig
    );
    expect(regression.status).toBe("Regression");

    const uiRegression = evaluateSdlcState(
      {
        issueId: 99,
        target: "@ui-only",
        specValid: true,
        hasLinkedBranch: true,
        hasImplementationCommits: true,
        isPreviouslyDone: true,
        isMerged: false,
        subIssues: [],
        frontend: {
          cucumber: { ...passCuc, passedScenarios: 0, failedScenarios: 1, brokenIssueIds: [] },
          istanbul: passIstanbul,
        },
      },
      baseConfig
    );
    expect(uiRegression.status).toBe("Regression");

    const brokenIdRegression = evaluateSdlcState(
      {
        issueId: 10,
        target: "@backend-only",
        specValid: true,
        hasLinkedBranch: true,
        hasImplementationCommits: true,
        isPreviouslyDone: true,
        isMerged: false,
        subIssues: [],
        backend: {
          cucumber: { ...passCuc, brokenIssueIds: [20, 10] },
          jacoco: passJaCoCo,
        },
        frontend: {
          cucumber: { ...passCuc, brokenIssueIds: [15] },
          istanbul: passIstanbul,
        },
      },
      baseConfig
    );
    expect(brokenIdRegression.status).toBe("Regression");
    expect(brokenIdRegression.brokenIssueIds).toEqual([10, 15, 20]);
  });
});

describe("sdlc-github adapter, GraphQL live path, --dry-run, and CLI", () => {
  it("loads config and bootstraps GitHub Projects v2 in dry-run and live mode", async () => {
    const rootDir = trackTempDir();
    const cfg = loadSdlcConfig(rootDir);
    expect(cfg.projectTitle).toBe("EduJournal — Generic Full-Stack SDLC");

    const dryRes = await bootstrapProject({ rootDir }, { dryRun: true, log: () => {} });
    expect(dryRes.dryRun).toBe(true);
    expect(dryRes.operations).toHaveLength(4);
    expect(fs.existsSync(path.join(rootDir, ".sdlc-dry-run-log.json"))).toBe(true);

    // Second dry-run appends cleanly to existing log file
    await bootstrapProject({ rootDir }, { dryRun: true, log: () => {} });

    // Live GraphQL via default fetch mock + mocked gh CLI
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { repository: { id: "R_1", owner: { id: "O_1" } } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { createProjectV2: { projectV2: { id: "P_1", number: 7, url: "https://github.com/projects/7" } } },
        }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: { createProjectV2Field: { projectV2Field: { id: "F_1", name: "Slice" } } } }),
      });
    vi.stubGlobal("fetch", fetchMock);
    process.env.GITHUB_REPOSITORY = "7-3-N-3-7/api";

    const liveRes = await bootstrapProject({ rootDir }, { token: "tok_123", log: () => {} });
    expect(liveRes.dryRun).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(9);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
        json: async () => ({ errors: [{ message: "Bad token" }] }),
      })
    );
    await expect(bootstrapProject({ rootDir }, { token: "bad", log: () => {} })).rejects.toThrow(
      "GitHub GraphQL error: Bad token"
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: "Server Down",
        json: async () => ({}),
      })
    );
    await expect(bootstrapProject({ rootDir }, { token: "bad", log: () => {} })).rejects.toThrow(
      "GitHub GraphQL error: Server Down"
    );
  });

  it("syncs issues to features, validates invalid Gherkin, and spawns hierarchical Sub-Issues", async () => {
    const rootDir = trackTempDir();
    const issueBody = [
      "### Parent Issue",
      "#50",
      "### Vertical Slice",
      "finance",
      "### Target",
      "@fullstack",
      "```gherkin",
      "Feature: Sync test",
      "  @spawn-subissue",
      "  Scenario: Child capability",
      "    Given parent branch",
      "    When child starts",
      "    Then child passes",
      "```",
    ].join("\n");

    const synced = await syncIssueToFeature(
      { rootDir, issueId: 51, title: "Sync Child", body: issueBody },
      { dryRun: true, log: () => {} }
    );
    expect(synced.branchPlan.baseBranch).toBe("feature/50-parent");
    expect(fs.existsSync(path.join(rootDir, synced.featurePath))).toBe(true);

    const ghCalls: string[][] = [];
    const gqlCallsSync: string[] = [];
    await syncIssueToFeature(
      { rootDir, issueId: 52, title: "Live Branch", body: issueBody },
      {
        dryRun: false,
        token: "t",
        runGh: (args) => {
          ghCalls.push(args);
          return "ok";
        },
        graphql: async <T>(query: string) => {
          gqlCallsSync.push(query);
          if (query.includes("projectsV2(first: 20)")) {
            return {
              repository: {
                issue: { id: "I_52" },
                projectsV2: {
                  nodes: [
                    {
                      id: "P_1",
                      number: 1,
                      url: "https://github.com/projects/1",
                      title: baseConfig.projectTitle,
                      fields: {
                        nodes: [
                          { id: "F_ST", name: "Status", options: [{ id: "OPT_RED", name: "Red (Outer BDD)" }] },
                          { id: "F_SL", name: "Slice" },
                        ],
                      },
                    },
                  ],
                },
              },
            } as T;
          }
          if (query.includes("addProjectV2ItemById")) {
            return { addProjectV2ItemById: { item: { id: "ITEM_52" } } } as T;
          }
          return { updateProjectV2ItemFieldValue: { projectV2Item: { id: "ITEM_52" } } } as T;
        },
        log: () => {},
      }
    );
    expect(ghCalls[0]).toContain("develop");
    expect(gqlCallsSync.some((q) => q.includes("updateProjectV2ItemFieldValue"))).toBe(true);

    await expect(
      syncIssueToFeature(
        { rootDir, issueId: 53, title: "Broken", body: "not gherkin" },
        { dryRun: true, log: () => {} }
      )
    ).rejects.toThrow("Invalid Gherkin in Issue #53");

    // Dry-run spawn (issue #51 and #52 both contain @spawn-subissue)
    const spawnDry = await spawnSubIssues(
      { rootDir, parentIssueId: 51, parentBranch: "feature/51-sync-child" },
      { dryRun: true, log: () => {} }
    );
    expect(spawnDry.spawned).toHaveLength(2);
    expect(spawnDry.spawned[0].childIssueId).toBe(5101);

    // Re-add @spawn-subissue and test live spawn + URL parsing
    const specFile = path.join(rootDir, synced.featurePath);
    fs.writeFileSync(
      specFile,
      fs.readFileSync(specFile, "utf8").replace("@issue-5101 @parent-51", "@spawn-subissue"),
      "utf8"
    );
    const spawnLive = await spawnSubIssues(
      {
        rootDir,
        parentIssueId: 51,
        parentBranch: "feature/51-sync-child",
        featureFileRelPath: synced.featurePath,
      },
      { token: "t", dryRun: false, log: () => {} }
    );
    expect(spawnLive.spawned[0].childIssueId).toBe(777);

    const idFallbackMock = vi.fn().mockReturnValue("created-without-number");
    await spawnSubIssues(
      { rootDir, parentIssueId: 51, parentBranch: "feature/51-sync-child", featureFileRelPath: synced.featurePath },
      { token: "t", dryRun: false, runGh: idFallbackMock, log: () => {} }
    );
    expect(idFallbackMock).not.toHaveBeenCalled();

    // Test spawn URL without /issues/number match
    fs.writeFileSync(
      specFile,
      fs.readFileSync(specFile, "utf8").replace("@issue-777 @parent-51", "@spawn-subissue"),
      "utf8"
    );
    await spawnSubIssues(
      { rootDir, parentIssueId: 51, parentBranch: "feature/51-sync-child", featureFileRelPath: synced.featurePath },
      { token: "t", dryRun: false, runGh: () => "https://github.com/custom-url", log: () => {} }
    );

    // Missing specs dir gracefully yields 0 spawned
    const emptyRoot = trackTempDir();
    expect(
      (await spawnSubIssues({ rootDir: emptyRoot, parentIssueId: 1, parentBranch: "dev" }, { dryRun: true })).spawned
    ).toEqual([]);
  });

  it("verifies workspace reports (passing, regression, merged, and missing reports) and executes CLI commands", async () => {
    const rootDir = trackTempDir();
    const cfg = loadSdlcConfig(rootDir);

    // Missing reports -> Red / Inner TDD + failed exit code on verify
    const logPath = path.join(rootDir, "cli-dry-run.json");
    const failCode = await runCli([
      "verify",
      "--root",
      rootDir,
      "--branch",
      "feature/10-unfinished",
      "--dry-run",
      "--dry-run-log",
      logPath,
    ], { log: () => {} });
    expect(failCode).toBe(1);

    // Populate real passing Backend & Frontend reports + 100% coverages
    const writeJson = (rel: string, obj: unknown) => {
      const p = path.join(rootDir, rel);
      makeDirs(path.dirname(p));
      fs.writeFileSync(p, JSON.stringify(obj), "utf8");
    };

    writeJson(cfg.gates.targets.backend.cucumberJson, [
      {
        tags: [{ name: "@issue-10" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "passed" } }] }],
      },
    ]);
    const jacocoPath = path.join(rootDir, cfg.gates.targets.backend.jacocoXml);
    makeDirs(path.dirname(jacocoPath));
    fs.writeFileSync(
      jacocoPath,
      `<report name="b">
        <counter type="LINE" missed="0" covered="100"/>
        <counter type="BRANCH" missed="0" covered="100"/>
        <counter type="INSTRUCTION" missed="0" covered="100"/>
        <counter type="COMPLEXITY" missed="0" covered="100"/>
        <counter type="METHOD" missed="0" covered="50"/>
        <counter type="CLASS" missed="0" covered="10"/>
      </report>`,
      "utf8"
    );
    writeJson(cfg.gates.targets.frontend.cucumberJson, [
      {
        tags: [{ name: "@issue-10" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "passed" } }] }],
      },
    ]);
    writeJson(cfg.gates.targets.frontend.vitestSummaryJson, {
      total: {
        lines: { pct: 100 },
        statements: { pct: 100 },
        functions: { pct: 100 },
        branches: { pct: 100 },
      },
    });

    const passCode = await runCli([
      "verify",
      "--root",
      rootDir,
      "--branch",
      "feature/10-demo",
      "--merged",
      "--dry-run",
      "--dry-run-log",
      logPath,
    ], { log: () => {} });
    expect(passCode).toBe(0);

    // Regression marks broken issue IDs and live mode comments via gh
    writeJson(cfg.gates.targets.backend.cucumberJson, [
      {
        tags: [{ name: "@issue-10" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "failed" } }] }],
      },
    ]);
    const comments: string[][] = [];
    const verifyLogs: string[] = [];
    const liveVerify = await verifyWorkspaceAndSync(
      { rootDir, branch: "feature/10-demo", isPreviouslyDone: true },
      {
        token: "t",
        dryRun: false,
        runGh: (args) => {
          comments.push(args);
          return "ok";
        },
        graphql: async () => {
          throw new Error("Project scope unavailable");
        },
        log: (m) => verifyLogs.push(m),
      }
    );
    expect(liveVerify.evaluation.status).toBe("Regression");
    expect(liveVerify.operations.some((o) => o.action === "mark_regression")).toBe(true);
    expect(comments[0]).toContain("comment");
    expect(verifyLogs.some((m) => m.includes("Project v2 sync skipped for Issue #10"))).toBe(true);

    // CLI remaining subcommands: bootstrap, sync-issue (--body & --body-file), spawn, status, unknown
    expect(await runCli(["bootstrap", "--root", rootDir, "--dry-run"], { log: () => {} })).toBe(0);
    expect(
      await runCli(["sync-issue", "--root", rootDir, "--issue", "88", "--dry-run"], { log: () => {} })
    ).toBe(0);

    const bodyFile = path.join(rootDir, "issue-body.md");
    fs.writeFileSync(
      bodyFile,
      "### Target\n@fullstack\n### Gherkin Specification\n```gherkin\nFeature: File\n  Scenario: Spawn\n    Given a\n```",
      "utf8"
    );
    expect(
      await runCli(
        ["sync-issue", "--root", rootDir, "--issue", "89", "--body-file", bodyFile, "--dry-run"],
        { log: () => {} }
      )
    ).toBe(0);
    expect(await runCli(["spawn", "--root", rootDir, "--parent", "89", "--dry-run"], { log: () => {} })).toBe(0);
    // Default logger, default deps, & maybeRunMain direct execution check
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);

    expect((await bootstrapProject({ rootDir })).dryRun).toBe(true);
    const validSpecBody =
      "### Target\n@fullstack\nFeature: Default Deps\n  Scenario: S\n    Given a";
    await syncIssueToFeature({ rootDir, issueId: 91, title: "Default Deps", body: validSpecBody });
    await spawnSubIssues({ rootDir, parentIssueId: 91, parentBranch: "dev" });
    await verifyWorkspaceAndSync({ rootDir, branch: "dev" });

    expect(await runCli(["status", "--root", rootDir, "--dry-run"])).toBe(0);
    expect(logSpy).toHaveBeenCalled();

    const scriptPath = path.join(rootDir, "cli-entry.ts");
    const { pathToFileURL } = await import("node:url");
    expect(
      await maybeRunMain(
        pathToFileURL(scriptPath).href,
        ["node", scriptPath, "bootstrap", "--root", rootDir, "--dry-run"],
        { log: () => {} }
      )
    ).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(0);

    // Trigger catch inside maybeRunMain via nonexistent --body-file
    expect(
      await maybeRunMain(
        pathToFileURL(scriptPath).href,
        ["node", scriptPath, "sync-issue", "--root", rootDir, "--body-file", path.join(rootDir, "missing.md")],
        { log: () => {} }
      )
    ).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(await maybeRunMain("file:///other", ["node"])).toBe(false);

    // Exercise GITHUB_TOKEN fallback, non-issue live verify, and non-.feature skipping
    process.env.GITHUB_TOKEN = "env_gh_tok";
    await verifyWorkspaceAndSync({ rootDir, branch: "main" }, { dryRun: false, runGh: () => "ok", log: () => {} });
    delete process.env.GITHUB_TOKEN;

    // Non-issue branch & subdir + non-.feature file skipping in spawnSubIssues
    makeDirs(path.join(rootDir, "specs/features/empty-sub"));
    fs.writeFileSync(path.join(rootDir, "specs/features/empty-sub/plain.feature"), "Feature: Plain\n  Scenario: P\n    Given p", "utf8");
    fs.writeFileSync(path.join(rootDir, "specs/features/empty-sub/notes.txt"), "ignored non-feature", "utf8");
    await spawnSubIssues({ rootDir, parentIssueId: 1, parentBranch: "dev" }, { dryRun: true, log: () => {} });

    expect(await runCli(["unknown-cmd"])).toBe(2);
    expect(errSpy).toHaveBeenCalled();
    expect(await runCli([], { log: () => {} })).toBe(2);
  });

  it("resolves target repositories and syncs child repo branches in dry-run and live modes", async () => {
    expect(resolveTargetRepositories("@fullstack", baseConfig)).toEqual([]);

    const multiConfig: SdlcConfig = {
      ...baseConfig,
      repositories: {
        controlPlane: "7-3-N-3-7/api",
        backend: "7-3-N-3-7/backend",
        frontend: "7-3-N-3-7/frontend",
      },
    };
    expect(resolveTargetRepositories("@backend-only", multiConfig)).toEqual(["7-3-N-3-7/backend"]);
    expect(resolveTargetRepositories("@ui-only", multiConfig)).toEqual(["7-3-N-3-7/frontend"]);
    expect(resolveTargetRepositories("@fullstack", multiConfig)).toEqual([
      "7-3-N-3-7/backend",
      "7-3-N-3-7/frontend",
    ]);

    const rootDir = trackTempDir();
    fs.writeFileSync(path.join(rootDir, "sdlc.config.json"), JSON.stringify(multiConfig, null, 2), "utf8");

    const dryMulti = await syncIssueToFeature(
      {
        rootDir,
        issueId: 95,
        title: "Multi Repo Sync",
        body: "### Target\n@fullstack\nFeature: Multi\n  Scenario: M\n    Given m",
      },
      { dryRun: true, log: () => {} }
    );
    expect(
      dryMulti.operations.filter((o) => o.action === "sync_child_repo_branch").map((o) => o.details.repo)
    ).toEqual(["7-3-N-3-7/backend", "7-3-N-3-7/frontend"]);

    const liveCalls: string[][] = [];
    const logs: string[] = [];
    await syncIssueToFeature(
      {
        rootDir,
        issueId: 96,
        title: "Live Multi Repo",
        parentBranch: "feature/90-parent",
        body: "### Target\n@fullstack\nFeature: Live Multi\n  Scenario: L\n    Given l",
      },
      {
        dryRun: false,
        token: "tok",
        log: (m) => logs.push(m),
        graphql: async <T>() =>
          ({
            repository: {
              issue: null,
              projectsV2: { nodes: [] },
            },
          }) as T,
        runGh: (args) => {
          liveCalls.push(args);
          if (args[0] === "api" && args.includes("repos/7-3-N-3-7/frontend/git/ref/heads/feature/90-parent")) {
            throw new Error("missing parent branch in frontend");
          }
          if (args[0] === "api" && args.includes("--method") && args.includes("repos/7-3-N-3-7/backend/git/refs")) {
            throw new Error("branch already exists");
          }
          return "deadbeef1234";
        },
      }
    );

    expect(liveCalls.some((c) => c.includes("repos/7-3-N-3-7/frontend/git/ref/heads/dev"))).toBe(true);
    expect(logs.some((m) => m.includes("already exists or could not be created"))).toBe(true);
  });

  it("reuses existing Project v2 board on bootstrap, tolerates org 409, and passes trunk verification on dev/main", async () => {
    const rootDir = trackTempDir();
    const cfg = loadSdlcConfig(rootDir);
    const writeJson = (rel: string, obj: unknown) => {
      const p = path.join(rootDir, rel);
      makeDirs(path.dirname(p));
      fs.writeFileSync(p, JSON.stringify(obj), "utf8");
    };
    writeJson(cfg.gates.targets.backend.cucumberJson, [
      { tags: [{ name: "@issue-1" }], elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "passed" } }] }] },
    ]);
    const jacocoPath = path.join(rootDir, cfg.gates.targets.backend.jacocoXml);
    makeDirs(path.dirname(jacocoPath));
    fs.writeFileSync(
      jacocoPath,
      `<report name="b">
        <counter type="LINE" missed="0" covered="100"/>
        <counter type="BRANCH" missed="0" covered="100"/>
        <counter type="INSTRUCTION" missed="0" covered="100"/>
        <counter type="COMPLEXITY" missed="0" covered="100"/>
        <counter type="METHOD" missed="0" covered="50"/>
        <counter type="CLASS" missed="0" covered="10"/>
      </report>`,
      "utf8"
    );
    writeJson(cfg.gates.targets.frontend.cucumberJson, [
      { tags: [{ name: "@issue-1" }], elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "passed" } }] }] },
    ]);
    writeJson(cfg.gates.targets.frontend.vitestSummaryJson, {
      total: { lines: { pct: 100 }, statements: { pct: 100 }, functions: { pct: 100 }, branches: { pct: 100 } },
    });

    expect(
      await runCli(["verify", "--root", rootDir, "--branch", "dev", "--merged", "--dry-run"], { log: () => {} })
    ).toBe(0);
    expect(
      await runCli(["verify", "--root", rootDir, "--branch", "feature/missing-id", "--dry-run"], { log: () => {} })
    ).toBe(1);

    const gqlCalls: string[] = [];
    const logs: string[] = [];
    const res = await bootstrapProject(
      { rootDir },
      {
        dryRun: false,
        token: "tok",
        log: (m) => logs.push(m),
        graphql: async <T>(query: string) => {
          gqlCalls.push(query);
          if (query.includes("projectsV2(first: 20)")) {
            return {
              repository: {
                id: "R_1",
                owner: { id: "O_1" },
                projectsV2: {
                  nodes: [
                    {
                      id: "P_EXISTING",
                      number: 4,
                      url: "https://github.com/users/7-3-N-3-7/projects/4",
                      title: cfg.projectTitle,
                      fields: { nodes: [{ id: "F_1", name: "Slice" }, { id: "F_NONAME" }] },
                    },
                  ],
                },
              },
            } as T;
          }
          return { createProjectV2Field: { projectV2Field: { id: "F_X", name: "X" } } } as T;
        },
        runGh: () => {
          throw new Error("409 Conflict");
        },
      }
    );
    expect(res.dryRun).toBe(false);
    expect(gqlCalls.some((q) => q.includes("createProjectV2("))).toBe(false);
    expect(logs.some((m) => m.includes("Organization policy manages"))).toBe(true);

    // Remaining sdlc-domain edge cases: zero issue id tags, invalid/zero parent issue refs, and scenario without @spawn-subissue tag
    const zeroMeta = extractFeatureMetadata("@issue-0\nFeature: Zero\n  Scenario: S\n    Given a", baseConfig);
    expect(zeroMeta.issueIds).toEqual([]);
    expect(parseIssueBody(10, "NoParent", "### Parent Issue\nNone\n### Target\n@fullstack\nFeature: F\n  Scenario: S\n    Given x", baseConfig).parentIssueId).toBeNull();
    expect(parseIssueBody(10, "ZeroParent", "### Parent Issue\n#0\n### Target\n@fullstack\nFeature: F\n  Scenario: S\n    Given x", baseConfig).parentIssueId).toBeNull();
    const untouched = replaceSpawnSubIssueTag(
      "Feature: Tag\n  @smoke\n  Scenario: S\n    Given a\n",
      "S",
      99,
      10,
      baseConfig
    );
    expect(untouched).toContain("@issue-99 @parent-10");
  });

  it("extracts seed specs, formats issue bodies, injects idempotent tags, and builds Status & field metadata", () => {
    const statusInputs = buildStatusOptionInputs(baseConfig.projectBoard.statuses, [
      { id: "OPT_DONE", name: "Done" },
      { id: "", name: "Backlog" },
    ]);
    expect(statusInputs).toHaveLength(7);
    expect(statusInputs.find((s) => s.name === "Done")?.id).toBe("OPT_DONE");
    expect(statusInputs.find((s) => s.name === "Backlog")?.id).toBeUndefined();
    expect(buildStatusOptionInputs(["Backlog"])[0].color).toBe("GRAY");

    expect(deriveSliceFromFeaturePath("specs/features/core_architecture.feature")).toBe("core");
    expect(deriveSliceFromFeaturePath("specs\\features\\shared\\generic_sdlc_framework.feature")).toBe("sdlc");
    expect(deriveSliceFromFeaturePath("specs/features/appointment.feature")).toBe("appointment");

    expect(() =>
      extractSeedFeatureFromGherkin("bad.feature", "Scenario: Missing header", baseConfig)
    ).toThrow("Missing 'Feature:' header in bad.feature");

    const backendSpec = extractSeedFeatureFromGherkin(
      "specs/features/core_architecture.feature",
      [
        "@backend-only @issue-999",
        "Feature: Core Contracts",
        "  As an architect",
        "",
        "  @issue-5 @parent-999",
        "  Scenario: Contract check",
        "    Given base contract",
        "    Then it holds",
        "",
      ].join("\n"),
      baseConfig
    );
    expect(backendSpec.slice).toBe("core");
    expect(backendSpec.target).toBe("@backend-only");
    expect(backendSpec.description).toBe("As an architect");
    expect(backendSpec.scenarios[0].target).toBe("@backend-only");
    expect(backendSpec.scenarios[0].rawBlock).not.toContain("@issue-5");
    expect(backendSpec.rawFeatureText).not.toContain("@issue-999");

    const uiOnlySpec = extractSeedFeatureFromGherkin(
      "specs/features/management.feature",
      [
        "Feature: Executive KPI",
        "  @ui-only @ui",
        "  Scenario: Render KPI",
        "    Given admin",
        "    When opens KPI",
        "    Then visible",
      ].join("\n"),
      baseConfig
    );
    expect(uiOnlySpec.target).toBe("@ui-only");

    const emptyFeatSpec = extractSeedFeatureFromGherkin(
      "specs/features/empty.feature",
      "Feature: Empty Spec\n",
      baseConfig
    );
    expect(emptyFeatSpec.target).toBe("@fullstack");
    expect(emptyFeatSpec.scenarios).toEqual([]);

    const mixedSpec = extractSeedFeatureFromGherkin(
      "specs/features/appointment.feature",
      [
        "Feature: Appointments",
        "  Scenario: Default fullstack",
        "    Given slot",
        "    Then booked",
        "",
        "  @ui-only",
        "  Scenario Outline: UI outline",
        "    When views <lang>",
        "    Examples:",
        "      | lang |",
        "      | da   |",
      ].join("\n"),
      baseConfig
    );
    expect(mixedSpec.target).toBe("@fullstack");
    expect(mixedSpec.scenarios[0].target).toBe("@fullstack");
    expect(mixedSpec.scenarios[1].target).toBe("@ui-only");
    expect(mixedSpec.scenarios[1].rawBlock).toContain("Examples:");

    // injectSeedIssueTags: with and without existing tags, unmatched scenario, missing Feature, and idempotency
    expect(injectSeedIssueTags("no feature", 1, {}, baseConfig)).toBe("no feature");
    const rawGherkin = [
      "@fullstack @issue-1",
      "Feature: Tagged Spec",
      "  Scenario: Tagged One",
      "    Given a",
      "",
      "  @smoke @issue-55 @parent-1",
      "  Scenario: Untouched One",
      "    Given b",
    ].join("\n");
    const taggedOnce = injectSeedIssueTags(rawGherkin, 42, { "Tagged One": 43 }, baseConfig);
    expect(taggedOnce).toContain("@fullstack @issue-42");
    expect(taggedOnce).not.toContain("@issue-1");
    expect(taggedOnce).toContain("  @issue-43 @parent-42\n  Scenario: Tagged One");
    expect(taggedOnce).toContain("  @smoke @issue-55 @parent-1\n  Scenario: Untouched One");
    const taggedTwice = injectSeedIssueTags(taggedOnce, 42, { "Tagged One": 43 }, baseConfig);
    expect(taggedTwice).toBe(taggedOnce);

    // Formatting parent/sub-issue bodies for BDD and declarative features
    const bddParentBody = formatSeedParentIssueBody(mixedSpec);
    expect(parseIssueBody(1, mixedSpec.featureTitle, bddParentBody, baseConfig).valid).toBe(true);
    const bddChildBody = formatSeedSubIssueBody(mixedSpec, mixedSpec.scenarios[0], 1);
    expect(parseIssueBody(2, mixedSpec.scenarios[0].title, bddChildBody, baseConfig).parentIssueId).toBe(1);

    const declSpec = {
      featureTitle: "Infra",
      slice: "infrastructure",
      target: "@fullstack" as const,
      featureRelPath: null,
      rawFeatureText: null,
      description: "Infra desc",
      scenarios: [
        { title: "Docker Stack", target: "@fullstack" as const, rawBlock: "", description: "Compose works" },
        { title: "Fallback Desc", target: "@ui-only" as const, rawBlock: "", description: "" },
      ],
    };
    const declParentBody = formatSeedParentIssueBody(declSpec);
    expect(parseIssueBody(10, declSpec.featureTitle, declParentBody, baseConfig).valid).toBe(true);
    const declChildBody = formatSeedSubIssueBody(declSpec, declSpec.scenarios[1], 10);
    expect(declChildBody).toContain("Then Infra desc");

    expect(
      buildSeedFieldValues({
        slice: "infrastructure",
        target: "@fullstack",
        hasFeatureFile: false,
        subIssueSummary: "2/2 Done",
        linkedBranch: "main",
      })
    ).toMatchObject({ "Backend BDD": "N/A (Infra)", "Frontend BDD": "N/A (Infra)", "Coverage Gate": "N/A (Infra)" });
    expect(
      buildSeedFieldValues({
        slice: "management",
        target: "@ui-only",
        hasFeatureFile: true,
        subIssueSummary: "3/3 Done",
        linkedBranch: "main",
      })
    ).toMatchObject({ "Backend BDD": "N/A", "Frontend BDD": "PASS", "Coverage Gate": "PASS (100%)" });
    expect(
      buildSeedFieldValues({
        slice: "core",
        target: "@backend-only",
        hasFeatureFile: true,
        subIssueSummary: "2/2 Done",
        linkedBranch: "main",
      })
    ).toMatchObject({ "Backend BDD": "PASS", "Frontend BDD": "N/A" });
  });

  it("bootstraps Status single-select options, syncs Project v2 on verify/sync, and seeds features in dry-run & live modes", async () => {
    const rootDir = trackTempDir();
    const cfgWithDecl: SdlcConfig = {
      ...baseConfig,
      declarativeFeatures: [
        {
          slice: "infrastructure",
          target: "@fullstack",
          title: "Infrastructure Stack",
          description: "Runtime services",
          subIssues: [
            { title: "Traefik & Keycloak", target: "@fullstack", description: "Reverse proxy and auth" },
          ],
        },
      ],
    };
    fs.writeFileSync(path.join(rootDir, "sdlc.config.json"), JSON.stringify(cfgWithDecl, null, 2), "utf8");

    const specPath = path.join(rootDir, "specs/features/clinic.feature");
    makeDirs(path.dirname(specPath));
    const originalClinicFeature = [
      "Feature: Clinic Governance",
      "  @fullstack",
      "  Scenario: Onboard therapist",
      "    Given therapist registers",
      "    When submits IBAN",
      "    Then profile is active",
      "",
    ].join("\n");
    fs.writeFileSync(specPath, originalClinicFeature, "utf8");

    // 1. Bootstrap updates Status single-select field when statuses are missing (and skips when complete)
    let statusUpdated = false;
    const bootUpdated = await bootstrapProject(
      { rootDir },
      {
        dryRun: false,
        token: "tok",
        log: () => {},
        runGh: () => "ok",
        graphql: async <T>(query: string) => {
          if (query.includes("projectsV2(first: 20)")) {
            return {
              repository: {
                id: "R_1",
                owner: { id: "O_1" },
                projectsV2: {
                  nodes: [
                    {
                      id: "P_1",
                      number: 1,
                      url: "https://github.com/projects/1",
                      title: cfgWithDecl.projectTitle,
                      fields: {
                        nodes: [
                          {
                            id: "F_ST",
                            name: "Status",
                            options: [
                              { id: "OPT_DONE", name: "Done" },
                              { name: "NoId" },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            } as T;
          }
          if (query.includes("updateProjectV2Field")) {
            statusUpdated = true;
            return {
              updateProjectV2Field: {
                projectV2Field: {
                  options: [
                    { id: "OPT_DONE", name: "Done" },
                    { id: "OPT_REG", name: "Regression" },
                    { name: "MissingId" },
                  ],
                },
              },
            } as T;
          }
          return { createProjectV2Field: { projectV2Field: { id: "F_TXT" } } } as T;
        },
      }
    );
    expect(statusUpdated).toBe(true);
    expect(bootUpdated.projectMeta?.statusOptionIds["Regression"]).toBe("OPT_REG");

    let statusUpdateSkipped = true;
    await bootstrapProject(
      { rootDir },
      {
        dryRun: false,
        token: "tok",
        log: () => {},
        runGh: () => "ok",
        graphql: async <T>(query: string) => {
          if (query.includes("projectsV2(first: 20)")) {
            return {
              repository: {
                id: "R_1",
                owner: { id: "O_1" },
                projectsV2: {
                  nodes: [
                    {
                      id: "P_1",
                      number: 1,
                      url: "https://github.com/projects/1",
                      title: cfgWithDecl.projectTitle,
                      fields: {
                        nodes: [
                          { id: "F_ST", name: "Status" },
                          { id: "F_SL", name: "Slice" },
                          { id: "F_TG", name: "Target" },
                          { id: "F_BE", name: "Backend BDD" },
                          { id: "F_FE", name: "Frontend BDD" },
                          { id: "F_CV", name: "Coverage Gate" },
                          { id: "F_SI", name: "Sub-Issues" },
                          { id: "F_LB", name: "Linked Branch" },
                        ],
                      },
                    },
                  ],
                },
              },
            } as T;
          }
          if (query.includes("updateProjectV2Field")) {
            statusUpdateSkipped = false;
            return { updateProjectV2Field: {} } as T;
          }
          return {} as T;
        },
      }
    );
    expect(statusUpdateSkipped).toBe(false);

    // Skip updateProjectV2Field when all 7 statuses already exist
    let noUpdateNeeded = true;
    await bootstrapProject(
      { rootDir },
      {
        dryRun: false,
        token: "tok",
        log: () => {},
        runGh: () => "ok",
        graphql: async <T>(query: string) => {
          if (query.includes("projectsV2(first: 20)")) {
            return {
              repository: {
                id: "R_1",
                owner: { id: "O_1" },
                projectsV2: {
                  nodes: [
                    {
                      id: "P_1",
                      number: 1,
                      url: "https://github.com/projects/1",
                      title: cfgWithDecl.projectTitle,
                      fields: {
                        nodes: [
                          {
                            id: "F_ST",
                            name: "Status",
                            options: cfgWithDecl.projectBoard.statuses.map((s, idx) => ({
                              id: `O_${idx}`,
                              name: s,
                            })),
                          },
                          { id: "F_SL", name: "Slice" },
                          { id: "F_TG", name: "Target" },
                          { id: "F_BE", name: "Backend BDD" },
                          { id: "F_FE", name: "Frontend BDD" },
                          { id: "F_CV", name: "Coverage Gate" },
                          { id: "F_SI", name: "Sub-Issues" },
                          { id: "F_LB", name: "Linked Branch" },
                        ],
                      },
                    },
                  ],
                },
              },
            } as T;
          }
          if (query.includes("updateProjectV2Field")) {
            noUpdateNeeded = false;
          }
          return {} as T;
        },
      }
    );
    expect(noUpdateNeeded).toBe(true);

    // 2. Live syncIssueToFeature error catch + live verifyWorkspaceAndSync with passing checks and external brokenIssueId
    const syncWarnLogs: string[] = [];
    await syncIssueToFeature(
      {
        rootDir,
        issueId: 60,
        title: "Warn Sync",
        body: "### Target\n@fullstack\nFeature: W\n  Scenario: S\n    Given x",
      },
      {
        dryRun: false,
        token: "tok",
        runGh: () => "ok",
        graphql: async () => {
          throw new Error("gql down");
        },
        log: (m) => syncWarnLogs.push(m),
      }
    );
    expect(syncWarnLogs.some((m) => m.includes("Project v2 sync skipped for Issue #60"))).toBe(true);

    const writeJson = (rel: string, obj: unknown) => {
      const p = path.join(rootDir, rel);
      makeDirs(path.dirname(p));
      fs.writeFileSync(p, JSON.stringify(obj), "utf8");
    };
    writeJson(cfgWithDecl.gates.targets.backend.cucumberJson, [
      {
        tags: [{ name: "@issue-10" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "passed" } }] }],
      },
      {
        tags: [{ name: "@issue-99" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "failed" } }] }],
      },
    ]);
    const jacocoPath = path.join(rootDir, cfgWithDecl.gates.targets.backend.jacocoXml);
    makeDirs(path.dirname(jacocoPath));
    fs.writeFileSync(
      jacocoPath,
      `<report name="b">
        <counter type="LINE" missed="0" covered="100"/>
        <counter type="BRANCH" missed="0" covered="100"/>
        <counter type="INSTRUCTION" missed="0" covered="100"/>
        <counter type="COMPLEXITY" missed="0" covered="100"/>
        <counter type="METHOD" missed="0" covered="50"/>
        <counter type="CLASS" missed="0" covered="10"/>
      </report>`,
      "utf8"
    );
    writeJson(cfgWithDecl.gates.targets.frontend.cucumberJson, [
      {
        tags: [{ name: "@issue-10" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "passed" } }] }],
      },
    ]);
    writeJson(cfgWithDecl.gates.targets.frontend.vitestSummaryJson, {
      total: { lines: { pct: 100 }, statements: { pct: 100 }, functions: { pct: 100 }, branches: { pct: 100 } },
    });

    const syncedIssueNums: number[] = [];
    await verifyWorkspaceAndSync(
      {
        rootDir,
        branch: "feature/10-demo",
        subIssues: [{ issueId: 11, title: "Sub", status: "Done" }],
      },
      {
        dryRun: false,
        token: "tok",
        runGh: () => "ok",
        log: () => {},
        graphql: async <T>(query: string, vars: Record<string, unknown>) => {
          if (query.includes("projectsV2(first: 20)")) {
            syncedIssueNums.push(vars.issueNumber as number);
            return {
              repository: {
                issue: { id: `I_${vars.issueNumber}` },
                projectsV2: {
                  nodes: [
                    {
                      id: "P_1",
                      number: 1,
                      url: "u",
                      title: cfgWithDecl.projectTitle,
                      fields: {
                        nodes: [
                          {
                            id: "F_ST",
                            name: "Status",
                            options: [
                              { id: "O_T", name: "Inner TDD" },
                              { id: "O_R", name: "Regression" },
                            ],
                          },
                          { id: "F_LB", name: "Linked Branch" },
                        ],
                      },
                    },
                  ],
                },
              },
            } as T;
          }
          if (query.includes("addProjectV2ItemById")) {
            return { addProjectV2ItemById: { item: { id: "IT_1" } } } as T;
          }
          return { updateProjectV2ItemFieldValue: { projectV2Item: { id: "IT_1" } } } as T;
        },
      }
    );
    expect(syncedIssueNums).toEqual([10, 99]);

    // Also cover passing backend + failing frontend/coverage + brokenId === issueId + missing Status field
    writeJson(cfgWithDecl.gates.targets.backend.cucumberJson, [
      {
        tags: [{ name: "@issue-10" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "passed" } }] }],
      },
    ]);
    writeJson(cfgWithDecl.gates.targets.frontend.cucumberJson, [
      {
        tags: [{ name: "@issue-10" }],
        elements: [{ type: "scenario", tags: [], steps: [{ result: { status: "failed" } }] }],
      },
    ]);
    writeJson(cfgWithDecl.gates.targets.frontend.vitestSummaryJson, {
      total: { lines: { pct: 50 }, statements: { pct: 50 }, functions: { pct: 50 }, branches: { pct: 50 } },
    });
    const brokenSelfNums: number[] = [];
    await verifyWorkspaceAndSync(
      { rootDir, branch: "feature/10-demo" },
      {
        dryRun: false,
        token: "tok",
        runGh: () => "ok",
        log: () => {},
        graphql: async <T>(query: string, vars: Record<string, unknown>) => {
          if (query.includes("projectsV2(first: 20)")) {
            brokenSelfNums.push(vars.issueNumber as number);
            return {
              repository: {
                issue: { id: "I_10" },
                projectsV2: {
                  nodes: [
                    {
                      id: "P_1",
                      number: 1,
                      url: "u",
                      title: cfgWithDecl.projectTitle,
                      fields: { nodes: [{ id: "F_LB", name: "Linked Branch" }] },
                    },
                  ],
                },
              },
            } as T;
          }
          if (query.includes("addProjectV2ItemById")) {
            return { addProjectV2ItemById: { item: { id: "IT_10" } } } as T;
          }
          return { updateProjectV2ItemFieldValue: { projectV2Item: { id: "IT_10" } } } as T;
        },
      }
    );
    expect(brokenSelfNums).toEqual([10]);

    // 3. Dry-run seed in clean workspace leaves feature files untouched, handles omitted deps & declarativeFeatures
    const seedRoot = trackTempDir();
    fs.writeFileSync(path.join(seedRoot, "sdlc.config.json"), JSON.stringify(baseConfig, null, 2), "utf8");
    const apptSpecPath = path.join(seedRoot, "specs/features/appointment.feature");
    const seedSpecPath = path.join(seedRoot, "specs/features/clinic.feature");
    makeDirs(path.dirname(seedSpecPath));
    fs.writeFileSync(
      apptSpecPath,
      "Feature: Appt\n  Scenario: Book\n    Given slot\n    Then booked\n",
      "utf8"
    );
    fs.writeFileSync(seedSpecPath, originalClinicFeature, "utf8");

    const seedDefaultDry = await seedExistingFeatures({ rootDir: seedRoot });
    expect(seedDefaultDry.dryRun).toBe(true);
    expect(seedDefaultDry.totalParents).toBe(2);

    fs.writeFileSync(path.join(seedRoot, "sdlc.config.json"), JSON.stringify(cfgWithDecl, null, 2), "utf8");
    const seedDry = await seedExistingFeatures({ rootDir: seedRoot }, { dryRun: true, log: () => {} });
    expect(seedDry.dryRun).toBe(true);
    expect(seedDry.totalParents).toBe(3);
    expect(seedDry.totalSubIssues).toBe(3);
    expect(seedDry.totalItems).toBe(6);
    expect(fs.readFileSync(seedSpecPath, "utf8")).toBe(originalClinicFeature);
    expect(
      await runCli(["seed", "--root", seedRoot, "--dry-run", "--no-tag-files"], { log: () => {} })
    ).toBe(0);

    // 4. Live seed: creates issues, links native sub-issues, updates Project v2, closes issues, and tags feature files
    let nextIssueNum = 100;
    const subIssueLinks: Array<{ parent: string; child: string }> = [];
    const closedNums: string[] = [];
    const liveSeedGql = async <T>(query: string, vars: Record<string, unknown>) => {
      if (query.includes("projectsV2(first: 20)")) {
        return {
          repository: {
            id: "R_1",
            owner: { id: "O_1" },
            projectsV2: {
              nodes: [
                {
                  id: "P_1",
                  number: 1,
                  url: "https://github.com/projects/1",
                  title: cfgWithDecl.projectTitle,
                  fields: {
                    nodes: [
                      {
                        id: "F_ST",
                        name: "Status",
                        options: cfgWithDecl.projectBoard.statuses.map((s, i) => ({ id: `OPT_${i}`, name: s })),
                      },
                      { id: "F_SL", name: "Slice" },
                      { id: "F_TG", name: "Target" },
                      { id: "F_BE", name: "Backend BDD" },
                      { id: "F_FE", name: "Frontend BDD" },
                      { id: "F_CV", name: "Coverage Gate" },
                      { id: "F_SI", name: "Sub-Issues" },
                      { id: "F_LB", name: "Linked Branch" },
                    ],
                  },
                },
              ],
            },
          },
        } as T;
      }
      if (query.includes("issue(number: $issueNumber)")) {
        return { repository: { issue: { id: `NODE_${vars.issueNumber}` } } } as T;
      }
      if (query.includes("addSubIssue")) {
        subIssueLinks.push({ parent: vars.issueId as string, child: vars.subIssueId as string });
        return { addSubIssue: { issue: { id: vars.issueId }, subIssue: { id: vars.subIssueId } } } as T;
      }
      if (query.includes("addProjectV2ItemById")) {
        return { addProjectV2ItemById: { item: { id: `ITEM_${vars.contentId}` } } } as T;
      }
      return { updateProjectV2ItemFieldValue: { projectV2Item: { id: "ITEM" } } } as T;
    };

    const seedLive1 = await seedExistingFeatures(
      { rootDir: seedRoot },
      {
        dryRun: false,
        token: "tok",
        log: () => {},
        graphql: liveSeedGql,
        runGh: (args) => {
          if (args[0] === "issue" && args[1] === "list") return "[]";
          if (args[0] === "issue" && args[1] === "create") {
            return `https://github.com/7-3-N-3-7/api/issues/${nextIssueNum++}`;
          }
          if (args[0] === "issue" && args[1] === "close") {
            closedNums.push(args[2]);
            return "closed";
          }
          return "ok";
        },
      }
    );
    expect(seedLive1.dryRun).toBe(false);
    expect(seedLive1.totalItems).toBe(6);
    expect(subIssueLinks).toEqual([
      { parent: "NODE_100", child: "NODE_101" },
      { parent: "NODE_102", child: "NODE_103" },
      { parent: "NODE_104", child: "NODE_105" },
    ]);
    expect(closedNums).toEqual(["101", "100", "103", "102", "105", "104"]);
    const updatedFeature = fs.readFileSync(seedSpecPath, "utf8");
    expect(updatedFeature).toContain("@issue-102\nFeature: Clinic Governance");
    expect(updatedFeature).toContain("@fullstack @issue-103 @parent-102\n  Scenario: Onboard therapist");

    // 5. Idempotent live re-run with mix of CLOSED & OPEN existing issues + closeIssues/updateFeatureTags disabled
    const closedOnSecondRun: string[] = [];
    await seedExistingFeatures(
      { rootDir: seedRoot, updateFeatureTags: false },
      {
        dryRun: false,
        token: "tok",
        log: () => {},
        graphql: liveSeedGql,
        runGh: (args) => {
          if (args[0] === "issue" && args[1] === "list") {
            return JSON.stringify([
              { number: 100, id: "NODE_100", title: "[SDLC Feature]: Appt", state: "CLOSED" },
              { number: 101, id: "NODE_101", title: "[Sub-Issue]: Book", state: "CLOSED" },
              { number: 102, id: "NODE_102", title: "[SDLC Feature]: Clinic Governance", state: "CLOSED" },
              { number: 103, id: "NODE_103", title: "[Sub-Issue]: Onboard therapist", state: "OPEN" },
              { number: 104, id: "NODE_104", title: "[SDLC Feature]: Infrastructure Stack", state: "CLOSED" },
              { number: 105, id: "NODE_105", title: "[Sub-Issue]: Traefik & Keycloak", state: "CLOSED" },
            ]);
          }
          if (args[0] === "issue" && args[1] === "close") {
            closedOnSecondRun.push(args[2]);
          }
          return "ok";
        },
      }
    );
    expect(closedOnSecondRun).toEqual(["103"]);

    await seedExistingFeatures(
      { rootDir: seedRoot, closeIssues: false, updateFeatureTags: false },
      {
        dryRun: false,
        token: "tok",
        log: () => {},
        graphql: liveSeedGql,
        runGh: (args) => {
          if (args[0] === "issue" && args[1] === "list") {
            return JSON.stringify([
              { number: 100, id: "NODE_100", title: "[SDLC Feature]: Appt", state: "OPEN" },
              { number: 101, id: "NODE_101", title: "[Sub-Issue]: Book", state: "OPEN" },
              { number: 102, id: "NODE_102", title: "[SDLC Feature]: Clinic Governance", state: "OPEN" },
              { number: 103, id: "NODE_103", title: "[Sub-Issue]: Onboard therapist", state: "OPEN" },
              { number: 104, id: "NODE_104", title: "[SDLC Feature]: Infrastructure Stack", state: "OPEN" },
              { number: 105, id: "NODE_105", title: "[Sub-Issue]: Traefik & Keycloak", state: "OPEN" },
            ]);
          }
          return "ok";
        },
      }
    );

    // 6. Malformed gh issue create output throws clear error
    await expect(
      seedExistingFeatures(
        { rootDir: seedRoot },
        {
          dryRun: false,
          token: "tok",
          log: () => {},
          graphql: liveSeedGql,
          runGh: (args) => {
            if (args[0] === "issue" && args[1] === "list") return "[]";
            if (args[0] === "issue" && args[1] === "create") return "invalid-output";
            return "ok";
          },
        }
      )
    ).rejects.toThrow("Could not parse issue number from gh output");
  });
});
