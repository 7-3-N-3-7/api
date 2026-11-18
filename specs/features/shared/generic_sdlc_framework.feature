@fullstack @api @sdlc @issue-1
Feature: Generic GitHub SDLC Framework (Dual-Layer Spec & Gate Contract)
  As a platform engineer maintaining a symmetric full-stack monorepo
  I want GitHub Issues, hierarchical Sub-Issues, tree-isomorphic branches, and shared Gherkin specs synchronized deterministically across Backend and Frontend
  So that every requirement is traced and gated by >= 98% coverage on both JaCoCo and Istanbul before merge

  Scenario: GitHub Issue with Gherkin generates linked branch and Red Outer BDD state
    Given SDLC configuration loaded from "sdlc.config.json" with strict 98% thresholds on JaCoCo and Istanbul
    When SDLC synchronizes GitHub Issue 101 titled "Automated Board Sync" with slice "core" and target "@fullstack"
    Then SDLC resolves linked branch "feature/101-automated-board-sync" from base branch "dev"
    And SDLC transitions Issue 101 to project status "Red (Outer BDD)"

  Scenario: Hierarchical Sub-Issue blocks Parent Issue in Inner TDD until child reaches Done and all 98% gates pass
    Given SDLC configuration loaded from "sdlc.config.json" with strict 98% thresholds on JaCoCo and Istanbul
    When SDLC resolves child branch for Sub-Issue 102 titled "GraphQL Field Mapping" under parent branch "feature/101-automated-board-sync"
    Then SDLC resolves child branch "feature/102-graphql-field-mapping" from base branch "feature/101-automated-board-sync"
    When SDLC evaluates Issue 101 with passing Backend and Frontend 98% gates while Sub-Issue 102 has status "Inner TDD"
    Then SDLC state machine status is "Inner TDD" with merge allowed "false"
    When SDLC evaluates Issue 101 with passing Backend and Frontend 98% gates while Sub-Issue 102 has status "Done"
    Then SDLC state machine status is "Green Gate" with merge allowed "true"

  Scenario: Failed @issue scenario in Cucumber transitions previously Done Issue to Regression
    Given SDLC configuration loaded from "sdlc.config.json" with strict 98% thresholds on JaCoCo and Istanbul
    When SDLC evaluates previously Done Issue 101 against a failing "@issue-101" scenario report
    Then SDLC state machine status is "Regression" with merge allowed "false"
