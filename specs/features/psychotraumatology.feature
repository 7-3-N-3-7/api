Feature: Psychotraumatology PCL-5 Screening and Privacy Isolation
  As a therapist and client
  I want PCL-5 trauma assessments recorded accurately and restricted to authorized participants
  So that clinical progress can be measured without exposing sensitive mental health data

  @fullstack @api
  Scenario: Therapist submits and retrieves a PCL-5 trauma assessment for an active client
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Traumeterapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When therapist "maja_terapeut" submits a PCL-5 trauma assessment for "anders_sand" with total score 48 and severity "SEVERE"
    Then the PCL-5 assessment should be stored with score 48 and severity "SEVERE"
    And client "anders_sand" retrieving their PCL-5 assessments should include score 48

  @fullstack @api
  Scenario: Cross-client access to PCL-5 assessments is denied
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And a registered user account exists with username "other_client", full name "Anden Klient", email "other@example.dk", and role "CLIENT"
    And an authenticated client session for "other_client"
    When client "other_client" attempts to retrieve PCL-5 assessments for "anders_sand"
    Then access should be denied due to insufficient permissions

  @ui-only @ui
  Scenario: Client navigates 4 PCL-5 symptom cluster wizard and tracks live progress bar
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=pcl5"
    And in the portal UI client selects option 2 on PCL-5 question 0 and advances to the next cluster
    Then element "pcl5-progress-bar" should report progress 1 and cluster tab "pcl5-cluster-tab-1" should be active
    And the visual snapshot "pcl5-cluster-wizard" of the PCL-5 form should match baseline

  @ui-only @ui
  Scenario: Client completes all 20 PCL-5 questionnaire items and records computed severity score
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=pcl5"
    And in the portal UI client completes all 20 PCL-5 items with Likert value 2 and submits
    Then the PCL-5 results list in the UI should contain score 40

  @ui-only @ui
  Scenario: Therapist uses manual quick-entry PCL-5 scoring mode for an active handshake client
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When in the portal UI therapist "maja_terapeut" opens "/da/dashboard/therapist?tab=pcl5"
    And in the portal UI therapist switches to manual PCL-5 quick-entry mode for client "anders_sand"
    Then the visual snapshot "pcl5-therapist-manual-mode" of the PCL-5 form should match baseline
    When in the portal UI therapist enters manual PCL-5 score "44" and submits
    Then the PCL-5 results list in the UI should contain score 44
