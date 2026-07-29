# Wearables Ingestion

## Devices (P0)

### Oura

- **Method:** Personal Access Token (PAT) — self-serve, instant
- **API:** Oura Cloud API v2 (`https://api.ouraring.com/v2/`)
- **Data pulled:** sleep, readiness, activity, heart rate, HRV, SpO2, temperature
- **Schedule:** Daily pull; backfill on first connect
- **FHIR mapping:** `Observation` resources with LOINC codes where available; proprietary codes with system `https://ouraring.com/codes` otherwise

### Whoop

- **Method:** OAuth 2.0 app — requires Whoop developer app registration (days, possible review)
- **API:** Whoop Developer API v1
- **Data pulled:** recovery score, strain, sleep, HRV, respiratory rate
- **Schedule:** Daily pull
- **FHIR mapping:** Same pattern as Oura

### Apple Health (export path)

Apple Health live sync requires an Apple Developer account ($99/yr) and HealthKit provisioning. For MVP, the manual export path is used instead. See [Apple Health](apple-health.md).

## Devices (P1 / later)

| Device | Gate | Fallback |
|---|---|---|
| Garmin | B2B-oriented API, slow approval | FIT file export → local parse |
| Dexcom / CGM | Sandbox instant; production review | Route CGM through Apple Health export |
| Fitbit / Google Fit | OAuth | Direct API |

## Deduplication

Oura and Apple Health both report steps, heart rate, sleep. The deduplication policy:

1. Source priority order (configurable): Oura > Whoop > Apple Health > Garmin for their primary signals
2. For non-overlapping signals (e.g., Whoop recovery score), no deduplication needed
3. When both sources report the same LOINC code for the same time window, keep the higher-confidence source and log the discard

## Schema notes

*Detailed FHIR mapping table to be completed during storage spec work.*
