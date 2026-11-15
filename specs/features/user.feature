Feature: User Account Management, Authentication, and Role-Based Access Control
  As a clinic operator and platform user
  I want user registration, authentication, personal profiles, and role isolation enforced consistently
  So that each user only accesses the accounts, clinical records, and administrative capabilities permitted for their role

  @fullstack @api
  Scenario: Registering a new user succeeds without exposing secret credentials
    Given an authenticated administrator session
    When registering a new user account with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", password "SecurePassword123!", and role "THERAPIST"
    Then the user account registration should succeed
    And the user directory should include username "maja_terapeut" with role "THERAPIST"
    And no password hash or secret credential should be exposed in the account record

  @fullstack @api
  Scenario: Registering a duplicate username is rejected
    Given an authenticated administrator session
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When registering a new user account with username "anders_sand", full name "Anders Kopi", email "kopi@example.dk", password "SecurePassword123!", and role "CLIENT"
    Then the operation should be rejected with a validation error mentioning "already exists"

  @fullstack @api
  Scenario: Registering an account with an unsupported role is rejected
    Given an authenticated administrator session
    When registering a new user account with username "ugyldig_rolle", full name "Ugyldig Bruger", email "ugyldig@example.dk", password "SecurePassword123!", and role "SUPER_WIZARD"
    Then the operation should be rejected with a validation error mentioning "invalid role"

  @fullstack @api
  Scenario: Removing a user account updates the user directory
    Given an authenticated administrator session
    And a registered user account exists with username "temp_bruger", full name "Midlertidig Bruger", email "temp@example.dk", and role "CLIENT"
    When the user account "temp_bruger" is deleted
    Then the account removal should complete successfully
    And the user directory should not include username "temp_bruger"

  @fullstack @api
  Scenario: Unauthenticated visitors are denied access to protected portal areas
    Given an unauthenticated visitor session
    When attempting to view the user directory
    Then access should be denied as unauthenticated
    When attempting to view appointments
    Then access should be denied as unauthenticated
    When attempting to view client journal entries for "anders_sand"
    Then access should be denied as unauthenticated

  @fullstack @api
  Scenario: Authenticated users can view and update their own personal profile
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated client session for "anders_sand"
    When the signed-in user views their personal profile
    Then the personal profile should belong to "anders_sand" with role "CLIENT"
    When the signed-in user updates their personal profile full name to "Anders Sand Updated" and phone to "+45 20 30 40 50"
    Then the personal profile full name should be "Anders Sand Updated"

  @fullstack @api
  Scenario: Role-based isolation restricts clinical notes to therapists
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" attempts to record a confidential therapist clinical note for "anders_sand"
    Then access should be denied due to insufficient permissions

  @backend-only
  Scenario: Identity verification rejects untrusted tokens and accepts valid issuer claims
    Given an identity token with subject "user-123", username "anders_sand", and roles "CLIENT" issued by an untrusted authority
    When checking the current user profile with that identity token
    Then access should be denied as unauthenticated
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an identity token with subject "user-123", username "anders_sand", and roles "CLIENT" issued by the trusted authority
    When checking the current user profile with that identity token
    Then the personal profile should belong to "anders_sand" with role "CLIENT"
