# ARD Conformance Validator

This is a JavaScript port of the Agentic Resource Discovery (ARD) Conformance Testing Tool.

The original Python script is located in the `ards-project/ard-spec` repository:
[https://github.com/ards-project/ard-spec/blob/main/conformance/bin/conformance-test](https://github.com/ards-project/ard-spec/blob/main/conformance/bin/conformance-test)

## Modifications for Lighthouse:
While the validation rules and test suite maintain 1:1 parity with the reference suite, the following adaptations were made for Lighthouse integration:
- **Structured Error Return:** `ConformanceTester` stores structured objects (`{ element, message }`) in `errors` and `warnings` instead of formatted ANSI CLI strings.
- **Precompiled Standalone Validator (`schema-validator.js`):** Uses `build/build-ard-schema.js` (`yarn build-ard-schema`) to precompile `ai-catalog.schema.json` into a pure, standalone JavaScript validator (`schema-validator.js`) ahead of time using `Ajv2020` and `ajv/dist/standalone`. This eliminates runtime dynamic compilation (`new Function()` / `eval()`), preventing Content Security Policy (CSP) `unsafe-eval` violations when running inside Chrome DevTools frontend, avoiding runtime `fs.readFileSync` calls in browser/bundled contexts, and keeping `Ajv` out of the client bundle.
- **ESM Format Validation:** Imports `uri` and `date-time` format validators statically from `ajv-formats/dist/formats.js` rather than bundling the full `ajv-formats` dynamic plugin.
- **Lighthouse Logger:** Replaced raw `console.log` with `lighthouse-logger`.
