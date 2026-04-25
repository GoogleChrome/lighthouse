# DevTools Tests

This runs the DevTools e2e tests with latest Lighthouse.

`third-party/devtools-tests` contains all of our e2e tests.

## Run

```sh
pnpm test-devtools

# Run the test runner, without getting the latest DevTools commits like `pnpm test-devtools` does.
# This still bundles Lighthouse + rolls to DevTools before running the tests.
SKIP_DOWNLOADS=1 pnpm test-devtools
```
