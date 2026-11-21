@issue-80
Feature: User Account Management, Authentication, and Role-Based Access Control
  As a clinic operator and platform user
  I want user registration, authentication, personal profiles, and role isolation enforced consistently
  So that each user only accesses the accounts, clinical records, and administrative capabilities permitted for their role

  @fullstack @api @issue-81 @parent-80
  Scenario: Registering a new user succeeds without exposing secret credentials
    Given an authenticated administrator session
    When registering a new user account with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", password "SecurePassword123!", and role "THERAPIST"
    Then the user account registration should succeed
    And the user directory should include username "maja_terapeut" with role "THERAPIST"
    And no password hash or secret credential should be exposed in the account record

  @fullstack @api @issue-82 @parent-80
  Scenario: Registering a duplicate username is rejected
    Given an authenticated administrator session
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When registering a new user account with username "anders_sand", full name "Anders Kopi", email "kopi@example.dk", password "SecurePassword123!", and role "CLIENT"
    Then the operation should be rejected with a validation error mentioning "already exists"

  @fullstack @api @issue-83 @parent-80
  Scenario: Registering an account with an unsupported role is rejected
    Given an authenticated administrator session
    When registering a new user account with username "ugyldig_rolle", full name "Ugyldig Bruger", email "ugyldig@example.dk", password "SecurePassword123!", and role "SUPER_WIZARD"
    Then the operation should be rejected with a validation error mentioning "invalid role"

  @fullstack @api @issue-84 @parent-80
  Scenario: Removing a user account updates the user directory
    Given an authenticated administrator session
    And a registered user account exists with username "temp_bruger", full name "Midlertidig Bruger", email "temp@example.dk", and role "CLIENT"
    When the user account "temp_bruger" is deleted
    Then the account removal should complete successfully
    And the user directory should not include username "temp_bruger"

  @fullstack @api @issue-85 @parent-80
  Scenario: Unauthenticated visitors are denied access to protected portal areas
    Given an unauthenticated visitor session
    When attempting to view the user directory
    Then access should be denied as unauthenticated
    When attempting to view appointments
    Then access should be denied as unauthenticated
    When attempting to view client journal entries for "anders_sand"
    Then access should be denied as unauthenticated

  @fullstack @api @issue-86 @parent-80
  Scenario: Authenticated users can view and update their own personal profile
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated client session for "anders_sand"
    When the signed-in user views their personal profile
    Then the personal profile should belong to "anders_sand" with role "CLIENT"
    When the signed-in user updates their personal profile full name to "Anders Sand Updated" and phone to "+45 20 30 40 50"
    Then the personal profile full name should be "Anders Sand Updated"

  @fullstack @api @issue-87 @parent-80
  Scenario: Role-based isolation restricts clinical notes to therapists
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" attempts to record a confidential therapist clinical note for "anders_sand"
    Then access should be denied due to insufficient permissions

  @backend-only @issue-88 @parent-80
  Scenario: Identity verification rejects untrusted tokens and accepts valid issuer claims
    Given an identity token with subject "user-123", username "anders_sand", and roles "CLIENT" issued by an untrusted authority
    When checking the current user profile with that identity token
    Then access should be denied as unauthenticated
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an identity token with subject "user-123", username "anders_sand", and roles "CLIENT" issued by the trusted authority
    When checking the current user profile with that identity token
    Then the personal profile should belong to "anders_sand" with role "CLIENT"

  @ui-only @ui @issue-89 @parent-80
  Scenario: Landing page 2-step registration wizard validates and navigates cleanly across steps
    When in the browser a visitor opens the 2-step registration wizard on "/da"
    Then the registration modal should show step "1 / 2" and match visual snapshot "user-register-step1"
    When in the browser the visitor fills step 1 of registration with first name "Sofie", last name "Holm", username "wizard_preview_user", and advances to step 2
    Then the registration modal should show step "2 / 2" and match visual snapshot "user-register-step2"
    When in the browser the visitor returns to step 1 of the registration wizard
    Then the registration modal should return to step "1 / 2"

  @ui-only @ui @issue-90 @parent-80
  Scenario: New visitor completes 2-step landing registration and lands inside personal portal
    When in the browser a visitor completes the 2-step registration for logical user "ny_klient_reg" on "/da"
    Then the browser should sign in and navigate to the personal dashboard with "portal-workspace-shell" visible

  @ui-only @ui @issue-91 @parent-80
  Scenario: Unauthenticated access to protected dashboard routes redirects back to landing login
    Given an unauthenticated visitor session
    When in the browser the unauthenticated visitor opens "/da/dashboard/personal"
    Then the browser should redirect to the landing page showing "hero-cta-login"

  @ui-only @ui @issue-92 @parent-80
  Scenario: Desktop workspace shell supports sidebar collapse and multi-role portal switching
    Given a registered user account exists with username "multi_admin", full name "Admin Bruger", email "multi_admin@klinik.dk", and role "ADMIN"
    When in the portal UI user "multi_admin" with role "ADMIN" opens "/da/dashboard/admin"
    And in the portal UI the user collapses the desktop sidebar
    Then the workspace sidebar attribute "data-sidebar-collapsed" should be "true"
    And the visual snapshot "shell-desktop-sidebar-collapsed" of the desktop viewport should match baseline
    When in the portal UI the user switches portal area via "portal-switch-client"
    Then the browser URL should contain "/da/dashboard/personal"

  @ui-only @ui @issue-93 @parent-80
  Scenario: Mobile viewport workspace shell toggles navigation drawer and user menu dropdown
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in a mobile viewport "390x844" client "anders_sand" opens "/da/dashboard/personal"
    And in the portal UI the user opens the mobile navigation drawer
    Then element "mobile-sidebar-drawer" should be visible and match visual snapshot "shell-mobile-drawer"
    When in the portal UI the user closes the mobile drawer and opens the user menu dropdown
    Then element "user-menu-dropdown" should be visible

  @ui-only @ui @issue-94 @parent-80
  Scenario: Administrator creates and deletes a scoped user account in the user directory UI
    Given an authenticated administrator session
    When in the portal UI administrator "admin_user" opens "/da/dashboard/admin?tab=users"
    Then the visual snapshot "admin-users-directory" of the user directory workspace should match baseline
    When in the portal UI administrator creates a "CLIENT" user account for logical user "ui_oprettet_bruger"
    Then the user directory list in the UI should contain logical user "ui_oprettet_bruger"
    When in the portal UI administrator deletes logical user "ui_oprettet_bruger" via the confirmation dialog
    Then logical user "ui_oprettet_bruger" should be removed from the UI user directory list
