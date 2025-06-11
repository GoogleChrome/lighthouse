# Running Lighthouse on in Your Integration Jest Tests

See [example-lh-auth.test.js](./example-lh-auth.test.js) for an example of how to run Lighthouse in your Jest tests on pages in both an authenticated and non-authenticated session. This recipe builds on the [auth docs](../auth).

```sh
# Be in this folder: docs/recipes/integration-test

# Build Lighthouse
yarn --cwd ../../..
yarn --cwd ../../.. build-report
yarn --cwd ../../.. build-pack

# Install deps for this recipe.
yarn
yarn --cwd ../auth

# Run the recipe.
yarn test
```
