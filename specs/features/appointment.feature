@fullstack @api
Feature: Therapy Appointment Scheduling, Conflicts, Rescheduling, and Optimal Slot Finding
  As a client and therapist
  I want reliable appointment booking, conflict detection, rescheduling, cancellation, date filtering, and slot optimization
  So that clinic calendars stay accurate and double bookings are prevented

  Scenario: Client books an available therapy session with a therapist
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" books an appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-11-20T10:00:00" to "2026-11-20T11:00:00"
    Then the appointment booking should succeed with status "CONFIRMED"

  Scenario: Double booking the same therapist in an overlapping time slot is rejected as a conflict
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" books an appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-11-21T14:00:00" to "2026-11-21T15:00:00"
    Then the appointment booking should succeed with status "CONFIRMED"
    When client "anders_sand" attempts to book an appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-11-21T14:30:00" to "2026-11-21T15:30:00"
    Then the booking should be rejected as a scheduling conflict

  Scenario: Booking with an end time not strictly after start time is rejected
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    When client "anders_sand" attempts to book an appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-11-22T15:00:00" to "2026-11-22T14:00:00"
    Then the operation should be rejected with a validation error mentioning "after start time"

  Scenario: Client reschedules and cancels a future appointment while historical dates are rejected
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    And client "anders_sand" has a booked appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-11-23T09:00:00" to "2026-11-23T10:00:00"
    When client "anders_sand" attempts to reschedule that appointment to "2023-01-01T10:00:00" until "2023-01-01T11:00:00"
    Then the operation should be rejected with a validation error mentioning "in the past"
    When client "anders_sand" reschedules that appointment to "2026-11-24T11:00:00" until "2026-11-24T12:00:00"
    Then the appointment start time should be updated to "2026-11-24T11:00:00"
    When client "anders_sand" cancels the scheduled appointment
    Then the cancellation should complete successfully

  Scenario: Filtering client appointments returns only sessions inside the requested date window
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    And client "anders_sand" has a booked appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-11-25T10:00:00" to "2026-11-25T11:00:00"
    And client "anders_sand" has a booked appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-12-10T10:00:00" to "2026-12-10T11:00:00"
    When client "anders_sand" filters appointments from "2026-11-01T00:00:00" to "2026-11-30T23:59:59"
    Then the filtered schedule should include "2026-11-25T10:00:00" and exclude "2026-12-10T10:00:00"

  Scenario: Slot optimization recommends a feasible conflict-free slot across therapist availability windows
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And therapist "maja_terapeut" configures multi-window availability from "09:00" to "12:00" and "13:00" to "16:00"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated client session for "anders_sand"
    And client "anders_sand" has a booked appointment with therapist "maja_terapeut" for service "Individuel Terapi" from "2026-11-26T09:00:00" to "2026-11-26T10:00:00"
    When requesting optimal conflict-free slots for therapist "maja_terapeut" on "2026-11-26"
    Then a feasible recommended slot avoiding "2026-11-26T09:00:00" should be returned

  @backend-only
  Scenario: Unassigned quick-booking prevents duplicate start times
    Given an authenticated therapist session for "maja_terapeut"
    When quick-booking an unassigned appointment for client name "Anders Sand" at "2026-11-27T14:00:00"
    Then the appointment booking should succeed
    When quick-booking an unassigned appointment for client name "Anders Sand" at "2026-11-27T14:00:00"
    Then the booking should be rejected as a scheduling conflict
