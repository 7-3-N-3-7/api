@fullstack @api
Feature: Clinic Billing, Prepaid Clip Cards, Subscriptions, Installment Loans, and General Ledger
  As a clinic therapist and client
  I want payments, refunds, prepaid packages, subscriptions, installment plans, and general ledger postings to balance accurately
  So that clinic accounting remains auditable and financial overviews respect role boundaries

  Scenario: Invoice payment and full refund balance general ledger accounts and commit history
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 1200 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When an invoice of 1200 DKK is paid by client "anders_sand" for a therapy session
    Then general ledger account "1100" should change by 1200 DKK and account "4100" should change by 1200 DKK from baseline
    And the ledger commit snapshot for that invoice should be retrievable
    When therapist "maja_terapeut" issues a full refund for that invoice
    Then general ledger account "1100" should change by 0 DKK and account "4100" should change by 0 DKK from baseline

  Scenario: Purchasing and redeeming a prepaid clip card defers and recognizes revenue proportionally
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Klippekort Terapi" priced at 1000 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When client "anders_sand" purchases a 5-session prepaid clip card for 5000 DKK
    Then client "anders_sand" should have 5 remaining prepaid clips
    And general ledger account "1100" should change by 5000 DKK and deferred account "2100" should change by 5000 DKK from baseline
    When client "anders_sand" redeems 1 prepaid clip
    Then client "anders_sand" should have 4 remaining prepaid clips
    And general ledger deferred account "2100" should change by 4000 DKK and revenue account "4100" should change by 1000 DKK from baseline

  Scenario: Subscription billing and 3-installment loan repayment update balances accurately
    Given a registered user account exists with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", and role "THERAPIST"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When activating a monthly subscription plan for client "anders_sand" at 499 DKK
    Then client "anders_sand" should have an active subscription plan
    When client "anders_sand" enters a 3-installment loan plan totaling 3000 DKK
    And client "anders_sand" repays installment 1 of 1000 DKK
    Then the loan plan should reflect 2 remaining installments and 2000 DKK remaining balance

  Scenario: Financial overview and general ledger enforce strict role-based access control
    Given a registered user account exists with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", and role "THERAPIST"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And a registered user account exists with username "other_client", full name "Anden Klient", email "other@example.dk", and role "CLIENT"
    When client "anders_sand" views their own financial overview
    Then the financial overview should be accessible
    When client "other_client" attempts to view the financial overview for "anders_sand"
    Then access should be denied due to insufficient permissions
    When client "anders_sand" attempts to view the clinic general ledger summary
    Then access should be denied due to insufficient permissions
    When therapist "maja_terapeut" views the clinic general ledger summary
    Then the clinic general ledger summary should be accessible
