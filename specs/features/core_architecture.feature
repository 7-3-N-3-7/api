@backend-only @issue-35
Feature: Core Platform Base Architecture and Generic Resource Contracts
  As a platform architect
  I want all core domain modules to adhere to the generic base architecture
  So that persistence, service orchestration, and standardized error/resource contracts behave uniformly

  @issue-36 @parent-35
  Scenario: Domain modules adhere to the generic base entity, repository, service, and controller contracts
    Then the following domain components should extend or implement the core base contracts:
      | componentType | className                      |
      | entity        | UserEntity                     |
      | entity        | Appointment                    |
      | entity        | JournalEntry                   |
      | entity        | TherapistClinicalNote          |
      | entity        | TherapistNote                  |
      | entity        | PsychotraumatologyTest         |
      | entity        | ClientProfile                  |
      | entity        | Organisation                   |
      | entity        | ProviderProfile                |
      | entity        | Service                        |
      | entity        | ClientTherapistHandshake       |
      | entity        | I18nDictionary                 |
      | repository    | UserRepository                 |
      | repository    | AppointmentRepository          |
      | repository    | JournalEntryRepository         |
      | repository    | TherapistClinicalNoteRepository|
      | repository    | TherapistNoteRepository        |
      | repository    | PsychotraumatologyTestRepository|
      | repository    | ClientProfileRepository        |
      | repository    | OrganisationRepository         |
      | repository    | ProviderProfileRepository      |
      | repository    | ServiceRepository              |
      | repository    | HandshakeRepository            |
      | service       | UserService                    |
      | service       | AppointmentService             |
      | service       | JournalService                 |
      | service       | PsychotraumatologyService      |
      | service       | ClinicPlatformService          |
      | controller    | UserController                 |
      | controller    | AppointmentController          |
      | controller    | JournalController              |
      | controller    | PsychotraumatologyController   |
      | controller    | ClinicPlatformController       |

  @issue-37 @parent-35
  Scenario: Creating a generic domain appointment allows retrieving it individually and in the appointment directory
    Given an authenticated therapist session for "maja_terapeut"
    When a generic appointment is registered for client "Anders Sand" at "2026-11-20T10:00:00"
    Then the appointment registration should succeed
    And retrieving that appointment individually should return client "Anders Sand" at "2026-11-20T10:00:00"
    And the generic appointment directory should include client "Anders Sand"
