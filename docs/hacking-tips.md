A few assorted scripts and tips to make hacking on Lighthouse a bit easier

# Eng team resources

* [LH Build Tracker](https://lh-build-tracker.herokuapp.com/builds/limit/100) - plotted results of [build-tracker](../build-tracker.config.js) [data](../.github/workflows/ci.yml#:~:text=buildtracker)
* [LH PR Tracking](https://paulirish.github.io/lh-pr-tracking/) - stats about open PRs, collected [daily](https://github.com/paulirish/lh-pr-tracking/blob/master/.github/workflows/update-stats.yml).

## Evaluate Lighthouse's runtime performance

Lighthouse has instrumentation to collect timing data for its operations. The data is exposed at `LHR.timing.entries`.  You can generate a trace from this data for closer analysis.

![image](https://user-images.githubusercontent.com/39191/47525915-3c477000-d853-11e8-90a2-27036f93e682.png)
[View example trace](https://ahead-daughter.surge.sh/paulirish.json.timing.trace.html)

To generate, run `yarn timing-trace` with the LHR json:
```sh
lighthouse http://example.com --output=json --output-path=lhr.json
yarn timing-trace lhr.json
```

That will generate `lhr.json.timing.trace.json`. Then, drag 'n drop that file into `chrome://tracing`.

## Unhandled promise rejections

Getting errors like these?

> (node:12732) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1)
> (node:12732) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.

Use [`--trace-warnings`](https://medium.com/@jasnell/introducing-process-warnings-in-node-v6-3096700537ee) to get actual stack traces.

```sh
node --trace-warnings cli http://example.com
```

## Iterating on the report

This will generate new reports from the same results json.

```sh
# capture some results first:
lighthouse http://example.com --output=json > temp.report.json

# quickly generate reports:
node generate_report.js > temp.report.html; open temp.report.html
```
```js
// generate_report.js

import {ReportGenerator} from './report/generator/report-generator.js';
import results from './temp.report.json' assert { type: 'json' };
const html = ReportGenerator.generateReportHtml(results);

console.log(html);
```

## Using Audit Classes Directly, Providing Your Own Artifacts

See [gist](https://gist.github.com/connorjclark/d4555ad90ae5b5ecf793ad2d46ca52db).

## Mocking modules with testdouble

We use `testdouble` and `mocha` to mock modules for testing. However, [mocha will not "hoist" the mocks](https://jestjs.io/docs/ecmascript-modules#module-mocking-in-esm) so any imports that depend on a mocked module need to be done dynamically *after* the testdouble mock is applied.

Analyzing the dependency trees can be complicated, so we recommend importing as many modules as possible (read: all non-test modules, typically) dynamically and only using static imports for test libraries (e.g. `testdouble`, `jest-mock`, `assert`). For example:

```js
import jestMock from 'jest-mock';
import * as td from 'testdouble';

await td.replaceEsm('./module-to-mock.js', {
  mockedFunction: jestMock.fn(),
});

// module-to-mock.js is imported somewhere in the dependency tree of root-module.js
const rootModule = await import('./root-module.js');
```
