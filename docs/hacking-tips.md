A few assorted scripts and tips to make hacking on Lighthouse a bit easier

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
node --trace-warnings lighthouse-cli http://example.com
```

## Iterating on the report

This will generate new reports from the same results json.

```sh
# capture some results first:
lighthouse --output=json http://example.com > temp.report.json

# quickly generate reports:
node generate_report.js > temp.report.html; open temp.report.html
```
```js
// generate_report.js
'use strict';

const ReportGenerator = require('./lighthouse-core/report/report-generator');
const results = require('./temp.report.json');
const html = ReportGenerator.generateReportHtml(results);

console.log(html);
```

## Debugging Travis via docker image

You can do a local docker image install of Travis to better inspect a travis build:

* [How to run travis-ci locally - Stack Overflow](https://stackoverflow.com/questions/21053657/how-to-run-travis-ci-locally)
* [Common Build Problems - Travis CI](https://docs.travis-ci.com/user/common-build-problems/#Troubleshooting-Locally-in-a-Docker-Image)

```sh
docker run --name travis-debug -dit travisci/ci-garnet:packer-1512502276-986baf0 /sbin/init
docker exec -it travis-debug bash -l

# once inside, change to travis user, rather than root
su - travis

# once on the travis user, make a clone of lighthouse and play around
```

```sh
# you may also want to mount a local folder into your docker instance.
# This will mount your local machines's ~/temp/trav folder into the container's /home/travis/mountpoint folder
docker run -v $HOME/temp/trav:/home/travis/mountpoint --name travis-debug -dit travisci/ci-garnet:packer-1496954857 /sbin/init

```

You can then run the travis commands (e.g. `travis compile`) to install an environment and run the build script:

[travis-ci/travis-build: .travis.yml =&gt; build.sh converter](https://github.com/travis-ci/travis-build#invocation)

## Using Audit Classes Directly, Providing Your Own Artifacts

See [gist](https://gist.github.com/connorjclark/d4555ad90ae5b5ecf793ad2d46ca52db).
