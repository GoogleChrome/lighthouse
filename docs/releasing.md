### Release guide for maintainers

This doc is only relevant to core member.

## Release Policy

### Cadence

We aim to release every 3 weeks. Our schedule is set as follows: One day before the [expected Chromium branch point](https://www.chromium.org/developers/calendar) (which is every six weeks) and again exactly 3 weeks after that day.

For example, following this schedule, we will attempt a release on these dates:

* _Oct 15 2019_
* Nov 5 2019
* _Nov 26 2019_
* Dec 17 2019
* ...

Italicized dates are the day before the expected Chromium branch point.

The planned ship dates are added to the internal Lighthouse calendar.

If a release is necessary outside these scheduled dates, we may choose to skip the next scheduled release.

In general, the above release dates are when new versions will be available in npm. About a week later, it will be reflected in LR / PSI. Some 10 weeks later, it will be available in Stable Chrome.

### Release manager

Release manager is appointed, according to the list below. However, if the appointed manager is absent, the next engineer in line in the list would own it.

    bckenny, paulirish, patrickhulce

Release manager follows the below _Release Process_.

### Release publicity

Note: actively undergoing changes by @exterkamp and @egsweeny.

1. Release mgr copies changelog to a new [Releases](https://github.com/GoogleChrome/lighthouse/releases). Tags and ships it.
1. Release mgr tells the _LH public_ Hangout chat about the new version.
1. V & Kayce write and publish the [/updates](https://developers.google.com/web/updates/) blog post
1. Paul writes the tweet (linking the /updates post) and sends it on [@____lighthouse](https://twitter.com/____lighthouse).
1. Paul prepares a roll for DevTools frontend

### Versioning

We follow [semver](https://semver.org/) versioning semantics (`vMajor.Minor.Patch`). Breaking changes will bump the major version. New features or bug fixes will bump the minor version. If a release contains no new features, then we'll only bump the patch version.


## Release Process

Note: You'll wanna be on a Linux machine, since the Lightrider step will require that.

### On the scheduled release date

Before starting, you should announce to the LH eng channel that you are releasing,
and that no new PRs should be merged until you are done.

```sh
# Run the tests.
bash ./lighthouse-core/scripts/release/test.sh
# Change into the newly-created pristine folder.
cd ../lighthouse-pristine
```

Confirm DevTools integration will work:
```sh
# You should have Chromium already checked out at ~/chromium/src
# See: https://www.chromium.org/developers/how-tos/get-the-code

# Roll to Chromium folder.
yarn devtools

# Checkout latest Chromium code.
cd ~/chromium/src
git pull
git new-branch lh-roll-x.x.x
gclient sync
autoninja -C out/Release chrome blink_tests

# Run tests and rebase.
yarn --cwd ~/chromium/src/third_party/blink/renderer/devtools test 'http/tests/devtools/audits/*.js' --reset-results
# Verify the changes are expected.
git diff

# Verify that the Audits panel still works. Consider the new features that have been added.
# If anything is wrong, stop releasing, investigate, land a fix and start over.

# For bonus points, add some tests covering new features. Either a new test, or an extra
# assertion in an existing test.

git cl upload --bypass-hooks
# Go to Gerrit, run CQ dry run, ensure the tests all pass.
```

Confirm Lightrider integration will work:
```sh
# See the internal README for updating Lighthouse.

# Test things out locally, if happy, deploy to canary and see how the graphs react. 20 minutes should be enough time.

# Do the stuff in "Test LR changes in Canary".
# go/lightrider-doc#test-lr-changes-in-canary

# Verify that Lightrider works properly, and is generating reports fully. Consider the new features that have been added.
# Note: if the changes include proto changes make sure that the API has those new fields.
# If anything is wrong, stop releasing, investigate, land a fix and start over.

# For bonus points, add some tests covering new features. Either a new test, or an extra
# assertion in an existing test.
```

Now that the integrations are confirmed to work, go back to `lighthouse` folder.

```sh
# Prepare the commit, replace x.x.x with the desired version
bash ./lighthouse-core/scripts/release/prepare-commit.sh x.x.x

# Open the PR and await merge...
echo "It's been merged! 🎉"

# One last test (this script uses origin/master, so we also get the commit with the new changelog - that commit should be HEAD).
bash ./lighthouse-core/scripts/release/test.sh
# Package everything for publishing
bash ./lighthouse-core/scripts/release/prepare-package.sh

# Make sure you're in the Lighthouse pristine repo we just tested.
cd ../lighthouse-pristine

# Sanity check: last chance to abort.
git status
git log

# Publish tag.
git push --follow-tags

# Publish to npm.
npm publish

# Publish viewer.
yarn deploy-viewer

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

# * Tell the world!!! *
echo "Complete the _Release publicity_ tasks documented above"

# Roll the tagged commit to Chromium and update the CL you made. Do not land, see next section.
# Roll the tagged commit to LR and land the CL.
```

### Chromium CL

If this is a branching week, wait until _after_ the branch point email, then land the CL.

Otherwise, you can land it immediately.

### The following Monday

Evaluate LR staging, if all looks good, promote to production!
