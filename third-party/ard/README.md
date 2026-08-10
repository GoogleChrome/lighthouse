# ARD Conformance Validator

This is a JavaScript port of the Agentic Resource Discovery (ARD) Conformance Testing Tool.

The original Python script is located in the `ards-project/ard-spec` repository:

- **Upstream Repository**: https://github.com/ards-project/ard-spec
- **Source Script**: `conformance/bin/conformance-test`
- **Schema**: `spec/schemas/ai-catalog.schema.json`
- **Pinned Commit SHA**: `47042e5c0c32c0b58634f5b4a093fced28192dbf`

## Upgrades

Upstream schema and asset synchronization is handled as part of Lighthouse's dependency upgrade workflow (`core/scripts/update-ard-spec.js` invoked by `upgrade-deps.sh`).
