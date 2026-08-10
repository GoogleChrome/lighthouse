# ARD Conformance Validator

This is a JavaScript port of the Agentic Resource Discovery (ARD) Conformance Testing Tool.

The original Python script is located in the `ards-project/ard-spec` repository:
- **Upstream Repository**: https://github.com/ards-project/ard-spec
- **Source Script**: `conformance/bin/conformance-test`
- **Schema**: `spec/schemas/ai-catalog.schema.json`
- **Pinned Commit SHA**: `47042e5c0c32c0b58634f5b4a093fced28192dbf`

## Modifications for Lighthouse:
While the validation rules and test suite maintain 1:1 parity with the reference suite, the following adaptations were made for Lighthouse integration:
- **Structured Error Return:** `ConformanceTester` stores structured objects (`{ element, message }`) in `errors` and `warnings` instead of formatted ANSI CLI strings.
- **Precompiled Standalone Validator (`schema-validator.js`):** Uses `build/build-ard-schema.js` (`yarn build-ard-schema`) to precompile `ai-catalog.schema.json` into a pure, standalone JavaScript validator (`schema-validator.js`) ahead of time using `Ajv2020` and `ajv/dist/standalone`. This eliminates runtime dynamic compilation (`new Function()` / `eval()`), preventing Content Security Policy (CSP) `unsafe-eval` violations when running inside Chrome DevTools frontend, avoiding runtime `fs.readFileSync` calls in browser/bundled contexts, and keeping `Ajv` out of the client bundle.
- **ESM Format Validation:** Imports `uri` and `date-time` format validators statically from `ajv-formats/dist/formats.js` rather than bundling the full `ajv-formats` dynamic plugin.
- **Lighthouse Logger:** Replaced raw `console.log` with `lighthouse-logger`.

## Updating Conformance Script

Upstream schema and conformance test synchronization is checked regularly during dependency upgrades (via `core/scripts/upgrade-deps.sh`) and monitored weekly via CI (`.github/workflows/cron-weekly.yml` with `node core/scripts/update-ard-spec.js --check`).

When upstream changes are detected:
1. Run `yarn update:ard-spec` to fetch the latest `ai-catalog.schema.json` and bump the pinned commit SHA.
2. Review the printed diff of `conformance/bin/conformance-test` and adapt `third-party/ard/ard.js` to match any updated validation rules.
3. Run `yarn build-ard-schema` to regenerate the standalone validator (`schema-validator.js`).
4. Run `yarn mocha third-party/ard/ard-test.js` to verify test conformance.

