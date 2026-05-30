# HealthBridge Sample CSVs

These CSV files contain sample patient measurements for testing the CSV import feature.

## Files

| File | Type Key | Fields | Description |
|---|---|---|---|
| `blood_pressure.csv` | `blood_pressure` | `systolic`, `diastolic` | Blood pressure readings (mmHg) |
| `glucose.csv` | `glucose` | `value` | Glucose level readings (mg/dL) |
| `heart_rate.csv` | `heart_rate` | `value` | Heart rate readings (bpm) |

## How to Use

1. Log in as a patient (e.g., `patient1@example.com` / `patient1234`).
2. Navigate to **Measurements** → **New Measurement**.
3. Find the measurement type card you want to import, click it to expand, then switch to **Upload** mode.
4. Select the corresponding CSV file and click **Upload**.
5. The system will parse and import all rows at once.

## CSV Format

The import endpoint (`POST /api/measurements/import`) expects:

| Requirement | Details |
|---|---|
| **Header** | First column must be `data_ora`. Remaining columns must match the field keys of the measurement type. |
| **data_ora** | ISO 8601 timestamp (e.g., `2026-05-28T08:30:00Z`) |
| **Field values** | Numeric values only (integers or decimals). Use `.` as decimal separator. |
| **Empty lines** | Automatically skipped. |
| **Units** | Not specified in CSV — the system uses the default unit from the measurement type config. |

### Example (`blood_pressure.csv`)
```csv
data_ora,systolic,diastolic
2026-05-28T08:30:00Z,118,76
2026-05-29T12:15:00Z,132,85
```

### Field Keys by Type

| Measurement Type | Field Keys | Default Unit |
|---|---|---|
| `blood_pressure` | `systolic`, `diastolic` | mmHg |
| `glucose` | `value` | mg/dL |
| `heart_rate` | `value` | bpm |
| `cholesterol` | `total`, `hdl`, `ldl` | mg/dL |
| `weight` | `value` | kg |
| `temperature` | `value` | °C |
| `spo2` | `value` | % |
| `respiratory_rate` | `value` | bpm |
