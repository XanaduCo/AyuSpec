# Wearables Ingestion

All wearable data flows through [Open Wearables](../open-wearables.md) — the self-hosted ingestion layer. Two provider tiers are available:

| Tier | Providers | Data residency | Cost |
|------|-----------|---------------|------|
| **Open Wearables (default)** | 13 | Your server only | Infrastructure only |
| **Terra Bridge (optional, paid)** | 50+ | Transits Terra's cloud → lands locally | Terra per-connection fee |

Choose Terra Bridge only if you need a device that Open Wearables doesn't cover and you accept that wearable data will transit Terra's infrastructure before landing in your local store. See [Open Wearables](../open-wearables.md#terra-bridge-optional-paid) for detail.

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

| Device | Gate | Notes |
|---|---|---|
| Garmin | Developer program currently suspended | FIT file export → local parse as fallback; available via Terra Bridge |
| Dexcom / CGM | Formal developer agreement required | Route CGM through Apple Health export (Open Wearables); available via Terra Bridge |
| Fitbit / Google Fit | OAuth, open program | Direct API via Open Wearables |

### Terra Bridge — unlocking gated devices

For Garmin and Dexcom/CGM, where a formal developer agreement gates direct API access, Terra Bridge provides an alternative. Terra holds the necessary developer agreements and exposes a unified API. When a user enables Terra Bridge for a specific provider:

1. Terra fetches data from the wearable vendor API on the user's behalf
2. Terra routes the data to the user's local Open Wearables instance via webhook
3. The data is ingested and stored locally; it does not persist in Terra's infrastructure beyond the transit

**What the user accepts:** wearable data for Terra-bridged providers transits Terra's cloud. Terra's ToS permits aggregating de-identified analytics from transit data. This is an informed tradeoff — not a default.

Terra Bridge is an optional paid add-on. Pricing follows Terra's per-user/per-connection model.

Delivery to the local webhook does not guarantee every Terra field is stored — data lands only where a `SeriesType` mapping exists. See the [Terra Bridge ingestion contract](../open-wearables.md#terra-bridge-ingestion-contract) for the coverage matrix and known gaps (notably nutrition).

## Deduplication

Oura and Apple Health both report steps, heart rate, sleep. The deduplication policy:

1. Source priority order (configurable): Oura > Whoop > Apple Health > Garmin for their primary signals
2. For non-overlapping signals (e.g., Whoop recovery score), no deduplication needed
3. When both sources report the same LOINC code for the same time window, keep the higher-confidence source and log the discard

## Schema notes

*Detailed FHIR mapping table to be completed during storage spec work.*
