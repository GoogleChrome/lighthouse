### Release guide for maintainers

This doc is only relevant to core members.

## Release Policy

### Cadence

We aim to release major version bumps no more than once a year.

### Versioning

We follow [semver](https://semver.org/) versioning semantics (`vMajor.Minor.Patch`). Breaking changes will bump the major version. New features or bug fixes will bump the minor version. If a release contains no new features, then we'll only bump the patch version.

## Release Process

### Update various dependencies

In general, Lighthouse should be using the latest version of its critical dependencies. These are listed in the following script. It's ok to not be on the very latest, use your judgement.

```sh
bash core/scripts/upgrade-deps.sh
```

Follow the instructions printed to stdout re: testing in LR.

### On the scheduled release date

Before starting, you should announce to the LH eng channel that you are releasing,
and that no new PRs should be merged until you are done.

### Lightrider

Before starting a release, roll `main` to google3 and validate Lightrider tests continue to pass (or at least fail in expected ways).

For more, see the internal README for updating Lighthouse: go/lightrider-doc-landing

### Open the PR

Now that the integrations are confirmed to work, go back to `lighthouse` folder.

```sh
# Prepare the commit, replace x.x.x with the desired version
bash ./core/scripts/release/prepare-commit.sh x.x.x
```

1. Edit changelog.md before opening the PR
1. Open the PR with title `vx.x.x`
1. Hold until approved and merged

### Cut the release

```sh
# Package everything for publishing.
bash ./core/scripts/release/prepare-package.sh

# Make sure you're in the Lighthouse pristine repo.
cd ../lighthouse-pristine

# Last chance to abort.
git status
git log

# Publish tag.
git push --tags

# Publish to npm.
# This part happens in GitHub CI because of the tag push - see the publish.yml worfklow.
# No need to wait before doing next step.

# Publish viewer and treemap.
yarn deploy-viewer
yarn deploy-treemap
```

### Extensions

The extensions rarely change. Run `git log clients/extension` to see the latest changes,
and re-publish them to the Chrome and Firefox extension stores if necessary.

To test:

- run `yarn build-extension`
- go to chrome://extensions/
- click "load packed", select `dist/extension-chrome-package`
- manually test it

To publish:

```sh
# Publish the extensions (if it changed).
open https://chrome.google.com/webstore/developer/edit/blipmdconlkpinefehnmjammfjpmpbjk
cd dist/extension-package/
echo "Upload the package zip to CWS dev dashboard..."
# Be in lighthouse-extension-owners group
# Open <https://chrome.google.com/webstore/developer/dashboard>
# Click _Edit_ on lighthouse
# _Upload Updated Package_
# Select `lighthouse-X.X.X.X.zip`
# _Publish_ at the bottom

# For Firefox: https://addons.mozilla.org/en-US/developers/addon/google-lighthouse/versions/submit/
```

### Chromium CL

```sh
git checkout vx.x.x # Checkout the specific version.
yarn devtools ~/src/devtools/devtools-frontend

cd ~/src/devtools/devtools-frontend
git new-branch rls
git commit -am "[Lighthouse] Roll Lighthouse x.x.x"
git cl upload -b 40543651
```

### DevTools MCP Roll

Update Lighthouse in the [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) repo. See [instructions](https://github.com/ChromeDevTools/chrome-devtools-mcp/pull/1825/changes#r3046586581).

From the `chrome-devtools-mcp` repo:
1. Update version in `package.json` and run `npm install`.
2. Checkout corresponding LH revision to sibling `../lighthouse`.
3. Run `npm run update-lighthouse`.
4. Commit the bundle. Update `tests/third_party_notices.test.ts` if new dependencies are added.

### Lightrider

Roll to google3.

### Done

Yay!
