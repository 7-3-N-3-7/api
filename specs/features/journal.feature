Feature: Client Journaling, Confidential Therapist Notes, and Unified Clinical Timeline
  As a client and therapist
  I want personal journals, shared reflections, and confidential therapist notes managed with strict privacy boundaries
  So that clients track their recovery safely while clinicians keep private medical observations confidential

  @fullstack @api
  Scenario: Client creates and retrieves personal journal entries
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" writes a personal journal entry titled "Morgenrefleksion" with content "Sov roligt i nat."
    Then viewing the journal entries for "anders_sand" should include "Morgenrefleksion"

  @fullstack @api
  Scenario: Confidential therapist clinical notes remain hidden from clients in journals and timeline
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When therapist "maja_terapeut" records a shared clinical note "God fremgang i øvelserne" for "anders_sand"
    And therapist "maja_terapeut" records a confidential clinical note "Mistanke om flashbacks ved trigger X" for "anders_sand"
    Then when client "anders_sand" views their journal and unified timeline, "God fremgang i øvelserne" should be visible and "Mistanke om flashbacks ved trigger X" should be hidden
    And when therapist "maja_terapeut" views the clinical history and unified timeline for "anders_sand", both "God fremgang i øvelserne" and "Mistanke om flashbacks ved trigger X" should be visible

  @fullstack @api
  Scenario: A therapist without an active handshake cannot view a client's journal entries or clinical notes
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And an onboarded therapist "sofie_terapeut" with IBAN "DK5000400440998877", currency "DKK", and service "Parterapi" priced at 4 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" writes a personal journal entry titled "Privat Dagbog" with content "Kun for min egen behandler."
    And therapist "maja_terapeut" records a confidential clinical note "Klinisk observation A" for "anders_sand"
    Then when unlinked therapist "sofie_terapeut" views the journal bundle and clinical history for "anders_sand", no entries or notes should be returned

  @ui-only @ui
  Scenario: Client without handshakes sees sharing guidance and saves a private diary entry
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=journal"
    And in the portal UI client toggles the diary share option to inspect active handshake guidance
    Then element "no-active-handshakes-tip" should be visible
    When in the portal UI client toggles off diary sharing and submits a private diary entry titled "Min Stille Refleksion" with mood 8
    Then the journal list in the UI should contain "Min Stille Refleksion"
    And the visual snapshot "journal-client-private-diary" of the journal workspace should match baseline

  @ui-only @ui
  Scenario: Client with an active handshake shares a reflection explicitly with their therapist
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=journal"
    And in the portal UI client shares a diary entry titled "Delt Dagbogsnotat" with therapist "maja_terapeut" and mood 7
    Then the journal list in the UI should contain "Delt Dagbogsnotat"

  @ui-only @ui
  Scenario: Therapist switches Semantic Zoom Timeline across Macro, Meso, and Micro detail levels
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    When in the portal UI therapist "maja_terapeut" opens "/da/dashboard/therapist?tab=timeline"
    And in the portal UI therapist activates timeline zoom preset "macro"
    Then element "active-zoom-tier-badge" should reflect zoom tier "Makro" and match visual snapshot "timeline-zoom-macro"
    When in the portal UI therapist activates timeline zoom preset "meso"
    Then element "active-zoom-tier-badge" should reflect zoom tier "Meso" and match visual snapshot "timeline-zoom-meso"
    When in the portal UI therapist activates timeline zoom preset "micro"
    Then element "active-zoom-tier-badge" should reflect zoom tier "Mikro" and match visual snapshot "timeline-zoom-micro"

  @ui-only @ui
  Scenario: Therapist filters timeline categories and inspects full SOAP notes in detail drawer
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    When in the portal UI therapist "maja_terapeut" opens "/da/dashboard/therapist?tab=timeline"
    And in the portal UI therapist filters timeline by "sessions" then "goals" then "all"
    And in the portal UI therapist opens the first timeline event card at "micro" zoom
    Then element "journal-detail-inspector" should be visible and match visual snapshot "timeline-detail-inspector"
    When in the portal UI therapist closes "close-detail-inspector"
    Then element "journal-detail-inspector" should be hidden

  @ui-only @ui
  Scenario: Therapist adjusts Vertical Zoom Scrollbar via keyboard shortcuts
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    When in the portal UI therapist "maja_terapeut" opens "/da/dashboard/therapist?tab=timeline"
    And in the portal UI therapist zooms via keyboard "+" three times and "-" once on "zoom-scrollbar-track"
    Then the zoom percentage readout "zoom-percentage-value" should update accordingly
