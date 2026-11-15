Feature: Clinic Onboarding, IBAN & Currency Governance, Marketplace Directory, and Handshakes
  As a clinic provider and prospective client
  I want therapist onboarding prerequisites, service management, marketplace discovery, and handshakes enforced consistently
  So that only verified providers publish services and clients collaborate within approved clinical relationships

  @fullstack @api
  Scenario: Therapist without an IBAN cannot publish billable services and is informed of missing fields
    Given a registered user account exists with username "ny_terapeut", full name "Ny Terapeut", email "ny@klinik.dk", and role "THERAPIST"
    And an authenticated therapist session for "ny_terapeut"
    When checking onboarding readiness for therapist "ny_terapeut"
    Then service creation should be blocked and missing profile fields should include "IBAN"
    When therapist "ny_terapeut" attempts to create service "Angstbehandling" priced at 2 "DKK" for 50 minutes in branch "PSYCHOLOGY"
    Then the operation should be rejected with a validation error mentioning "IBAN"

  @fullstack @api
  Scenario: Therapist completes onboarding with IBAN and currency, publishes a service, and toggles visibility
    Given a registered user account exists with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", and role "THERAPIST"
    And an authenticated therapist session for "maja_terapeut"
    When therapist "maja_terapeut" configures bank details with IBAN "DK5000400440116243" and preferred currency "DKK"
    Then service creation should be enabled for therapist "maja_terapeut" with no missing profile fields
    When therapist "maja_terapeut" creates service "Traumeterapi (EMDR)" priced at 2 "DKK" for 60 minutes in branch "PSYCHOLOGY"
    Then the service "Traumeterapi (EMDR)" should be created as active with currency "DKK"
    When therapist "maja_terapeut" toggles active status on service "Traumeterapi (EMDR)"
    Then the service "Traumeterapi (EMDR)" should become inactive

  @fullstack @api
  Scenario: Marketplace directory excludes the viewing therapist's own services while showing peer providers
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Traumeterapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And an onboarded therapist "sofie_terapeut" with IBAN "DK5000400440998877", currency "DKK", and service "Parterapi" priced at 4 DKK for 75 minutes in branch "PSYCHOLOGY"
    And an authenticated therapist session for "maja_terapeut"
    When "maja_terapeut" browses the clinic marketplace directory
    Then the marketplace directory should include provider "sofie_terapeut" and exclude provider "maja_terapeut"

  @fullstack @api
  Scenario: Client-therapist handshake lifecycle supports approval and termination
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Klinisk Psykologi" priced at 3 DKK for 50 minutes in branch "PSYCHOLOGY"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When client "anders_sand" requests a handshake with therapist "maja_terapeut"
    Then the handshake status should be "REQUESTED"
    When therapist "maja_terapeut" updates the handshake status to "ACTIVE"
    Then the handshake status should be "ACTIVE"
    When therapist "maja_terapeut" updates the handshake status to "TERMINATED"
    Then the handshake status should be "TERMINATED"

  @fullstack @api
  Scenario: End-to-end three-user clinic journey across onboarding, handshake, booking, assessment, and overviews
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "PTSD Session" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And a registered user account exists with username "sofie_kliniker", full name "Sofie Holm", email "sofie@klinik.dk", and role "CLIENT"
    When client "anders_sand" books an appointment with therapist "maja_terapeut" for service "PTSD Session" from "2026-12-01T10:00:00" to "2026-12-01T11:00:00"
    And therapist "maja_terapeut" submits a PCL-5 trauma assessment for "anders_sand" with total score 41 and severity "MODERATE"
    Then the therapist overview for "maja_terapeut" should list client "anders_sand" with handshake status "ACTIVE" and latest PCL-5 score 41
    And the client overview for "anders_sand" should reflect the booking for "PTSD Session" without exposing "sofie_kliniker"

  @ui-only @ui
  Scenario: Un-onboarded therapist sees onboarding gate in clinic tab, submits CVR and IBAN, and publishes a 2 DKK service
    Given a registered user account exists with username "ny_terapeut", full name "Ny Terapeut", email "ny_ui@klinik.dk", and role "THERAPIST"
    When in the portal UI therapist "ny_terapeut" opens "/da/dashboard/therapist?tab=clinic_cvr"
    Then element "therapist-onboarding-form" should be visible and match visual snapshot "clinic-therapist-onboarding-gate"
    When in the portal UI therapist completes clinic onboarding with organisation "73N37", CVR "46688244", and IBAN "DK5000400440116243"
    And in the portal UI therapist creates service "UI Samtale" priced at 2 DKK for 60 minutes
    Then the therapist services list in the UI should display "UI Samtale"

  @ui-only @ui
  Scenario: Client discovers therapist in clinic marketplace and requests a clinical handshake
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=marketplace"
    And in the portal UI client requests a handshake with provider "maja_terapeut"
    Then provider card for "maja_terapeut" should display handshake status in the marketplace

  @ui-only @ui
  Scenario: Client updates personal profile and handshake data-sharing permissions in consents tab
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=consents"
    Then the visual snapshot "clinic-client-consents-panel" of the consents view should match baseline
    When in the portal UI client updates personal phone to "+45 31 32 33 34" and configures handshake restriction from "2026-01-01" hiding mood scores
    Then elements "profile-saved-badge" and "handshake-settings-saved" should be visible

  @ui-only @ui
  Scenario: Client sees therapist upgrade call-to-action in header and navigates to clinic onboarding page
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal"
    And in the portal UI client clicks "upgrade-therapist-cta"
    Then the browser URL should contain "/da/dashboard/clinic" and show "clinic-onboarding-page"

  @ui-only @ui
  Scenario: Unified settings route renders Profile & Clinic settings workspace
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/settings"
    Then element "settings-clinic-page" should be visible and match visual snapshot "clinic-settings-workspace"
