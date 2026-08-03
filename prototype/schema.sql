-- ============================================================================
-- ayuOS — knowledge schema (The Healthspan Model)
-- Postgres 16. Single-user, local. See prototype/ARCHITECTURE.md.
--
-- SCOPE
--   Bundled, read-only-at-runtime content: the typed graph of systems,
--   functions, markers, interventions, modifiers, outcomes and risk factors
--   described in docs/healthspan-model.md.
--
--   NOT user data. No user_id column exists anywhere in this schema and none
--   should ever be added. No FK crosses from `ayuos`/`clinical` into here, and
--   none crosses out (see §Versioning below).
--
-- LOAD MODEL
--   Authored as YAML in the repo, compiled and loaded wholesale at install /
--   update time into a staging schema, then swapped in by name inside one
--   transaction:
--
--       BEGIN;
--         ALTER SCHEMA knowledge      RENAME TO knowledge_prev;
--         ALTER SCHEMA knowledge_next RENAME TO knowledge;
--         -- write knowledge.change_log, flip model_version.is_current
--       COMMIT;
--       DROP SCHEMA knowledge_prev CASCADE;
--
--   Consequence: no incremental writes at runtime, no vacuum pressure, no
--   write-path concurrency to design for. Everything below optimises reads.
--
-- KEY DECISIONS (argued in ARCHITECTURE.md, restated where they bind below)
--   1. Primary keys are authored, human-stable slugs. No surrogate sequences —
--      user rows in `ayuos` hold soft references into this graph and must
--      survive a wholesale content swap.
--   2. Hybrid edge payload: typed columns for anything the resolver filters,
--      sorts, or dereferences; `attrs JSONB` for the display-only long tail.
--   3. Ordinal axes are native ENUMs whose *declaration order is the ordering*.
--      No numeric scores are stored, computed, or derivable from this schema.
--   4. Citation rule is enforced by the database, not only by CI.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS knowledge;

-- ----------------------------------------------------------------------------
-- Structural types
-- ----------------------------------------------------------------------------

CREATE TYPE knowledge.node_type AS ENUM (
    'System', 'Function', 'Marker', 'Intervention', 'Modifier', 'Outcome', 'RiskFactor'
);

CREATE TYPE knowledge.edge_type AS ENUM (
    'PART_OF', 'PROTECTS', 'SUPPORTS', 'MEASURED_BY',
    'BLOCKS', 'CAUTIONS', 'REQUIRES', 'ADJUSTS', 'SUBSTITUTES',
    'RISK_OF', 'ELEVATES', 'INTERACTS'
);

-- ----------------------------------------------------------------------------
-- Ordinal axes.
--
-- Declaration order IS the ordering: Postgres compares enum values by the order
-- they were declared, so `ORDER BY effect_size DESC` is a correct ordinal sort
-- with no lookup table and — critically — no integer to multiply. Ranking is a
-- partial order over these axes (see ARCHITECTURE.md §Ranking); a single hidden
-- composite score is not representable here by construction.
--
-- NULL means "not asserted for this edge type". Where the claim is genuinely
-- "no effect" or "no evidence", the explicit 'none' value is used. The two are
-- not interchangeable and the per-edge-type CHECK below forces the distinction.
-- ----------------------------------------------------------------------------

CREATE TYPE knowledge.magnitude          AS ENUM ('none', 'small', 'moderate', 'large');
CREATE TYPE knowledge.evidence_strength  AS ENUM ('none', 'low', 'moderate', 'high');
CREATE TYPE knowledge.certainty          AS ENUM ('low', 'moderate', 'high');
CREATE TYPE knowledge.cost_band          AS ENUM ('free', 'low', 'moderate', 'high');
CREATE TYPE knowledge.risk_band          AS ENUM ('negligible', 'low', 'moderate', 'high');
CREATE TYPE knowledge.effort_band        AS ENUM ('trivial', 'low', 'moderate', 'high');
CREATE TYPE knowledge.time_to_effect     AS ENUM ('immediate', 'days', 'weeks', 'months', 'years');
CREATE TYPE knowledge.adherence_realism  AS ENUM ('low', 'moderate', 'high');
CREATE TYPE knowledge.reversibility      AS ENUM ('irreversible', 'partial', 'reversible');
CREATE TYPE knowledge.severity           AS ENUM ('mild', 'moderate', 'severe');
CREATE TYPE knowledge.validity           AS ENUM ('weak', 'moderate', 'strong');
CREATE TYPE knowledge.noise_band         AS ENUM ('low', 'moderate', 'high');
CREATE TYPE knowledge.invasiveness       AS ENUM ('none', 'minimal', 'moderate', 'high');
CREATE TYPE knowledge.effect_delta       AS ENUM ('much_lower', 'lower', 'comparable', 'higher');
CREATE TYPE knowledge.interaction_kind   AS ENUM ('antagonistic', 'redundant', 'additive', 'synergistic');

-- Quality tier from docs/healthspan-model.md#measurement-quality-tiers.
-- Declared D→A so that ORDER BY quality_tier DESC puts reference methods first.
CREATE TYPE knowledge.quality_tier       AS ENUM ('D', 'C', 'B', 'A');

-- Compiled content only ever holds reviewed material. `draft` is a state that
-- exists in YAML and CI, never in the database.
CREATE TYPE knowledge.review_status      AS ENUM ('provisional', 'clinician_approved', 'needs_review');

-- Which axis an ADJUSTS edge touches. Typed because the resolver merges
-- conflicting adjustments per-dimension (ARCHITECTURE.md §Conflict handling).
CREATE TYPE knowledge.adjust_dimension   AS ENUM ('dose', 'intensity', 'technique', 'equipment', 'environment', 'timing');

-- ----------------------------------------------------------------------------
-- Version ledger
-- ----------------------------------------------------------------------------

CREATE TABLE knowledge.model_version (
    version       text        PRIMARY KEY,            -- semver of the content bundle, e.g. '0.4.2'
    content_hash  text        NOT NULL,               -- SHA-256 over the compiled YAML corpus
    source_commit text        NOT NULL,               -- git sha of the authoring repo
    built_at      timestamptz NOT NULL,
    installed_at  timestamptz NOT NULL DEFAULT now(),
    node_count    integer     NOT NULL,
    edge_count    integer     NOT NULL,
    is_current    boolean     NOT NULL DEFAULT false
);

-- Append-only: rows survive content swaps so a user-visible recommendation can
-- always be traced back to the bundle that produced it.
CREATE UNIQUE INDEX model_version_one_current
    ON knowledge.model_version (is_current) WHERE is_current;

-- What changed between bundles. Written by the loader, read by the UI to answer
-- "this advice changed since you acted on it". This is the *only* history kept
-- in the database — full prior graphs live in git, not here.
CREATE TABLE knowledge.change_log (
    version_to   text        NOT NULL REFERENCES knowledge.model_version (version),
    version_from text        REFERENCES knowledge.model_version (version),
    entity_kind  text        NOT NULL CHECK (entity_kind IN ('node', 'edge')),
    entity_id    text        NOT NULL,
    change       text        NOT NULL CHECK (change IN ('added', 'removed', 'changed')),
    prev_hash    text,
    new_hash     text,
    summary      text        NOT NULL,   -- authored, human-readable; shown to the user
    user_visible boolean     NOT NULL DEFAULT false,  -- true when advice direction changed
    PRIMARY KEY (version_to, entity_kind, entity_id)
);

CREATE INDEX change_log_entity ON knowledge.change_log (entity_id, entity_kind);
CREATE INDEX change_log_visible ON knowledge.change_log (version_to) WHERE user_visible;

-- ----------------------------------------------------------------------------
-- Citations
--
-- Sources are first-class rows; the node/edge link is a junction so one
-- guideline supports many claims and the locator (page/section/table) is
-- recorded per claim rather than per source.
--
-- `corpus_ref` is a SOFT reference to ayuos.evidence_corpus. Deliberately not a
-- foreign key: bundled content must not depend on the presence of user-side
-- tables, and a content swap must never cascade into user data.
-- ----------------------------------------------------------------------------

CREATE TABLE knowledge.citations (
    id            text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    kind          text NOT NULL CHECK (kind IN ('guideline', 'systematic_review', 'meta_analysis',
                                                'rct', 'observational', 'mechanistic', 'consensus')),
    title         text NOT NULL,
    body_org      text,                    -- ACSM, AHA/ACC, ADA, USPSTF, NICE, WHO, …
    edition       text,                    -- pinned guideline version; a new edition = review task
    year          integer NOT NULL CHECK (year BETWEEN 1900 AND 2200),
    identifier    text,                    -- DOI / PMID / URL
    corpus_ref    text,                    -- soft ref into ayuos.evidence_corpus, see above
    attrs         jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- ----------------------------------------------------------------------------
-- Nodes
--
-- One table for all seven node types. Type-specific attributes go to `attrs`
-- unless the agent filters or sorts on them, in which case they earn a typed
-- column — Markers are the only type with a query surface of its own, so they
-- get a side table rather than seven sparse columns on `nodes`.
-- ----------------------------------------------------------------------------

CREATE TABLE knowledge.nodes (
    id             text PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    node_type      knowledge.node_type NOT NULL,
    title          text NOT NULL,
    summary        text NOT NULL,            -- one-liner the agent can drop inline
    body           text,                     -- markdown long form
    aliases        text[] NOT NULL DEFAULT '{}',

    -- Outcome polarity. RISK_OF edges point at adverse Outcomes; PROTECTS edges
    -- point at protective ones. Avoids inventing an eighth node type for
    -- adverse events, which would fragment the outcome vocabulary.
    outcome_polarity text CHECK (outcome_polarity IN ('protective', 'adverse')),

    -- Review metadata. Mandatory on every node — docs/healthspan-model.md is
    -- explicit that uncited content does not ship.
    last_reviewed  date NOT NULL,
    review_horizon interval NOT NULL DEFAULT '18 months',
    review_status  knowledge.review_status NOT NULL,
    reviewed_by    text,

    content_hash   text NOT NULL,            -- SHA-256 of the authored YAML for this node
    attrs          jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Required for the composite FKs on `edges` that enforce endpoint types.
    CONSTRAINT nodes_id_type_uniq UNIQUE (id, node_type),

    CONSTRAINT nodes_polarity_only_on_outcomes
        CHECK ((node_type = 'Outcome') = (outcome_polarity IS NOT NULL)),

    -- Not `current_date` — CHECK expressions must be immutable. Staleness is
    -- surfaced by knowledge.stale_content below and gated in CI.
    CONSTRAINT nodes_reviewed_plausible CHECK (last_reviewed >= DATE '2020-01-01')
);

-- `locator` is NOT NULL DEFAULT '' rather than nullable so it can sit in the
-- primary key: the same source may be cited twice on one node at two locations.
CREATE TABLE knowledge.node_citations (
    node_id     text NOT NULL REFERENCES knowledge.nodes (id) ON DELETE CASCADE,
    citation_id text NOT NULL REFERENCES knowledge.citations (id),
    locator     text NOT NULL DEFAULT '',   -- 'Table 3', '§4.2, p.118'
    note        text,                       -- what specifically this source establishes
    PRIMARY KEY (node_id, citation_id, locator)
);

-- Marker-specific properties (docs/healthspan-model.md#measurement-quality-tiers).
-- Typed rather than JSONB because `suggest_markers` filters on tier and
-- ingestibility, and experimentation.md reads `noise` for power/duration
-- heuristics — both are query predicates, not display strings.
CREATE TABLE knowledge.marker_props (
    marker_id          text PRIMARY KEY REFERENCES knowledge.nodes (id) ON DELETE CASCADE,
    node_type          knowledge.node_type NOT NULL DEFAULT 'Marker'
                       CHECK (node_type = 'Marker'),
    noise              knowledge.noise_band NOT NULL,
    noise_cv_pct       numeric(5,2),        -- within-person CV where a number is defensible
    cost               knowledge.cost_band NOT NULL,
    invasiveness       knowledge.invasiveness NOT NULL,
    min_useful_interval interval NOT NULL,  -- measuring ApoB weekly tells you nothing
    unit               text,
    loinc_code         text,                -- joins to the timeseries/clinical metric catalogue
    ingestible_via     text[] NOT NULL DEFAULT '{}',  -- 'epic', 'apple-health', 'oura', 'manual', …
    attrs              jsonb NOT NULL DEFAULT '{}'::jsonb,

    -- Guarantees the row really does hang off a Marker node.
    FOREIGN KEY (marker_id, node_type) REFERENCES knowledge.nodes (id, node_type)
);

-- ----------------------------------------------------------------------------
-- Edges
--
-- ## Typed columns vs. JSONB payload — the decision
--
-- Twelve edge types with genuinely heterogeneous payloads. Three options:
--
--   (a) One table, everything in JSONB.
--       Rejected. Three things break. First, referential integrity: REQUIRES
--       carries a prerequisite *node reference* and SUBSTITUTES carries the
--       Function both interventions serve — you cannot put a foreign key
--       inside JSONB, and a dangling node ref in bundled content is exactly the
--       failure the citation rule exists to prevent. Second, ordinality:
--       `attrs->>'effect_size'` is text, so ordering is alphabetical
--       ('large' < 'moderate' < 'none' < 'small') unless every query
--       re-establishes the scale — the ranking rule would live in application
--       string constants instead of the type system. Third, CHECK constraints
--       over JSONB are unreadable and unenforced in practice.
--
--   (b) One table per edge type (twelve tables).
--       Rejected. Every traversal becomes a twelve-way UNION. Modifier
--       resolution collects BLOCKS/CAUTIONS/REQUIRES/ADJUSTS in one pass; that
--       is one indexed scan here and four UNIONed scans there, for a graph
--       small enough that the split buys nothing.
--
--   (c) Hybrid — adopted.
--       A column is typed when it satisfies any of:
--         - it is dereferenced as a graph reference (prerequisite_node_id,
--           serves_function_id) → needs a real FK;
--         - the resolver or ranker filters/sorts on it (effect_size,
--           evidence_strength, quality_tier, severity, adjust_dimension) →
--           needs ordinality and an index;
--         - it is an axis of the fixed comparison frame in epistemics.md →
--           a fixed schema is the point; a missing cell must be a visible NULL,
--           not an absent JSON key.
--       Everything else — dose-response detail, equipment lists, acclimatisation
--       windows, regional variants, escalation thresholds — goes to `attrs`.
--
--   The sparseness cost is real and small: ~15 mostly-NULL columns across a few
--   thousand rows is a null bitmap, not storage. The open questions in
--   healthspan-model.md (structured vs. prose dose-response; regional variants)
--   are precisely the fields left in `attrs` — JSONB is where undecided shape
--   belongs, and promoting a field to a typed column later is a migration this
--   schema can afford because content is regenerated wholesale anyway.
-- ----------------------------------------------------------------------------

CREATE TABLE knowledge.edges (
    -- Composed by the compiler as '<from_id>|<EDGE_TYPE>|<to_id>|<qualifier>'.
    -- Authored-stable, not a sequence: `ayuos` rows cite edge ids and a content
    -- swap must not renumber them.
    id            text PRIMARY KEY,

    edge_type     knowledge.edge_type NOT NULL,
    from_id       text NOT NULL REFERENCES knowledge.nodes (id),
    -- NULL only for a global BLOCKS: a red flag ("exertional chest pain") halts
    -- plan generation across every intervention rather than naming each one. The
    -- alternative — a sentinel node — would be a fake Intervention in the graph.
    -- Guarded by edges_global_block_is_red_flag below.
    to_id         text REFERENCES knowledge.nodes (id),
    from_type     knowledge.node_type NOT NULL,
    to_type       knowledge.node_type,
    qualifier     text NOT NULL DEFAULT '',   -- distinguishes multiple edges of one type

    -- --- comparison-frame axes (SUPPORTS; partially SUBSTITUTES/RISK_OF) -----
    effect_size        knowledge.magnitude,
    evidence_strength  knowledge.evidence_strength,
    certainty          knowledge.certainty,
    time_to_effect     knowledge.time_to_effect,
    cost               knowledge.cost_band,
    risk               knowledge.risk_band,
    effort             knowledge.effort_band,
    reversibility      knowledge.reversibility,
    adherence_realism  knowledge.adherence_realism,
    dose_response      text,                 -- prose today; see open question in the spec

    -- --- MEASURED_BY --------------------------------------------------------
    quality_tier       knowledge.quality_tier,
    validity           knowledge.validity,
    noise              knowledge.noise_band,

    -- --- modifier edges (BLOCKS / CAUTIONS / REQUIRES / ADJUSTS) ------------
    severity              knowledge.severity,
    reason                text,        -- why this modifier applies — always user-visible
    resolution_text       text,        -- what the user is told; verbatim, never generated
    adjustment            text,        -- ADJUSTS: the change, stated plainly
    adjust_dimension      knowledge.adjust_dimension,
    prerequisite_node_id  text REFERENCES knowledge.nodes (id),   -- REQUIRES
    is_red_flag           boolean NOT NULL DEFAULT false,         -- BLOCKS: route to clinician
    suppress_substitutes  boolean NOT NULL DEFAULT false,         -- red-flag blocks offer nothing

    -- --- SUBSTITUTES --------------------------------------------------------
    serves_function_id    text REFERENCES knowledge.nodes (id),
    effectiveness_delta   knowledge.effect_delta,

    -- --- RISK_OF ------------------------------------------------------------
    baseline_incidence    text,        -- authored band, e.g. '1–3% per season'

    -- --- ELEVATES / INTERACTS -----------------------------------------------
    priority_delta        knowledge.magnitude,
    interaction_kind      knowledge.interaction_kind,

    -- --- conditionality -----------------------------------------------------
    -- Declarative predicate over the user's fact set, evaluated by the resolver
    -- (not by Postgres). Example: {"all":[{"fact":"hot-humid-conditions"},
    -- {"any":[{"fact":"anticholinergic-medication"}]}]}
    applies_when          jsonb,
    -- Escalation: "hot/humid ADJUSTS running, but BLOCKS above thresholds
    -- combined with certain medications". The escalated type is recorded in the
    -- explanation trail alongside the original.
    escalates_to          knowledge.edge_type,
    escalation_when       jsonb,

    -- --- provenance ---------------------------------------------------------
    last_reviewed  date NOT NULL,
    review_horizon interval NOT NULL DEFAULT '18 months',
    review_status  knowledge.review_status NOT NULL,
    content_hash   text NOT NULL,
    attrs          jsonb NOT NULL DEFAULT '{}'::jsonb,

    CONSTRAINT edges_natural_key UNIQUE (from_id, edge_type, to_id, qualifier),
    CONSTRAINT edges_no_self_loop CHECK (from_id <> to_id),
    CONSTRAINT edges_reviewed_plausible CHECK (last_reviewed >= DATE '2020-01-01'),

    -- Endpoint node types are enforced declaratively via composite FKs into
    -- nodes(id, node_type) plus this CHECK. A CHECK alone cannot see the other
    -- table; the denormalised from_type/to_type columns are what make it
    -- possible, and the FKs are what keep them honest.
    FOREIGN KEY (from_id, from_type) REFERENCES knowledge.nodes (id, node_type),
    FOREIGN KEY (to_id,   to_type)   REFERENCES knowledge.nodes (id, node_type),

    -- A null target is only ever a red-flag halt, never an authoring slip.
    CONSTRAINT edges_global_block_is_red_flag CHECK (
        to_id IS NOT NULL
        OR (edge_type = 'BLOCKS' AND attrs->>'routing' = 'clinician')
    ),

    CONSTRAINT edges_endpoint_types CHECK (
        to_id IS NULL OR
        CASE edge_type
            WHEN 'PART_OF'     THEN from_type IN ('Function', 'System') AND to_type = 'System'
            WHEN 'PROTECTS'    THEN from_type = 'Function'     AND to_type = 'Outcome'
            WHEN 'SUPPORTS'    THEN from_type = 'Intervention' AND to_type = 'Function'
            WHEN 'MEASURED_BY' THEN from_type = 'Function'     AND to_type = 'Marker'
            WHEN 'BLOCKS'      THEN from_type = 'Modifier'     AND to_type = 'Intervention'
            WHEN 'CAUTIONS'    THEN from_type = 'Modifier'     AND to_type = 'Intervention'
            WHEN 'REQUIRES'    THEN from_type = 'Modifier'     AND to_type = 'Intervention'
            WHEN 'ADJUSTS'     THEN from_type = 'Modifier'     AND to_type = 'Intervention'
            WHEN 'SUBSTITUTES' THEN from_type = 'Intervention' AND to_type = 'Intervention'
            WHEN 'RISK_OF'     THEN from_type = 'Intervention' AND to_type = 'Outcome'
            -- Modifier is a legal source: a preference ("I want to swim") or an
            -- access constraint legitimately raises priority, and adherence beats
            -- theoretical superiority. Widened after seed authoring — see NOTES.md.
            WHEN 'ELEVATES'    THEN from_type IN ('RiskFactor', 'Modifier')
                                AND to_type IN ('Intervention', 'Function', 'Marker')
            WHEN 'INTERACTS'   THEN from_type = 'Intervention' AND to_type = 'Intervention'
        END
    ),

    -- Required payload per edge type. This is the constraint that makes the
    -- hybrid honest: a typed column that is optional for every type is just a
    -- JSONB key with extra syntax.
    CONSTRAINT edges_payload_by_type CHECK (
        CASE edge_type
            WHEN 'SUPPORTS' THEN
                effect_size IS NOT NULL AND evidence_strength IS NOT NULL
                AND certainty IS NOT NULL AND time_to_effect IS NOT NULL
                AND cost IS NOT NULL AND risk IS NOT NULL AND effort IS NOT NULL
                AND reversibility IS NOT NULL AND adherence_realism IS NOT NULL
            WHEN 'MEASURED_BY' THEN
                quality_tier IS NOT NULL AND validity IS NOT NULL AND noise IS NOT NULL
            WHEN 'BLOCKS' THEN
                reason IS NOT NULL AND resolution_text IS NOT NULL AND severity IS NOT NULL
                AND (NOT suppress_substitutes OR is_red_flag)
            WHEN 'CAUTIONS' THEN
                reason IS NOT NULL AND resolution_text IS NOT NULL
            WHEN 'ADJUSTS' THEN
                reason IS NOT NULL AND adjustment IS NOT NULL AND adjust_dimension IS NOT NULL
            WHEN 'REQUIRES' THEN
                reason IS NOT NULL AND prerequisite_node_id IS NOT NULL
            WHEN 'SUBSTITUTES' THEN
                serves_function_id IS NOT NULL AND effectiveness_delta IS NOT NULL
            WHEN 'RISK_OF' THEN
                severity IS NOT NULL AND baseline_incidence IS NOT NULL
            WHEN 'ELEVATES' THEN
                priority_delta IS NOT NULL AND reason IS NOT NULL
            WHEN 'INTERACTS' THEN
                interaction_kind IS NOT NULL
            ELSE true
        END
    ),

    -- Red flags and escalation are only meaningful on the edge types that carry
    -- them; keeps stray flags out of the compiled bundle.
    CONSTRAINT edges_red_flag_only_on_blocks
        CHECK (NOT is_red_flag OR edge_type = 'BLOCKS'),
    CONSTRAINT edges_escalation_well_formed
        CHECK ((escalates_to IS NULL) = (escalation_when IS NULL)),
    CONSTRAINT edges_escalation_only_upward
        CHECK (escalates_to IS NULL
               OR (edge_type IN ('ADJUSTS', 'CAUTIONS') AND escalates_to IN ('BLOCKS', 'REQUIRES', 'ADJUSTS'))),

    -- INTERACTS is symmetric; store one canonical direction so the resolver
    -- never has to union both orientations.
    CONSTRAINT edges_interacts_canonical
        CHECK (edge_type <> 'INTERACTS' OR from_id < to_id)
);

CREATE TABLE knowledge.edge_citations (
    edge_id     text NOT NULL REFERENCES knowledge.edges (id) ON DELETE CASCADE,
    citation_id text NOT NULL REFERENCES knowledge.citations (id),
    locator     text NOT NULL DEFAULT '',
    note        text,
    PRIMARY KEY (edge_id, citation_id, locator)
);

-- Modifier precedence, as data rather than a constant in application code:
-- BLOCK > REQUIRES > ADJUST > CAUTION > ELEVATE. Lower rank applies first and
-- wins. Kept in the database so the collection query can order by it and the
-- resolver, the UI, and any test fixture all read one source of truth.
CREATE TABLE knowledge.edge_precedence (
    edge_type knowledge.edge_type PRIMARY KEY,
    rank      integer NOT NULL UNIQUE CHECK (rank > 0),
    terminal  boolean NOT NULL DEFAULT false   -- terminal = removes the candidate
);

INSERT INTO knowledge.edge_precedence (edge_type, rank, terminal) VALUES
    ('BLOCKS',   1, true),
    ('REQUIRES', 2, false),
    ('ADJUSTS',  3, false),
    ('CAUTIONS', 4, false),
    ('ELEVATES', 5, false);

-- ----------------------------------------------------------------------------
-- The citation rule, enforced by the database
--
-- "CI rejects any node or edge without a citation and a last_reviewed date.
--  Non-negotiable." — docs/healthspan-model.md#authoring-maintenance
--
-- last_reviewed is NOT NULL, so that half is free. "At least one child row"
-- has no declarative form in SQL, so it is a DEFERRABLE INITIALLY DEFERRED
-- constraint trigger: it fires at COMMIT, which is exactly right for a loader
-- that inserts nodes, then edges, then citations in one transaction. A bundle
-- with one uncited edge fails to install — the whole transaction, not the row.
--
-- CI enforces the same rule earlier and with better error messages. This is the
-- backstop for hand-loaded or partially-patched content.
-- ----------------------------------------------------------------------------

CREATE FUNCTION knowledge.assert_node_cited() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM knowledge.node_citations c WHERE c.node_id = NEW.id) THEN
        RAISE EXCEPTION 'uncited node %: every node must carry at least one citation', NEW.id
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NULL;
END $$;

CREATE FUNCTION knowledge.assert_edge_cited() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    -- PART_OF is pure navigation structure with no claim attached, and is the
    -- one documented exemption. Everything else asserts something about a body
    -- and must cite. Widen this list only with a clinical reviewer's sign-off.
    IF NEW.edge_type = 'PART_OF' THEN
        RETURN NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM knowledge.edge_citations c WHERE c.edge_id = NEW.id) THEN
        RAISE EXCEPTION 'uncited edge %: every claim-bearing edge must carry at least one citation', NEW.id
            USING ERRCODE = 'integrity_constraint_violation';
    END IF;
    RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER nodes_must_be_cited
    AFTER INSERT OR UPDATE ON knowledge.nodes
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION knowledge.assert_node_cited();

CREATE CONSTRAINT TRIGGER edges_must_be_cited
    AFTER INSERT OR UPDATE ON knowledge.edges
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION knowledge.assert_edge_cited();

-- Staleness surfacing: flagged in the UI, never silently trusted.
CREATE VIEW knowledge.stale_content AS
    SELECT 'node' AS kind, id, title AS label, last_reviewed,
           last_reviewed + review_horizon AS due, review_status
      FROM knowledge.nodes
     WHERE last_reviewed + review_horizon < current_date
    UNION ALL
    SELECT 'edge', id, edge_type::text || ' ' || from_id || ' → ' || to_id, last_reviewed,
           last_reviewed + review_horizon, review_status
      FROM knowledge.edges
     WHERE last_reviewed + review_horizon < current_date;

-- ----------------------------------------------------------------------------
-- Indexes — one per traversal pattern the agent tools actually run.
--
-- At v0 scale (~200 nodes, ~2k edges) the entire graph fits in shared_buffers
-- and most of these are strictly speaking optional. They are here because they
-- cost nothing on a read-only table loaded once per release, and because the
-- shapes are what the query planner should be nudged toward as v1/v2 content
-- lands and the edge count grows an order of magnitude.
-- ----------------------------------------------------------------------------

-- Generic outbound / inbound traversal.
CREATE INDEX edges_from_type ON knowledge.edges (from_id, edge_type);
CREATE INDEX edges_to_type   ON knowledge.edges (to_id, edge_type);

-- (a) System → Function spine. PART_OF is walked upward from the child, so the
--     recursive step probes to_id; small partial index keeps the spine hot.
CREATE INDEX edges_part_of ON knowledge.edges (to_id, from_id)
    WHERE edge_type = 'PART_OF';

-- (a) Ranked interventions for a Function. Ordering columns are in the index so
--     the ORDER BY is satisfied without a sort. DESC matches the ranking
--     direction; enum comparison uses declaration order.
CREATE INDEX edges_supports_ranked ON knowledge.edges
    (to_id, effect_size DESC, evidence_strength DESC, certainty DESC)
    WHERE edge_type = 'SUPPORTS';

-- (b) Modifier collection: probe is (candidate intervention set × user fact
--     set). to_id leads because the candidate set is usually the smaller and
--     more selective of the two.
CREATE INDEX edges_modifier_lookup ON knowledge.edges (to_id, from_id)
    INCLUDE (edge_type)
    WHERE edge_type IN ('BLOCKS', 'CAUTIONS', 'REQUIRES', 'ADJUSTS');

-- (b) Risk-factor sharpening, same shape, different targets.
CREATE INDEX edges_elevates_lookup ON knowledge.edges (to_id, from_id)
    WHERE edge_type = 'ELEVATES';

-- (c) Substitutes for a blocked intervention, constrained to the same Function.
CREATE INDEX edges_substitutes_lookup ON knowledge.edges (from_id, serves_function_id)
    WHERE edge_type = 'SUBSTITUTES';

-- Marker suggestion by function, best tier first.
CREATE INDEX edges_measured_by_tier ON knowledge.edges (from_id, quality_tier DESC)
    WHERE edge_type = 'MEASURED_BY';

-- REQUIRES prerequisite dereference (prerequisite → the edges that demand it).
CREATE INDEX edges_prerequisite ON knowledge.edges (prerequisite_node_id)
    WHERE prerequisite_node_id IS NOT NULL;

-- Conditional-edge scan: the resolver only evaluates predicates on edges that
-- have one.
CREATE INDEX edges_conditional ON knowledge.edges USING gin (applies_when jsonb_path_ops)
    WHERE applies_when IS NOT NULL;

CREATE INDEX edges_attrs ON knowledge.edges USING gin (attrs jsonb_path_ops);

CREATE INDEX nodes_by_type ON knowledge.nodes (node_type, id);
CREATE INDEX nodes_attrs   ON knowledge.nodes USING gin (attrs jsonb_path_ops);
CREATE INDEX nodes_aliases ON knowledge.nodes USING gin (aliases);

-- Marker filtering for suggest_markers ("what can ayuOS already ingest?").
CREATE INDEX marker_props_ingestible ON knowledge.marker_props USING gin (ingestible_via);

-- Citation fan-out for the "show me the sources" path.
CREATE INDEX node_citations_by_citation ON knowledge.node_citations (citation_id);
CREATE INDEX edge_citations_by_citation ON knowledge.edge_citations (citation_id);

-- ----------------------------------------------------------------------------
-- OPTIONAL, NOT ADOPTED — closure over the PART_OF spine.
--
-- The hierarchy is stored as an adjacency list (PART_OF edges). Depth is 2–3
-- and the recursive CTE below is sub-millisecond at v0 scale, so a closure
-- table is redundant, not expensive. Because content is immutable at runtime it
-- would carry zero maintenance cost — the objection is a second source of truth,
-- not upkeep. Enable this materialized view if `query_health_model` p95 ever
-- exceeds ~5 ms or the spine grows past ~5 levels.
--
-- CREATE MATERIALIZED VIEW knowledge.node_closure AS
--   WITH RECURSIVE c(descendant, ancestor, depth) AS (
--       SELECT id, id, 0 FROM knowledge.nodes WHERE node_type IN ('System','Function')
--       UNION ALL
--       SELECT c.descendant, e.to_id, c.depth + 1
--         FROM c JOIN knowledge.edges e ON e.from_id = c.ancestor AND e.edge_type = 'PART_OF'
--   ) SELECT * FROM c;
-- CREATE UNIQUE INDEX ON knowledge.node_closure (ancestor, descendant);
-- -- Refreshed once, by the loader, immediately after a content swap.
-- ----------------------------------------------------------------------------


-- ============================================================================
-- QUERY PATTERNS
--
-- These are the three shapes the agent tools issue. They are the *collection*
-- half of the work; precedence resolution, conflict merging, and explanation
-- assembly happen in application code (ARCHITECTURE.md §Where resolution runs).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (a) Walk System → Functions → Interventions, ranked.
--     Tool: query_health_model / rank_interventions.
--     $1 = system node id, e.g. 'cardiovascular'.
--
-- WITH RECURSIVE spine AS (
--     SELECT n.id AS node_id, n.node_type, 0 AS depth
--       FROM knowledge.nodes n
--      WHERE n.id = $1 AND n.node_type = 'System'
--     UNION ALL
--     SELECT e.from_id, e.from_type, s.depth + 1
--       FROM spine s
--       JOIN knowledge.edges e
--         ON e.to_id = s.node_id AND e.edge_type = 'PART_OF'
--      WHERE s.depth < 4                      -- content is acyclic; this is a seatbelt
-- ),
-- functions AS (
--     SELECT DISTINCT node_id AS function_id FROM spine WHERE node_type = 'Function'
-- )
-- SELECT f.function_id,
--        fn.title            AS function_title,
--        iv.id               AS intervention_id,
--        iv.title            AS intervention_title,
--        s.id                AS edge_id,
--        s.effect_size, s.evidence_strength, s.certainty, s.time_to_effect,
--        s.cost, s.risk, s.effort, s.reversibility, s.adherence_realism,
--        s.dose_response
--   FROM functions f
--   JOIN knowledge.nodes fn ON fn.id = f.function_id
--   JOIN knowledge.edges s  ON s.to_id = f.function_id AND s.edge_type = 'SUPPORTS'
--   JOIN knowledge.nodes iv ON iv.id = s.from_id
--  ORDER BY fn.title,
--           s.effect_size       DESC,   -- ordinal: enum declaration order
--           s.evidence_strength DESC,
--           s.certainty         DESC,
--           iv.id;                      -- deterministic tiebreak, never a preference
--
-- NOTE: this ORDER BY is a *stable display order*, not the ranking. The ranking
-- is the dominance partial order over (effect_size, evidence_strength) computed
-- in application code; ties here are incomparable, not equal.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- (b) Collect every modifier edge applying to a candidate intervention set.
--     Tool: resolve_modifiers, phase 1 (collection).
--     $1 = text[] candidate intervention ids
--     $2 = text[] user fact node ids (Modifier and RiskFactor nodes)
--
--     One query, one round trip, no N+1. Ordered by precedence so the resolver
--     folds a pre-sorted list and the ordering rule is not restated in code.
--
-- SELECT e.id                AS edge_id,
--        e.edge_type,
--        p.rank              AS precedence_rank,
--        p.terminal,
--        e.from_id           AS modifier_id,
--        m.title             AS modifier_title,
--        m.node_type         AS modifier_kind,      -- Modifier vs RiskFactor
--        e.to_id             AS intervention_id,
--        e.severity, e.reason, e.resolution_text,
--        e.adjustment, e.adjust_dimension,
--        e.prerequisite_node_id, e.is_red_flag, e.suppress_substitutes,
--        e.priority_delta,
--        e.applies_when, e.escalates_to, e.escalation_when,
--        COALESCE(
--            (SELECT jsonb_agg(jsonb_build_object('citation_id', ec.citation_id,
--                                                 'locator', ec.locator,
--                                                 'title', c.title,
--                                                 'year', c.year)
--                              ORDER BY ec.citation_id)
--               FROM knowledge.edge_citations ec
--               JOIN knowledge.citations c ON c.id = ec.citation_id
--              WHERE ec.edge_id = e.id),
--            '[]'::jsonb) AS citations
--   FROM knowledge.edges e
--   JOIN knowledge.edge_precedence p ON p.edge_type = e.edge_type
--   JOIN knowledge.nodes m ON m.id = e.from_id
--  WHERE e.to_id   = ANY($1)
--    AND e.from_id = ANY($2)
--    AND e.edge_type IN ('BLOCKS', 'REQUIRES', 'ADJUSTS', 'CAUTIONS', 'ELEVATES')
--  ORDER BY e.to_id, p.rank, e.severity DESC NULLS LAST, e.from_id;
--
--     ELEVATES edges that target a Function rather than an Intervention are
--     collected by the same query with $1 extended to include the function id —
--     the endpoint CHECK permits both, and the resolver distinguishes by to_type.
--
--     Citations are aggregated in the same query on purpose: an explanation
--     trail entry is not renderable without its sources, so fetching them
--     separately would create a window where a modification could be shown
--     uncited.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- (c) Find SUBSTITUTES for a blocked intervention serving the same Function.
--     Tool: resolve_modifiers, phase 4 (BLOCK handling).
--     $1 = blocked intervention id, $2 = target function id,
--     $3 = text[] user fact ids (so a substitute is not itself blocked)
--
-- WITH candidates AS (
--     SELECT sub.to_id            AS substitute_id,
--            sub.id               AS substitute_edge_id,
--            sub.effectiveness_delta,
--            sub.attrs
--       FROM knowledge.edges sub
--      WHERE sub.edge_type = 'SUBSTITUTES'
--        AND sub.from_id = $1
--        AND sub.serves_function_id = $2
-- ),
-- clean AS (   -- drop substitutes that the same fact set also blocks
--     SELECT c.*
--       FROM candidates c
--      WHERE NOT EXISTS (
--            SELECT 1 FROM knowledge.edges b
--             WHERE b.edge_type = 'BLOCKS'
--               AND b.to_id   = c.substitute_id
--               AND b.from_id = ANY($3))
-- )
-- SELECT c.substitute_id,
--        n.title,
--        c.effectiveness_delta,
--        s.effect_size, s.evidence_strength, s.certainty,
--        s.cost, s.risk, s.effort, s.adherence_realism,
--        c.substitute_edge_id
--   FROM clean c
--   JOIN knowledge.nodes n ON n.id = c.substitute_id
--   -- the substitute's own SUPPORTS edge to the same Function, so the swap is
--   -- shown on identical axes rather than as a bare "try this instead"
--   LEFT JOIN knowledge.edges s
--          ON s.edge_type = 'SUPPORTS' AND s.from_id = c.substitute_id AND s.to_id = $2
--  ORDER BY c.effectiveness_delta DESC, s.effect_size DESC NULLS LAST, c.substitute_id;
--
--     Substitutes that survive here may still carry CAUTIONS/ADJUSTS from the
--     same fact set. Those are collected by re-running (b) over the substitute
--     set — one extra round trip, bounded by graph fan-out, and it keeps the
--     "no candidate escapes modifier resolution" invariant a single code path.
--
--     If the originating BLOCKS edge has suppress_substitutes = true (red flag),
--     this query is NOT run at all. The resolution is "this warrants clinical
--     evaluation", full stop.
-- ----------------------------------------------------------------------------
