---
name: update-trace-engine
description: Build, validate, publish, and roll @paulirish/trace_engine from devtools-frontend into Lighthouse. Invoke when asked to update or roll the trace_engine package.
---

# Update `@paulirish/trace_engine`

Lighthouse consumes Chrome DevTools' trace processor (`front_end/models/trace`) via the standalone `@paulirish/trace_engine` npm package, built from the `trace-engine-lib` branch of `paulirish/devtools-frontend`.

## What lives where

| Location | Purpose | Notes |
|---|---|---|
| `devtools-frontend` checkout (branch `trace-engine-lib`) | Source & packaging scripts | Tracks `origin/main` (`https://chromium.googlesource.com/devtools/devtools-frontend`) + packaging scripts in `scripts/trace/`. Common local path: `~/devtools/devtools-frontend` (ask user if not found). |
| `scripts/trace/prep-trace-engine-package.sh` (in `devtools-frontend`) | Builds `out/TraceEngine` and prepares standalone package | Converts `export const enum` → `export enum` in `front_end/models/trace/**/*.ts`, builds with `gn` + `autoninja`, applies shims from `scripts/trace/replacements/`, extracts insight locale strings, and invokes `copy-build-trace-engine-for-publish.sh`. |
| `scripts/trace/copy-build-trace-engine-for-publish.sh` (in `devtools-frontend`) | Copies dist to `$HOME/code/trace_engine` and tests | Copies `out/TraceEngine/dist` to `$HOME/code/trace_engine`, runs `npm install` and `npm test` (Mocha tests in `test/test-trace-engine.mjs` + `tsc --build ./tsconfig.json`). |
| `$HOME/code/trace_engine` | Standalone npm package staging directory | Where `npm version` and `npm publish` are run. |
| `core/lib/trace-engine.js` (in Lighthouse) | Lighthouse entry point for `@paulirish/trace_engine` | Re-exports `TraceProcessor`, `TraceHandlers`, `Insights`, `Helpers`, and `Types`. |

## Procedure

### 1. Merge `origin/main` into `trace-engine-lib` in `devtools-frontend`

1. Find the previous `devtools-frontend` `main` commit SHA from the most recent `deps: upgrade trace_engine` commit or PR in Lighthouse (or via `git log -n 1 --merges --pretty=format:"%P"` on `trace-engine-lib`).
2. In the `devtools-frontend` checkout:
   ```sh
   git checkout trace-engine-lib
   git fetch origin main
   git merge origin/main --no-edit
   ```
3. Record the commit range `<old_sha>...<new_sha>` and inspect upstream changes:
   ```sh
   git log --oneline <old_sha>..<new_sha> -- front_end/models/trace front_end/models/cpu_profile
   ```
4. If there are merge conflicts in `front_end/models/trace/**/*.ts` due to `export const enum` vs `export enum`, resolve in favor of `origin/main` — `prep-trace-engine-package.sh` automatically converts `export const enum` to `export enum`.

### 2. Build and test the standalone package

Ensure `depot_tools` (`gn`, `autoninja`) and Node/npm are on `PATH`, then run:

```sh
scripts/trace/prep-trace-engine-package.sh
```

This builds `out/TraceEngine`, populates `$HOME/code/trace_engine`, and runs `npm test` (`mocha` + `tsc --build ./tsconfig.json`).

#### Fixing build or test failures in `trace-engine-lib`

- **TypeScript (`tsc --build ./tsconfig.json`) errors in `$HOME/code/trace_engine`**:
  - `prep-trace-engine-package.sh` replaces several DevTools modules using `scripts/trace/replacements/` so Lighthouse can bundle `trace_engine` into an IIFE (`esbuild`) and defer localization (`LH.IcuMessage`):
    - `HostRuntime.js`: synchronous stub replacing top-level `await` in `core/platform/HostRuntime.js`.
    - `UIString.d.ts` & `i18n.{js,d.ts}`: types `LocalizedString` as a deferred `{i18nId, values}` object instead of a branded `string`. If a file in `core/platform/` (such as `UserVisibleError.d.ts`) fails type-checking because it expects `LocalizedString` to be assignable to `string` and isn't needed by `models/trace`, stub its `.d.ts` in `prep-trace-engine-package.sh` (`echo 'export {};' > "$dist/core/platform/<File>.d.ts"`).
    - `common.{js,d.ts}`, `sdk.d.ts`, `crux-manager.d.ts`: minimal stubs for `core/common`, `core/sdk`, and `models/crux-manager`. Update these if `models/trace` references new symbols from those modules.
- **Mocha (`test/test-trace-engine.mjs`) failures**:
  - If an assertion in `scripts/trace/test/test-trace-engine.mjs` fails due to an intentional upstream calculation change in `front_end/models/trace`, update `scripts/trace/test/test-trace-engine.mjs` and re-run `scripts/trace/copy-build-trace-engine-for-publish.sh`.
- Commit any updated files on `trace-engine-lib` and push to Paul's fork (`git push paulirish trace-engine-lib`) when requested.

### 3. Bump the package version

Determine the next patch version (`0.0.X` → `0.0.(X+1)`) from `package.json` in Lighthouse or `npm view @paulirish/trace_engine version --registry https://registry.npmjs.org/`:

```sh
cd $HOME/code/trace_engine
npm version v0.0.XXX --no-git-tag-version
```

### 4. Validate locally in Lighthouse before publishing

Copy the built package into Lighthouse's `node_modules/@paulirish/trace_engine` to validate before publishing to npm:

```sh
rm -rf node_modules/@paulirish/trace_engine/{models,core,generated,third_party,locales,test}
cp -rp $HOME/code/trace_engine/{models,core,generated,third_party,locales,package.json,tsconfig.json} node_modules/@paulirish/trace_engine/
```

Run the Lighthouse validation checks:

1. **Type-checking**:
   ```sh
   yarn type-check
   ```
   Fix any Lighthouse code or JSDoc types broken by upstream `TraceEngine` API/type changes (commonly in `core/audits/insights/`, `core/computed/`, `core/gather/gatherers/trace-elements.js`, or `core/lib/trace-engine.js`).

2. **Bundles**:
   ```sh
   yarn build-devtools && yarn build-lr && yarn build-devtools-mcp
   ```
   Confirms `esbuild` can bundle `trace_engine` into IIFE (`dt-bundle.js`, Lightrider) and ESM without top-level `await` or missing module errors.

3. **Unit tests**:
   ```sh
   yarn mocha core/test/audits/insights/*-test.js core/test/audits/metrics-test.js core/test/audits/predictive-perf-test.js core/test/audits/byte-efficiency/byte-efficiency-audit-test.js core/test/computed/metrics/*-test.js core/test/computed/trace-engine-result-test.js core/test/computed/navigation-insights-test.js core/test/computed/entity-classification-test.js core/test/computed/tbt-impact-tasks-test.js
   INTERNAL_LANTERN_USE_TRACE=1 yarn mocha core/test/computed/metrics/*-test.js core/test/audits/metrics-test.js core/test/audits/predictive-perf-test.js
   ```
   Update test expectations and snapshots (`yarn mocha --update <test-file>`) where upstream changes intentionally affect metrics, insights, or Lantern trace simulations.

4. **Sample JSON, locale strings, flow fixtures, and Lantern baselines**:
   ```sh
   yarn update:sample-json
   bash core/scripts/assert-baseline-flow-result-unchanged.sh
   yarn test-lantern
   ```
   - If `assert-baseline-flow-result-unchanged.sh` fails due to expected changes, update flow fixtures with `yarn update:flow-fixtures`.
   - If `yarn test-lantern` reports expected metric changes on the Lantern dataset (or if `models/trace/lantern` changed upstream), update the Lantern baseline files (`core/test/fixtures/lantern-baseline-computed-values.json` and `core/test/fixtures/lantern-baseline-accuracy.json`):
     ```sh
     FORCE=1 ./core/scripts/lantern/update-baseline-lantern-values.js
     ./core/scripts/lantern/assert-baseline-lantern-values-unchanged.js
     ```
   - Review `git diff core/test/results/sample_v2.json` and `git diff shared/localization/locales/en-US.json` to make sure every change is accounted for by an upstream commit.

5. **Linter**:
   ```sh
   yarn lint --fix
   ```

### 5. Pause for npm publish

Once local validation passes, pause and ask the user to publish `$HOME/code/trace_engine` to npm (requires interactive npm authentication):

```sh
cd $HOME/code/trace_engine
npm publish --access public --registry https://registry.npmjs.org/
```

### 6. Roll `package.json`, `yarn.lock`, and open the PR

After the user confirms `@paulirish/trace_engine@0.0.XXX` is published on npm:

1. Update `"@paulirish/trace_engine": "0.0.XXX"` in `package.json` and run `yarn` to update `yarn.lock`.
2. Commit all changes (`deps: upgrade trace_engine to 0.0.XXX`).
3. Run `yarn diff:sample-json` after committing (note: `assert-strings-collected.sh` runs `git diff --exit-code shared/localization/locales/`, so uncommitted locale changes will cause it to fail).
4. Push the branch and open a PR against `GoogleChrome/lighthouse` with title `deps: upgrade trace_engine to 0.0.XXX` and description formatted like [PR #17307](https://github.com/GoogleChrome/lighthouse/pull/17307) (including the collapsible `<details><summary>` block with the full `git log <old_sha>...<new_sha> -- front_end/models/trace` output):

````markdown
Roll `@paulirish/trace_engine` from `0.0.OLD` to `0.0.NEW` (`<old_sha>...<new_sha>`).

https://chromium.googlesource.com/devtools/devtools-frontend.git/+log/<old_sha>..<new_sha>

### Highlights for Lighthouse

- **<Category>**:
  - **<Highlight>** ([CL <cl_number>](https://chromium-review.googlesource.com/c/devtools/devtools-frontend/+/<cl_number>)): <summary of upstream change and impact on Lighthouse>

`git log <old_sha>...<new_sha> -- front_end/models/trace`:

<details>
  <summary>Changelog (just front_end/models/trace, mostly relevant to our usage in LH)</summary>

```
<full output of: git log <old_sha>...<new_sha> -- front_end/models/trace>
```

</details>
````
