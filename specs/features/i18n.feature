@issue-49
Feature: Multi-Language Localization, Graceful Fallback, and Live Dictionary Updates
  As a platform user and administrator
  I want supported languages resolved accurately, unknown languages to fall back to English, and live copy updates reflected immediately
  So that clients and therapists experience consistent terminology in their chosen language

  @fullstack @api @issue-50 @parent-49
  Scenario Outline: Supported platform locales resolve without fallback
    When requesting the localization bundle for locale "<locale>"
    Then the localization bundle should return translations for "<locale>" without fallback

    Examples:
      | locale |
      | da     |
      | en     |
      | fr     |
      | es     |
      | de     |

  @fullstack @api @issue-51 @parent-49
  Scenario: Unsupported locale falls back to English
    When requesting the localization bundle for unsupported locale "ja"
    Then the localization bundle should fall back to "en"

  @fullstack @api @issue-52 @parent-49
  Scenario: Administrator updates a live translation key and subsequent lookups reflect the change
    Given an authenticated administrator session
    When the administrator updates translation key "portal.welcome" in locale "da" to "Velkommen til Din Klinik"
    Then requesting the localization bundle for locale "da" should map "portal.welcome" to "Velkommen til Din Klinik"

  @ui-only @ui @issue-53 @parent-49
  Scenario: Landing page and hero copy adapt cleanly across Danish, English, French, Spanish, and German
    When in the browser a visitor switches the landing page language through "da", "en", "fr", "es", and "de"
    Then the browser UI should render localized headings without missing translation errors or leaked keys
    And the visual snapshot "i18n-landing-hero-da" for "/da" and "i18n-landing-hero-en" for "/en" should match baseline

  @ui-only @ui @issue-54 @parent-49
  Scenario: Administrator searches, filters by locale, and paginates the live i18n dictionary
    Given an authenticated administrator session
    When in the portal UI administrator "admin_user" opens "/da/dashboard/admin?tab=overview"
    Then the browser UI should display i18n search, locale filter pills, and pagination controls
    When in the portal UI administrator filters the i18n dictionary by search "auth.signInButton" and locale "all"
    Then the visual snapshot "i18n-admin-dictionary" of the i18n workspace should match baseline

  @ui-only @ui @issue-55 @parent-49
  Scenario: Administrator creates and deletes a translation entry via confirmation dialog
    Given an authenticated administrator session
    When in the portal UI administrator "admin_user" opens "/da/dashboard/admin?tab=overview"
    And in the portal UI administrator creates a translation key in locale "da" with value "Playwright Midlertidig Banner"
    Then the i18n dictionary list in the UI should contain the created translation value "Playwright Midlertidig Banner"
    When in the portal UI administrator deletes that created translation entry via the confirmation dialog
    Then the created translation entry should be removed from the i18n dictionary list

  @ui-only @ui @issue-56 @parent-49
  Scenario: Authenticated portal routes across locales render without leaked translation keys
    Given an onboarded therapist "maja_terapeut" with IBAN "DK5000400440116243", currency "DKK", and service "Individuel Terapi" priced at 2 DKK for 60 minutes in branch "PSYCHOLOGY"
    And a registered user account exists with username "anders_sand", full name "Anders Sand", email "anders@example.dk", and role "CLIENT"
    Then authenticated portal pages across "/da/dashboard/personal", "/en/dashboard/personal", and "/de/dashboard/therapist" should render cleanly without i18n errors
