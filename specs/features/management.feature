Feature: Executive KPI Management and Admin Route Governance
  As a clinic manager and system administrator
  I want executive KPIs displayed, created, and removed in the management dashboard while non-admins are blocked
  So that financial and quality metrics remain curated exclusively by authorized leadership

  @ui-only @ui
  Scenario: Management dashboard renders seeded KPIs and matches visual baseline
    Given an authenticated administrator session
    When in the portal UI administrator "admin_user" opens "/da/dashboard/admin?tab=management"
    Then the browser UI should show element "management-feature-view" with KPI list "kpi-list"
    And the visual snapshot "management-kpi-dashboard" of the management workspace should match baseline

  @ui-only @ui
  Scenario: Administrator creates and deletes a scoped management KPI through confirmation dialog
    Given an authenticated administrator session
    When in the portal UI administrator "admin_user" opens "/da/dashboard/admin?tab=management"
    And in the portal UI administrator creates a KPI named "Session Tilfredshed" with value "96", unit "%", and department "Kvalitet"
    Then the KPI list in the UI should display "Session Tilfredshed"
    When in the portal UI administrator deletes the KPI "Session Tilfredshed" via the confirmation dialog
    Then the KPI "Session Tilfredshed" should no longer appear in the KPI list

  @ui-only @ui
  Scenario: Non-admin therapist is redirected away from executive management routes
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    When in the portal UI therapist "maja_terapeut" navigates to "/da/dashboard/admin?tab=management"
    Then the browser URL should redirect to "/da/dashboard/therapist" without unhandled errors
