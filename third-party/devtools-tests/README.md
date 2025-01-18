# Devtools e2e Tests

These tests are rolled into the Chromium DevTools Frontend codebase. They "belong" to the devtools frontend, but are truly defined in this Lighthouse repo.

Run with `sh core/test/devtools-tests/test-locally.sh`.

See `core/test/devtools-tests/README.md` for more.

## Sync

```sh
rsync -ahvz --exclude='OWNERS' ~/src/devtools/devtools-frontend/test/e2e/lighthouse/ third-party/devtools-tests/e2e/lighthouse/
rsync -ahvz --exclude='OWNERS' ~/src/devtools/devtools-frontend/test/e2e/resources/lighthouse/ third-party/devtools-tests/e2e/resources/lighthouse/
```
