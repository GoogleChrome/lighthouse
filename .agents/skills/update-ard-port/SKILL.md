---
name: update-ard-port
description: Sync Lighthouse's Agentic Resource Discovery (ARD) port with upstream ards-project/ard-spec. Invoke when `node core/scripts/update-ard-spec.js --check` reports the ARD spec is out of sync, when the weekly cron CI job fails on it, or when asked to update the ARD conformance script, schema, or discovery rules.
---

# Update the ARD port

Lighthouse vendors a JavaScript port of the upstream ARD conformance tester. When
upstream changes, the port must be brought back to **1:1 parity** while preserving the
Lighthouse-specific adaptations listed in `third-party/ard/README.md`.

## What lives where

| Upstream (ards-project/ard-spec) | Lighthouse | Notes |
|---|---|---|
| `conformance/bin/conformance-test` → `validate_manifest` and helpers | `third-party/ard/ard.js` | `ConformanceTester` (`validate_manifest`, `run_json_schema_validation`, `add_error/warning/info`), `parse_media_type`, `classify_media_type`, `format_schema_error`. Keep upstream `snake_case` names and **word-for-word message text**. |
| `spec/schemas/ard-entry.schema.json` | `third-party/ard/spec/schemas/ard-entry.schema.json` | Must stay byte-identical to upstream. |
| (generated) | `third-party/ard/schema-validator.js` | Precompiled Ajv standalone validator, built by `build/build-ard-schema.js` (`yarn build-ard-schema`). Never hand-edit. |
| `spec/ard.md` §5.1 Discovery Mechanisms (+ `resolve_publisher` in the script) | `core/gather/gatherers/agentic/ard.js` | Candidate order: robots.txt `agentmap` → `<link rel="ard">` → `Link` header → `/.well-known/ard.json` → legacy `ai-catalog` equivalents. Source names in `Artifacts.ArdDiscoverySource` (`types/artifacts.d.ts`). |
| severity / scoring (Lighthouse-only) | `core/audits/agentic/ard-schema.js` | errors → score 0; warnings/legacy/broken-link → 0.9; clean → 1. `infos` are not surfaced. |
| pinned SHA + reviewed hashes + deviation list | `third-party/ard/README.md` | `**Pinned Commit SHA**` and the `**Reviewed Upstream Files**` SHA-256 lines are parsed/written by the update script. Never edit the hashes by hand — they are the proof that the port was reviewed against that exact upstream content. |

Tests:
- `third-party/ard/ard-test.js` — port unit tests
- `core/test/gather/gatherers/agentic/ard-test.js` — gatherer
- `core/test/audits/agentic/ard-schema-test.js` — audit
- `cli/test/smokehouse/test-definitions/ard.js`, `ard-invalid.js` + fixtures in `cli/test/fixtures/agentic/`
- `core/test/results/artifacts/artifacts.json` — sample `AgentResourceDiscovery` artifact

## Procedure

### 1. See what changed

```
node core/scripts/update-ard-spec.js --check
```

"In sync" means upstream HEAD matches the vendored schema byte-for-byte **and** the
SHA-256 of `conformance/bin/conformance-test` and `spec/ard.md` match the hashes recorded
in the README. The output lists which of the three differ, plus old/new SHA and a compare
link. Pull the upstream files at **both** SHAs for side-by-side review (the compare API
patch is often truncated):

```
https://raw.githubusercontent.com/ards-project/ard-spec/<sha>/conformance/bin/conformance-test
https://raw.githubusercontent.com/ards-project/ard-spec/<sha>/spec/schemas/ard-entry.schema.json
https://raw.githubusercontent.com/ards-project/ard-spec/<sha>/spec/ard.md
```

Save them in the conversation scratch dir and diff old vs new. Also check
`conformance/` for new test fixtures/expected outputs and `docs/adr/` for ADRs explaining
renamed or removed fields (e.g. `collections`, media type renames).

### 2. Sync the schema

```
yarn update:ard-spec
```

This writes `third-party/ard/spec/schemas/ard-entry.schema.json` verbatim from upstream
and prints the `conformance-test` diff. If a hand-ported file changed it **exits 1 and
does not bump the pinned SHA** — that is expected; the SHA is bumped in step 8 after
porting. Do not pass `--ack-port` yet.

### 3. Port conformance-test changes into `third-party/ard/ard.js`

For every hunk in the upstream `conformance-test` diff decide whether it touches:
- **Validation rules** (new/removed checks, changed thresholds such as the
  `representativeQueries` 2–5 range, new deprecated media types, URN regex) → port 1:1.
- **Severity** (error ↔ warning ↔ info) → mirror it; this changes audit scoring.
- **Message text** → copy exactly; the audit shows these strings to users and tests
  assert on them.
- **CLI/ANSI output, argparse, `main()`, `resolve_publisher`** → not ported (see README
  deviations); skip unless the discovery logic itself changed (then see step 4).
- **`format_schema_error`** → only adapt if upstream changes how schema errors are
  phrased. Ajv's messages differ from Python `jsonschema`; keep the
  `'x' is a required property` mapping.

Rules to preserve:
- Treat non-object roots/entries as empty instead of throwing.
- Push `{element, message}` objects; never return formatted strings.
- Log through `lighthouse-logger`, not `console`.
- Only `ConformanceTester` and `classify_media_type` are exported; add exports only if
  tests need them.

If `classify_media_type` / `parse_media_type` changed, run a parity check against the
real Python script on a list of tricky inputs (params, quoted strings, casing,
deprecated/unknown `application/*` types) and fix any mismatch.

### 4. If `spec/ard.md` changed

Read §5.1 (and any section the script's `resolve_publisher` references). If the
mechanisms, well-known path, `rel` names, header names, or precedence changed:
- Update the candidate list/order in `core/gather/gatherers/agentic/ard.js`
  (`resolveManifest`) and the `getArdLinksInDOM` rel names.
- Update `Artifacts.ArdDiscoverySource` and `discoverySignals` in `types/artifacts.d.ts`.
- Update `LEGACY_SOURCES` / UIStrings in `core/audits/agentic/ard-schema.js` if what counts
  as legacy changed.

### 5. Rebuild the validator (only if the schema changed)

```
yarn build-ard-schema
```

Review the `schema-validator.js` diff: it should only reflect schema changes. The build
throws if any `require(` survives or a `$id` is missing — fix `build/build-ard-schema.js`
rather than the output.

### 6. Update tests and fixtures

- `third-party/ard/ard-test.js`: add a case for every new/changed rule and message.
- Gatherer/audit tests if discovery or scoring changed.
- Smoke: `cli/test/fixtures/agentic/ard.json` / `ai-catalog-invalid.json` and the
  expectations in `cli/test/smokehouse/test-definitions/ard-invalid.js`. Smokehouse
  asserts the **exact count and order** of `details.items`.
- `core/test/results/artifacts/artifacts.json` if the artifact shape changed.

### 7. Update docs

- README "Modifications for Lighthouse" if a new deviation was introduced, and the
  "Updating Conformance Script" steps if the process changed.
- `@fileoverview` comments in `ard.js`, the gatherer and the audit that mention the spec
  version.
- Audit `UIStrings` if user-facing wording or the spec link changed.

### 8. Verify, then acknowledge

```
yarn mocha third-party/ard/ard-test.js core/test/gather/gatherers/agentic/ard-test.js core/test/audits/agentic/ard-schema-test.js
yarn smoke ard ardInvalid
yarn type-check
yarn lint --fix
yarn update:sample-json
```

`yarn update:sample-json` also runs `i18n:collect-strings`; audit tests resolve
UIStrings through `shared/localization/locales/en-US.json`, so new strings fail tests
until this runs. Do not run `yarn unit`.

Only once everything above is green:

```
yarn update:ard-spec --ack-port                 # records reviewed hashes + bumps pinned SHA
node core/scripts/update-ard-spec.js --check   # must now report in sync
```

`--ack-port` is the single statement that "the port matches this upstream content". Never
run it to silence the check without having ported the diff.

### 9. Report

Summarize for the user: upstream SHA range, each rule/message/severity change and its
effect on audit scoring, any discovery changes, and any deviation added to the README.
Do not commit or open a PR unless asked.

## Gotchas

- The check compares *content*, not commit IDs. A green check after a deps upgrade means
  nothing changed upstream, not that someone looked. `upgrade-deps.sh` only runs
  `--check`; it cannot acknowledge changes.
- `run_command` rejects `grep`; use `grep_search`, `awk`, or `sed`.
- Upstream v0.91 has no `specVersion` check, logs unknown root members only, warns on
  `collections` (removed by ADR-0003), does not check HTTPS, and does not validate
  `capabilities`. Do not add Lighthouse-only checks to the port — put them in the audit
  if ever wanted.
- The `[label]` prefix upstream prepends to entry messages is carried in `element`, not
  in `message`.
- The gatherer, not the port, decides which manifest URL is validated; the port only
  receives `raw_content` and `source_label`.
