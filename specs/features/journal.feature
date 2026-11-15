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
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When therapist "maja_terapeut" records a shared clinical note "God fremgang i øvelserne" for "anders_sand"
    And therapist "maja_terapeut" records a confidential clinical note "Mistanke om flashbacks ved trigger X" for "anders_sand"
    Then when client "anders_sand" views their journal and unified timeline, "God fremgang i øvelserne" should be visible and "Mistanke om flashbacks ved trigger X" should be hidden
    And when therapist "maja_terapeut" views the clinical history and unified timeline for "anders_sand", both "God fremgang i øvelserne" and "Mistanke om flashbacks ved trigger X" should be visible

  @fullstack @api
  Scenario: A therapist without an active handshake cannot view a client's journal entries or clinical notes
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And an onboarded therapist "sofie_terapeut" with IBAN "DK5000400440998877", currency "DKK", and service "Parterapi" priced at 1400 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" writes a personal journal entry titled "Privat Dagbog" with content "Kun for min egen behandler."
    And therapist "maja_terapeut" records a confidential clinical note "Klinisk observation A" for "anders_sand"
    Then when unlinked therapist "sofie_terapeut" views the journal bundle and clinical history for "anders_sand", no entries or notes should be returned

  @ui-only @ui
  Scenario: Therapist opens Client Journal & Timeline view in the portal UI
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When therapist "maja_terapeut" opens the Client Journal view for "anders_sand"
    Then the therapist portal should show the Client Journal timeline and note composer
