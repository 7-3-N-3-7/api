# Integr8te / EduJournal — Full-Stack 2-File Core & Vertical Slice Architecture

Velkommen til kildekoden for hovedopgaven **Integr8te / EduJournal** — en sikker, rolleopdelt klinik-, journal-, booking- og økonomiplatform udviklet med **1:1 arkitektonisk symmetri** mellem **Java 17 / Spring Boot 3.2.5** (Backend) og **TypeScript 5 / React 19 / Next.js 16 / Vite** (Frontend).

Dette repository er struktureret og kommenteret med fokus på høj læsbarhed for udviklere, vejleder og censor.

---

## 0. Universelt Kommentarsystem (Stil A) & 5-Minutters Læseguide

Alle kildefiler i både **Java 17 Backend** og **TypeScript/React Frontend** indledes med et **Arkitektonisk Visitkort** og benytter en fælles, HTML-fri **Stil A-notation**, så du øjeblikkeligt kan se hvilken type kodeelement der refereres til:

| Stil A Tag | Betydning | Eksempel i Backend (Java 17) | Eksempel i Frontend (TypeScript / React) |
| :--- | :--- | :--- | :--- |
| `@Spejler: ...` | 1:1 modstykke i den anden stak | `@Spejler: frontend/src/core/baseDomainCore.ts` | `@Spejler: backend/.../BaseDomainCore.java` |
| `[Interface: Navn]` | Interface / Kontrakt | `[Interface: HasId]`, `[Interface: Identifiable]` | `[Interface: HasId]`, `[Interface: ProblemDetail]` |
| `[AbstractClass: Navn]` | Abstrakt superklasse (*Layer Supertype*) | `[AbstractClass: BaseService<Entity, DTO>]` | `[AbstractClass: BaseApiService<DTO, ID>]` |
| `[Class: Navn]` | Konkret klasse / Guard / Exception | `[Class: DomainException]` | `[Class: FrontendDomainException]`, `[Class: DomainGuard]` |
| `[Enum: Navn]` | Enum / Fejlkodekatalog | `[Enum: ErrorCode]` | `[Enum: ErrorCode]` |
| `[Record/DTO: Navn]` | Uforanderlig datakontrakt (DTO) | `[Record/DTO: AppointmentDto]` | `[Record/DTO: AppointmentDto]` |
| `[Entity: Navn]` | Persistent JPA / MongoDB-entitet | `[Entity: Appointment]`, `[Entity: I18nDictionary]` | *(Skjult på backend via Information Hiding)* |
| `[Repository: Navn]` | Package-private Spring Data Repository | `[Repository: AppointmentRepository]` | *(Modsvares af modul-privat `*ApiService`)* |
| `[Service: Navn]` | Domæne- eller API-service | `[Service: AppointmentService]` | `[Service: AppointmentApiService]` |
| `[Controller: Navn]` | Spring REST Controller | `[Controller: AppointmentController]` | *(Modsvares af `[Hook: useBaseCrud()]`)* |
| `[Component: <Navn />]` | React UI-komponent | *(Kun i Frontend)* | `[Component: <AppointmentFeatureView />]` |
| `[Hook: useNavn()]` | React Custom Hook | *(Kun i Frontend)* | `[Hook: useBaseCrud()]`, `[Hook: useAuth()]` |
| `#metodeNavn(param)` | Metode, funktion eller hook-kald | `#validateBeforeCreate(dto)`, `#create(dto)` | `#validateBeforeCreate(dto)`, `#request(subPath)` |
| `` `variabelNavn` `` | Variabel, felt eller parameter | `` `repository` ``, `` `existingEntity` `` | `` `basePath` ``, `` `items` ``, `` `roleHint` `` |

### Anbefalet 5-Minutters Læserækkefølge (Til Censor, Vejleder & Nye Udviklere)
1. **Start i 2-File Core (Backend $\leftrightarrow$ Frontend):**
   - [`BaseDomainCore.java`](backend/src/main/java/com/platform/core/BaseDomainCore.java) $\leftrightarrow$ [`baseDomainCore.ts`](frontend/src/core/baseDomainCore.ts)
   - [`BaseWebCore.java`](backend/src/main/java/com/platform/core/BaseWebCore.java) $\leftrightarrow$ [`baseUiCore.tsx`](frontend/src/core/baseUiCore.tsx)
2. **Læs en komplet Vertical Slice fra top til bund (5 trin):**
   - [`AppointmentFeature.java`](backend/src/main/java/com/platform/features/appointment/AppointmentFeature.java) $\leftrightarrow$ [`AppointmentFeature.tsx`](frontend/src/features/appointment/AppointmentFeature.tsx) (Timefold Solver AI-planlægning)
   - [`JournalFeature.java`](backend/src/main/java/com/platform/features/journal/JournalFeature.java) $\leftrightarrow$ [`JournalFeature.tsx`](frontend/src/features/journal/JournalFeature.tsx) (Eclipse JGit SHA-1 revisionsmotor & GDPR privatlivsfiltrering)

---

## 1. Arkitektonisk Overblik: 2-File Core + Vertical Feature Slices

Både backend og frontend er konstrueret efter nøjagtig samme arkitektoniske principper:
1. **2-File Core (*Layer Supertype*, Fowler):** Hele applikationens tværgående infrastruktur (identitetskontrakter, generisk CRUD-orkestrering, funktionel domænevalidering, RBAC-sikkerhed og RFC 7807 fejlhåndtering) er samlet i **2 kernefiler** pr. stak.
2. **Selvbærende Vertical Feature Slices:** Hvert forretningsdomæne bor i sin egen mappe og samler DTO-kontrakter, entiteter/modeller, modul-private repositories/API-services og controllere/UI-views.
3. **Streng Information Hiding:** Ingen dataadgangskomponenter (`*Repository` eller `*Service` i Java; `*ApiService` i TypeScript) eksporteres som `public`/`export` uden for deres respektive slice.

### 1:1 Symmetri i Kernen (2-File Core + Gateway)

| Lag / Ansvar | Backend (`backend/src/main/java/com/platform/core/`) | Frontend (`frontend/src/core/`) | Centrale Mønstre & Invarianter |
| :--- | :--- | :--- | :--- |
| **Domæne & Persistens / API** | [`BaseDomainCore.java`](backend/src/main/java/com/platform/core/BaseDomainCore.java) | [`baseDomainCore.ts`](frontend/src/core/baseDomainCore.ts) | `HasId`, `Identifiable`, `ErrorCode` (*Functional Exception Factory*), `DomainGuard`, `BaseService` / `BaseApiService` (*Template Method Pattern*). **Zero-Web / Zero-UI invariant** (ingen Spring Web eller React imports). |
| **Præsentation & Fejlhåndtering** | [`BaseWebCore.java`](backend/src/main/java/com/platform/core/BaseWebCore.java) | [`baseUiCore.tsx`](frontend/src/core/baseUiCore.tsx) | `BaseController` / `useBaseCrud` hook, `GlobalExceptionHandler` / `<ProblemAlert />` (**RFC 7807 `ProblemDetail`**), samt `AuthProvider` og `<RoleGuard />` til deklarativ RBAC. |
| **Zero-Trust Auth Gateway** | [`SecurityConfig.java`](backend/src/main/java/com/platform/config/SecurityConfig.java) | [`authGateway.ts`](frontend/src/core/authGateway.ts) | OAuth2 / Keycloak JWT-validering på backend og Zero-Trust login-handoff fra den offentlige Landing-app til Dashboardet på frontend. |

---

## 2. 1:1 Mapping af Vertikale Feature Slices

Hver vertikal slice i backenden følger en fast **5-trins opbygning** (`1. DTO CONTRACTS` -> `2. JPA / MONGO ENTITIES` -> `3. REPOSITORIES & PORTS` -> `4. DOMAIN SERVICES` -> `5. REST CONTROLLERS`), og hver frontend-slice følger en tilsvarende **3-trins opbygning** (`1. DTOs & PURE DOMAIN LOGIC` -> `2. MODULE-PRIVATE API SERVICE` -> `3. EXPORTED FEATURE VIEW`).

| Forretningsdomæne | Backend Vertical Slice (`com.platform.features.*`) | Frontend Vertical Slice (`frontend/src/features/*`) | Centrale Domæneregler & Teknologier |
| :--- | :--- | :--- | :--- |
| **Aftaler & AI-Planlægning** | [`AppointmentFeature.java`](backend/src/main/java/com/platform/features/appointment/AppointmentFeature.java) | [`AppointmentFeature.tsx`](frontend/src/features/appointment/AppointmentFeature.tsx) | **Timefold Solver** (`HardSoftScore` optimering af arbejdstid, overlap og sammenhængende kalender), kollisionsvalidering med pauser og JGit aftale-audit (`Refs-Appointment`). |
| **Klinik, CVR & Samtykke** | [`ClinicPlatformFeature.java`](backend/src/main/java/com/platform/features/clinic/ClinicPlatformFeature.java) | [`ClinicPlatformFeature.tsx`](frontend/src/features/clinic/ClinicPlatformFeature.tsx) | 8-cifret dansk CVR-validering, behandler-onboarding, ydelseskatalog og granulære **`ClientTherapistHandshake`** samtykker pr. JGit-gren. |
| **Økonomi & Hovedbog** | [`FinanceFeature.java`](backend/src/main/java/com/platform/features/finance/FinanceFeature.java) | [`FinanceFeature.tsx`](frontend/src/features/finance/FinanceFeature.tsx) | **Kill Bill** fakturering/kreditnota/abonnement, **Apache Fineract** dobbelt bogholderi (kontoplan `1100`–`4200`, klippekort, afdrag) og **JGit** bilags-commits. |
| **Internationalisering (i18n)** | [`I18nFeature.java`](backend/src/main/java/com/platform/features/i18n/I18nFeature.java) | [`I18nFeature.tsx`](frontend/src/features/i18n/I18nFeature.tsx) | **MongoDB** dokumentlager (`i18n_dictionaries`), ISO 639-1 validering, rekursiv fallback-fletning mod dansk referencesprog og dækningsgrad. |
| **Journal & JGit Historik** | [`JournalFeature.java`](backend/src/main/java/com/platform/features/journal/JournalFeature.java) | [`JournalFeature.tsx`](frontend/src/features/journal/JournalFeature.tsx) | **Eclipse JGit** SHA-1 versionsstyring på emnegrene (`main`, `trauma`, `sleep`) samt **Privacy-by-Design** filtrering af `<!-- INTERNAL_MEDICAL_NOTES -->` for klienter. |
| **Psykotraumatologi (PCL-5)** | [`PsychotraumatologyFeature.java`](backend/src/main/java/com/platform/features/psychotraumatology/PsychotraumatologyFeature.java) | [`PsychotraumatologyFeature.tsx`](frontend/src/features/psychotraumatology/PsychotraumatologyFeature.tsx) | Klinisk PCL-5 og ITQ traumescreening (score `0–80`), sværhedsgradsklassificering og Zero-Trust adgangskontrol pr. klient-UUID. |
| **Brugere & Sikkerhedsprofil** | [`UserFeature.java`](backend/src/main/java/com/platform/features/user/UserFeature.java) | [`UserFeature.tsx`](frontend/src/features/user/UserFeature.tsx) | Brugeroprettelse med `@JsonProperty(access = WRITE_ONLY)` adgangskodebeskyttelse, Keycloak JWT-profiludtræk og RBAC-roller. |
| **Rollebeskyttet Booking (SoC)** | *(Delegerer til `AppointmentFeature`)* | [`BookingFeature.tsx`](frontend/src/features/booking/BookingFeature.tsx) | Deklarativ `<RoleGuard allowed={["CLIENT", "PROVIDER"]} />` omkring kalender- og bookingflowet. |
| **Virksomhedsledelse (SoC)** | *(Delegerer til `Clinic`/`Finance`)* | [`ManagementFeature.tsx`](frontend/src/features/management/ManagementFeature.tsx) | Deklarativ `<RoleGuard allowed={["MANAGEMENT"]} />` omkring klinik-KPI'er og ledelsesaudit. |
| **Offentlig Landing (SoC)** | [`PublicHealthController`](backend/src/main/java/com/platform/features/user/UserFeature.java) | [`LandingFeature.tsx`](frontend/src/features/landing/LandingFeature.tsx) | Zero-Trust offentlig indgang på Port 5173 uden afhængigheder til dashboard-DTO'er eller `BaseApiService`. |

---

## 3. Frontend Dual-App Separation of Concerns (SoC) & RBAC

Frontenden understøtter både **Next.js 16 App Router (BFF på Port 3000)** og en fysisk adskilt **Dual-App Vite-arkitektur**:

1. **`apps/landing` (`@platform/landing` — Port 5173):**
   - Offentlig Zero-Trust applikation, der kun bundler [`authGateway.ts`](frontend/src/core/authGateway.ts) og [`LandingFeature.tsx`](frontend/src/features/landing/LandingFeature.tsx).
   - Indeholder **nul** patient-, journal- eller økonomikode i sit produktionsbundle (`dist/`).
2. **`apps/dashboard` (`@platform/dashboard` — Port 5174):**
   - Beskyttet Multi-Role Dashboard omsluttet af `AuthProvider` og `<RoleGuard />`:
     - **`CLIENT` (Borger/Klient):** Adgang til `BookingFeatureView`.
     - **`PROVIDER` / `THERAPIST` (Behandler):** Adgang til `BookingFeatureView`, `JournalFeatureView` og `PsychotraumatologyFeatureView`.
     - **`MANAGEMENT` / `ADMIN` (Ledelse):** Adgang til `ManagementFeatureView`, `FinanceFeatureView` og `UserFeatureView`.

---

## 4. Kørsel af Tests, Coverage Gates (100%) & Generisk GitHub SDLC-Framework

### Frontend & SDLC-Kerne (Vitest + Istanbul Coverage Gate 100% & Cucumber.js)

Kør fra `frontend/`-mappen:

```bash
cd frontend

# 1. Kør alle 12 Vitest-testsuiter (96 tests inkl. sdlc/core) med Istanbul coverage-gate (100% på lines, statements, functions & branches)
npm run test:coverage

# 2. Kør fælles Gherkin @fullstack BDD-kontrakter i Cucumber.js (mod ../specs/features/)
npm run test:bdd:api

# 3. Byg begge isolerede Vite-applikationer (@platform/landing + @platform/dashboard)
npm run build:all

# 4. Byg Next.js 16 BFF-applikationen
npm run build
```

### Backend (JUnit 5 + Cucumber BDD + 6-Metrik JaCoCo Coverage Gate 100%)

Kør fra `backend/`-mappen:

```bash
cd backend

# Kør samtlige enheds-, arkitektur- og 43 Cucumber BDD-tests samt 100% JaCoCo gate (LINE, BRANCH, INSTRUCTION, COMPLEXITY, METHOD, CLASS)
mvn test jacoco:report jacoco:check
```

### Generisk GitHub SDLC-Framework (`sdlc/core/` & `sdlc.config.json`)

Repositoryet spejler den dobbeltsidede arkitektursymmetri i en **tredobbelt 2-fils kerne-symmetri**:
- **Backend 2-fils kerne:** [`BaseDomainCore.java`](backend/src/main/java/com/platform/core/BaseDomainCore.java) + [`BaseWebCore.java`](backend/src/main/java/com/platform/core/BaseWebCore.java)
- **Frontend 2-fils kerne:** [`baseDomainCore.ts`](frontend/src/core/baseDomainCore.ts) + [`baseUiCore.tsx`](frontend/src/core/baseUiCore.tsx)
- **SDLC 2-fils procesmotor:** [`sdlc-domain.ts`](sdlc/core/sdlc-domain.ts) + [`sdlc-github.ts`](sdlc/core/sdlc-github.ts) styret deklarativt af [`sdlc.config.json`](sdlc.config.json) og fælles `.feature`-kontrakter i [`specs/features/`](specs/features/shared/generic_sdlc_framework.feature).

Root CLI-kommandoer (fra projektets rod — køres direkte med `npm run sdlc:...` uden ekstra root-afhængigheder, inkl. Multi-Repo konfiguration i `sdlc.config.json` for `7-3-N-3-7/api`, `7-3-N-3-7/backend` og `7-3-N-3-7/frontend`):

```bash
# 1. Klargør GitHub Projects v2 board, custom felter & branch protection 100% via gh CLI (--dry-run understøttes)
npm run sdlc:bootstrap

# 2. Synkronisér Issue -> linked branch (dev -> feature/<id>-<slug> -> child-branch) & Gherkin-kontrakt
npm run sdlc:sync-issue -- --issue <nr> --title "<titel>"

# 3. Opret hierarkisk Sub-Issue & træ-isomorf child-branch fra parent-branch
npm run sdlc:spawn -- --parent <parentNr> --child <childNr> --title "<delopgave>"

# 4. Verificér begge BDD-rapporter + 100% JaCoCo (6 tællere) & Istanbul (4 tællere) + Sub-Issues (Green Gate)
npm run sdlc:verify -- --branch feature/<id>-<slug> --dry-run

# 5. Vis lokal SDLC-status
npm run sdlc:status

# 6. Synkronisér Issue & Projects v2 direkte fra commit-tags (--dry-run understøttes)
npm run sdlc:commit-sync -- --message "feat: implement flow #42 #tdd" --branch dev --dry-run
```

**Commit-message tags til GitHub Issues & Projects v2 (virker i `api`, `backend` & `frontend`):**

| Tag (1:1 eller kort form) | Projects v2 Status | Issue-handling |
| :--- | :--- | :--- |
| `#backlog` | `Backlog` | Tilføjer til board & kommenterer |
| `#spec-ready` / `#spec` | `Spec Ready` | Opdaterer status & kommenterer |
| `#red-outer-bdd` / `#bdd` / `#red` | `Red (Outer BDD)` | Opdaterer status & kommenterer |
| `#inner-tdd` / `#tdd` | `Inner TDD` | Opdaterer status & kommenterer |
| `#green-gate` / `#green` | `Green Gate` | Opdaterer status & kommenterer |
| *(`#done` ignoreres)* | `Done` | Sættes udelukkende af `sdlc-verify-and-sync.yml` efter grøn CI / merge til `main` |
| `#regression` | `Regression` | Sætter `Regression`, kommenterer & genåbner hvis lukket |

Eksempler: `feat: auth #42 #tdd`, `fix: endpoint api#42 #green` (fra `backend`/`frontend`), `fix: rollback #42 #regression`.

---

## 5. Arkitekturdiagrammer & Hovedopgavedokumentation

- **Mermaid Arkitekturdiagrammer & Interaktiv Vektorfremviser (`docs/diagrams/` & `infrastructure/diagrams/`):**
  - [`docs/diagrams/diagram-oversigt.html`](docs/diagrams/diagram-oversigt.html): Samlet offline interaktiv Pan & Zoom vektoroversigt over alle 44 diagrammer (43 Mermaid + 1 PlantUML), også udgivet via GitHub Pages på `https://7-3-n-3-7.github.io/api/diagrams/diagram-oversigt.html`.
  - [`docs/diagrams/generic-sdlc-architecture.mmd`](docs/diagrams/generic-sdlc-architecture.mmd): Generisk GitHub SDLC-Framework (Tredobbelt 2-fils Symmetri, GitHub Projects v2, træ-isomorfe branches & to-vejs feedback-loop).
  - [`infrastructure/diagrams/bdd-tdd-workflow.mmd`](infrastructure/diagrams/bdd-tdd-workflow.mmd): 9-trins lukket Outside-In BDD/TDD & SDLC Full-Stack Gate workflow.
  - [`docs/diagrams/fullstack-symmetry.mmd`](docs/diagrams/fullstack-symmetry.mmd): 1:1 Full-Stack Arkitektonisk Symmetri & Dual-App Frontend SoC.
  - [`docs/diagrams/core-and-slice-class-diagram.mmd`](docs/diagrams/core-and-slice-class-diagram.mmd): Detaljeret UML-klassediagram over `BaseDomainCore`, `BaseWebCore` og vertikale slices.
  - [`docs/diagrams/double-loop-tdd.mmd`](docs/diagrams/double-loop-tdd.mmd): Outside-In Double-Loop TDD-arbejdsgang (Cucumber BDD + JUnit 5/Mockito).
- **Rapport & Dokumentation:**
  - [`hovedopgave.tex`](hovedopgave.tex): LaTeX-kildekode til hovedopgaverapporten.
  - [`HOVEDOPGAVE_DRAFT.md`](HOVEDOPGAVE_DRAFT.md): Samlet Markdown-udgave af hovedopgaven.
  - [`HOVEDOPGAVE_DIAGRAMMER.md`](HOVEDOPGAVE_DIAGRAMMER.md): Katalog over samtlige C4-, sekvens-, tilstands- og klassediagrammer.
