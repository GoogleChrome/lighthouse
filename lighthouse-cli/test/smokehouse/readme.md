# Smokehouse

Smokehouse is the Lighthouse end-to-end/smoke test runner. It takes in a set of URLs (usually pointing to custom-built test sites), runs Lighthouse on them, and compares the results against a set of expectations.

By default this is done using the Lighthouse CLI (to exercise the full pipeline) with the tests listed in [`smokehouse/test-definitions/core-tests.js`](./test-definitions/core-tests.js).

## Options

See [`SmokehouseOptions`](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-cli/test/smokehouse/smokehouse.js#L23).

## Test definitions

| Name           | Type                               | Description                                                                                                                      |
| -------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | `string`                           | The string identifier of the test.                                                                                               |
| `expectations` | `{lhr: Object, artifacts: Object}` | See below.                                                                                                                       |
| `config`       | `LH.Config.Json` (optional)        | An optional Lighthouse config. If not specified, the default config is used.                                                     |
| `runSerially`  | `boolean` (optional)               | An optional flag. If set to true, the test won't be run in parallel to other tests. Useful if the test is performance sensitive. |

### Expectations

The smoke test expectations can assert the values of the Lighthouse result (the `lhr`) and gathered `artifacts` for multiple URLs. The URL to be tested is specified in the expectations's `requestedUrl` field.

The expectations are asserted as a subset of the actual results: all values in the expectations must be in the actual results, but not all actual results must be asserted.

Examples can be found in the [core tests](./test-definitions/).

### Special numeric expectations

If checking a number somewhere in the Lighthouse results, numeric comparisons can be used in place of a raw expected number. This allows asserting ranges or categories of numbers where the exact value isn't necessarily important, or to allow for expected variability in a test.

The comparator is specified with a string, and the actual value being tested must be a number. Whitespace may be included in the string for readability.

The following operators are supported:

| Operator | Example      |
| -------- | ------------ |
| `>`      | `'>0'`       |
| `>=`     | `'>=5'`      |
| `<`      | `'<1'`       |
| `<=`     | `'<=10'`     |
| `+/-`    | `'100+/-10'` |
| `±`      | `'100±10'`   |

**Examples**:
| Actual | Expected | Result |
| -- | -- | -- |
| `{timeInMs: 50}` | `{timeInMs: '>0'}` | ✅ PASS |
| `{numericValue: 3969.135}` | `{numericValue: '1000±100'}` | ❌ FAIL |

### Special string expectations

If checking a string somewhere in the Lighthouse results, a regular expression can be used in place of a string literal.

**Examples**:
| Actual | Expected | Result |
| -- | -- | -- |
| `{displayValue: '4.0 s'}` | `{displayValue: /^\d+\.\d+/}` | ✅ PASS |
| `{url: 'http://example.com'}` | `{url: /^https/}` | ❌ FAIL |

### Special array expectations

Individual elements of an array can be asserted by using numeric properties in an object, e.g. asserting the third element in an array is 5: `{2: 5}`.

However, if an array literal is used as the expectation, an extra condition is enforced that the actual array _must_ have the same length as the provided expected array.

**Examples**:
| Actual | Expected | Result |
| -- | -- | -- |
| `[{url: 'http://badssl.com'}, {url: 'http://example.com'}]` | `{1: {url: 'http://example.com'}}` | ✅ PASS |
| `[{timeInMs: 5}, {timeInMs: 15}]` | `{length: 2}` | ✅ PASS |
| `[{timeInMs: 5}, {timeInMs: 15}]` | `[{timeInMs: 5}]` | ❌ FAIL |

## Pipeline

The different frontends launch smokehouse with a set of tests to run. Smokehouse then coordinates the tests using a particular method of running Lighthouse (CLI, as a bundle, etc).

```
Smokehouse Frontends                                        Lighthouse Runners
+------------+
|            |
|   bin.js   +----+                                           +--------------+
|            |    |                                           |              |
+------------+    |                                       +-->+    cli.js    |
                  |                                       |   |              |
+------------+    |            +---------------+          |   +--------------+
|            |    | testDefns> |               |  config> |
|   node.js  +---------------->+ smokehouse.js +<---------+
|            |    |            |               |   <lhr   |   +--------------+
+------------+    |            +-------+-------+          |   |              |
                  |                    ^                  +-->+   bundle.js  |
+------------+    |                    |                      |              |
|            |    |                    |                      +--------------+
|   lib.js   +----+                    v
|            |                +--------+--------+
+------------+                |                 |
                              |  report/assert  |
                              |                 |
                              +-----------------+
```

### Smokehouse frontends

- `frontends/smokehouse-bin.js` - runs smokehouse from the command line
- `lib` - configurable entrypoint to smokehouse, can be bundled to run in a browser environment
- `node.js` - run smokehouse from a node process

### Smokehouse

- `smokehouse.js` - takes a set of smoke-test definitions and runs them via a passed-in runner. Smokehouse is bundleable and can run in a browser as long as runner used is bundleable as well.

### Lighthouse runners

- `lighthouse-runners/cli.js` - the original test runner, exercising the Lighthouse CLI from command-line argument parsing to the results written to disk on completion.
- `lighthouse-runners/bundle.js` - a smoke test runner that operates on an already-bundled version of Lighthouse for end-to-end testing of that version.

## Custom smoke tests (for plugins et al.)

Smokehouse comes with a core set of test definitions, but it can run any set of tests. Custom extensions of Lighthouse (like plugins) can provide their own tests and run them via the same infrastructure. For example:

- have a test site on a public URL or via a local server (e.g. `https://localhost:8080`)
- create a test definition (e.g. in `plugin-tests.js`)
  ```js
  const smokeTests = [{
    id: 'pluginTest',
    expectations: require('./expectations.js'),
    // config: ..., // If left out, uses default LH config
    // runSerially: true, // If test is perf-sensitive
  };
  module.exports = smokeTests;
  ```
- create a test expectations file (e.g. `expectations.js`)
  ```js
  const expectations = [{
    lhr: {
      requestedUrl: 'http://localhost:8080/index.html',
      finalUrl: 'http://localhost:8080/index.html',
      audits: {
        'preload-as': {
          score: 1,
          displayValue: /^Found 0 preload requests/,
        },
      },
    },
  };
  module.exports = expectations;
  ```
- run smokehouse

  `yarn smoke --tests-path plugin-tests.js`
