# Komplet Diagram-katalog til Hovedopgaven (Baseret på Kodebasen & Git-historik)

Dette dokument indeholder alle diagrammer til hovedopgaven udarbejdet i **Mermaid** direkte ud fra projektets faktiske kildekode og Git-commithistorik på tværs af `root` (`api`), `backend` og `frontend`.

---

## Indholdsfortegnelse

1. [Sprint-rekonstruktion og Commit-Tidslinje baseret på Git Commits](#1-sprint-rekonstruktion-og-commit-tidslinje-baseret-på-git-commits)
   - [1.1 Visuel Commit-Tidslinje (Flowchart) & Commit-Log Tabel til Procesdelen](#11-visuel-commit-tidslinje-flowchart--commit-log-tabel-til-procesdelen)
2. [Gitgraph – Branch-strategi og JGit Patient-versionsstyring](#2-gitgraph--branch-strategi-og-jgit-patient-versionsstyring)
   - [2.1 Gitgraph over projektets udviklings-branches (GitHub)](#21-gitgraph-over-projektets-udviklings-branches-github)
   - [2.2 Gitgraph over Eclipse JGit Patient-Journal Branches (`JournalGitService`)](#22-gitgraph-over-eclipse-jgit-patient-journal-branches-journalgitservice)
3. [Flowchart / Pipeline – CI/CD, GitHub SDLC & Outside-In BDD/TDD](#3-flowchart--pipeline--cicd-github-sdlc--outside-in-bddtdd)
4. [ER-Diagram (`erDiagram`) – PostgreSQL, MongoDB & JGit](#4-er-diagram-erdiagram--postgresql-mongodb--jgit)
5. [State Machine Diagrammer (`stateDiagram-v2`)](#5-state-machine-diagrammer-statediagram-v2)
   - [5.1 State Machine: Samtykke-Handshake & Granulær Journaladgang](#51-state-machine-samtykke-handshake--granulær-journaladgang)
   - [5.2 State Machine: Aftale-livscyklus (Appointment) & Finansiel Bogføring (KillBill/Fineract)](#52-state-machine-aftale-livscyklus-appointment--finansiel-bogføring-killbillfineract)
6. [Aktivitets- og Sekvensdiagrammer pr. Domæne (Alle 7 Domæner)](#6-aktivitets--og-sekvensdiagrammer-pr-domæne-alle-7-domæner)
   - [6.1 Domæne 1: `core` (Generisk Base-Arkitektur: BaseController $\rightarrow$ BaseService $\rightarrow$ BaseRepository)](#61-domæne-1-core-generisk-base-arkitektur-basecontroller--baseservice--baserepository)
   - [6.2 Domæne 2: `appointment` (Booking, Timefold AI Solver, JGit, Redis & Kafka)](#62-domæne-2-appointment-booking-timefold-ai-solver-jgit-redis--kafka)
   - [6.3 Domæne 3: `clinic-platform` (Klinik-markedsplads, CVR/IBAN Onboarding, Ydelser & Handshakes)](#63-domæne-3-clinic-platform-klinik-markedsplads-cvriban-onboarding-ydelser--handshakes)
   - [6.4 Domæne 4: `i18n` (Flersproget Lokalisering, MongoDB Dictionaries & BFF Cache)](#64-domæne-4-i18n-flersproget-lokalisering-mongodb-dictionaries--bff-cache)
   - [6.5 Domæne 5: `journal` (Klientjournal, Fortrolige Terapeutnoter & JGit Privatlivsfilter)](#65-domæne-5-journal-klientjournal-fortrolige-terapeutnoter--jgit-privatlivsfilter)
   - [6.6 Domæne 6: `psychotraumatology` (PCL-5 Traumescreening & Selvbetjenings-autorisation)](#66-domæne-6-psychotraumatology-pcl-5-traumescreening--selvbetjenings-autorisation)
   - [6.7 Domæne 7: `user` (Brugeroprettelse, Keycloak OAuth2 JWT Filter & Profil)](#67-domæne-7-user-brugeroprettelse-keycloak-oauth2-jwt-filter--profil)
7. [Frontend 1:1 Symmetri, Dual-App Separation of Concerns (`apps/landing` vs. `apps/dashboard`) & RBAC (`RoleGuard`)](#7-frontend-11-symmetri-dual-app-separation-of-concerns-appslanding-vs-appsdashboard--rbac-roleguard)

---

# 1. Sprint-rekonstruktion og Commit-Tidslinje baseret på Git Commits

Da udviklingsforløbet primært er drevet og dokumenteret gennem hyppige Git-commits og Pull Requests på tværs af `api` (root), `backend` og `frontend`, er projektets faktiske sprint- og tidsforløb her rekonstrueret direkte fra `git log` (fra første commit i hovedopgaveforløbet d. **26. oktober 2026** frem til aflevering d. **5. januar 2027**).

### 1.1 Visuel Commit-Tidslinje (Flowchart) & Commit-Log Tabel til Procesdelen

```mermaid
flowchart LR
    S1["Sprint 1 (26/10 - 03/11)\n• c9c320d: Spring Boot & JPA init\n• f33d296: Frontend init\n• 75eb886: GHCR & E2E pipeline\n• 89bcf24: Playwright RBAC E2E"]
    S2["Sprint 2 (03/11 - 10/11)\n• c505a5b: Taiga TG-14 ChatOps\n• 32928f5: Zitadel til Keycloak OIDC\n• 069386f: feature/journal-crm\n• 33df4da: Taiga BDD webhook"]
    S3["Sprint 3 (10/11 - 17/11)\n• 91c9794: JGit, Quartz, StateMachine\n• fa8b407: Next.js 16 + next-intl\n• bf32d79: JournalGitService\n• f502ae4: I18n MongoDB modul"]
    S4["Sprint 4 (17/11 - 24/11)\n• 3103cd9: UUID, Provider & Service\n• bdc2b79: PCL-5 Psychotraumatology\n• efc4357: TherapistClinicalNote\n• aa45c1c: TG-29 Localization PR"]
    S5["Sprint 5 (24/11 - 02/12)\n• 6b6d01b: MultiWindow & JGit UI\n• 3124690: Timefold AI Solver\n• 403ffb1: Generisk Base-Arkitektur\n• d6e731d: Finans, IBAN & 100% JaCoCo"]

    S1 --> S2 --> S3 --> S4 --> S5
```

| Sprint & Periode | Centrale Git Commits (`backend` / `frontend` / `api`) | Leveret Funktionalitet & Arkitektur |
| :--- | :--- | :--- |
| **Sprint 1**<br>*(26. okt – 03. nov 2026)* | `c9c320d`, `ca5872f`, `f33d296`, `75eb886`, `89bcf24` | Opstart af Spring Boot backend, første Gherkin `.feature`-filer til journal/psykotraumatologi, Dockerisering, GHCR container-pipeline og Playwright E2E-skelet. |
| **Sprint 2**<br>*(03. nov – 10. nov 2026)* | `46c4615`, `c505a5b` (`TG-14`), `d70ec4f`, `32928f5` (#37), `40af524`, `069386f` (#21), `33df4da` | Opsætning af Traefik reverse proxy, arkitektonisk skift fra Zitadel til **Keycloak 24 OIDC** med dedikeret PostgreSQL `auth-db`, samt automatisk Taiga-til-GitHub BDD synkronisering. |
| **Sprint 3**<br>*(10. nov – 17. nov 2026)* | `91c9794`, `a17c344` (`TG-26`), `6446311` (`TG-27`), `fa8b407`, `94e7ed1`, `bf32d79`, `f502ae4`, `21432bf` | Skift fra Vite SPA til **Next.js 16 BFF med NextAuth**, implementering af [`JournalGitService`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/journal/JournalFeature.java) (Eclipse JGit), `I18nService` (MongoDB) og Docker Compose secrets-håndtering. |
| **Sprint 4**<br>*(17. nov – 24. nov 2026)* | `3103cd9`, `1d0e7e9`, `bdc2b79`, `efc4357`, `5f22640`, `d118282`, `aa45c1c` (`TG-29`), `28bf632` | Gennemførelse af UUID-identitet på tværs af entiteter, oprettelse af [`PsychotraumatologyFeature`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/psychotraumatology/PsychotraumatologyFeature.java) (PCL-5), fortrolige terapeutnoter (`TherapistClinicalNote`) og fuld flersproget lokaliserings-pipeline. |
| **Sprint 5**<br>*(24. nov – 02. dec 2026)* | `44238d6`, `6b6d01b`, `2da49bb`, `3124690`, `5c87524`, `403ffb1`, `7d6e4ea`, `d6e731d`, `9668e6a` | **Videreudvikling & Arkitektonisk Konsolidering:** `TherapistMultiWindowWorkspace` med JGit diff-tidslinje, **Timefold Solver** booking-optimering, **Konsolideret 2-Fils Core (`BaseDomainCore` + `BaseWebCore`) & Vertical Slice Arkitektur (`features/*`)**, finansmodul (KillBill/Fineract + IBAN) og **100% JaCoCo coverage gate**. |

---

# 2. Gitgraph – Branch-strategi og JGit Patient-versionsstyring

### 2.1 Gitgraph over projektets udviklings-branches (GitHub)
Nedenstående Mermaid `gitGraph` viser den faktiske branch- og merge-historik (`main`, `dev` og `feature/*`-branches) fra projektets Git-repositories:

```mermaid
gitGraph
    commit id: "c9c320d: Init Spring Boot & BDD"
    commit id: "75eb886: GHCR & E2E Workflow"
    branch dev
    checkout dev
    commit id: "c505a5b: Taiga TG-14 Sync"
    commit id: "d70ec4f: Setup Traefik Proxy"

    branch feature/keycloak
    checkout feature/keycloak
    commit id: "32928f5: Zitadel til Keycloak OIDC"
    commit id: "40af524: Keycloak Postgres DB"
    checkout dev
    merge feature/keycloak id: "12dbd9a: PR #44 Keycloak"

    branch feature/journal-crm
    checkout feature/journal-crm
    commit id: "6dbcb81: CRM & Journal Models"
    commit id: "bf32d79: JournalGitService (JGit)"
    checkout dev
    merge feature/journal-crm id: "9ed925d: PR #26 Journal"

    branch feature/TG-29-i18n
    checkout feature/TG-29-i18n
    commit id: "fa8b407: Next.js 16 & next-intl"
    commit id: "f502ae4: MongoDB I18nDictionary"
    commit id: "bdc2b79: PCL-5 Psychotraumatology"
    checkout dev
    merge feature/TG-29-i18n id: "28bf632: PR #27/29 Localization"

    commit id: "3124690: Timefold AI Solver"
    commit id: "403ffb1: Generic Base Architecture" tag: "v2.0-core"
    commit id: "7d6e4ea: Swimlane Diagrams"

    checkout main
    merge dev id: "6342150: Release Main"
    commit id: "d6e731d: Finance, IBAN & 100% JaCoCo" tag: "v2.1-rc"
```

### 2.2 Gitgraph over Eclipse JGit Patient-Journal Branches (`JournalGitService`)
Ud over kildekodens Git-historik bruger systemet **Eclipse JGit** internt i [`JournalGitService.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/service/JournalGitService.java) til at versionsstyre hver enkelt klients journalfil (`./journal-repo/<patientId>.md`) med logiske branches (`[Branch: main]`, `[Branch: trauma-therapy]`, `[Branch: private-diary]`), som styres via klientens `ClientTherapistHandshake.allowedBranches`:

```mermaid
gitGraph TB:
    commit id: "a1b2c3d4: [Branch: main] Aftale oprettet (Klinik Booking)"
    commit id: "e5f6a7b8: [Branch: main] Indledende dagbog (Mood: 5/10)"

    branch trauma-therapy
    checkout trauma-therapy
    commit id: "9c0d1e2f: [Branch: trauma-therapy] EMDR Session #1 (Shared)"
    commit id: "3f4a5b6c: [Branch: trauma-therapy] Terapeut Notat (INTERNAL_MEDICAL_NOTES)"

    branch private-diary
    checkout private-diary
    commit id: "7d8e9f0a: [Branch: private-diary] Privat refleksion (Kun Klient)"

    checkout trauma-therapy
    commit id: "1a2b3c4d: [Branch: trauma-therapy] PCL-5 Opfølgning (Mood: 8/10)"

    checkout main
    merge trauma-therapy id: "5e6f7a8b: [Branch: main] Status-evaluering delt med terapeut"
```

---

# 3. Flowchart / Pipeline – CI/CD, GitHub SDLC & Outside-In BDD/TDD

Dette flowchart viser den samlede udviklings-, SDLC- og CI/CD-pipeline på tværs af [`.github/workflows/sdlc-commit-sync.yml`](file:///z:/home/work/projects/api/.github/workflows/sdlc-commit-sync.yml), [`.github/workflows/sdlc-verify-and-sync.yml`](file:///z:/home/work/projects/api/.github/workflows/sdlc-verify-and-sync.yml), [`pom.xml`](file:///z:/home/work/projects/api/backend/pom.xml) og [`docker-publish.yml`](file:///z:/home/work/projects/api/backend/.github/workflows/docker-publish.yml):

```mermaid
flowchart TD
    subgraph LocalDev["1. Lokal Udvikling & Test-Loop"]
        US["📋 Krav / GitHub Issue\n(Gherkin .feature & GitHub Projects v2)"] --> Branch["🌿 Træ-isomorf Branch\nfeature/<id>-<beskrivelse>"]
        Branch --> Code["💻 Outside-In BDD/TDD Kodning\n(Next.js 16 BFF + Spring Boot 3.3)"]
        Code --> LocalTest{"✅ Lokal Unit/TDD-test\n(JUnit 5 / Vitest)"}
        LocalTest -- "Fejl" --> Code
    end

    subgraph GitHubCI["2. GitHub Actions CI, SDLC & 100% Verification"]
        LocalTest -- "Grøn" --> Push["⬆️ git push origin feature/..."]
        Push --> CommitSync["🔄 SDLC Commit Tag Sync\n(sdlc-commit-sync.yml -> GitHub Projects v2)"]
        Push --> BackendTest["☕ Backend Maven Test & Coverage\n• H2 In-Memory + Testcontainers MongoDB\n• JUnit 5 + Cucumber Java"]
        BackendTest --> JaCoCo{"📊 JaCoCo Coverage Gate\nLine, Branch, Method, Class = 100%?"}
        JaCoCo -- "< 100% Dækning" --> BuildFail["❌ Maven Build Fejler\n(jacoco-check gate)"]
        BuildFail --> Code

        Push --> FrontendTest["⚛️ Frontend & SDLC Test & E2E\n• ESLint + Vitest 100% Istanbul\n• Cucumber.js + Playwright E2E"]
    end

    subgraph CDDeploy["3. Container Publish, Deployment & CI Green Gate"]
        JaCoCo -- "= 100% Bestået" --> PRMerge["🔀 Pull Request & sdlc:verify Green Gate\n(Merge til dev / main -> Done)"]
        FrontendTest --> PRMerge
        CommitSync --> PRMerge

        PRMerge --> SdlcVerify["🟢 SDLC Verify & Living Spec Sync\n(.github/workflows/sdlc-verify-and-sync.yml)"]
        PRMerge --> GHCR["🐳 Docker Multi-Stage Build & Push\n• ghcr.io/7-3-n-3-7/backend:latest\n• ghcr.io/7-3-n-3-7/frontend:latest"]
        GHCR --> ProdRollout["🚀 Cloud VM (Docker Compose + Traefik)\nDocker Secrets & Container Rollout"]
    end
```

---

# 4. ER-Diagram (`erDiagram`) – PostgreSQL, MongoDB & JGit

Nedenstående Mermaid `erDiagram` modellerer det komplette databaseskema på tværs af **PostgreSQL (`business-db`)**, **MongoDB (`integrate_mongo`)** og **Eclipse JGit (`journal-repo`)**:

```mermaid
erDiagram
    APP_USERS {
        UUID id PK "Identifiable (UUID)"
        VARCHAR username UK "NOT NULL"
        VARCHAR email UK "NOT NULL"
        VARCHAR password "BCrypt / OIDC"
        VARCHAR role "CLIENT | THERAPIST | ADMIN"
    }

    CLIENT_PROFILES {
        UUID id PK "Identifiable (UUID)"
        UUID user_id FK, UK "Ref -> APP_USERS.id"
        VARCHAR full_name "NOT NULL"
        DATE date_of_birth "NOT NULL"
        VARCHAR home_address "NOT NULL"
        VARCHAR postal_code "NOT NULL"
        VARCHAR phone_number "NOT NULL"
        VARCHAR email
    }

    ORGANISATIONS {
        UUID id PK "Identifiable (UUID)"
        VARCHAR cvr_number UK "8 cifre, NOT NULL"
        VARCHAR name "NOT NULL"
        VARCHAR address
        VARCHAR postal_code
        VARCHAR phone_number
        VARCHAR email
        VARCHAR video_meeting_url
        VARCHAR iban "Udbetalingskonto"
        VARCHAR currency "ISO 4217 (DKK, EUR, USD)"
    }

    PROVIDER_PROFILES {
        UUID id PK "Identifiable (UUID)"
        UUID user_uuid FK, UK "Ref -> APP_USERS.id"
        UUID organisation_id FK "Ref -> ORGANISATIONS.id"
        VARCHAR display_name
        TEXT biography
        JSONB working_hours_json "Timefold arbejdstider"
        VARCHAR video_meeting_url
        VARCHAR iban
        VARCHAR currency "ISO 4217"
    }

    CLIENT_THERAPIST_HANDSHAKES {
        UUID id PK "Identifiable (UUID)"
        UUID client_uuid FK "Ref -> CLIENT_PROFILES.user_id"
        UUID therapist_uuid FK "Ref -> PROVIDER_PROFILES.user_uuid"
        VARCHAR status "PENDING | ACTIVE | REVOKED"
        TIMESTAMP granted_at
        TIMESTAMP revoked_at
        DATE valid_from
        DATE valid_to
        DATE history_start_date
        DATE history_end_date
        VARCHAR allowed_branches "Kommaseparerede JGit branches"
        VARCHAR custom_restrictions "fx NO_PCL5_SCORES, NO_MOOD_SCORES"
        TEXT branch_restrictions "Pr. branch restriktioner"
    }

    SERVICES {
        UUID id PK "Identifiable (UUID)"
        UUID organisation_id FK "NULLABLE (Klinik-skabelon)"
        UUID provider_profile_id FK "NULLABLE (Terapeut-ydelse)"
        VARCHAR name "NOT NULL"
        TEXT description
        INTEGER duration_minutes "30, 45, 60, 90"
        DECIMAL price "NOT NULL"
        VARCHAR currency "ISO 4217"
        VARCHAR location "Klinik | Online | Hjemmebesøg"
        BOOLEAN is_active "DEFAULT TRUE"
    }

    APPOINTMENTS {
        UUID id PK "Identifiable (UUID)"
        UUID client_uuid FK "Ref -> CLIENT_PROFILES.user_id"
        UUID therapist_uuid FK "Ref -> PROVIDER_PROFILES.user_uuid"
        UUID service_id FK "Ref -> SERVICES.id"
        UUID journal_entry_id FK "NULLABLE Ref -> JOURNAL_ENTRIES.id"
        TIMESTAMP start_time "NOT NULL"
        TIMESTAMP end_time "NOT NULL"
        VARCHAR title
        VARCHAR location
        VARCHAR status "CONFIRMED | CANCELLED"
        VARCHAR git_commit_hash "8-char SHA-1 JGit ref"
    }

    JOURNAL_ENTRIES {
        UUID id PK "Identifiable (UUID)"
        UUID client_uuid FK "Ref -> CLIENT_PROFILES.user_id"
        UUID appointment_id FK "NULLABLE Ref -> APPOINTMENTS.id"
        VARCHAR title "NOT NULL"
        TEXT content "Markdown indhold"
        INTEGER mood_rating "1..10"
        BOOLEAN shared_with_therapists "DEFAULT TRUE"
        TEXT shared_therapist_uuids_raw
        VARCHAR git_branch "DEFAULT main"
        VARCHAR git_commit_hash "8-char SHA-1 JGit ref"
        TIMESTAMP timestamp "NOT NULL"
    }

    THERAPIST_CLINICAL_NOTES {
        UUID id PK "Identifiable (UUID)"
        UUID client_uuid FK "Ref -> CLIENT_PROFILES.user_id"
        UUID author_therapist_uuid FK "Ref -> PROVIDER_PROFILES.user_uuid"
        UUID journal_entry_id FK "NULLABLE Ref -> JOURNAL_ENTRIES.id"
        UUID appointment_id FK "NULLABLE Ref -> APPOINTMENTS.id"
        TEXT confidential_markdown "INTERNAL_MEDICAL_NOTES"
        VARCHAR git_commit_hash "8-char SHA-1 JGit ref"
        TIMESTAMP created_at "NOT NULL"
    }

    PSYCHOTRAUMATOLOGY_TESTS {
        UUID id PK "Identifiable (UUID)"
        UUID client_uuid FK "Ref -> CLIENT_PROFILES.user_id"
        UUID therapist_uuid FK "NULLABLE Ref -> PROVIDER_PROFILES.user_uuid"
        VARCHAR test_type "PCL-5"
        INTEGER score "0..80"
        VARCHAR severity "LOW | MODERATE | HIGH | SEVERE"
        JSONB answers_json "20 PCL-5 spørgsmål"
        TIMESTAMP timestamp "NOT NULL"
    }

    I18N_DICTIONARIES_MONGODB {
        UUID _id PK "UUID identitet (Identifiable)"
        STRING locale UK "da, en, de, es, fr, sv, no, nl, it, pl"
        STRING display_name
        STRING flag
        BOOLEAN published
        INSTANT updated_at
        MAP translations "Hierarkisk nøgle-værdi træ"
    }

    JGIT_COMMIT_LOG {
        STRING commit_hash PK "SHA-1 (40 tegn / 8 tegn kort)"
        STRING patient_file "patients/<clientUuid>.md"
        STRING branch "main | trauma-therapy | ..."
        STRING author_name
        STRING message
        TEXT blob_snapshot "Fuldt Markdown snapshot ved commit"
        INSTANT commit_time
    }

    APP_USERS ||--o| CLIENT_PROFILES : "har klientprofil"
    APP_USERS ||--o| PROVIDER_PROFILES : "har terapeutprofil"
    ORGANISATIONS ||--o{ PROVIDER_PROFILES : "beskæftiger"
    ORGANISATIONS ||--o{ SERVICES : "definerer skabelon"
    PROVIDER_PROFILES ||--o{ SERVICES : "udbyder"
    CLIENT_PROFILES ||--o{ CLIENT_THERAPIST_HANDSHAKES : "udsteder samtykke"
    PROVIDER_PROFILES ||--o{ CLIENT_THERAPIST_HANDSHAKES : "modtager adgang"
    CLIENT_PROFILES ||--o{ APPOINTMENTS : "booker"
    PROVIDER_PROFILES ||--o{ APPOINTMENTS : "afholder"
    SERVICES ||--o{ APPOINTMENTS : "specificerer"
    CLIENT_PROFILES ||--o{ JOURNAL_ENTRIES : "ejer og skriver"
    APPOINTMENTS |o--o| JOURNAL_ENTRIES : "knyttet til"
    CLIENT_PROFILES ||--o{ THERAPIST_CLINICAL_NOTES : "omhandler"
    PROVIDER_PROFILES ||--o{ THERAPIST_CLINICAL_NOTES : "forfatter"
    JOURNAL_ENTRIES |o--o{ THERAPIST_CLINICAL_NOTES : "kommenterer"
    JOURNAL_ENTRIES ||--o{ JGIT_COMMIT_LOG : "committes til"
    THERAPIST_CLINICAL_NOTES ||--o{ JGIT_COMMIT_LOG : "committes til"
    APPOINTMENTS ||--o{ JGIT_COMMIT_LOG : "logges privat i"
    CLIENT_PROFILES ||--o{ PSYCHOTRAUMATOLOGY_TESTS : "besvarer (PCL-5)"
    PROVIDER_PROFILES |o--o{ PSYCHOTRAUMATOLOGY_TESTS : "evaluerer"
```

---

# 5. State Machine Diagrammer (`stateDiagram-v2`)

### 5.1 State Machine: Samtykke-Handshake & Granulær Journaladgang
Dette `stateDiagram-v2` viser tilstandsmaskinen for `ClientTherapistHandshake` i [`ClinicPlatformService.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/service/ClinicPlatformService.java) og [`JournalService.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/service/JournalService.java):

```mermaid
stateDiagram-v2
    [*] --> NONE : Klient og Terapeut har endnu ingen forbindelse

    NONE --> PENDING : POST /api/v1/clinic/handshakes (status = "PENDING")
    NONE --> ACTIVE : POST /api/v1/clinic/handshakes (status = "ACTIVE", grantedAt = now())

    PENDING --> ACTIVE : PATCH /api/v1/clinic/handshakes/{id} (status = "ACTIVE", grantedAt = now())
    PENDING --> REVOKED : PATCH /api/v1/clinic/handshakes/{id} (status = "REVOKED", revokedAt = now())

    state ACTIVE {
        [*] --> ValidatingAccess
        ValidatingAccess --> DateWindowCheck : Tjek validFrom <= LocalDate.now() <= validTo
        DateWindowCheck --> BranchFilter : Gyldig dato → Filtrer JGit-historik på allowedBranches
        BranchFilter --> PrivacyFilter : Filtrer på historyStartDate..historyEndDate & strip "Klinik Booking"-commits
        PrivacyFilter --> RestrictionCheck : Anvend customRestrictions (fx NO_PCL5_SCORES / NO_MOOD_SCORES)
    }

    ACTIVE --> ACTIVE : PATCH /api/v1/clinic/handshakes/{id}\n(Opdater allowedBranches, historyStartDate/EndDate eller restriktioner)
    ACTIVE --> EXPIRED : LocalDate.now() > validTo\n(isCurrentlyValid() == false)
    ACTIVE --> REVOKED : PATCH /api/v1/clinic/handshakes/{id}\n(status = "REVOKED", revokedAt = now())

    EXPIRED --> ACTIVE : Klient forlænger validTo-dato
    REVOKED --> ACTIVE : Klient genaktiverer samtykke\n(grantedAt = now(), revokedAt = null)

    note right of REVOKED
        Ved REVOKED eller EXPIRED:
        • Terapeuten mister øjeblikkeligt adgang til
          klientens JournalEntries og JGit-historik.
        • Terapeutens egne TherapistClinicalNotes
          bevares af hensyn til klinisk journalpligt.
    end note
```

### 5.2 State Machine: Aftale-livscyklus (Appointment) & Finansiel Bogføring (KillBill/Fineract)
Dette `stateDiagram-v2` viser samspillet mellem [`AppointmentService.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/service/AppointmentService.java) og [`FinanceService.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/service/FinanceService.java):

```mermaid
stateDiagram-v2
    [*] --> SLOT_SUGGESTED : GET /api/v1/appointments/timefold-slots\n(TimefoldBookingService foreslår optimale tider)

    SLOT_SUGGESTED --> CONFIRMED : POST /api/v1/appointments\n• Ingen overlap fundet\n• JGit commit ("Aftale oprettet")\n• Kafka event "CREATED"
    SLOT_SUGGESTED --> CONFLICT_409 : POST /api/v1/appointments\n(Overlap med eksisterende CONFIRMED aftale)
    CONFLICT_409 --> SLOT_SUGGESTED : Klient vælger ny foreslået Timefold-tid

    CONFIRMED --> RESCHEDULED_CONFIRMED : PUT /api/v1/appointments/{id}\n• startTime i fremtiden & ingen overlap\n• JGit commit ("Aftale ombooket")\n• Kafka event "UPDATED"
    RESCHEDULED_CONFIRMED --> RESCHEDULED_CONFIRMED : Yderligere ombooking

    state "Fakturering & Fineract GL Bogføring" as Billing {
        CONFIRMED --> INVOICED_UNPAID : POST /api/v1/finance/bill-session (payImmediately = false)\n• KillBill Invoice CREATED\n• Fineract GL: Debet 1200 / Kredit 4100\n• FinanceGitService commit (SESSION_INVOICE)
        CONFIRMED --> PAID : POST /api/v1/finance/bill-session (payImmediately = true)\n• Fineract GL: Debet 1200 / Kredit 4100\n• Fineract Settlement: Debet 1100 / Kredit 1200
        CONFIRMED --> PAID_BY_PREPAID_CLIP : POST /api/v1/finance/prepaid/consume\n• Trækker 1 klip fra Fineract Savings\n• Fineract GL: Debet 2100 / Kredit 4100\n• FinanceGitService commit (PREPAID_CONSUME)
        INVOICED_UNPAID --> PAID : Betaling registreret (Debet 1100 / Kredit 1200)
    }

    CONFIRMED --> CANCELLED : DELETE /api/v1/appointments/{id}\n• status = "CANCELLED"\n• JGit commit ("Aftale aflyst")\n• Kafka event "CANCELLED"
    RESCHEDULED_CONFIRMED --> CANCELLED : DELETE /api/v1/appointments/{id}

    PAID --> REFUNDED_CREDIT_NOTE : POST /api/v1/finance/invoices/{id}/refund\n• KillBill Credit Note\n• Fineract Modpostering: Debet 4100 / Kredit 1100\n• FinanceGitService commit (CREDIT_NOTE)
    INVOICED_UNPAID --> REFUNDED_CREDIT_NOTE : POST /api/v1/finance/invoices/{id}/refund\n(Fineract Modpostering: Debet 4100 / Kredit 1200)

    CANCELLED --> [*]
    REFUNDED_CREDIT_NOTE --> [*]
```

---

# 6. Aktivitets- og Sekvensdiagrammer pr. Domæne (Alle 7 Domæner)

Herunder følger et **Aktivitetsdiagram (Swimlane Flowchart)** og et **Sekvensdiagram** for hvert af de 7 domæner:
1. `core`
2. `appointment`
3. `clinic-platform`
4. `i18n`
5. `journal`
6. `psychotraumatology`
7. `user`

---

## 6.1 Domæne 1: `core` & Vertical Slices (`BaseDomainCore` + `BaseWebCore` $\leftrightarrow$ `baseDomainCore.ts` + `baseUiCore.tsx` $\rightarrow$ `<FeatureName>Feature`)

De tre arkitekturdiagrammer [`docs/diagrams/core-and-slice-class-diagram.puml`](file:///z:/home/work/projects/api/docs/diagrams/core-and-slice-class-diagram.puml), [`docs/diagrams/fullstack-symmetry.puml`](file:///z:/home/work/projects/api/docs/diagrams/fullstack-symmetry.puml) og [`docs/diagrams/double-loop-tdd.mmd`](file:///z:/home/work/projects/api/docs/diagrams/double-loop-tdd.mmd) viser den komplette **1:1 Full-Stack Arkitektursymmetri** mellem Java 21 / Spring Boot 3-backend'en og TypeScript 5 / React 19-frontend'en:
- **Backend Core (`com.platform.core`) $\leftrightarrow$ Frontend Core (`src/core`):**
  - [`BaseDomainCore.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/core/BaseDomainCore.java) $\leftrightarrow$ [`baseDomainCore.ts`](file:///z:/home/work/projects/api/frontend/src/core/baseDomainCore.ts) (Ren domænekerne uden UI/React-afhængigheder: `HasId<ID>`, `PageResponse<T>`, `ErrorCode`, `ProblemDetail`, `FrontendDomainException`, `DomainGuard` og den abstrakte `BaseApiService<DTO, ID>`).
  - [`BaseWebCore.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/core/BaseWebCore.java) $\leftrightarrow$ [`baseUiCore.tsx`](file:///z:/home/work/projects/api/frontend/src/core/baseUiCore.tsx) (Præsentations-supertype: den generiske `useBaseCrud<DTO, ID>` hook, RFC 7807 `<ProblemAlert />` med deterministiske `data-testid`-attributter samt `<PortalWorkspaceShell />`).
- **7 1:1 Vertical Feature Slices (`com.platform.features.<name>` $\leftrightarrow$ `src/features/<name>/<Name>Feature.tsx`):**
  - [`AppointmentFeature.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/appointment/AppointmentFeature.java) $\leftrightarrow$ [`AppointmentFeature.tsx`](file:///z:/home/work/projects/api/frontend/src/features/appointment/AppointmentFeature.tsx)
  - [`ClinicPlatformFeature.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/clinic/ClinicPlatformFeature.java) $\leftrightarrow$ [`ClinicPlatformFeature.tsx`](file:///z:/home/work/projects/api/frontend/src/features/clinic/ClinicPlatformFeature.tsx)
  - [`FinanceFeature.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/finance/FinanceFeature.java) $\leftrightarrow$ [`FinanceFeature.tsx`](file:///z:/home/work/projects/api/frontend/src/features/finance/FinanceFeature.tsx)
  - [`I18nFeature.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/i18n/I18nFeature.java) $\leftrightarrow$ [`I18nFeature.tsx`](file:///z:/home/work/projects/api/frontend/src/features/i18n/I18nFeature.tsx)
  - [`JournalFeature.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/journal/JournalFeature.java) $\leftrightarrow$ [`JournalFeature.tsx`](file:///z:/home/work/projects/api/frontend/src/features/journal/JournalFeature.tsx)
  - [`PsychotraumatologyFeature.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/psychotraumatology/PsychotraumatologyFeature.java) $\leftrightarrow$ [`PsychotraumatologyFeature.tsx`](file:///z:/home/work/projects/api/frontend/src/features/psychotraumatology/PsychotraumatologyFeature.tsx)
  - [`UserFeature.java`](file:///z:/home/work/projects/api/backend/src/main/java/com/platform/features/user/UserFeature.java) $\leftrightarrow$ [`UserFeature.tsx`](file:///z:/home/work/projects/api/frontend/src/features/user/UserFeature.tsx)

### 6.1.0 Klassediagram – 1:1 Full-Stack Symmetri (`docs/diagrams/fullstack-symmetry.puml`)

```mermaid
classDiagram
    direction TB

    namespace Backend_Java17 {
        class BaseDomainCore_Java["BaseDomainCore.java (Pure Java)"] {
            +interface HasId~ID~
            +enum ErrorCode
            +class DomainException
            +abstract BaseService~Entity, DTO~
        }
        class BaseWebCore_Java["BaseWebCore.java (Spring Web)"] {
            +abstract BaseController~Entity, DTO~
            +class GlobalExceptionHandler
        }
        class AppointmentFeature_Java["AppointmentFeature.java (Single-File Slice)"] {
            +record AppointmentDto
            +class AppointmentController
            ~class AppointmentService (package-private)
            ~interface AppointmentRepository (package-private)
        }
    }

    namespace Frontend_TS_React {
        class baseDomainCore_TS["baseDomainCore.ts (Pure TypeScript)"] {
            +interface HasId~ID~
            +enum ErrorCode
            +interface ProblemDetail
            +class FrontendDomainException
            +class DomainGuard
            +abstract BaseApiService~DTO, ID~
        }
        class baseUiCore_TSX["baseUiCore.tsx (React Supertype)"] {
            +useBaseCrud(service)
            +ProblemAlert(error)
            +PortalWorkspaceShell()
        }
        class AppointmentFeature_TSX["AppointmentFeature.tsx (Single-File Slice)"] {
            +interface AppointmentDto
            +component AppointmentFeatureView
            -class AppointmentApiService (module-private)
            -const appointmentApi (module-private)
        }
    }

    BaseWebCore_Java --> BaseDomainCore_Java : depends on
    AppointmentFeature_Java --> BaseDomainCore_Java : extends BaseService
    AppointmentFeature_Java --> BaseWebCore_Java : extends BaseController

    baseUiCore_TSX --> baseDomainCore_TS : depends on
    AppointmentFeature_TSX --> baseDomainCore_TS : extends BaseApiService
    AppointmentFeature_TSX --> baseUiCore_TSX : uses useBaseCrud & ProblemAlert

    BaseWebCore_Java <..> baseDomainCore_TS : HTTP REST + RFC 7807 ProblemDetail
    AppointmentFeature_Java <..> AppointmentFeature_TSX : 1-til-1 DTO & Slice Mirroring
```

### 6.1.1 Aktivitetsdiagram – `core` & RFC 7807 `ProblemDetail`

```mermaid
flowchart TD
    subgraph Lane1["1. Web Core Swimlane: BaseWebCore.BaseController<Entity, DTO>"]
        A1(["HTTP Request modtages\n(GET / POST / PUT / DELETE)"]) --> A2["Spring IoC router til package-private slice-controller\nfx AppointmentController (/api/v1/appointments)"]
        A2 --> A3{"Standard CRUD eller\ndomæne-specifikt endpoint?"}
        A3 -- "Standard CRUD" --> A4["Kalder BaseController.getAll() / getAllPaged()\n/ getById(id) / create(dto) / update(id, dto) / delete(id)"]
    end

    subgraph Lane2["2. Domain Core Swimlane: BaseDomainCore.BaseService<Entity, DTO> (@Transactional)"]
        A4 --> B1["Åbner @Transactional kontekst\nKalder validateBeforeCreate(dto) / validateBeforeUpdate(id, dto)"]
        B1 --> B2{"Overholdes domæneregler?\nErrorCode.require(condition, details)"}
        B2 -- "Nej (Fejl)" --> BErr["Kast DomainException via ErrorCode::toException\n(NOT_FOUND 404, CONFLICT 409, BAD_REQUEST 400, FORBIDDEN 403)"]
        B2 -- "Ja (Gyldig)" --> B3["toEntity(DTO dto) / mergeEntity(existing, dto)\nSætter entity.setId(null) ved create"]
    end

    subgraph Lane3["3. Data Access Swimlane: BaseDomainCore.BaseRepository<Entity>"]
        B3 --> C1["BaseRepository.save(entity) / findById(id) / deleteById(id)"]
    end

    subgraph Lane4["4. ORM & Database Swimlane: Identifiable (UUID) & PostgreSQL"]
        C1 --> D1[("Hibernate EntityManager\nPostgreSQL business-db\n(@Id @GeneratedValue UUID)")]
    end

    subgraph Lane5["5. DTO Response & RFC 7807 GlobalExceptionHandler"]
        D1 --> E1["toDto(Entity entity) -> Java Record DTO implements HasId (UUID)"]
        E1 --> E2(["BaseController returnerer ResponseEntity<DTO>\n(HTTP 200 OK / 201 Created + Location / 204 No Content)"])
        BErr --> E3(["GlobalExceptionHandler (@RestControllerAdvice)\nReturnerer RFC 7807 ProblemDetail JSON med errorCode & timestamp"])
    end
```

### 6.1.2 Sekvensdiagram – `core` (`BaseController` $\rightarrow$ `BaseService` $\rightarrow$ `ErrorCode` / `ProblemDetail`)

```mermaid
sequenceDiagram
    autonumber
    actor Caller as Klient / BFF Proxy
    participant Ctrl as BaseWebCore.BaseController<Entity, DTO>
    participant Svc as BaseDomainCore.BaseService<Entity, DTO>
    participant Guard as BaseDomainCore.ErrorCode
    participant Repo as BaseDomainCore.BaseRepository<Entity>
    participant Advice as BaseWebCore.GlobalExceptionHandler

    Caller->>Ctrl: POST /api/v1/appointments (JSON Record DTO dto)
    Ctrl->>Svc: create(@Valid DTO dto)
    activate Svc
    Svc->>Svc: validateBeforeCreate(DTO dto)
    Svc->>Repo: existsByStartTime(dto.startTime())
    Repo-->>Svc: boolean exists
    Svc->>Guard: ErrorCode.CONFLICT.require(!exists, "Tidspunktet er allerede booket")
    alt Domæneregel fejler (exists == true)
        Guard-->>Advice: throw DomainException(ErrorCode.CONFLICT, details)
        Advice-->>Caller: HTTP 409 Conflict (RFC 7807 ProblemDetail JSON)
    else Domæneregel overholdt (exists == false)
        Svc->>Svc: toEntity(dto) + entity.setId(null)
        Svc->>Repo: save(Entity entity)
        Repo-->>Svc: Entity saved (med genereret UUID)
        Svc->>Svc: toDto(Entity saved) -> Record DTO
        Svc-->>Ctrl: DTO created
        deactivate Svc
        Ctrl-->>Caller: HTTP 201 Created (Location: /api/v1/appointments/{id} + JSON DTO)
    end
```

---

## 6.2 Domæne 2: `appointment` (Booking, Timefold AI Solver, JGit, Redis & Kafka)

### 6.2.1 Aktivitetsdiagram – `appointment`

```mermaid
flowchart TD
    subgraph UI_BFF["1. Klient / Terapeut UI & Next.js BFF"]
        A1(["Bruger anmoder om ledige tider eller booker aftale"]) --> A2{"Handlingstype?"}
    end

    subgraph CtrlLane["2. Controller Swimlane: AppointmentController (/api/v1/appointments)"]
        A2 -- "Foreslå tider" --> C1["GET /api/v1/appointments/timefold-slots\ngetTimefoldOptimalSlots()"]
        A2 -- "Book aftale" --> C2["POST /api/v1/appointments\ncreateAppointment()"]
        A2 -- "Ombook / Aflys" --> C3["PUT / DELETE /api/v1/appointments/{id}\nrescheduleAppointment() / cancelAppointment()"]
    end

    subgraph SvcLane["3. Service & AI Solver Swimlane: AppointmentService & TimefoldBookingService"]
        C1 --> S1["Hent terapeutens eksisterende aftaler\n& ProviderProfile.workingHoursJson"]
        S1 --> S2["TimefoldBookingService.suggestOptimalSlots()\nEvaluerer hard/soft constraints og rangerer tider"]

        C2 --> S3{"Er endTime > startTime?"}
        S3 -- "Nej" --> Err400["Kast HTTP 400 Bad Request"]
        S3 -- "Ja" --> S4["Hent terapeutens aftaler fra AppointmentRepository"]
        S4 --> S5{"Overlap med ikke-aflyst aftale?"}
        S5 -- "Ja (Overlap)" --> Err409["Kast HTTP 409 Conflict\n'Therapist is already booked'"]
        S5 -- "Nej (Ledig)" --> S6["Sæt status = 'CONFIRMED'\nog gem i AppointmentRepository"]

        C3 --> S7["Valider at aftale findes og startTime > LocalDateTime.now()\nOpdater status ('CONFIRMED' eller 'CANCELLED')"]
    end

    subgraph InfraLane["4. Persistens, JGit, Redis Cache & Kafka Event Swimlane"]
        S6 --> I1[("PostgreSQL: appointments\nGemmer Appointment entitet")]
        S7 --> I1
        I1 --> I2["JournalGitService.commitJournalEntryWithHash()\nSkriver '## Aftale: ... Refs-Appointment: #<id>' til <clientUuid>.md\nog gemmer gitCommitHash på Appointment"]
        I2 --> I3["PlatformCacheService (Redisson/Redis):\n• evictByPrefix('appointments:client:' + clientUuid)\n• put('appointment:' + id, saved)"]
        I3 --> I4["PlatformEventService (Kafka):\npublishEvent('appointment-events', 'CREATED'/'UPDATED'/'CANCELLED')"]
    end

    S2 --> Resp200(["Returner HTTP 200/201 JSON til BFF & UI"])
    I4 --> Resp200
```

### 6.2.2 Sekvensdiagram – `appointment`

```mermaid
sequenceDiagram
    autonumber
    actor Client as Klient
    participant BFF as Next.js BFF Proxy
    participant Ctrl as AppointmentController
    participant Svc as AppointmentService
    participant TF as TimefoldBookingService
    participant Repo as AppointmentRepository
    participant JGit as JournalGitService
    participant Cache as PlatformCacheService (Redis)
    participant Kafka as PlatformEventService (Kafka)

    Client->>BFF: GET /api/backend/appointments/timefold-slots?therapistUuid=...&date=2027-11-10&durationMinutes=60
    BFF->>Ctrl: GET /api/v1/appointments/timefold-slots
    Ctrl->>Svc: getTimefoldSlotSuggestions(therapistUuid, date, 60, preferredTime, null)
    Svc->>Repo: findByTherapistUuid(therapistUuid)
    Repo-->>Svc: List<Appointment> existingAppointments
    Svc->>TF: suggestOptimalSlots(therapistUuid, date, 60, preferredTime, existing, profile, null)
    TF-->>Svc: Map<String, Object> (recommendedSlots + constraintScore)
    Svc-->>Ctrl: Map<String, Object>
    Ctrl-->>BFF: HTTP 200 OK (Optimale tider)
    BFF-->>Client: Viser ledige AI-optimerede tidsforslag

    Client->>BFF: POST /api/backend/appointments (title, startTime, endTime, therapistUuid, serviceId)
    BFF->>Ctrl: POST /api/v1/appointments
    Ctrl->>Svc: createAppointment(appointment)
    activate Svc
    Svc->>Repo: findByTherapistUuid(therapistUuid)
    Repo-->>Svc: List<Appointment>
    Note over Svc: Tjekker tidsinterval og overlap mod aktive aftaler.\nKaster 409 Conflict ved overlap.
    Svc->>Repo: save(appointment med status="CONFIRMED")
    Repo-->>Svc: Appointment saved (id = UUID)
    Svc->>JGit: commitJournalEntryWithHash(clientUuid, "## Aftale: ... Refs-Appointment: #id", "Aftale oprettet...", author)
    JGit-->>Svc: 8-tegns SHA-1 gitCommitHash
    Svc->>Repo: save(saved med gitCommitHash)
    Svc->>Cache: evictByPrefix("appointments:client:" + clientUuid)
    Svc->>Cache: put("appointment:" + saved.id, saved)
    Svc->>Kafka: publishEvent("appointment-events", "CREATED", id, payload)
    Svc-->>Ctrl: Appointment saved
    deactivate Svc
    Ctrl-->>BFF: HTTP 201 Created (Appointment JSON inkl. gitCommitHash)
    BFF-->>Client: Bekræfter booking i UI
```

---

## 6.3 Domæne 3: `clinic-platform` (Klinik-markedsplads, CVR/IBAN Onboarding, Ydelser & Handshakes)

### 6.3.1 Aktivitetsdiagram – `clinic-platform`

```mermaid
flowchart TD
    subgraph BFF_Lane["1. Frontend & Next.js BFF (/api/backend/clinic/*)"]
        A1(["Bruger tilgår Klinik-markedsplads,\nOnboarder med CVR/IBAN eller opretter Ydelse/Handshake"]) --> A2{"Operation?"}
    end

    subgraph Ctrl_Lane["2. Controller Swimlane: ClinicPlatformController (/api/v1/clinic)"]
        A2 -- "Terapeut Onboarding" --> C1["POST /api/v1/clinic/therapist-onboarding\nonboardTherapist(payload, auth)"]
        A2 -- "Opret Ydelse (Service)" --> C2["POST /api/v1/clinic/services\ncreateService(payload, auth)"]
        A2 -- "Opret/Opdater Handshake" --> C3["POST / PATCH /api/v1/clinic/handshakes\ncreateOrUpdateHandshake() / updateHandshakeStatus()"]
    end

    subgraph Svc_Lane["3. Service Swimlane: ClinicPlatformService"]
        C1 --> S1{"Er cvrNumber udfyldt?"}
        S1 -- "Nej" --> E400_1["Kast HTTP 400: CVR number is required"]
        S1 -- "Ja" --> S2["Find eller opret Organisation(cvr, orgName)\nValider ISO-4217 currency & gem IBAN/adresse"]
        S2 --> S3["Find eller opret ProviderProfile for userUuid\nTilknyt Organisation, arbejdstider, IBAN & videoMeetingUrl"]

        C2 --> S4["getMissingProfileFields(provider, org, clientProfile)\nKontrollerer: CVR, orgName, arbejdstider, adresse, postnr., tlf., IBAN"]
        S4 --> S5{"Mangler obligatoriske profilfelter?"}
        S5 -- "Ja" --> E400_2["Kast HTTP 400 Bad Request:\n'Du kan ikke oprette en service før du har udfyldt: ...'"]
        S5 -- "Nej" --> S6["Opret eller deduplikér Service entitet\nmed varighed, pris, valuta og lokation"]

        C3 --> S7["Berig Handshake med clientName, therapistName & organisationName\nSæt status (ACTIVE/PENDING/REVOKED), validFrom/To,\nhistoryStartDate/EndDate, allowedBranches & customRestrictions"]
    end

    subgraph DB_Keycloak["4. Repository, PostgreSQL & Keycloak Rolle-Sync"]
        S3 --> D1[("PostgreSQL:\norganisations & provider_profiles")]
        D1 --> D2["Next.js BFF (route.ts):\nsyncKeycloakTherapistRole(userUuid)\nTildeler 'therapist' realm-rolle i Keycloak"]
        S6 --> D3[("PostgreSQL: services")]
        S7 --> D4[("PostgreSQL: client_therapist_handshakes")]
    end
```

### 6.3.2 Sekvensdiagram – `clinic-platform`

```mermaid
sequenceDiagram
    autonumber
    actor User as Terapeut / Klient
    participant BFF as Next.js BFF (route.ts)
    participant KC as Keycloak Admin API
    participant Ctrl as ClinicPlatformController
    participant Svc as ClinicPlatformService
    participant OrgRepo as OrganisationRepository
    participant ProvRepo as ProviderProfileRepository
    participant SrvRepo as ServiceRepository
    participant HsRepo as HandshakeRepository

    Note over User,HsRepo: Del 1: Terapeut CVR & IBAN Onboarding + Automatisk Keycloak Rolle-opgradering
    User->>BFF: POST /api/backend/clinic/therapist-onboarding (cvrNumber, organisationName, iban, currency, workingHoursJson)
    BFF->>Ctrl: POST /api/v1/clinic/therapist-onboarding (Bearer JWT)
    Ctrl->>Svc: onboardTherapist(payload, auth)
    activate Svc
    Svc->>OrgRepo: findByCvrNumber(cvr)
    OrgRepo-->>Svc: Optional<Organisation>
    Svc->>OrgRepo: save(organisation med CVR, IBAN, ISO-4217 currency, adresse)
    Svc->>ProvRepo: findByUserUuid(userUuid)
    Svc->>ProvRepo: save(providerProfile knyttet til Organisation)
    ProvRepo-->>Svc: ProviderProfile
    Svc-->>Ctrl: ProviderProfile
    deactivate Svc
    Ctrl-->>BFF: HTTP 200 OK (ProviderProfile)
    BFF->>KC: syncKeycloakTherapistRole(userUuid)\nPOST /admin/realms/{realm}/users/{id}/role-mappings/realm ("therapist")
    KC-->>BFF: 204 No Content (Rolle tildelt)
    BFF-->>User: HTTP 200 OK (Terapeut-profil aktiv)

    Note over User,HsRepo: Del 2: Oprettelse af Ydelse (Service) med Profil-Gate
    User->>BFF: POST /api/backend/clinic/services (name, durationMinutes, price, currency, location)
    BFF->>Ctrl: POST /api/v1/clinic/services
    Ctrl->>Svc: createService(payload, auth)
    Svc->>Svc: getMissingProfileFields(provider, org, clientProfile)
    Note over Svc: Bekræfter at CVR, orgNavn, arbejdstider,\nadresse, postnr., telefon og IBAN er udfyldt
    Svc->>SrvRepo: save(service)
    SrvRepo-->>Svc: Service
    Svc-->>Ctrl: Service
    Ctrl-->>BFF: HTTP 200 OK (Service)
    BFF-->>User: Ydelse synlig på markedspladsen

    Note over User,HsRepo: Del 3: Klient opretter Granulært Samtykke-Handshake
    User->>BFF: POST /api/backend/clinic/handshakes (clientUuid, therapistUuid, allowedBranches, customRestrictions)
    BFF->>Ctrl: POST /api/v1/clinic/handshakes
    Ctrl->>Svc: createOrUpdateHandshake(req)
    Svc->>HsRepo: findByClientUuidAndTherapistUuid(clientUuid, therapistUuid)
    Svc->>HsRepo: save(handshake med status="ACTIVE", grantedAt=now())
    HsRepo-->>Svc: ClientTherapistHandshake
    Svc-->>Ctrl: ResponseEntity (201 Created / 200 OK)
    Ctrl-->>BFF: ClientTherapistHandshake JSON
    BFF-->>User: Samtykke aktivt
```

---

## 6.4 Domæne 4: `i18n` (Flersproget Lokalisering, MongoDB Dictionaries & BFF Cache)

### 6.4.1 Aktivitetsdiagram – `i18n`

```mermaid
flowchart TD
    subgraph Startup["1. Applikationsopstart (Seeding)"]
        S0(["Spring Boot Startup"]) --> S1["ClinicDatabaseInitializer.run()\nSeeder standard-ordbøger (da, en, de, es, fr)\ni MongoDB hvis de ikke findes"]
    end

    subgraph ClientFlow["2. Offentligt Læse-flow (Next.js UI & BFF Cache)"]
        U1(["Bruger skifter sprog i LanguageSwitcher\neller indlæser side"]) --> U2["GET /api/backend/i18n/{locale}"]
        U2 --> U3["Next.js BFF Proxy videresender til\nI18nController.getDictionary(locale)"]
        U3 --> U4{"Findes locale i MongoDB?"}
        U4 -- "Ja" --> U5["Returner translations Map<String, Object>"]
        U4 -- "Nej (Fallback)" --> U6["Hent fallback-sprog ('en' eller 'da')\nog sæt header X-Locale-Fallback: true"]
        U5 --> U7["Next.js BFF sætter HTTP Header:\nCache-Control: public, max-age=300, stale-while-revalidate=600"]
        U6 --> U7
    end

    subgraph AdminFlow["3. Admin Redigerings- & Klonings-flow (/api/v1/i18n)"]
        A1(["Admin opretter nyt sprog eller\nopdaterer oversættelsesnøgle"]) --> A2{"Handling?"}
        A2 -- "PUT /api/v1/i18n/{locale}/{key}" --> A3["I18nService.updateTranslation(locale, key, value)\nSplitter punktum-nøgler (fx 'nav.dashboard.title')\ntil indlejrede LinkedHashMap-noder"]
        A2 -- "POST /api/v1/i18n/locales" --> A4["I18nService.createOrUpdateLocale()\nKloner evt. manglende nøgler fra reference-sprog\nvia flattenMap() + updateNestedMap()"]
        A2 -- "GET /api/v1/i18n/locales?ref=da" --> A5["I18nService.getLocaleSummaries('da')\nBeregner translatedCount, missingCount & completionPct (%)"]
        A3 --> M1[("MongoDB: i18n_dictionaries\nGemmer dokument med updatedAt = Instant.now()")]
        A4 --> M1
        A5 --> M1
    end
```

### 6.4.2 Sekvensdiagram – `i18n`

```mermaid
sequenceDiagram
    autonumber
    actor User as Bruger / Admin
    participant UI as CachedI18nProvider & LanguageSwitcher
    participant BFF as Next.js BFF Proxy (route.ts)
    participant Ctrl as I18nController
    participant Svc as I18nService
    participant Mongo as I18nDictionaryRepository (MongoDB)

    Note over User,Mongo: Scenarie A: Indlæsning af sprogordbog med CDN/Browser-caching
    User->>UI: Vælger sprog "da" (Dansk)
    UI->>BFF: GET /api/backend/i18n/da
    BFF->>Ctrl: GET /api/v1/i18n/da
    Ctrl->>Svc: getDictionary("da")
    Svc->>Mongo: findByLocale("da")
    Mongo-->>Svc: Optional<I18nDictionary>
    Svc-->>Ctrl: I18nDictionary (translations Map)
    Ctrl-->>BFF: HTTP 200 OK (JSON translations)
    Note over BFF: Tilføjer Cache-Control:\npublic, max-age=300, stale-while-revalidate=600
    BFF-->>UI: HTTP 200 OK + Cache-Control header
    UI-->>User: Renderer brugergrænseflade på dansk

    Note over User,Mongo: Scenarie B: Admin opdaterer hierarkisk nøgle & henter dækningsprocent
    User->>BFF: PUT /api/backend/i18n/de/dashboard.welcome ({"value": "Willkommen"})
    BFF->>Ctrl: PUT /api/v1/i18n/de/dashboard.welcome
    Ctrl->>Svc: updateTranslation("de", "dashboard.welcome", "Willkommen")
    activate Svc
    Svc->>Mongo: findByLocale("de")
    Mongo-->>Svc: I18nDictionary ("de")
    Svc->>Svc: Opdel "dashboard.welcome" ved "."\nog opdater indlejret Map<String, Object>
    Svc->>Mongo: save(dict med updatedAt = Instant.now())
    Mongo-->>Svc: I18nDictionary
    Svc-->>Ctrl: I18nDictionary
    deactivate Svc
    Ctrl-->>BFF: HTTP 200 OK
    BFF-->>User: Oversættelse gemt

    User->>BFF: GET /api/backend/i18n/locales?ref=da
    BFF->>Ctrl: GET /api/v1/i18n/locales?ref=da
    Ctrl->>Svc: getLocaleSummaries("da")
    Svc->>Mongo: findByLocale("da") + findAll()
    Svc->>Svc: flattenMap() -> Beregn completionPct og missingKeys mod "da"
    Svc-->>Ctrl: List<Map<String, Object>> (summaries)
    Ctrl-->>BFF: HTTP 200 OK
    BFF-->>User: Viser sprogstatus og oversættelsesprocent i Admin UI
```

---

## 6.5 Domæne 5: `journal` (Klientjournal, Fortrolige Terapeutnoter & JGit Privatlivsfilter)

### 6.5.1 Aktivitetsdiagram – `journal`

```mermaid
flowchart TD
    subgraph UI_Lane["1. KlientPortal & TherapistMultiWindowWorkspace"]
        A1(["Bruger opretter journalindlæg, skriver terapeutnotat\neller åbner JGit-tidslinje"]) --> A2{"Handling?"}
    end

    subgraph Ctrl_Lane["2. Controller Swimlane: JournalController (/api/v1/journals)"]
        A2 -- "Klient: Nyt Journalindlæg" --> C1["POST /api/v1/journals\ncreateJournalEntry(dto, auth)"]
        A2 -- "Terapeut: Klinisk Notat" --> C2["POST /api/v1/journals/therapist-notes\ncreateTherapistNote(payload, auth)"]
        A2 -- "Hent Journal & JGit Historik" --> C3["GET /api/v1/journals/client/{clientUuid}\n& GET /api/v1/journals/history/{clientUuid}"]
    end

    subgraph Svc_Lane["3. Service Swimlane: JournalService"]
        C1 --> S1["Udtræk clientUuid & authorName fra JWT\nKonverter DTO -> JournalEntry (inkl. gitBranch & moodRating)"]
        S1 --> S2["Byg Markdown-blok med Branch, Mood, Shared-status\nog evt. Refs-Appointment: #<appointmentId>"]

        C2 --> S3{"Har brugeren ROLE_THERAPIST\nog gyldigt JWT?"}
        S3 -- "Nej" --> Err403["Kast HTTP 401 / 403 Forbidden"]
        S3 -- "Ja" --> S4["Indpak notat i INTERNAL_MEDICAL_NOTES-markør\nog gem TherapistClinicalNote i PostgreSQL"]

        C3 --> S5{"Er kalderen Klienten selv\neller en Terapeut?"}
        S5 -- "Terapeut" --> S6["Slå ClientTherapistHandshake op:\nValider status == ACTIVE, validFrom..validTo,\nallowedBranches & historyStartDate..historyEndDate"]
        S5 -- "Klienten selv" --> S7["Fuld adgang til egne JournalEntries,\nmen strip INTERNAL_MEDICAL_NOTES-markør fra JGit-snapshots"]
    end

    subgraph JGit_DB_Lane["4. Eclipse JGit & PostgreSQL Persistens"]
        S2 --> G1["JournalGitService.commitJournalEntryWithHash()\nAppend til ./journal-repo/<clientUuid>.md\ngit.add() + git.commit('[Branch: <branch>] ...')"]
        S4 --> G1
        G1 --> G2[("PostgreSQL:\njournal_entries & therapist_clinical_notes\n+ link appointment.journalEntryId")]

        S6 --> G3["JournalGitService.getCommitHistory()\n• Filtrer på allowedBranches & datointerval\n• Skjul klientens private 'Klinik Booking' commits for terapeuter\n• Returner commits med 8-tegns SHA-1 hash & snapshot"]
        S7 --> G3
    end
```

### 6.5.2 Sekvensdiagram – `journal`

```mermaid
sequenceDiagram
    autonumber
    actor Client as Klient
    actor Therapist as Terapeut
    participant Ctrl as JournalController
    participant Svc as JournalService
    participant HsRepo as HandshakeRepository
    participant JRepo as JournalEntryRepository
    participant NoteRepo as TherapistClinicalNoteRepository
    participant JGit as JournalGitService (Eclipse JGit)

    Note over Client,JGit: Del 1: Klient skriver journalindlæg på specifik JGit-branch
    Client->>Ctrl: POST /api/v1/journals (title, content, moodRating=8, gitBranch="trauma-therapy", sharedWithTherapists=true)
    Ctrl->>Svc: createJournalEntry(dto, auth)
    activate Svc
    Svc->>Svc: toEntity(dto) -> JournalEntry
    Svc->>JGit: commitJournalEntryWithHash(clientUuid, markdownContent, "Added journal entry: ...", clientName, "trauma-therapy")
    activate JGit
    JGit->>JGit: Append til <clientUuid>.md\ngit.add() + git.commit("[Branch: trauma-therapy] Added journal entry...")
    JGit-->>Svc: commitHash (fx "9c0d1e2f")
    deactivate JGit
    Svc->>JRepo: save(entry med gitCommitHash="9c0d1e2f")
    JRepo-->>Svc: JournalEntry
    Svc-->>Ctrl: JournalEntry
    deactivate Svc
    Ctrl-->>Client: HTTP 201 Created

    Note over Therapist,JGit: Del 2: Terapeut tilføjer fortroligt klinisk notat (INTERNAL_MEDICAL_NOTES)
    Therapist->>Ctrl: POST /api/v1/journals/therapist-notes (clientUuid, therapistNote, appointmentId)
    Ctrl->>Svc: createTherapistNote(payload, auth)
    activate Svc
    Svc->>Svc: hasTherapistRole(auth) == true
    Svc->>JGit: commitJournalEntryWithHash(clientUuid, "<!-- INTERNAL_MEDICAL_NOTES -->\n" + note, "Clinical note...", therapistName, branch)
    JGit-->>Svc: commitHash (fx "3f4a5b6c")
    Svc->>NoteRepo: save(TherapistClinicalNote med gitCommitHash="3f4a5b6c")
    Svc-->>Ctrl: TherapistClinicalNote
    deactivate Svc
    Ctrl-->>Therapist: HTTP 201 Created

    Note over Client,JGit: Del 3: Rollebaseret læsning af JGit Commit-historik (Privatlivsfiltrering)
    Therapist->>Ctrl: GET /api/v1/journals/history/{clientUuid}?therapistUuid={tUuid}
    Ctrl->>Svc: getJournalCommitHistory(clientUuid, tUuid, auth)
    Svc->>HsRepo: findByClientUuidAndTherapistUuid(clientUuid, tUuid)
    HsRepo-->>Svc: ClientTherapistHandshake (ACTIVE, allowedBranches=["trauma-therapy"], historyStartDate..EndDate)
    Svc->>JGit: getCommitHistory(clientUuid, isTherapist=true, journalService, startDate, endDate, tUuid, ["trauma-therapy"])
    Note over JGit: 1. Frasorterer klientens private "Klinik Booking" aftale-commits\n2. Filtrerer på allowedBranches ("trauma-therapy") og datointerval\n3. Bevarer INTERNAL_MEDICAL_NOTES da isTherapist == true
    JGit-->>Svc: Filtreret List<Map<String, String>> commits
    Svc-->>Ctrl: List<Map<String, String>>
    Ctrl-->>Therapist: HTTP 200 OK (Kun tilladte branches & kliniske commits)
```

---

## 6.6 Domæne 6: `psychotraumatology` (PCL-5 Traumescreening & Selvbetjenings-autorisation)

### 6.6.1 Aktivitetsdiagram – `psychotraumatology`

```mermaid
flowchart TD
    subgraph UI_Lane["1. KlientPortal & Terapeut Overblik"]
        A1(["Klient udfylder PCL-5 spørgeskema\neller henter egne PCL-5 testresultater"]) --> A2{"Handling?"}
    end

    subgraph Ctrl_Lane["2. Controller Swimlane: PsychotraumatologyController (/api/v1/psychotraumatology/tests)"]
        A2 -- "Indsend PCL-5 Test" --> C1["POST /api/v1/psychotraumatology/tests\nsubmitTest(PsychotraumatologyTestDto)"]
        A2 -- "Hent Klientens Tests" --> C2["GET /api/v1/psychotraumatology/tests/client/{clientUuid}\ngetTestsByClient(clientUuid, authentication)"]
    end

    subgraph Svc_Lane["3. Service Swimlane: PsychotraumatologyService (extends BaseService)"]
        C1 --> S1["toEntity(dto):\n• Sæt testType = 'PCL-5' (default)\n• Sæt score, severity (LOW/MODERATE/HIGH/SEVERE)\n• Sæt answersJson & timestamp = LocalDateTime.now()"]
        S1 --> S2["Kalder arvet BaseService.create(test)"]

        C2 --> S3{"Findes gyldigt Jwt i Authentication?"}
        S3 -- "Nej" --> E401["Kast HTTP 401 Unauthorized"]
        S3 -- "Ja" --> S4{"Er UUID.fromString(jwt.getSubject())\n== clientUuid?"}
        S4 -- "Nej (Anden bruger)" --> E403["Kast HTTP 403 Forbidden\n'Forbidden access to other client's records'"]
        S4 -- "Ja (Klienten selv)" --> S5["PsychotraumatologyTestRepository.findByClientUuid(clientUuid)"]
    end

    subgraph DB_Lane["4. Repository & PostgreSQL Swimlane"]
        S2 --> D1[("PostgreSQL: psychotraumatology_tests\nGemmer PCL-5 resultat")]
        S5 --> D1
        D1 --> R1(["Returner HTTP 201 Created / HTTP 200 OK"])
    end
```

### 6.6.2 Sekvensdiagram – `psychotraumatology`

```mermaid
sequenceDiagram
    autonumber
    actor Client as Klient
    participant BFF as Next.js BFF Proxy
    participant Ctrl as PsychotraumatologyController
    participant Svc as PsychotraumatologyService
    participant Base as BaseService<PsychotraumatologyTest, PsychotraumatologyTestDto>
    participant Repo as PsychotraumatologyTestRepository
    participant DB as PostgreSQL (psychotraumatology_tests)

    Client->>BFF: POST /api/backend/psychotraumatology/tests (clientUuid, score=42, severity="HIGH", answersJson="[...]")
    BFF->>Ctrl: POST /api/v1/psychotraumatology/tests (Bearer JWT)
    Ctrl->>Svc: submitTest(dto)
    activate Svc
    Svc->>Svc: toEntity(dto) -> PsychotraumatologyTest (testType="PCL-5")
    Svc->>Base: create(test)
    Base->>Repo: save(test)
    Repo->>DB: INSERT INTO psychotraumatology_tests ...
    DB-->>Repo: PsychotraumatologyTest (id = UUID)
    Repo-->>Base: PsychotraumatologyTest
    Base-->>Svc: PsychotraumatologyTest
    Svc-->>Ctrl: PsychotraumatologyTest
    deactivate Svc
    Ctrl-->>BFF: HTTP 201 Created
    BFF-->>Client: Viser gemt PCL-5 score og sværhedsgrad

    Client->>BFF: GET /api/backend/psychotraumatology/tests/client/{clientUuid}
    BFF->>Ctrl: GET /api/v1/psychotraumatology/tests/client/{clientUuid} (Bearer JWT)
    Ctrl->>Svc: getTestsByClient(clientUuid, authentication)
    activate Svc
    Svc->>Svc: callerUuid = UUID.fromString(jwt.getSubject())
    alt callerUuid != clientUuid
        Svc-->>Ctrl: Kast 403 Forbidden ("Forbidden access to other client's records")
        Ctrl-->>BFF: HTTP 403 Forbidden
    else callerUuid == clientUuid
        Svc->>Repo: findByClientUuid(clientUuid)
        Repo->>DB: SELECT * FROM psychotraumatology_tests WHERE client_uuid = ?
        DB-->>Repo: List<PsychotraumatologyTest>
        Repo-->>Svc: List<PsychotraumatologyTest>
        Svc-->>Ctrl: List<PsychotraumatologyTest>
        Ctrl-->>BFF: HTTP 200 OK (JSON List)
    end
    deactivate Svc
    BFF-->>Client: Renderer PCL-5 udviklingsgraf
```

---

## 6.7 Domæne 7: `user` (Brugeroprettelse, Keycloak OAuth2 JWT Filter & Profil)

### 6.7.1 Aktivitetsdiagram – `user`

```mermaid
flowchart TD
    subgraph SecurityLane["1. Sikkerhedsfilter: SecurityConfig (Spring Security OAuth2 Resource Server)"]
        R0(["Indgående HTTP Request"]) --> R1{"Offentligt endpoint\n(/api/public/**, /api/v1/i18n/*, /api/users)?"}
        R1 -- "Nej (Beskyttet)" --> R2["Valider Bearer JWT mod Keycloak JWKS\neller verificerede BFF X-Auth-* headers"]
        R2 --> R3["jwtAuthenticationConverter()\nUdtræk realm_access.roles -> ROLE_<rolle>"]
        R1 -- "Ja (PermitAll / Auth)" --> R4["Videresend til Controller"]
        R3 --> R4
    end

    subgraph CtrlLane["2. Controller Swimlane: UserController (/api/users) & ProfileController (/api/v1/profile)"]
        R4 --> C1{"Endpoint?"}
        C1 -- "POST /api/users" --> C2["UserController.createUser(@Valid UserRequestDto)\nValiderer @NotBlank username/password & role"]
        C1 -- "GET /api/v1/profile" --> C3["ProfileController.getUserProfile(authentication)\nUdtrækker sub, preferred_username, email & roller fra Jwt"]
    end

    subgraph SvcLane["3. Service Swimlane: UserService (extends BaseService<UserEntity, UserDto>)"]
        C2 --> S1{"Matcher role\n'^(CLIENT|ADMIN|THERAPIST)$'?"}
        S1 -- "Nej" --> E400_Role["Kast IllegalArgumentException('invalid role')\n-> HTTP 400 Bad Request"]
        S1 -- "Ja" --> S2{"Findes username allerede?\nuserRepository.existsByUsername()"}
        S2 -- "Ja" --> E400_Dup["Kast IllegalArgumentException('username already exists')\n-> HTTP 409 / 400"]
        S2 -- "Nej" --> S3["toEntity(request) -> UserEntity\nuserRepository.save(user)"]
    end

    subgraph DBLane["4. Repository & PostgreSQL Swimlane"]
        S3 --> D1[("PostgreSQL: app_users\nGemmer UserEntity med UUID")]
        D1 --> D2["Map til UserResponseDto (id, username, role)\n(Udelader password i respons)"]
        D2 --> Out(["Returner HTTP 201 Created / HTTP 200 OK"])
        C3 --> Out
    end
```

### 6.7.2 Sekvensdiagram – `user`

```mermaid
sequenceDiagram
    autonumber
    actor User as Ny Bruger / Klient
    participant BFF as Next.js Auth / BFF
    participant Sec as SecurityConfig (OAuth2 FilterChain)
    participant UCtrl as UserController (/api/users)
    participant PCtrl as ProfileController (/api/v1/profile)
    participant USvc as UserService
    participant URepo as UserRepository
    participant DB as PostgreSQL (app_users)

    Note over User,DB: Del 1: Oprettelse af bruger med rolle- og dubletvalidering
    User->>BFF: Indsender registreringsformular (username, password, role="CLIENT")
    BFF->>Sec: POST /api/users (JSON UserRequestDto)
    Sec->>UCtrl: createUser(@Valid UserRequestDto)
    activate UCtrl
    UCtrl->>USvc: createUser(request)
    activate USvc
    USvc->>USvc: Valider role.matches("^(CLIENT|ADMIN|THERAPIST)$")
    USvc->>URepo: existsByUsername(request.username)
    URepo->>DB: SELECT COUNT(*) FROM app_users WHERE username = ?
    DB-->>URepo: false (ledigt)
    URepo-->>USvc: false
    USvc->>USvc: toEntity(request) -> UserEntity
    USvc->>URepo: save(userEntity)
    URepo->>DB: INSERT INTO app_users (id, username, password, role) VALUES (UUID, ...)
    DB-->>URepo: UserEntity (savedUser)
    URepo-->>USvc: savedUser
    USvc->>USvc: Map til UserResponseDto (id, username, role)
    USvc-->>UCtrl: UserResponseDto
    deactivate USvc
    UCtrl-->>BFF: HTTP 201 Created (UserResponseDto uden password)
    deactivate UCtrl
    BFF-->>User: Bruger oprettet

    Note over User,DB: Del 2: Hentning af autentificeret brugerprofil via JWT
    User->>BFF: GET /api/backend/profile (Med NextAuth Session Cookie)
    BFF->>Sec: GET /api/v1/profile (Authorization: Bearer <Keycloak JWT>)
    Sec->>Sec: Valider JWT signatur & udtræk GrantedAuthorities
    Sec->>PCtrl: getUserProfile(Authentication)
    PCtrl->>PCtrl: Læs Jwt claims (sub, preferred_username, email, realm_access.roles)
    PCtrl-->>BFF: HTTP 200 OK (Profil-metadata JSON)
    BFF-->>User: Viser brugerprofil og aktiv rolle i UI
```

---

# 7. Frontend 1:1 Symmetri, Dual-App Separation of Concerns (`apps/landing` vs. `apps/dashboard`) & RBAC (`RoleGuard`)

For at opnå 1:1 arkitektonisk symmetri mellem Java 17 / Spring Boot 3-backenden og TypeScript 5 / React 19-frontenden — samtidig med at **Zero-Trust Separation of Concerns (SoC)** håndhæves på klientsiden — er frontenden struktureret som en **Hybrid Dual-App & BFF Arkitektur** med en **2-Fils Core (`baseDomainCore.ts` + `baseUiCore.tsx`)**, et offentligt **Zero-Trust Gateway-lag (`authGateway.ts` + `LandingFeature.tsx`)** i [`apps/landing`](file:///z:/home/work/projects/api/frontend/apps/landing/src/App.tsx) (Port 5173) og en **Rollebaseret Portal (`AuthProvider` + `<RoleGuard />`)** i [`apps/dashboard`](file:///z:/home/work/projects/api/frontend/apps/dashboard/src/App.tsx) (Port 5174) samt Next.js 16 BFF (Port 3000).

### 7.1 Arkitekturdiagram: Dual-App SoC (`apps/landing` vs. `apps/dashboard`) & RBAC (`RoleGuard`)

```mermaid
flowchart TB
    subgraph PublicZone["Offentlig Zone — apps/landing (Port 5173, Zero-Trust Gateway)"]
        LandingUI["LandingFeature.tsx\n(<LandingFeatureView />)\nOffentlig værdipræsentation & Login-knapper"]
        Gateway["authGateway.ts (Pure TypeScript)\nAuthGateway.buildLoginUrl(roleHint)\nAuthGateway.initiateLogin(roleHint)\nIngen React- eller CRUD-imports!"]
        LandingUI -->|"onClick -> initiateLogin('CLIENT' | 'PROVIDER' | 'MANAGEMENT')"| Gateway
    end

    subgraph ProtectedZone["Beskyttet Portal-Zone — apps/dashboard (Port 5174) & Next.js 16 BFF (:3000)"]
        subgraph Core2File["2-Fils Core (src/core/)"]
            DomainCore["baseDomainCore.ts (Pure TypeScript)\n• HasId<ID>, UserRole, AuthenticatedUser\n• expandRoleAliases() & matchesAnyRole()\n• ErrorCode & ProblemDetail (RFC 7807)\n• FrontendDomainException & DomainGuard\n• abstract BaseApiService<DTO, ID>"]
            UiCore["baseUiCore.tsx (React Supertype)\n• <AuthProvider /> & useAuth()\n• <RoleGuard allowed={[...]} />\n• useBaseCrud<DTO, ID>()\n• <ProblemAlert /> & <PortalWorkspaceShell />"]
            UiCore -->|depends on| DomainCore
        end

        subgraph Slices["Rolle-isolerede Vertical Feature Slices (src/features/*)"]
            BookingSlice["BookingFeature.tsx & AppointmentFeature.tsx\n<RoleGuard allowed={['CLIENT', 'PROVIDER']}>\nModule-private AppointmentApiService"]
            JournalSlice["JournalFeature.tsx\n<RoleGuard allowed={['PROVIDER']}>\nModule-private JournalApiService + JGit diff"]
            MgmtSlice["ManagementFeature.tsx\n<RoleGuard allowed={['MANAGEMENT']}>\nModule-private ManagementApiService (KPI & Audit)"]
            DomainSlices["Øvrige 1:1 Domæne-Slices:\n• ClinicPlatformFeature.tsx\n• FinanceFeature.tsx\n• I18nFeature.tsx\n• PsychotraumatologyFeature.tsx\n• UserFeature.tsx"]
        end

        BookingSlice --> UiCore
        JournalSlice --> UiCore
        MgmtSlice --> UiCore
        DomainSlices --> UiCore
    end

    subgraph BackendZone["Spring Boot 3 Backend (:8080 / :8081)"]
        JavaWeb["BaseWebCore.java\nBaseController<Entity, DTO>\nGlobalExceptionHandler (RFC 7807)"]
        JavaDomain["BaseDomainCore.java\nBaseService<Entity, DTO>\nDomainGuard & ErrorCode"]
        JavaWeb --> JavaDomain
    end

    Gateway -->|"HTTP Redirect\nhttp://localhost:5174/?roleHint=..."| UiCore
    DomainCore <-->|"HTTP REST / JSON + Bearer JWT\n+ RFC 7807 ProblemDetail"| JavaWeb
```

### 7.2 Sekvensdiagram: Fra Offentlig Gateway (`apps/landing`) til Rollebeskyttet Vertical Slice (`<RoleGuard />`)

```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Besøgende / Bruger
    participant Landing as LandingFeatureView (Port 5173)
    participant AG as AuthGateway (authGateway.ts)
    participant Portal as Dashboard App / AuthProvider (Port 5174 / :3000)
    participant RG as <RoleGuard allowed={[...]} /> (baseUiCore.tsx)
    participant Slice as Vertical Slice (fx ManagementFeature / JournalFeature)
    participant Svc as Module-Private <Name>ApiService (baseDomainCore.ts)
    participant API as Spring Boot 3 Backend (/api/v1/*)

    Visitor->>Landing: Klikker på "Virksomhedsledelse Login" (eller Klient / Terapeut)
    Landing->>AG: AuthGateway.initiateLogin("MANAGEMENT")
    AG->>AG: buildLoginUrl("MANAGEMENT") -> "http://localhost:5174/?roleHint=MANAGEMENT"
    AG-->>Portal: window.location.assign(...) -> OIDC / Session-kontekst
    Portal->>Portal: AuthProvider initialiserer user.roles (synkroniserer PROVIDER<->THERAPIST, MANAGEMENT<->ADMIN)
    Portal->>RG: Render <RoleGuard allowed={["MANAGEMENT"]}> omkring <ManagementFeatureView />
    alt matchesAnyRole(user.roles, allowed) == false (fx CLIENT forsøger adgang til Management/Journal)
        RG-->>Visitor: Viser <p data-testid="forbidden-notice">Adgang nægtet</p> (Zero data leakage)
    else matchesAnyRole(user.roles, allowed) == true
        RG->>Slice: Mount <ManagementFeatureView /> -> useBaseCrud(managementService)
        Slice->>Svc: create(dto) -> validateBeforeCreate(dto) via DomainGuard
        Svc->>API: POST /api/backend/management/kpis (Authorization: Bearer <token>)
        API-->>Svc: HTTP 201 Created (ManagementKpiDto) eller HTTP 4xx/5xx RFC 7807 ProblemDetail
        Svc-->>Slice: Opdaterer React state eller viser <ProblemAlert />
        Slice-->>Visitor: Viser opdateret KPI-liste / Journal / Kalender
    end
```

