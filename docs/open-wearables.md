# Open Wearables

Open Wearables is the wearable ingestion layer for ayuOS. It is a self-hosted, open-source platform that aggregates health data from multiple wearable devices into a single unified REST API — rather than integrating separately with each device manufacturer, one server normalizes everything.

- **Stack:** FastAPI (Python), React 19 + TypeScript, PostgreSQL + Redis + Celery
- **Providers:** 13 supported
- **Repo:** [XanaduCo/open-wearables](https://github.com/XanaduCo/open-wearables)
- **Evaluation:** [Open Wearables vs Terra](evaluations/open-wearables-vs-terra.md)

---

## Open Wearables vs Terra

Terra is the main commercial alternative — a managed SaaS wearable data aggregator.

| | Open Wearables | Terra Bridge (optional) |
|--|----------------|------------------------|
| **Hosting** | Self-hosted | Managed SaaS |
| **Source** | Open source | Closed source |
| **Cost** | Infrastructure only | Per-user/per-connection fee |
| **Data residency** | Your server only | Transits Terra's cloud → lands locally |
| **Providers** | 13 | ~50+ |
| **Mobile** | SDK — you build the app | Drop-in hosted widget |
| **Support** | Community | Enterprise SLAs |
| **Recommended use** | Default for all users | Optional add-on for gated providers (Garmin, Dexcom) |

**Open Wearables** is the default and preferred path. Zero data transit; fully self-hosted; open source.

**Terra Bridge** is an optional paid add-on for users who need providers only Terra can access (Garmin while the developer program is suspended, Dexcom/CGM under formal agreement). Data transits Terra's cloud in transit, then lands in the user's local Open Wearables instance. Terra's ToS permits de-identified analytics on transit data — users who enable Terra Bridge accept this tradeoff explicitly.

The two are not mutually exclusive. A user can run Open Wearables for Oura, Whoop, and Polar (zero transit) and add Terra Bridge only for Garmin (transit accepted).

---

## Terra Bridge (optional, paid)

Terra Bridge is a paid integration layer that routes data from Terra-connected providers into the user's local Open Wearables instance. It exists specifically to reach providers that require formal developer agreements that an open-source project cannot hold (or where the program is currently suspended).

**How it works:**

1. User enables Terra Bridge in ayuOS settings and pays Terra's per-connection fee
2. Terra authenticates with the wearable vendor on the user's behalf (OAuth)
3. Terra delivers data to the user's local Open Wearables webhook endpoint
4. Data is stored locally; Terra does not retain it beyond delivery

**Providers accessible only via Terra Bridge (in the current Open Wearables tier):**

| Provider | Reason |
|----------|--------|
| Garmin | Developer program suspended for new applicants |
| Dexcom | Formal developer agreement required |
| Abbott Libre | Formal developer agreement required |
| Eight Sleep | Closed / agreement required |

**What the user accepts:** wearable data for these providers transits Terra's cloud. Terra's ToS permits aggregating de-identified analytics from transit data. ayuOS surfaces this clearly before the user enables Terra Bridge for any provider.

**Fallback for Garmin:** FIT file export → local parse remains available as a zero-transit alternative for historical data.

---

## Supported data variables

~80+ metric types across:

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

---

## Gaps vs Terra

| Gap | Detail |
|-----|--------|
| **Nutrition** | Full macro/micronutrient data from food logging apps (Cronometer, MyFitnessPal, Noom). OW has only `hydration` on main — but a full implementation exists on the unmerged `coachboard-v2` branch. |
| **Direct CGM** | Dexcom and Abbott/Libre as first-party integrations, not routed through Apple Health or Ultrahuman |
| **Withings** | Direct integration with Withings smart scales, blood pressure cuffs, thermometers |
| **Provider breadth** | ~50+ vs 13 — Terra covers more niche devices (Cronometer, Eight Sleep, Peloton, etc.) |

---

## Terra Bridge ingestion contract

Terra Bridge delivering data to a local webhook does **not** by itself guarantee that
every field Terra sends is stored. Terra data lands in Open Wearables through the same
path as any other provider: a provider strategy maps incoming fields onto the
[`SeriesType` catalog](#the-real-differentiator-developer-agreements). A Terra field with no
corresponding `SeriesType` has nowhere to go.

So the answer to *"can Open Wearables ingest everything Terra sends?"* is:
**most of it, but not everything, and only what has been explicitly mapped.**

### The mapping model

The target schema is the `SeriesType` catalog — ~80+ integer-ID metric types, data stored
as normalized time-series keyed by SeriesType (per user, per provider). Terra normalizes
its providers into its own payload categories (Activity, Body, Daily, Sleep, Nutrition,
Menstruation, plus nested workout/session structures). Ingesting Terra losslessly requires
a Terra strategy that maps every Terra field to a `SeriesType` — and where no `SeriesType`
exists, one must be added (enum entry + migration) before that field can be stored.

### Terra payload → OW coverage matrix

Cells marked `[U]` are unverified against the current OW code (`series_types.py`, the Terra
strategy, the `coachboard-v2` branch) and must be confirmed before this table is treated as
authoritative — see [Open questions](#open-questions-terra-ingestion) below.

| Terra payload category | Terra provides | OW `SeriesType` exists? | Status | Gap-closing work |
|---|---|---|---|---|
| **Body** (HR, HRV, SpO2, glucose, temp, body composition) | Scalar biometrics + samples | Yes — broad overlap | Lossless `[U]` | Confirm field-level mapping completeness |
| **Daily** (steps, calories, distance, active durations, stress) | Daily summaries + intraday samples | Yes for most | Lossless `[U]` | Confirm intraday-sample granularity is preserved |
| **Sleep** (durations, stages, HRV, respiration) | Summary + hypnogram | Partial | Summary maps; **hypnogram sequence** `[U]` | Decide stage-sequence representation (see nested note) |
| **Activity / Workout** (sessions, laps, GPS, power) | Nested session objects | Partial | Scalar streams map; **laps/GPS/session structure** likely dropped | Structured session modeling (see nested note) |
| **Nutrition** (meals, macros, micros, calorie budgets) | Full food-log data | **No on `main`** (only `hydration`) | **Dropped** | Merge `coachboard-v2` (adds nutrition SeriesTypes) + Terra-nutrition mapping |
| **Menstruation** (cycle, flow, symptoms) | Cycle data | `[U]` | `[U]` | Confirm SeriesTypes exist; add if not |
| **Provider-specific scores** (readiness, recovery, body battery) | Vendor scores | Mostly yes | Lossless `[U]` | Per-score confirmation |

### Unmapped-field policy

Open Wearables' governing rule is "if a provider exposes a field, someone has to map it" —
there is no generic catch-all bucket, so an **unmapped Terra field is dropped, not stored as
unknown.** Whether dropped fields should instead be *logged* (for observability) or
*persisted raw* (so historical data isn't lost before a mapping exists) is an open design
decision, not current behavior. Until decided, assume silent drop for anything not in the
matrix above.

### Nested / session data

The `SeriesType` model is oriented to **scalar metric streams**. Terra's nested payloads —
workout sessions with laps and GPS sample arrays, sleep with a full hypnogram — do not map
cleanly to scalar time-series and risk lossy flattening. Capturing them faithfully likely
needs dedicated structured storage rather than more `SeriesType` entries; see
[Storage](storage.md).

### Open questions — Terra ingestion

- [ ] Does a Terra ingestion strategy already exist in the OW repo, and how complete is its field mapping?
- [ ] Unmapped-field policy: drop silently, log, or raw-store-for-later-mapping?
- [ ] Is merging `coachboard-v2` sufficient for Terra nutrition, or is a separate Terra-nutrition mapping also required on top?
- [ ] How are Terra's nested session structures (laps, GPS, sleep stages) represented — flattened to SeriesTypes, or modeled as structured resources in the [storage layer](storage.md)?

---

## The real differentiator: developer agreements

The most durable Terra advantage isn't data types — it's **access**. Some providers require a formal developer agreement (or have closed their programs), which a commercial entity is better positioned to hold.

| Provider | Status | Notes |
|----------|--------|-------|
| **Garmin** | ⚠️ Suspended | Garmin's developer program is currently closed to new applicants. The OW integration is complete and works for existing developer accounts, but new deployments cannot get API credentials. |
| **Dexcom / Abbott (CGM)** | ❌ Agreement required | Medical-grade CGM APIs require formal developer agreements. Terra likely holds these; manufacturers are more selective with open-source projects. |
| **Renpho** | ⚠️ Unofficial only | No official developer API. The community has reverse-engineered the backend (`renpho.qnclouds.com`, email/password auth). Terra's Renpho support almost certainly uses this same approach. Fragile — Renpho can break it at any time. |

For providers **without** such restrictions (Whoop, Oura, Polar, Suunto, Fitbit, Strava, Google), OW is on equal footing with Terra.

!!! note "Adding a new metric"
    Open Wearables is purely engineering-driven. Adding a new metric:

    1. Add an entry to the `SeriesType` enum in `series_types.py` with a stable integer DB ID
    2. A database migration for the new ID
    3. Map it in whichever provider strategy emits that data

    No commercial partnership layer — if a provider exposes a field, any contributor can map it.

---

## Does Terra have a permanent advantage?

**For developer-agreement-gated providers, yes in practice:**

- **Garmin** — integration is complete, but new API credentials are unavailable while the developer program is suspended. Closes immediately if Garmin reopens.
- **Direct CGM** (Dexcom, Abbott/Libre) — formal agreements required; Terra is better positioned to hold them.
- **Nutrition data** — not a structural gap; `coachboard-v2` branch has a full implementation pending merge.

**Where OW can catch up or lead:**

- Any provider with an open developer program can be added by contributors
- Self-hosted means unofficial APIs (like Renpho's reverse-engineered endpoint) can be integrated without Terra's liability concerns
- OW has niche metrics Terra doesn't normalize (detailed pulmonary function, environmental audio, granular walking biomechanics)

**Bottom line:** The real divide is developer-agreement-gated providers — Garmin (suspended), Dexcom, Abbott. For everything else, OW is functionally equivalent and the gaps are closeable.

---

## Renpho: direct integration is possible

Renpho has no official developer API, but the community has reverse-engineered it:

- REST endpoint at `renpho.qnclouds.com`, email + password auth (no OAuth)
- [`renpho-api`](https://pypi.org/project/renpho-api/) Python client on PyPI
- [`hass-renpho`](https://github.com/neilzilla/hass-renpho) Home Assistant integration using the same approach

A native OW provider for Renpho is feasible. Risk: Renpho can change their backend at any time.

---

## Device support for ayuOS users

| Device | Status | Notes |
|--------|--------|-------|
| **Whoop** | ✅ Fully supported | OAuth 2.0, recovery/sleep/HRV, real-time webhooks |
| **Garmin** | ⚠️ Supported but gated | Integration complete; developer program suspended for new applicants |
| **FreeStyle Libre (CGM)** | ⚠️ Indirect | Via Apple Health (iOS) or Ultrahuman Ring Air; direct Abbott integration requires developer agreement |
| **Renpho Scale** | ⚠️ Indirect or unofficial | Via Apple Health / Google Health Connect, or a custom integration using the reverse-engineered API |
