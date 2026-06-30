---
name: lighthouse-verification
description: Instructions for how to validate changes made to Lighthouse. Must invoke when making changes to Lighthouse.
---

# Lighthouse verification

Run a subset of the unit tests like this:

```
yarn mocha test/files/to/run
```

Don't run "yarn unit" - it takes too long.

Run typechecking and linter:

```
yarn type-check
yarn lint --fix
```

Make sure to run some unit tests and the type-checker / linter after making changes.

Always run `yarn update:sample-json` after making any change.

If you modify any user-facing strings, regenerate the localization files:

```
yarn i18n:collect-strings
```
