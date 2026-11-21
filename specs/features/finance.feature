@issue-38
Feature: Clinic Billing, Prepaid Clip Cards, Subscriptions, Installment Loans, and General Ledger
  As a clinic therapist and client
  I want payments, refunds, prepaid packages, subscriptions, installment plans, and general ledger postings to balance accurately
  So that clinic accounting remains auditable and financial overviews respect role boundaries

  @fullstack @api @issue-39 @parent-38
  Scenario: Invoice payment and full refund balance general ledger accounts and commit history
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When an invoice of 2 DKK is paid by client "anders_sand" for a therapy session
    Then general ledger account "1100" should change by 2 DKK and account "4100" should change by 2 DKK from baseline
    And the ledger commit snapshot for that invoice should be retrievable
    When therapist "maja_terapeut" issues a full refund for that invoice
    Then general ledger account "1100" should change by 0 DKK and account "4100" should change by 0 DKK from baseline

  @fullstack @api @issue-40 @parent-38
  Scenario: Purchasing and redeeming a prepaid clip card defers and recognizes revenue proportionally
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Klippekort Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered client "anders_sand" with an active handshake with therapist "maja_terapeut"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When client "anders_sand" purchases a 5-session prepaid clip card for 3 DKK
    Then client "anders_sand" should have 5 remaining prepaid clips
    And general ledger account "1100" should change by 3 DKK and deferred account "2100" should change by 3 DKK from baseline
    When client "anders_sand" redeems 1 prepaid clip
    Then client "anders_sand" should have 4 remaining prepaid clips
    And general ledger deferred account "2100" should change by 2.40 DKK and revenue account "4100" should change by 0.60 DKK from baseline

  @fullstack @api @issue-41 @parent-38
  Scenario: Subscription billing and 3-installment loan repayment update balances accurately
    Given a registered user account exists with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", and role "THERAPIST"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When activating a monthly subscription plan for client "anders_sand" at 3 DKK
    Then client "anders_sand" should have an active subscription plan
    When client "anders_sand" enters a 3-installment loan plan totaling 6 DKK
    And client "anders_sand" repays installment 1 of 2 DKK
    Then the loan plan should reflect 2 remaining installments and 4 DKK remaining balance

  @fullstack @api @issue-42 @parent-38
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

  @fullstack @api @issue-43 @parent-38
  Scenario: Vipps MobilePay OSGi plugin processes recurring subscriptions, clip cards, and tokenized credit card payments
    Given a registered user account exists with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", and role "THERAPIST"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When client "anders_sand" pays via Vipps OSGi checkout for "CLIP_CARD" of 3 DKK with payment method "CREDIT_CARD" and 5 clips
    Then client "anders_sand" should have 5 remaining prepaid clips
    And general ledger account "1100" should change by 3 DKK and deferred account "2100" should change by 3 DKK from baseline
    When client "anders_sand" pays via Vipps OSGi checkout for "SUBSCRIPTION" of 3 DKK with payment method "MOBILEPAY"
    And the active Vipps agreement is charged for the next recurring period by "anders_sand"
    Then general ledger account "1100" should change by 9 DKK and revenue account "4200" should change by 6 DKK from baseline
    When the active Vipps agreement is cancelled by "anders_sand"
    Then the Vipps agreement status should be "STOPPED"

  @fullstack @api @issue-44 @parent-38
  Scenario: Purchasing Therapist and Management access via Vipps MobilePay routes payouts to Docker Secret IBANs and upgrades roles
    Given a registered user account exists with username "maja_terapeut", full name "Maja Lindholm", email "maja@klinik.dk", and role "THERAPIST"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    And an authenticated therapist session for "maja_terapeut"
    And the baseline general ledger balances are recorded
    When user "anders_sand" with role "CLIENT" purchases platform access "THERAPIST_ACCESS" via payment method "MOBILEPAY"
    Then the Vipps payout destination should have IBAN "DK8130000012345678", MSN "700101", amount 4 DKK, and granted role "THERAPIST"
    And general ledger account "1100" should change by 4 DKK and revenue account "4300" should change by 4 DKK from baseline
    And user "anders_sand" should be able to access the clinic general ledger summary
    When user "maja_terapeut" with role "THERAPIST" purchases platform access "MANAGEMENT_ACCESS" via payment method "CREDIT_CARD"
    Then the Vipps payout destination should have IBAN "DK9230000087654321", MSN "700202", amount 5 DKK, and granted role "ADMIN"
    And general ledger account "1100" should change by 9 DKK and revenue account "4300" should change by 9 DKK from baseline
    And the ledger commit snapshot for that invoice should be retrievable

  @ui-only @ui @issue-45 @parent-38
  Scenario: Client Finance hub displays 2 and 3 DKK plans, hides technical audit, and toggles 4 and 5 DKK licenses
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=finance"
    Then element "vipps-payment-hub" should be visible while "technical-audit-details" is hidden for clients
    And the visual snapshot "finance-client-vipps-hub" of the finance workspace should match baseline
    When in the portal UI client expands "professional-licenses-toggle"
    Then buttons "btn-checkout-therapist-access" and "btn-checkout-management-access" should be visible

  @ui-only @ui @issue-46 @parent-38
  Scenario: Client completes a 3 DKK clip card MobilePay checkout in the modal and redeems one clip
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=finance"
    And in the portal UI client opens checkout modal via "btn-checkout-clipcard"
    Then element "vipps-checkout-modal" should be visible without "checkout-payout-routing"
    And the visual snapshot "finance-vipps-checkout-modal" of element "vipps-checkout-modal" should match baseline
    When in the portal UI client submits MobilePay checkout with phone "+4522334455"
    Then element "vipps-checkout-receipt" should be visible and clip balance should be 5
    When in the portal UI client clicks "btn-consume-clip"
    Then client prepaid clip balance in the UI should decrease to 4

  @ui-only @ui @issue-47 @parent-38
  Scenario: Client completes a 4 DKK Therapist Access credit card checkout in the Vipps modal
    Given a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    When in the portal UI client "anders_sand" opens "/da/dashboard/personal?tab=finance"
    And in the portal UI client expands "professional-licenses-toggle"
    And in the portal UI client opens checkout modal via "btn-checkout-therapist-access" and switches to card payment
    Then the visual snapshot "finance-card-checkout-modal" of the card checkout modal should match baseline
    When in the portal UI client submits tokenized credit card checkout
    Then element "vipps-checkout-receipt" should contain "THERAPIST"

  @ui-only @ui @issue-48 @parent-38
  Scenario: Therapist finance workspace reveals technical audit details and 5 DKK Management payout routing
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    When in the portal UI therapist "maja_terapeut" opens "/da/dashboard/therapist?tab=finance"
    And in the portal UI therapist expands "technical-audit-summary" and opens "btn-checkout-management-access"
    And in the portal UI therapist expands checkout payout routing details
    Then element "checkout-payout-routing" should display IBAN "DK9230000087654321" and MSN "700202"
    And the visual snapshot "finance-therapist-payout-audit" of element "vipps-checkout-modal" should match baseline
