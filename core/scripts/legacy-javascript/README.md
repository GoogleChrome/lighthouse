# `legacy-javascript` Validation Tool

Creates many projects using specific babel transforms / polyfills (called variants) and aggregates the results of the LegacyJavascript audit for each.

Run:

```sh
yarn
node run.js
# STAGE=build|audit|all to just build the audits or run LegacyJavascript on them. Defaults to both (`all`).
```

`summary-signals.json` - summarizes the signals that LegacyJavascript finds for each variant. Variants in `variantsMissingSignals` (excluding `core-js-3-preset-env-esmodules/true`) signify a lack of detection for that variant. Full coverage isn't necessary.

`summary-sizes.json` - lists the size of each minified variant. Useful for understanding how many bytes each polyfill / transform adds.

## Interpreting Results

There are two outputs to this test:

* summary-sizes.txt
* summary-signals.json

`summary-sizes.txt` lists each of the variants (grouped by type) and sorted by their byte size. This is mostly a diagnostic tool and changes in this can be ignored. This is checked in for purely informative reasons–whenever lockfile is updated, changes in `summary-sizes.txt` give an indication of how transforms or polyfills might be changing in the developer ecosystem. It's also a quick reference for the relative cost of each of these transform/polyfills.

`summary-signals.json` is for preventing regressions in the audit. `.variantsMissingSignals` should at least have the babel-preset-env=true variant (since this whole test is about finding signals when babel-preset-env is NOT used). There may be more missing variants since it's just a heuristic. The number of these should only go down as the pattern matching improves.

For the signals of each variant, the expectation is that the number of them only goes up.

## Notes

Digging into core-js: https://gist.github.com/connorjclark/cc583554ff07cba7cdc416c06721fd6a
