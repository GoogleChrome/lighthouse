# Running Lighthouse on in Your Integration Jest Tests

See [example-lh-auth.test.js](./example-lh-auth.test.js) for an example of how to run Lighthouse in your Jest tests on pages in both an authenticated and non-authenticated session. This recipe builds on the [auth docs](../auth).

```sh
# Be in this folder: docs/recipes/integration-test

# Install deps.
yarn
yarn --cwd ../auth

# Test.
yarn test
```
