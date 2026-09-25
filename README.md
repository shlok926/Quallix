# 🎭 Quallix — QA Automation Framework

Deterministic, stateful Playwright + TypeScript automation framework designed for Platione Sales Assist.

![Playwright](https://img.shields.io/badge/Playwright-1.44-45ba4b?logo=playwright)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript)
![Tests](https://img.shields.io/badge/Tests-30%20Passed-brightgreen)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF?logo=github-actions)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Environment](https://img.shields.io/badge/Environment-Stateful%20Mock-blue)

---

## Quick Navigation

> [🚀 Quick Start](#-quick-start) • [📁 Project Structure](#-project-structure) • [🧪 Test Results](#-test-results--honest-analysis) • [🏗️ Architecture](#-architecture) • [📖 Contributing](#-contributing)

---

## About the Framework

This repository houses the QA Automation Framework developed for **Platione Sales Assist**. It provides comprehensive automated verification covering REST API clients, Page Object Model user interfaces, and end-to-end sales representative workflows.

> [!NOTE]
> **Execution Environment**: Tests in this repository execute against a built-in stateful mock application and routing layer (`MockAPIServer` and browser route interception). Direct live integration with external Java Spring Boot services or live Angular web servers is configurable via `APP_BASE_URL` and `API_BASE_URL`, but is not bundled directly within this repository.

The framework resolves common QA challenges of test flakiness, state pollution, and hardcoded credentials by introducing a decoupled Factory-Seeder architecture, a fail-closed configuration manager (`ConfigManager`), a destructive database reset safety boundary (`DatabaseSafetyGuard`), and dependency-injected Playwright fixtures.

---

## Key Features

| 🏭 Factory Pattern | 🌐 API Testing | 🖥️ UI Automation | ⚙️ CI/CD Ready |
| :--- | :--- | :--- | :--- |
| Realistic test data generation with edge cases | Full REST API client layer with mock server | Page Object Model + Component Objects | GitHub Actions smoke, regression, deploy-gate |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Test Runner** | Playwright 1.44 | Cross-browser automation + API testing |
| **Language** | TypeScript (strict mode) | Compile-time type safety and code quality |
| **Logger** | Winston | Structured logger outputting to console and files |
| **Data Generation** | @faker-js/faker | Dynamic, randomized payloads for factory seeding |
| **Database Connector**| mysql2 | Direct SQL querying for seeding/verification |
| **CI/CD** | GitHub Actions | Automated workflow triggers and reporting |
| **Formatting & Lint** | ESLint + Prettier | Consistent code styles and syntax enforcement |

---

## 🧪 Test Results & Honest Analysis

| Suite | Tests | Status | Target | Notes |
|---|---|---|---|---|
| API Tests | 28 | ✅ 28/28 Passing | API Client / Mock Server | Covers Config Security, DB Safety Guard, Contacts CRUD, Action API |
| UI Tests | 1 | ✅ 1/1 Passing | Chromium, Firefox, WebKit | Contacts UI table verification & creation flow |
| E2E Tests | 1 | ✅ 1/1 Passing | Chromium, Firefox, WebKit | Full sales rep workflow (login, navigation, lead qualification, actions) |
| **Total Test Suite** | **30** | **✅ 30/30 Passing** | **Cross-Browser** | **34 test runs across full CI browser matrix** |

### Cross-Browser Architecture

The UI and E2E automation suites execute seamlessly against the browser-level mock routing layer (`mockAPIServer.setupMockRoutes`) without external service dependencies. Cross-browser validation runs across **Chromium**, **Firefox**, and **WebKit**.

### What This Demonstrates

The 30/30 passing test suite proves the validity of the core framework architecture:
* **Fail-Closed Security & Config**: Validates `DatabaseSafetyGuard` (FIX-01) and fail-closed credential loading (FIX-04).
* **Accurate Behavioral Verification**: Eliminates false positives in duplicate phone validation and UI creation (FIX-02).
* **Complete Action API Contract**: Enforces in-memory isolation, action creation, retrieval, and status updates (FIX-03).
* **Cross-Browser Verification**: Proves identical layout rendering, navigation, and modal interactions across Chromium, Firefox, and WebKit (FIX-06).

---

## 📸 Test Evidence

### Test Execution — 30/30 Passing (34 Multi-Browser Matrix Runs)
![Terminal Output](docs/screenshots/terminal-output.png)

### HTML Report
![HTML Report](docs/screenshots/html-report.png)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TEST SUITE LAYER                         │
│       (tests/api/     tests/ui/     tests/e2e/)             │
└──────────────────────────┬──────────────────────────────────┘
                           │ uses
┌──────────────────────────▼──────────────────────────────────┐
│                    FIXTURE LAYER                            │
│         (Playwright fixtures for DI, setup, teardown)       │
└────────┬─────────────────┬──────────────────────────────────┘
         │                 │
┌────────▼──────┐  ┌───────▼────────────────────────────────┐
│  DATA LAYER   │  │         AUTOMATION LAYER               │
│  Factories    │  │  API Clients  │  Page Objects          │
│  API Seeders  │  │  Builders     │  Component Objects     │
│  DB Seeders   │  │  Validators   │  Navigation Helpers    │
└────────┬──────┘  └───────┬────────────────────────────────┘
         │                 │
┌────────▼─────────────────▼─────────────────────────────────┐
│                    UTILITY LAYER                            │
│   Config │ Logger │ DB Utils │ DB Safety │ Auth │ Dates     │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                 ENVIRONMENT LAYER                           │
│        .env.example  │  .env.qa  │  .env.staging            │
└────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Quallix/
├── .github/                 # GitHub Actions workflows and PR templates
│   └── workflows/           # Smoke, regression, deploy-gate, and CodeQL
├── database/                # Database migrations and baseline seeds
│   ├── migrations/          # SQL scripts to recreate schema tables
│   └── seeds/               # Baseline seed data for database setup
├── docs/                    # Framework documentation and media files
│   └── screenshots/         # Terminal runs and report HTML images
├── scripts/                 # CLI tools for data seeding and db resets
│   ├── seed-api.ts          # Programmatic REST API data seeding script
│   ├── seed-db.ts           # Direct database SQL seeding script
│   └── reset-db.ts          # Script to recreate fresh database tables (Protected by DatabaseSafetyGuard)
├── src/                     # Source folder containing the core framework
│   ├── api/                 # REST clients, builders, validators, and mock server
│   ├── data/                # Data factories and seeder registry classes
│   ├── fixtures/            # Dependency injection context managers
│   ├── types/               # TypeScript schemas and interface mappings
│   ├── ui/                  # Page objects and page-level helpers
│   └── utils/               # Database connectors, loggers, and config utilities
└── tests/                   # Specification files containing test assertions
    ├── api/                 # Integration test specs (Isolated, headless)
    ├── e2e/                 # User flows verifying complete sales cycles
    └── ui/                  # Page-object-driven user interface tests
```

---

## ⚡ Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/shlok926/Quallix.git
cd Quallix

# 2. Install dependencies
npm install

# 3. Install Playwright browsers (Chromium for standard gates, all for full matrix)
npx playwright install --with-deps chromium firefox webkit

# 4. Configure environment
cp .env.example .env
# Edit .env with your environment parameters

# 5. Run API test suite (28 tests, fully isolated against stateful mock)
npx playwright test --project=api

# 6. Run UI & E2E browser tests (Chromium)
npx playwright test --project=chromium

# 7. Run complete test suite (API + Chromium)
npx playwright test --project=api --project=chromium

# 8. Run smoke tests (8 critical path tests)
npx playwright test --grep "@smoke" --project=api --project=chromium

# 9. (Optional) Database Setup & Reset
npm run seed:db                      # Seed baseline database records
npm run reset:db -- --confirm        # Destructively reset DB (Restricted to local/test/qa environments)

# 10. View HTML report
npx playwright show-report reports/html
```

---

## ⚙️ Environment Configuration

The framework utilizes standard `.env` configuration files processed via a unified `ConfigManager` utility with strict fail-closed validation for required secrets.

```properties
# Application & API Base URLs
APP_BASE_URL=http://localhost:4200
API_BASE_URL=http://localhost:8080

# Database Configuration (MySQL connection pool)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=platione_test
DB_USER=qa_user
DB_PASSWORD=

# Test User Credentials (Required for authenticated flows — fail-closed if missing)
TEST_USER_EMAIL=qa@platione.com
TEST_USER_PASSWORD=

# Framework & Execution Controls
# LOG_LEVEL options: debug, info, warn, error
LOG_LEVEL=info
# ENVIRONMENT options: qa, local, test (permitted for db resets), staging, prod-like (protected)
ENVIRONMENT=qa

# Database Reset Safety Controls (Destructive operations require explicit confirmation)
# Set to 'true' in CI/automated environments or pass '--confirm' to CLI
CONFIRM_DB_RESET=false
```

---

## 🛡️ Database Reset Safety Boundary (`DatabaseSafetyGuard`)

Destructive database operations (`scripts/reset-db.ts`) are protected by a fail-closed safety guard (`DatabaseSafetyGuard` in `src/utils/db-safety.ts`):
* **Environment Restriction**: Reset is permitted only in `local`, `test`, or `qa` environments. Target environments matching `production`, `prod`, `staging`, `live`, or undefined are blocked.
* **Database Name Safeguard**: Operations targeting databases named `production`, `prod`, or `staging` are rejected.
* **Confirmation Flag**: Destructive drop/recreate requires explicit CLI flag `--confirm` or environment variable `CONFIRM_DB_RESET=true`.

| Scale | Tests | Strategy |
|-------|-------|----------|
| **3 tests** | Initial | Basic structure, 1-2 factories, mock handlers |
| **50 tests** | Growth | Full fixture system, CI/CD, parallel worker pools, mock server bypass |
| **500 tests** | Enterprise | Factory registry, browser matrix, test sharding, visual regression |

---

## 🔄 CI/CD Pipeline

We maintain three pipelines configured under `.github/workflows/`:
1. `smoke.yml` — Runs on every PR and push targeting the `main` branch. Validates code compilation, lint rules, and executes `@smoke` critical path tests on API & Chromium.
2. `regression.yml` — Triggered nightly (and on `workflow_dispatch`). Runs the complete test suite across the verified cross-browser matrix (Chromium, Firefox, WebKit) and API suite.
3. `deploy-gate.yml` — Runs on PRs targeting `main`/`develop`, executing the complete test suite on API & Chromium prior to merge.

---

## 💡 Design Decisions

| Decision | Why | Tradeoff |
|----------|-----|----------|
| **Factory-Seeder Separation** | Decouples data generation logic from network call setup. Tests only import what they request. | Slightly more files (a factory plus two seeders per model). |
| **Playwright over others** | Native support for parallel running, API mocking, and multi-browser execution. | Requires Node.js runtimes (which is standard). |
| **TypeScript strict mode** | Prevents type bugs, keeping framework code highly maintainable. | Requires writing strict types for API mock payloads. |
| **Both API + DB seeding** | Supports testing through direct database inserts (for speed) or API calls (to test business logic). | Increases maintenance cost for dual seeder routes. |
| **Playwright fixtures for DI** | Removes instantiation code from tests. Setup and teardown cleanup runs automatically. | Requires learning Playwright fixture extensibility syntax. |

---

## 📖 Contributing

Please review [CONTRIBUTING.md](CONTRIBUTING.md) for full instructions on writing tests, page objects, mock data factories, and conventional commit practices.

---

## 📋 Assignment Context

Developed for the **Platione Software Testing Intern Round 1** assignment.
* **Role**: First QA Automation Engineer (building framework from scratch).
* **Objective**: Establish a production-ready automation foundation.
* **Evaluation Criteria**:

| Category | Weight |
|----------|--------|
| Test Data Design | 30% |
| API Seeder Design | 20% |
| Database Seeder Design | 15% |
| Framework Architecture | 25% |
| Documentation & Design Thinking | 10% |

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
