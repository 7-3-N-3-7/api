// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type SdlcConfig,
  evaluateSdlcState,
  extractFeatureMetadata,
  injectIssueTags,
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
    requireSecretScan: true,
    requireAllSubIssuesDone: true,
    targets: {
      backend: {
        cucumberJson: "backend/target/cucumber-reports/cucumber-report.json",
        jacocoXml: "backend/target/site/jacoco/jacoco.xml",
        minLineCoverage: 0.98,
        minBranchCoverage: 0.98,
        minInstructionCoverage: 0.98,
        minComplexityCoverage: 0.98,
        minMethodCoverage: 0.98,
        minClassCoverage: 0.98,
      },
      frontend: {
        cucumberJson: "frontend/reports/cucumber-report.json",
        vitestSummaryJson: "frontend/coverage/coverage-summary.json",
        minLineCoverage: 0.98,
        minStatementCoverage: 0.98,
        minFunctionCoverage: 0.98,
        minBranchCoverage: 0.98,
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

  it("evaluates all 7 SDLC FSM statuses and enforces 98% gates & Sub-Issue locks", () => {
    const passCuc = {
      totalScenarios: 2,
      passedScenarios: 2,
      failedScenarios: 0,
      byIssue: { 1: { passed: 2, failed: 0 } },
      brokenIssueIds: [],
    };
    const passJaCoCo = { line: 0.99, branch: 0.98, instruction: 0.99, complexity: 0.98, method: 1, clazz: 1 };
    const passIstanbul = { line: 0.99, statement: 0.99, function: 0.99, branch: 0.985 };

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
          secretScanPassed: true,
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
          secretScanPassed: true,
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
          secretScanPassed: true,
          subIssues: [],
        },
        baseConfig
      ).status
    ).toBe("Red (Outer BDD)");

    const blockedBySubAndSecret = evaluateSdlcState(
      {
        issueId: 1,
        target: "@backend-only",
        specValid: true,
        hasLinkedBranch: true,
        hasImplementationCommits: true,
        isPreviouslyDone: false,
        isMerged: false,
        secretScanPassed: false,
        subIssues: [{ issueId: 2, title: "Child", status: "Inner TDD" }],
        backend: { cucumber: passCuc, jacoco: passJaCoCo },
      },
      baseConfig
    );
    expect(blockedBySubAndSecret.status).toBe("Inner TDD");
    expect(blockedBySubAndSecret.canMerge).toBe(false);
    expect(blockedBySubAndSecret.reasons).toEqual([
      "Secret scan failed (TruffleHog).",
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
        secretScanPassed: true,
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
        secretScanPassed: true,
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
        secretScanPassed: true,
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
        secretScanPassed: true,
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
        secretScanPassed: true,
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
    await syncIssueToFeature(
      { rootDir, issueId: 52, title: "Live Branch", body: issueBody },
      { dryRun: false, token: "t", runGh: (args) => { ghCalls.push(args); return "ok"; }, log: () => {} }
    );
    expect(ghCalls[0]).toContain("develop");

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

    // Populate real passing Backend & Frontend reports + 98% coverages
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
        <counter type="LINE" missed="1" covered="99"/>
        <counter type="BRANCH" missed="2" covered="98"/>
        <counter type="INSTRUCTION" missed="1" covered="99"/>
        <counter type="COMPLEXITY" missed="2" covered="98"/>
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
        lines: { pct: 99 },
        statements: { pct: 99 },
        functions: { pct: 98.5 },
        branches: { pct: 98.1 },
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
    const liveVerify = await verifyWorkspaceAndSync(
      { rootDir, branch: "feature/10-demo", isPreviouslyDone: true },
      { token: "t", dryRun: false, runGh: (args) => { comments.push(args); return "ok"; }, log: () => {} }
    );
    expect(liveVerify.evaluation.status).toBe("Regression");
    expect(liveVerify.operations.some((o) => o.action === "mark_regression")).toBe(true);
    expect(comments[0]).toContain("comment");

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
});
