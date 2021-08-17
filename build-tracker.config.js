'use strict';

// https://buildtracker.dev/docs/installation/#upload-your-builds

const Comparator = require('@build-tracker/comparator').default;
const ArtifactDelta = require('@build-tracker/comparator/dist/ArtifactDelta').default;
const {formatBytes} = require('@build-tracker/formatting');
const fetch = require('node-fetch');

const buildTrackerGithubToken = process.env.GH_DTBOT_TOKEN;
const applicationUrl = 'https://lh-build-tracker.herokuapp.com';
// What kind of sizes to report (stat, gzip, brotli)
const SIZE_KEY = 'stat';

module.exports = {
  applicationUrl,
  // Budgets for these are defined in https://github.com/paulirish/lh-build-tracker/blob/master/build-tracker.config.js
  // TODO, move some warn-levels to error
  artifacts: [
    'dist/lightrider/lighthouse-lr-bundle.js',
    'dist/extension/scripts/lighthouse-ext-bundle.js',
    'dist/lighthouse-dt-bundle.js',
    'dist/gh-pages/viewer/src/bundled.js',
    'dist/gh-pages/treemap/src/bundled.js',
    'dist/lightrider/report-generator-bundle.js',
    'dist/dt-report-resources/report.js',
    'dist/dt-report-resources/report-generator.js',
  ],
  onCompare: compareBuildsAndReportGhStatus,
};


// Thanks to Oliver J Ash! https://github.com/paularmstrong/build-tracker/issues/199
function compareBuildsAndReportGhStatus(data) {
  const {comparatorData} = data;
  const comparator = Comparator.deserialize(comparatorData);

  // Nice table display of the results and diff
  console.log(comparator.toMarkdown());

  if (comparator.builds.length === 1) {
    // We need 2 builds to provide a useful comparison, so if there is only one build, we exit early.
    return Promise.reject(
      new Error(
        `Expected comparator to have exactly 2 builds, but it only has 1. ` +
        `This most likely means the base branch hasn't finished building yet. ` +
        `Retry this build when the base branch has finished building. ` +
        `Note you will need to push a new commit.`
      )
    );
  }

  const formatDelta = allArtifactDelta =>
  `${formatBytes(allArtifactDelta.sizes[SIZE_KEY])} (${(
    allArtifactDelta.percents[SIZE_KEY] * 100
  ).toFixed(1)}%)`;

  const getSummaryStats = (parentBuild, build) => {
    const parentBuildSum = parentBuild.getSum(parentBuild.artifactNames);
    const buildSum = build.getSum(build.artifactNames);
    const allArtifactDelta = new ArtifactDelta('All', [], buildSum, parentBuildSum, false);
    const formattedDelta = formatDelta(allArtifactDelta);
    const formattedTotalSize = formatBytes(buildSum[SIZE_KEY]);
    const summaryStats = [
      `Change: ${formattedDelta}`,
      `Total: ${formattedTotalSize}`,
    ].join(' ');
    return summaryStats;
  };

  const parentBuild = comparator.builds[0];
  const build = comparator.builds[1];
  const targetUrl =
    `${applicationUrl}/builds/` +
    `${build.getMetaValue('parentRevision')}/${build.getMetaValue('revision')}`;

  const summaryStats = getSummaryStats(parentBuild, build);

  const isSuccess = comparator.errors.length === 0;
  const hasWarnings = comparator.unexpectedHashChanges.length || comparator.warnings.length;

  const summary = [hasWarnings ? '⚠️  See report.' : undefined, summaryStats]
    .filter(s => s !== undefined)
    .join(' ');

  console.log(`\n${summary}`);

  return postGHStatusForSha(
    {
      // Note: we don't use the `build` revision because—in a pull request build—this will
      // represent a merge commit "between the source branch and the upstream branch". This commit
      // doesn't actually exist in the PR.
      // https://docs.travis-ci.com/user/pull-requests/#how-pull-requests-are-built
      sha: build.meta.revision,
      state: isSuccess ? 'success' : 'failure',
      targetUrl,
      description: summary,
    },
    {
      buildTrackerGithubToken,
    }
  );
}


async function postGHStatusForSha({sha, state, targetUrl, description}, {buildTrackerGithubToken}) {
  // https://developer.github.com/v3/repos/statuses/#create-a-status
  fetch(`https://api.github.com/repos/GoogleChrome/lighthouse/statuses/${sha}`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${buildTrackerGithubToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      state,
      target_url: targetUrl,
      description,
      context: 'Build Tracker',
    }),
  }).then(async response => {
    if (response.ok) return;
    const json = await response.json();
    throw new Error(`GH API not OK. Status: ${response.status}. Body: ${JSON.stringify(json)}`);
  });
}
