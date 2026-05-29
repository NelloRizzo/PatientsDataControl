# HealthBridge — AI Agent Context

## Project Overview
HealthBridge is a healthcare data platform for recording, visualizing, and analyzing patient measurements (blood pressure, glucose, heart rate, etc.). Built as a monorepo with three packages.

## Architecture
```
healthbridge/
├── packages/shared/       # TypeScript types + Zod validation schemas
├── packages/backend/      # Express + Mongoose + JWT
└── packages/frontend/     # Vite + React 18 + TailwindCSS + Recharts
├── AGENTS.md              # This file
```

## Tech Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript 6.0.3 (strict mode) |
| Backend | Express + Mongoose (ODM MongoDB) |
| Auth | JWT (access 15m + refresh 7d) |
| Validation | Zod (shared between frontend/backend) |
| Frontend | Vite + React 18 + TypeScript |
| Routing | React Router v6 |
| Server state | TanStack Query |
| Charts | Recharts |
| Styling | TailwindCSS |
| HTTP | Axios |
| Hosting | Render (API web service + App web service) |

## Key Design Decisions

### Dynamic Measurement Types
Measurement types are NOT hardcoded. Admin creates/configures them via `MeasurementTypeConfig` model:
- `key` (unique identifier, e.g. `blood_pressure`)
- `name`, `description`, `category`
- `fields`: array of `{ key, name, unit, units[], type, min?, max? }`
- Each field supports multiple units (e.g. mg/dL, mmol/L)
- Compound types (blood pressure: systolic + diastolic) are handled as multiple fields

### Flexible Measurement Storage
The `Measurement` model stores data as:
- `values: Record<string, number>` (e.g. `{ systolic: 120, diastolic: 80 }`)
- `units: Record<string, string>` (e.g. `{ systolic: 'mmHg', diastolic: 'mmHg' }`)
- NOT a single `value`/`unit` — fully dynamic per type config

### Roles & Permissions
- `patient` — owns their data, CRUD on own measurements
- `doctor` — can view own patients' data (via `PatientDoctor` association)
- `analyst` — can view aggregate stats across all patients (no individual data)
- `admin` — full access, manages roles, associations, and measurement type configs

### Patient-Doctor Associations
Managed by admin via `PatientDoctor` model:
- Links a patient to a doctor with status (active/inactive)
- Enforces foreign key constraints via code
- Unique index on (patientId, doctorId)

### Address Fields
Patients have two address objects:
- `homeAddress` — where they actually live
- `legalAddress` — official registered address
- Each address has: `full`, `city`, `province`, `region`, `country`, `zip`

### Configurable Charts
Chart configurations are saveable per user via `ChartConfig` model:
- `measurementType`, `groupBy` (hour/day/week/month/year), `aggregation` (avg/min/max), `fields` (Y-axis)
- `chartType` (line/area/bar)
- Each config has a user-chosen `name` for easy recall
- Doctor dashboard includes save/load dropdown with save-as-name input and delete
- `patientFilters` with AND/OR logic supporting: sex, age range, address components (city, province, region, country)

### Aggregation Endpoints
- `/api/analyst/timeseries` — cross-patient aggregated time series with demographic filters
- `/api/analyst/stats` — cross-patient stats
- Same pattern for doctors (scoped to their patients)
- Same pattern for patients (scoped to their own data)

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register (patient role by default, sends verification email) |
| POST | /api/auth/login | Login, returns JWT pair |
| POST | /api/auth/refresh | Refresh tokens |
| GET | /api/auth/me | Current user info |
| PUT | /api/auth/profile | Update profile (name, email, addresses) |
| POST | /api/auth/verify-email | Verify email with token |
| POST | /api/auth/resend-verification | Resend verification email |
| POST | /api/auth/change-password | Change password (old + new) |

### Measurements
| Method | Path | Description |
|---|---|---|
| GET | /api/measurements | List own measurements (paginated, filterable) |
| POST | /api/measurements | Create measurement |
| POST | /api/measurements/import | Import CSV (one row = one measurement, fields column: `key=value|unit,...`) |
| GET | /api/measurements/stats | Stats for a type |
| GET | /api/measurements/:id | Get single measurement |
| PUT | /api/measurements/:id | Update measurement |
| DELETE | /api/measurements/:id | Delete measurement |

### Measurement Types (Dynamic Config)
| Method | Path | Access |
|---|---|---|
| GET | /api/measurement-types | All users (active types only) |
| GET | /api/measurement-types/all | Admin only |
| POST | /api/measurement-types | Admin only |
| PUT | /api/measurement-types/:key | Admin only |
| DELETE | /api/measurement-types/:key | Admin only |

### Chart Configs (Saved per user)
| Method | Path | Description |
|---|---|---|
| GET | /api/chart-configs | List user's saved configs |
| POST | /api/chart-configs | Save new config |
| PUT | /api/chart-configs/:id | Update config |
| DELETE | /api/chart-configs/:id | Delete config |

### Doctor
| Method | Path | Description |
|---|---|---|
| GET | /api/doctor/patients | List my patients |
| POST | /api/doctor/patients | Add patient association (by email) |
| PATCH | /api/doctor/patients/:patientId | Toggle status (active/inactive) |
| DELETE | /api/doctor/patients/:patientId | Remove association |
| GET | /api/doctor/patients/:id/measurements | View patient's measurements |
| GET | /api/doctor/patients/:patientId/latest-measurements | Latest measurement per type for patient |
| PUT | /api/doctor/patients/:patientId/profile | Update patient profile |
| GET | /api/doctor/patients/:patientId/notes | Get patient notes (chronological) |
| POST | /api/doctor/patients/:patientId/notes | Add patient note |
| GET | /api/doctor/patients/:patientId/alerts | Get patient alert history |

### Analyst
| Method | Path | Description |
|---|---|---|
| GET | /api/analyst/stats | Cross-patient stats (with demographic filters) |
| GET | /api/analyst/timeseries | Cross-patient timeseries (with demographic filters) |

### Admin
| Method | Path | Description |
|---|---|---|
| GET | /api/admin/users | List all users (filterable by role) |
| POST | /api/admin/users | Create user (all fields including addresses) |
| PUT | /api/admin/users/:id | Update user |
| DELETE | /api/admin/users/:id | Delete user |
| POST | /api/admin/associations | Assign doctor to patient |
| GET | /api/admin/associations | List all associations |
| PATCH | /api/admin/associations/:id/remove | Soft-deactivate association |
| PUT | /api/admin/users/:id | Update user (including password); system admin (admin@healthbridge.com) is protected from deletion |
| GET | /api/admin/contracts | List all doctor contracts |
| POST | /api/admin/contracts | Create contract (syncs maxPatients to User) |
| PUT | /api/admin/contracts/:id | Update contract |
| DELETE | /api/admin/contracts/:id | Delete contract |
| GET | /api/admin/contracts/report | Contract report with peak/avg patients per doctor |

### Device (stub for future)
| Method | Path | Description |
|---|---|---|
| GET | /api/devices/connections | List device connections |
| POST | /api/devices/connect | Register device connection |
| DELETE | /api/devices/connections/:id | Remove connection |

## Common Patterns

### Error Handling
Custom `AppError` class with statusCode + message. Global errorHandler middleware catches all.

### Validation
Use shared Zod schemas via `validate(schema, 'body'|'query'|'params')` middleware. Schemas live in `packages/shared/`.

### Authentication
`authenticate` middleware extracts JWT, attaches `req.userId` and `req.userRole`. `requireRole(...)` middleware for role-based access.

### Pagination
All list endpoints accept `page` (default 1) and `limit` (default 20, max 100). Response includes `{ data, pagination: { page, limit, total, totalPages } }`.

### Filtering
List endpoints accept `type`, `from`, `to` for type + date range filtering.

### Response Format
- Success: `data` or direct object, `pagination` when applicable
- Error: `{ error: "message" }` with appropriate HTTP status
- Delete: 204 No Content

## MongoDB Models
- User, Measurement, MeasurementTypeConfig, DeviceConnection, ApiKey, PatientDoctor, ChartConfig, PatientNote, AlertTemplate, AlertLog
- All models use `timestamps: true` (createdAt/updatedAt)
- User's password is auto-hashed via pre-save hook, stripped on toJSON
- User has email verification fields: `emailVerified`, `verificationToken`, `verificationExpires` (token also stripped on toJSON)
- Admin can update any user's password via `PUT /api/admin/users/:id` with `{ password }`
- System admin (admin@healthbridge.com) is protected from deletion

## Seeding the Database
```bash
npm run seed --workspace=packages/backend
```
Creates 8 measurement types, 9 users (admin, 2 doctors, analyst, 5 patients), patient-doctor associations, and ~750 sample measurements (30 days of data).

### Default Credentials
| Role | Email | Password |
|---|---|---|
| Admin | admin@healthbridge.com | admin1234 |
| Doctor | dr.smith@healthbridge.com | doctor1234 |
| Doctor | dr.jones@healthbridge.com | doctor1234 |
| Analyst | analyst@healthbridge.com | analyst1234 |
| Patient | patient1@example.com | patient1234 |

## Progress

### Done
- Monorepo structure with shared, backend, frontend packages
- All backend models: User, Measurement, MeasurementTypeConfig, PatientDoctor, DeviceConnection, ApiKey, ChartConfig, PatientNote, AlertTemplate, AlertLog
- Shared types and Zod validation schemas including alert/profile/note schemas
- Auth system: register, login, JWT refresh, role-based middleware, profile update endpoint (`PUT /api/auth/profile`)
- Patient-Doctor association: admin CRUD (`/api/admin/associations`), doctor add/reactivate/remove patients (`POST/PATCH/DELETE /api/doctor/patients`), admin create/update/delete users (`POST/PUT/DELETE /api/admin/users`)
- Dynamic measurement type CRUD (admin-only) with alert/danger thresholds
- Timeseries aggregation with configurable groupBy, field selection, and demographic filters
- Alert threshold evaluation on measurement creation
- Alert messaging system: AlertTemplate model, AlertLog model, channel interface (extensible), email channel (Nodemailer + Ethereal), processAlert called after createMeasurement, finds doctors via PatientDoctor, generates messages, sends email, logs result
- Patient notes: PatientNote model, GET/POST /api/doctor/patients/:patientId/notes, UI in DoctorPatients
- Doctor update patient profile: PUT /api/doctor/patients/:patientId/profile
- CSV import for measurements (POST /api/measurements/import + frontend UI in Measurements page)
- Analyst cross-patient stats/timeseries with filters
- Doctor endpoints: per-patient and aggregated timeseries/stats/notes
- Frontend: Login, Register, Dashboard (configurable chart), Measurements list (+ import), NewMeasurement (dynamic form), Profile (editable with all fields), AdminMeasurementTypes, AdminUsers (create user with all fields, inline edit, delete), DoctorPatients, AdminAssociations (select doctor/patient and assign), AdminAlertTemplates (view/edit templates)
- Seed script: 8 measurement types, 9 users, 5 associations, 700 measurements, 22 alert templates (7 types × 2 statuses alert/danger + 8 info templates)
- Navbar: admin links for Users, Types, Associations, Alerts
- System admin (admin@healthbridge.com) protected from deletion; admin can change any user's password via PUT /api/admin/users/:id with { password }
- Info notification templates (8 types) for opt-in new measurement notifications to doctors, plus createAlertTemplateSchema now supports 'info' status
- Alert log viewer for doctors: paginated GET /api/alerts/logs with filters, DoctorAlerts.tsx page, nav link, per-patient GET /api/doctor/patients/:patientId/alerts
- Email verification: User model fields (emailVerified, verificationToken, verificationExpires), emailService.ts, POST /api/auth/verify-email, POST /api/auth/resend-verification, VerifyEmail.tsx page, banner in Layout/Profile, sent on register and admin create
- Change password: dedicated POST /api/auth/change-password with oldPassword+newPassword validation, separate UI in Profile page
- Macrogroup field on MeasurementTypeConfig: backfill script (`scripts/backfillMacrogroups.ts`) mapped all 8 types to cardiac/blood_gas/generalhealth/lipidemia
- `User.maxPatients` field (doctor limit): enforced in `addPatient()`, visible/editable in AdminUsers create+edit forms
- `DoctorContract` model + admin CRUD + report with peak/avg patient calculation (7-day sampling), CSV export
- Doctor sidebar: patient names marked with red dot when `hasAlerts` (aggregated from AlertLog)
- Patient detail in DoctorPatients: shows grid of latest measurement per type (via `GET /doctor/patients/:patientId/latest-measurements`), chart below shows all historical data of selected type
- NewMeasurement page redesigned as gallery-style card grid (manual input or file upload per type)

### In Progress
- None currently

### Blocked / Needs Verification
- None currently

### Triaged / Future
- Export CSV/JSON endpoint
- Advanced charts / Looker Studio connector
- BigQuery sync, device OAuth (Fitbit, Google Fit), webhook endpoint

## Completed Features (Current Session)

### Render Deployment — Due Servizi (render.yaml)
- Sostituito Docker multi-stage build con due servizi nativi Render definiti in `render.yaml`:
  - **`patientshealthbridge-api`** — Node Web Service, Express backend su `https://patientshealthbridge-api.onrender.com`
  - **`patientshealthbridge-app`** — Node Web Service, frontend statico con `server.js` su `https://patientshealthbridge-app.onrender.com`
- Nomi univoci scelti per evitare suffissi casuali di Render
- `NODE_ENV=development npm install` nel build command per garantire installazione devDependencies (TypeScript)
- `VITE_API_URL` configurato sul frontend service per puntare all'API
- `APP_URL` configurato sul backend per CORS e link email

### CORS Multi-Origin
- `packages/backend/src/index.ts` — CORS cambiato da `origin: env.appUrl` (stringa singola) ad array con `['http://localhost:5173', env.appUrl]`, così funziona sia in dev che in prod

### TypeScript 6.0.3 + ignoreDeprecations
- Aggiornato TypeScript da `^5.5.0` a `6.0.3` (esatto) in tutti e tre i packages
- Aggiunto `"ignoreDeprecations": "6.0"` nei tsconfig di backend e frontend per silenziare l'errore TS5101 su `baseUrl`/`paths` (deprecati in TS 7.0)
- `baseUrl`/`paths` mantenuti per risolvere `@healthbridge/shared` (necessario con npm workspaces)

### Frontend VITE_API_URL
- Aggiunto `VITE_API_URL` env var support in `src/api/client.ts`
- `const API_BASE = import.meta.env.VITE_API_URL || ''`; defaults to empty (same-origin `/api` per dev via Vite proxy)
- Applicato sia a `baseURL` che al refresh interceptor

### Backend SPA Serving Removed
- Rimosso `express.static` serving del frontend dist e catch-all `*` route da `src/index.ts`
- Rimossi import `path` e `fileURLToPath` inutilizzati

### Macrogroup Backfill Script
- `packages/backend/scripts/backfillMacrogroups.ts` — mappa tutte le 8 chiavi measurement type a un macrogroup (cardiac/blood_gas/generalhealth/lipidemia)
- Aggiunto script npm: `npm run backfill:macrogroups --workspace=packages/backend`

### Doctor maxPatients + DoctorContract
- `User.maxPatients` aggiunto al model User, allo shared type IUser e agli Zod schemas
- `DoctorContract` model (doctorId, startDate, endDate, maxPatients, fee, currency, notes, status)
- Admin CRUD per contratti su `/api/admin/contracts` con autosync di `User.maxPatients`
- Report con peak/avg patients + CSV export su `/api/admin/contracts/report`
- Frontend: `AdminContracts.tsx` (modal CRUD), `AdminContractReport.tsx` (date range + tabella + export)
- `AdminUsers.tsx`: colonna maxPatients in tabella, campo edit/crea (solo per ruolo doctor)
- Seed: `maxPatients: 2` per dr.smith e dr.jones

### Alert Dot nella Doctor Dashboard
- `GET /api/doctor/patients` ora restituisce `hasAlerts: bool` per ogni paziente (aggregato da AlertLog)
- Frontend: pallino rosso accanto ai nomi dei pazienti con alert attivi

### Latest-per-Type per Doctor
- Nuovo endpoint `GET /api/doctor/patients/:patientId/latest-measurements` che raggruppa per type e restituisce l'ultima misurazione
- Frontend: griglia di card "Latest Measurements" nel pannello dettaglio paziente (al posto della tabella flat precedent)

### NewMeasurement Gallery
- Redesign completo: griglia responsive di card (una per tipo misurazione)
- Ogni card espandibile con due modalità: Manual (input numerico + unità) e Upload (drag & drop file CSV/immagine)
- Bottone Save/Upload individuale per card con feedback visivo

## Future Phases
- **Phase 2**: Export CSV/JSON endpoint, advanced charts, Looker Studio Community Connector
- **Phase 3**: BigQuery sync, device OAuth integrations (Fitbit, Google Fit), webhook endpoint
