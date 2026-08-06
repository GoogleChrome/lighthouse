# ARD Conformance Validator

This is a JavaScript port of the Agentic Resource Discovery (ARD) Conformance Testing Tool.

The original Python script is located in the `ards-project/ard-spec` repository:
[https://github.com/ards-project/ard-spec/blob/main/conformance/bin/conformance-test](https://github.com/ards-project/ard-spec/blob/main/conformance/bin/conformance-test)

## Modifications for Lighthouse:
While the validation rules and test suite maintain 1:1 parity with the reference suite, the following adaptations were made for Lighthouse integration:
- **Structured Error Return:** `ConformanceTester` stores structured objects (`{ element, message }`) in `errors` and `warnings` instead of formatted ANSI CLI strings.
- **Ajv (Draft 2020-12):** Uses `Ajv2020` with `ajv-formats` for strict Draft 2020-12 JSON Schema validation.
- **Inlined JSON Schema:** Statically inlines `ai-catalog.schema.json` via `fs.readFileSync(path.join(__dirname, ...))` and `build/plugins/inline-fs.js` for DevTools and browser bundling compatibility.
- **Lighthouse Logger:** Replaced raw `console.log` with `lighthouse-logger`.
