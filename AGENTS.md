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
| PUT | /api/doctor/patients/:patientId/profile | Update patient profile |
| GET | /api/doctor/patients/:patientId/medications | List patient medications |
| POST | /api/doctor/patients/:patientId/medications | Create prescription |
| PUT | /api/doctor/patients/:patientId/medications/:id | Update prescription |
| DELETE | /api/doctor/patients/:patientId/medications/:id | Delete prescription |
| POST | /api/doctor/patients/:patientId/reset-password | Reset patient password |
| GET | /api/doctor/export/csv | Export patients' measurements as CSV (type, from, to, demographic filters) |

### Analyst
| Method | Path | Description |
|---|---|---|
| GET | /api/analyst/stats | Cross-patient stats (with demographic filters) |
| GET | /api/analyst/timeseries | Cross-patient timeseries (with demographic filters) |
| GET | /api/analyst/export/csv | Export cross-patient measurements as CSV (type, from, to, demographic filters) |

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

### Tickets
| Method | Path | Description |
|---|---|---|
| POST | /api/tickets | Create ticket (doctor only) |
| GET | /api/tickets/mine | List my tickets |
| GET | /api/tickets/:id | Get single ticket |
| GET | /api/admin/tickets | List all tickets (admin only) |
| PUT | /api/admin/tickets/:id | Update ticket (admin only — status, assignee, notes) |
| GET | /api/admin/tickets/stats | Ticket stats (admin only) |

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
- User, Measurement, MeasurementTypeConfig, DeviceConnection, ApiKey, PatientDoctor, ChartConfig, PatientNote, AlertTemplate, AlertLog, Prescription, MedicationLog, Ticket
- All models use `timestamps: true` (createdAt/updatedAt)
- User's password is auto-hashed via pre-save hook, stripped on toJSON
- User has email verification fields: `emailVerified`, `verificationToken`, `verificationExpires` (token also stripped on toJSON)
- Admin can update any user's password via `PUT /api/admin/users/:id` with `{ password }`
- System admin (admin@healthbridge.com) is protected from deletion
- Prescription model: drugName, dosage, frequency, route, schedule (time + daysOfWeek), startDate, endDate, notes, active
- MedicationLog model: prescriptionId, patientId, takenAt, scheduledTime, notes
- Ticket model: ticketNumber (auto TKT-NNNN), userId, type, severity, status, assigneeId, adminNotes

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
- All backend models: User, Measurement, MeasurementTypeConfig, PatientDoctor, DeviceConnection, ApiKey, ChartConfig, PatientNote, AlertTemplate, AlertLog, Prescription, MedicationLog, Ticket
- Shared types and Zod validation schemas including alert/profile/note/medication/ticket schemas
- Auth system: register, login, JWT refresh, role-based middleware, profile update endpoint, set-password, change-password, reset-password
- Patient-Doctor association: admin CRUD, doctor add/reactivate/remove patients, admin create/update/delete users, reset-password admin & doctor
- Dynamic measurement type CRUD (admin-only) with alert/danger thresholds
- Timeseries aggregation with configurable groupBy, field selection, and demographic filters
- Alert threshold evaluation on measurement creation
- Alert messaging system: AlertTemplate model, AlertLog model, channel interface, email channel (Nodemailer + Ethereal), processAlert after createMeasurement
- Patient notes: PatientNote model, GET/POST /api/doctor/patients/:patientId/notes, UI in DoctorPatients
- Doctor update patient profile: PUT /api/doctor/patients/:patientId/profile
- CSV import for measurements (POST /api/measurements/import + frontend UI)
- Analyst cross-patient stats/timeseries with filters
- Doctor endpoints: per-patient and aggregated timeseries/stats/notes/trends
- Frontend: Login, Register, Dashboard (configurable chart), Measurements list (+ import), NewMeasurement (gallery), Profile (all fields), AdminMeasurementTypes, AdminUsers (inline edit), DoctorPatients (trends, cronologia misure), AdminAssociations, AdminAlertTemplates, DoctorAlerts, AdminContracts, AdminContractReport, DoctorPatientMedications, DoctorTickets, AdminTickets, MobileMeasurement, Help
- Seed script: 8 measurement types, 9 users, 5 associations, 700 measurements, 22 alert templates, GdprConsent, metric-only height/weight
- Navbar: sottomenu dropdown per ruolo, logout a sinistra, link Guida in Profilo, id per guide
- System admin (admin@healthbridge.com) protected from deletion
- Email verification: User model fields, emailService.ts, verify/resend endpoints, VerifyEmail page, banner in Layout/Profile
- Macrogroup field on MeasurementTypeConfig: backfill script mapped 8 types
- `User.maxPatients` field + `DoctorContract` model + admin CRUD + report with peak/avg
- Doctor sidebar: patient names with red dot when `hasAlerts`
- Patient detail: latest-per-type grid + trend icons + historical chart + month navigation table
- NewMeasurement: gallery-style card grid, AI extraction per type checkbox, `?forPatient=<id>` query param
- **Navbar ridisegnata**: dropdown a comparsa per ruolo, mobile hamburger + sezioni expandibili, "Esci" a sinistra (desktop icona+testo, mobile fondo con separatore)
- **MobileMeasurement.tsx**: schermata mobile standalone full-screen per pazienti, galleria tra tipi, Prec/Succ, input campi+unità+note, senza Navbar
- **Fix interceptor 401**: skip refresh/redirect per route `/auth/*`
- **Trend backend**: `patientLatestMeasurements` con `$push` + `$arrayElemAt[1]` per previousValues e trends
- **Cronologia misure**: pannello inline dopo chart, navigazione mesi, tabella dinamica
- **Reset password admin**: POST `/api/admin/users/:id/reset-password` + modale frontend
- **Reset password dottore**: POST `/api/doctor/patients/:patientId/reset-password` + pulsante header
- **Sistema Farmaci/Prescrizioni full stack**: IPrescription/PrescriptionTime/IMedicationLog types, Zod schemas, Prescription/MedicationLog models, medicationController CRUD + dueMedications + takeMedication, DoctorPatientMedications.tsx CRUD, Dashboard "I Miei Farmaci" con "Preso" + polling 60s, Notification categoria `'medication'`
- **Anamnesi farmacologica strutturata**: IFarmacologicaEntry `{ text, isCurrent }`, checkbox Terapia Attuale/Precedente in DoctorPatients + Dashboard badge verde/grigio
- **Gate GDPR rimosso**: verifyGdprConsent rimossa da doctorController.ts, gdprBlocked rimosso da DoctorPatients.tsx, Privacy.tsx sezione 8 aggiornata (art. 9(2)(h))
- **Sistema Ticket**: ITicket types (ticketNumber, severity, status), Ticket model, ticketController (create, myTickets, allTickets, update, stats), DoctorTickets.tsx (form + lista), AdminTickets.tsx (tabella + filtri + modale edit)
- **Guide interattive (driver.js)**: libreria driver.js@1.4.0, doctorGuide.ts (15 step), patientGuide.ts (9 step), GuideButton.tsx, Help.tsx, Navbar link "Guida", id su elementi chiave
- **Fix GuideButton — navigazione tra pagine**: `GuideButton` spostato in `Navbar.tsx` (desktop accanto a Esci, mobile prima del separatore) invece di essere solo in `Help.tsx`. Ora la guida sopravvive al cambio pagina perché Navbar è sempre montata.
- **CSV export endpoint**: `GET /api/analyst/export/csv` e `GET /api/doctor/export/csv` — esporta misurazioni in formato CSV con filtri (type, from, to, sesso, età, indirizzo). Colonne dinamiche in base ai field keys del tipo. Usabile da Google Sheets via `=IMPORTDATA(url)`. Headers: `Content-Type: text/csv`, `Content-Disposition: attachment`.
- **AI estrazione — auto-creazione nuovi tipi misurazione**: IA ora estrai TUTTI i valori medici (non solo tipi noti). Se un tipo non esiste in `MeasurementTypeConfig`, viene creato automaticamente con `active: false`, `category: "Auto-Estratto"`, `macrogroup: "Auto-Estratto"`. Frontend mostra badge `🆕 Nuovo` e nota informativa. L'admin deve attivare il tipo per renderlo visibile.
- **BMI display + storico grafico**: backend endpoint `GET /api/patient/bmi/timeseries` (calcola BMI storico usando ultima altezza + pesi nel tempo), frontend card con BMI attuale + sparkline in DoctorPatients.tsx (`#patient-bmi-section` prima di `#latest-measurements`) e Dashboard.tsx. Seed aggiornato con misure di altezza per tutti i pazienti.
- **Pagina Analisi multi-misura**: nuova pagina `/analisi` in Strumenti per dottore e analista. Seleziona più tipi misurazione con aggregazione per-type, confronta pazienti (sovrapposto o separato), linee KPI con aree colorate (ReferenceArea), trend SMA/regressione lineare, date range selezionabile, e salvataggio/caricamento configurazioni. Nessuna modifica backend — chiama endpoint timeseries esistenti in parallelo e mergea i risultati.

### In Progress
- (none)

### Blocked
- (none)

### Triaged / Future
- Advanced charts / Looker Studio Community Connector
- BigQuery sync, device OAuth (Fitbit, Google Fit), webhook endpoint
- Notifiche push per richieste condivisione e conferma presa in carico

## Completed Features (Current Session)

### Elementi Guide Completati con ID
- **Navbar.tsx**: funzione `item(label, to, id?)` accetta parametro `id`; aggiunti `#alerts-link`, `#import-link`, `#tickets-link` nei dropdown Strumenti (desktop e mobile)
- **DoctorPatients.tsx**: aggiunti id a sezioni chiave: `#sidebar-patients`, `#patient-actions`, `#patient-medications`, `#patient-notes`, `#patient-anamnesis`, `#latest-measurements`
- **Dashboard.tsx**: aggiunti `#patient-chart-section`, `#patient-my-doctors`, `#patient-anamnesis-section`, `#patient-medications-section`
- **doctorGuide.ts**: step `#patient-chart` → `#chart-section` (corrisponde all'id reale già presente)

### Traduzioni Dashboard.tsx Completate
- `#patient-chart-section`: placeholder "Loading chart..." → "Caricamento grafico...", "Select a measurement type..." → "Seleziona un tipo per visualizzare il grafico"
- `#patient-my-doctors`: titolo "My Doctors" → "I Miei Dottori"

### Pagina Analisi Multi-Misura
- **Nuova pagina `/analisi`**: accessibile da menu Strumenti per dottori e analisti
- **Scope selezionabile**: paziente singolo, confronto multi-paziente, o aggregato (con filtri demografici per analista)
- **Multi-tipo con aggregazione per-type**: ogni tipo misurazione ha la propria select Media/Minimo/Massimo
- **Confronto pazienti**: seleziona 2+ pazienti, visualizzazione sovrapposta (stesso chart) o separata (un chart per paziente)
- **KPI bands**: `ReferenceArea` colorate (verde range normale, giallo alert, rosso danger) basate su `alertMin/Max` e `dangerMin/Max` del MeasurementTypeConfig
- **Trend**: media mobile (SMA con finestra configurabile) o regressione lineare, renderizzata come linea tratteggiata
- **Date range**: input Da/A selezionabili
- **Salvataggio configurazioni**: salva/carica/elimina configurazioni multi-tipo espanse (ChartConfig esteso con `types`, `typeAggregations`, `showKpi`, `showTrend`, `scopeMode`, ecc.)
- **Zero modifiche backend**: chiama `Promise.all` sugli endpoint timeseries esistenti e mergea i risultati lato client
- **File**: `MultiTypeChart.tsx`, `Analisi.tsx`, `Navbar.tsx` (link), `App.tsx` (route), `ChartConfig.ts` (model esteso), `chart.ts`/`schemas.ts` (shared types estesi)

### BMI Card + Grafico Storico
- **Backend**: nuovo `GET /api/patient/bmi/timeseries` — calcola BMI storico usando ultima altezza nota + ogni peso nel tempo, con supporto `from`/`to` query params
- **DoctorPatients.tsx**: BMI card spostata da `#patient-actions` a `#patient-bmi-section` (prima di `#latest-measurements`), con sparkline Recharts (120px, linea blu, tooltip data+BMI)
- **Dashboard.tsx**: stesso componente BMI aggiunto per il paziente (prima di `#patient-chart-section`), visibile solo per ruolo `patient`
- **Seed**: aggiunte misure di altezza una tantum per ogni paziente (prima del loop dei 30 giorni), con valori realistici (160-182 cm)
Le annotazioni/issues sono in `todo/` (locale, non versionato).

## Future Phases
- **Phase 3**: BigQuery sync, device OAuth integrations (Fitbit, Google Fit, Samsung Health), webhook endpoint
- **Notifiche push**: per richieste di condivisione e conferma presa in carico
- **Integrazione Samsung Health (API REST)**: previa approvazione Samsung Developer Program. OAuth 2.0, sync automatico su `DeviceConnection` (provider `'samsung'`) di pressione, battito, peso, glucosio, SpO₂, passi. Endpoint backend `/api/devices/samsung/*`, frontend in Profile con stato connessione e "Sincronizza ora"
- **Integrazione Fitbit Web API** (alternativa self-service senza partnership): stessa architettura di Samsung ma OAuth immediato via `dev.fitbit.com`
