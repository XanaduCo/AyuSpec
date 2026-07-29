# Open Wearables vs Terra: Comparison

## What is Open Wearables?

Open Wearables is a self-hosted, open-source platform that aggregates health data from multiple wearable devices into a single unified REST API. Instead of integrating separately with each device manufacturer, you run one server that normalizes everything. Built with FastAPI (Python), React 19 + TypeScript, PostgreSQL + Redis + Celery, supporting 13 providers.

## Core Difference

| | Open Wearables | Terra Bridge (optional add-on) |
|--|----------------|-------------------------------|
| **Hosting** | Self-hosted | Managed SaaS |
| **Source** | Open source | Closed source |
| **Cost** | Infrastructure only | Per-user/per-connection fee |
| **Data residency** | Your server only | Transits Terra's cloud → lands locally |
| **Providers** | 13 | ~50+ |
| **Mobile** | SDK — you build the app | Drop-in hosted widget |
| **Support** | Community | Enterprise SLAs |
| **Recommended use** | Default for all users | Optional add-on for gated providers only |

Open Wearables is the default path — zero data transit. Terra Bridge is an optional paid add-on for providers that Open Wearables cannot reach without a formal developer agreement. The two can run side-by-side: Open Wearables handles all open-program providers (Oura, Whoop, Polar, Fitbit, Strava) while Terra Bridge covers gated providers (Garmin while the program is suspended, Dexcom, Abbott Libre).

**What the user accepts with Terra Bridge:** wearable data for Terra-bridged providers transits Terra's cloud before landing locally. Terra's ToS permits de-identified analytics on transit data. ayuOS requires explicit per-provider consent before enabling Terra Bridge for any device.

## Data Variables

Open Wearables supports ~80+ metric types across:

- **Heart & Cardiovascular** — HR, HRV (SDNN + RMSSD), walking HR, HR recovery
- **Blood & Respiratory** — SpO2, blood glucose, blood pressure, respiratory rate, AFib burden, breathing disturbance index, BAC, pulmonary function (FVC, FEV1, PEFR)
- **Body Composition** — weight, height, BMI, body fat %, lean mass, body/skin temperature + deviation, waist circumference, skeletal muscle mass
- **Fitness** — VO2 max, 6-min walk test, cardiovascular age
- **Activity** — steps, calories, basal energy, stand time, flights, MET
- **Walking Biomechanics** — step length, speed, asymmetry %, double support %, steadiness, stair ascent/descent speed
- **Running Biomechanics** — power, vertical oscillation, ground contact time, stride length, vertical ratio, stance balance
- **Swimming** — stroke count, underwater depth
- **Environmental** — UV, audio exposure, daylight time, weather, elevation, GPS
- **Provider-Specific** — Garmin body battery, stress score, fitness age
- **Other** — electrodermal activity, insulin delivery, hydration, falls count

## What Terra Has That Open Wearables Doesn't

| Gap | Detail |
|-----|--------|
| **Nutrition** | Full macro/micronutrient data from food logging apps (Cronometer, MyFitnessPal, Noom). OW has only `hydration` on main — but a full implementation (meals, macros, calorie budgets) exists on the unmerged `coachboard-v2` branch. |
| **Direct CGM** | Dexcom and Abbott/Libre as first-party integrations, not routed through Apple Health or Ultrahuman |
| **Withings** | Direct integration with Withings smart scales, blood pressure cuffs, thermometers |
| **Provider breadth** | ~50+ vs 13 — covers more niche devices (Cronometer, Eight Sleep, Peloton, etc.) |

## How Open Wearables Adds Variable Support

Purely engineering-driven and open source. Adding a new metric requires:
1. Adding an entry to the `SeriesType` enum in `series_types.py` with a stable integer DB ID
2. A database migration for the new ID
3. Mapping it in whichever provider strategy emits that data

No commercial partnership layer — if a provider exposes a field, any contributor can map it. The tradeoff is it only happens when someone cares enough to do it.

## The Real Differentiator: Developer Agreements

The most durable Terra advantage isn't data types — it's **access**. Some providers require a formal developer agreement (or have closed/suspended their developer programs), which a commercial entity like Terra is better positioned to hold:

| Provider | Status | Notes |
|----------|--------|-------|
| **Garmin** | ⚠️ Suspended | Garmin's developer program is currently closed to new applicants. OW's Garmin integration works for existing developer accounts but new deployments cannot get API credentials. |
| **Dexcom / Abbott (CGM)** | ❌ Agreement required | Medical-grade CGM APIs require formal developer agreements. Terra likely holds these; an open-source project can apply but manufacturers are more selective. |
| **Renpho** | ⚠️ Unofficial only | No official developer API. The community has reverse-engineered the backend (`renpho.qnclouds.com`, email/password auth). A Python client ([`renpho-api`](https://pypi.org/project/renpho-api/)) and Home Assistant integration exist. Terra's Renpho support almost certainly uses this same approach. Fragile — Renpho can break it at any time. |

For providers **without** such restrictions (Whoop, Oura, Polar, Suunto, Fitbit, Strava, Google), OW is on equal footing with Terra. Anyone can apply for those developer programs.

## Does Terra Have a Permanent Advantage?

**For developer-agreement-gated providers, yes in practice:**

- **Garmin** — OW has the integration built and fully functional, but you cannot get new API credentials right now. If Garmin reopens their program, this gap closes immediately.
- **Direct CGM** (Dexcom, Abbott/Libre) — requires formal agreements; Terra as a commercial entity is better positioned to hold these.
- **Nutrition data** — not a structural gap; the `coachboard-v2` branch has a full implementation pending merge.
- **Proprietary scores** (Whoop recovery, Oura readiness, Garmin body battery) — depend entirely on what providers expose. OW already maps most of these.

**Where OW can catch up or lead:**

- Any provider with an open developer program can be added by contributors
- Self-hosted means you can integrate unofficial APIs (like Renpho's reverse-engineered endpoint) without Terra's liability concerns around unsanctioned API usage
- OW has niche metrics Terra doesn't normalize (detailed pulmonary function, environmental audio, granular walking biomechanics)

**Bottom line:** The real divide is **developer-agreement-gated providers** — Garmin (currently suspended), Dexcom, Abbott. For everything else, OW is functionally equivalent and closeable on the gaps that remain.

## Renpho: Direct Integration Is Possible

Renpho has no official developer API, but the community has reverse-engineered it:

- REST endpoint at `renpho.qnclouds.com`, email + password auth (no OAuth)
- [`renpho-api`](https://pypi.org/project/renpho-api/) Python client on PyPI — fetches weight + full body composition
- [`hass-renpho`](https://github.com/neilzilla/hass-renpho) Home Assistant integration using the same approach
- An [MCP server](https://github.com/StartupBros-com/renpho-mcp-server) for querying Renpho data from Claude/Cursor
- Terra's own Renpho integration likely uses this same unofficial endpoint

A native OW provider for Renpho is feasible — the Python client exists and the strategy pattern is well-defined. Risk: Renpho can change their backend at any time.

## Your Devices

| Device | Open Wearables | Notes |
|--------|---------------|-------|
| **Garmin** | ⚠️ Supported but gated | Integration is complete; Garmin's developer program is currently suspended for new applicants |
| **Whoop** | ✅ Fully supported | OAuth 2.0, recovery/sleep/HRV, real-time webhooks |
| **FreeStyle Libre (CGM)** | ⚠️ Indirect | Via Apple Health (iOS) or Ultrahuman Ring Air; direct Abbott integration requires developer agreement |
| **Renpho Scale** | ⚠️ Indirect or unofficial | Via Apple Health / Google Health Connect, or a custom integration using the reverse-engineered API |
