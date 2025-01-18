### Release guide for maintainers

This doc is only relevant to core members.

## Release Policy

### Cadence

We aim to release every 4 week, one day after the [expected Chromium branch point](https://www.chromium.org/developers/calendar). These are Wednesdays.

Major version bumps will be the first release of April and October. The due date and progress of major milestones are tracked in https://github.com/GoogleChrome/lighthouse/milestones.

For example, following this schedule, we will attempt a release on these dates:

* _Sep 6 2023_ (Ships in M119, after M118 branch point)
* _Oct 4 2023_ (Ships in M120, after M119 branch point)
* ...

The planned ship dates are added to the internal Lighthouse calendar.

If a release is necessary outside these scheduled dates, we may choose to skip the next scheduled release.

In general, the above release dates are when new versions will be available in npm. Within 2 weeks, it will be reflected in LR / PSI. Some 10 weeks later, it will be available in Stable Chrome.

### Release manager

Release manager is appointed, according to the list below. However, if the appointed manager is absent, the next engineer in line in the list would own it.

    @cjamcl, @adamraine

### Versioning

We follow [semver](https://semver.org/) versioning semantics (`vMajor.Minor.Patch`). Breaking changes will bump the major version. New features or bug fixes will bump the minor version. If a release contains no new features, then we'll only bump the patch version.

## Release Process

### Update various dependencies

In general, Lighthouse should be using the latest version of all of these dependencies:

1. https://github.com/GoogleChrome/lighthouse-stack-packs
1. `puppeteer` and `puppeteer-core`
1. `third-party-web`
1. `axe-core`
1. `js-library-detector`
1. `chrome-launcher`
1. `chrome-devtools-frontend`
1. `devtools-protocol`

### On the scheduled release date

Before starting, you should announce to the LH eng channel that you are releasing,
and that no new PRs should be merged until you are done.

### Lightrider

There is a cron that rolls the latest Lighthouse to the Lightrider canary feed.
Make sure it has run recently, and there were no errors that require an upstream
fix in Lighthouse

For more, see the internal README for updating Lighthouse: go/lightrider-doc

Hold on submitting a CL until after cutting a release.

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
npm publish

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

### Lightrider

Roll to Lightrider canary, and alert LR team that the next version is ready to be rolled to stable.

### Done

Yay!
