# Axe

We use the internal `valid-langs.js` module in the axe package in the `href` audit.

The axe package is not published with a `package.json` that allows importing
of its `lib`, so we must extract it.
