@fullstack @api
Feature: Psychotraumatology PCL-5 Screening and Privacy Isolation
  As a therapist and client
  I want PCL-5 trauma assessments recorded accurately and restricted to authorized participants
  So that clinical progress can be measured without exposing sensitive mental health data

  Scenario: Therapist submits and retrieves a PCL-5 trauma assessment for an active client
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Traumeterapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    When therapist "maja_terapeut" submits a PCL-5 trauma assessment for "anders_sand" with total score 48 and severity "SEVERE"
    Then the PCL-5 assessment should be stored with score 48 and severity "SEVERE"
    And client "anders_sand" retrieving their PCL-5 assessments should include score 48

  Scenario: Cross-client access to PCL-5 assessments is denied
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And a registered user account exists with username "other_client", full name "Anden Klient", email "other@example.dk", and role "CLIENT"
    And an authenticated client session for "other_client"
    When client "other_client" attempts to retrieve PCL-5 assessments for "anders_sand"
    Then access should be denied due to insufficient permissions
