# ARD Conformance Validator

This is a JavaScript port of the Agentic Resource Discovery (ARD) Conformance Testing Tool.

The original Python script is located in the `ards-project/ard-spec` repository:
- **Upstream Repository**: https://github.com/ards-project/ard-spec
- **Source Script**: `conformance/bin/conformance-test`
- **Schema**: `spec/schemas/ard-entry.schema.json` (`$defs/ArdManifest` and `$defs/ArdEntry`)
- **Pinned Commit SHA**: `b76f235a8f461876ad4f1e77abd0eb0eb302b48d`
- **Reviewed Upstream Files** (SHA-256 of the upstream content the port was last verified against; maintained by `yarn update:ard-spec --ack-port`, do not edit by hand):
  - `conformance/bin/conformance-test`: `ac2f3cae1c4ac75261fe45786a117aaad275322c92b74110529ad03a794275b4`
  - `spec/ard.md`: `6deb2cc58216fb279569d8ff61bd4595ccdf6ceaeef6766a1a1c9f25b6b68a62`

## Modifications for Lighthouse:
While the validation rules and test suite maintain 1:1 parity with the reference suite, the following adaptations were made for Lighthouse integration:
- **Structured Error Return:** `ConformanceTester` stores structured objects (`{ element, message }`) in `errors`, `warnings` and `infos` instead of formatted ANSI CLI strings. The `[label]` prefix upstream puts on entry messages is reported as `element` instead.
- **Precompiled Standalone Validator (`schema-validator.js`):** Uses `build/build-ard-schema.js` (`yarn build-ard-schema`) to precompile the `ArdManifest` and `ArdEntry` definitions of `ard-entry.schema.json` into a pure, standalone JavaScript module (`schema-validator.js`) ahead of time using `Ajv2020` and `ajv/dist/standalone`. This eliminates runtime dynamic compilation (`new Function()` / `eval()`), preventing Content Security Policy (CSP) `unsafe-eval` violations when running inside Chrome DevTools frontend, avoiding runtime `fs.readFileSync` calls in browser/bundled contexts, and keeping `Ajv` out of the client bundle.
- **ESM Format Validation:** Imports `uri` and `date-time` format validators statically from `ajv-formats/dist/formats.js` rather than bundling the full `ajv-formats` dynamic plugin.
- **Schema Error Messages:** Ajv reports different messages than Python's `jsonschema`. The first error not nested inside a `oneOf`/`anyOf` branch is reported, with `'x' is a required property` phrasing kept for `required` errors.
- **Non-object Input:** Upstream assumes the manifest root and each entry are JSON objects. The port treats anything else as empty, so it reports errors instead of throwing.
- **Lighthouse Logger:** Replaced raw `console.log` with `lighthouse-logger`.

Publisher resolution (upstream's `resolve_publisher`, spec §5.1) is implemented by the gatherer in `core/gather/gatherers/agentic/ard.js`, and the resulting legacy-location warning by the `ard-schema` audit. `infos` are not surfaced in the audit.

## Updating Conformance Script

`yarn check:ard-spec` (`core/scripts/update-ard-spec.js --check`) compares upstream `main` against what Lighthouse has: the vendored schema must match byte-for-byte, and the hand-ported files must match the **Reviewed Upstream Files** hashes above. It runs weekly in CI (`.github/workflows/cron-weekly.yml`) and during dependency upgrades (`core/scripts/upgrade-deps.sh`). Neither of those can mark upstream changes as handled; only `--ack-port` does.

When it reports changes (the `update-ard-port` agent skill walks through this in detail):
1. Run `yarn update:ard-spec`. This syncs `ard-entry.schema.json` verbatim and prints the upstream `conformance-test` diff. If a hand-ported file changed, it exits 1 **without** bumping the pinned SHA.
2. Port `conformance/bin/conformance-test` changes into `third-party/ard/ard.js` (keep rules, severities and message text 1:1; see modifications above) and update `third-party/ard/ard-test.js`.
3. If `spec/ard.md` changed, check §5.1 (Discovery Mechanisms) against `core/gather/gatherers/agentic/ard.js`.
4. If the schema changed, run `yarn build-ard-schema` to regenerate `schema-validator.js`.
5. Verify: `yarn mocha third-party/ard/ard-test.js core/test/gather/gatherers/agentic/ard-test.js core/test/audits/agentic/ard-schema-test.js` and `yarn smoke ard ardInvalid`.
6. Run `yarn update:ard-spec --ack-port` to record the reviewed hashes and bump the pinned SHA. `yarn check:ard-spec` should now pass.

