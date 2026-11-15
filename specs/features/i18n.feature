Feature: Multi-Language Localization, Graceful Fallback, and Live Dictionary Updates
  As a platform user and administrator
  I want supported languages resolved accurately, unknown languages to fall back to English, and live copy updates reflected immediately
  So that clients and therapists experience consistent terminology in their chosen language

  @fullstack @api
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

  @fullstack @api
  Scenario: Unsupported locale falls back to English
    When requesting the localization bundle for unsupported locale "ja"
    Then the localization bundle should fall back to "en"

  @fullstack @api
  Scenario: Administrator updates a live translation key and subsequent lookups reflect the change
    Given an authenticated administrator session
    When the administrator updates translation key "portal.welcome" in locale "da" to "Velkommen til Din Klinik"
    Then requesting the localization bundle for locale "da" should map "portal.welcome" to "Velkommen til Din Klinik"

  @ui-only @ui
  Scenario: Switching language in the UI dynamically updates visible portal labels
    Given a visitor opens the portal application
    When the visitor switches the active language to "en"
    Then visible portal headings should render in "en"
    When the visitor switches the active language to "da"
    Then visible portal headings should render in "da"
