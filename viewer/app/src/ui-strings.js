/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview UI strings for the hosted Lighthouse web apps (Report Viewer &
 * Treemap). Collected into the shared localization files just like every other
 * Lighthouse UI string, so the website is translated with the same pipeline.
 */

const UIStrings = {
  /** Title of the Lighthouse Report Viewer page. Shown in the browser tab and as the main heading. */
  viewerTitle: 'Lighthouse Report Viewer',
  /** Instructions heading for loading an existing Lighthouse report into the viewer. */
  viewReportIntro: 'To view a report:',
  /** Instructions for loading a Lighthouse report by dragging its file onto the page. */
  dragAndDropFile: 'Drag \'n drop the file',
  /** Label of a button that opens a file picker to choose a Lighthouse report file from disk. */
  selectFileButton: 'or select a file',
  /** Instructions for loading a Lighthouse report by pasting its JSON contents or the URL of a GitHub Gist. */
  pasteJsonOrGist: 'Or, paste the JSON or a Gist URL',
  /** Suggestion to visit the Lighthouse Report Diff tool, which compares two Lighthouse reports. */
  diffToolHint: 'Also, perhaps visit the [Lighthouse Report Diff tool](https://googlechrome.github.io/lighthouse-ci/difftool/) to compare two reports.',
  /** Instructions heading for collecting a brand new Lighthouse report of a public web page. */
  collectReportIntro: 'To collect a fresh report of a public URL:',
  /** Suggestion to use the Lighthouse browser extension to collect a new report. */
  useBrowserExtension: 'Use the Lighthouse browser extension ([Chrome](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk) / [Firefox](https://addons.mozilla.org/en-US/firefox/addon/google-lighthouse/))',
  /** Suggestion to use the PageSpeed Insights website to collect a new report. */
  usePageSpeedInsights: 'Or, use [PageSpeed Insights](https://pagespeed.web.dev/)',

  /** Title of the Lighthouse Treemap page. Shown in the browser tab, the main heading and the page header. */
  treemapTitle: 'Lighthouse Treemap',
  /** Instructions for loading a Lighthouse result into the treemap by pasting it. */
  treemapHelpPaste: 'To view a treemap: paste the Lighthouse result JSON or a Gist URL.',
  /** Instructions for the alternative drag and drop way of loading a Lighthouse result. */
  treemapHelpDragDrop: 'You can also drag \'n drop the file or click here to select it.',

  /** Placeholder text for the input field where a GitHub Gist URL can be typed or pasted. */
  gistUrlPlaceholder: 'Enter or paste Gist URL',
  /** Label for the menu that changes the display language of the page. */
  localeSwitcherLabel: 'Language',

  /** Log message shown while waiting for PageSpeed Insights to return a Lighthouse report. */
  waitingForResults: 'Waiting for Lighthouse results ...',
  /** Log message shown while a report is being saved to GitHub. */
  savingToGithub: 'Saving report to GitHub...',
  /** Log message shown once a report has been saved to GitHub. */
  savedToGithub: 'Saved!',
  /** Log message shown while a report is being fetched from GitHub. */
  fetchingFromGithub: 'Fetching report from GitHub...',
  /**
   * @description Warning message shown when the GitHub API rate limit is close to being used up.
   * @example {42} used
   * @example {50} limit
   */
  approachingRateLimit: 'Approaching GitHub\'s rate limit. {used}/{limit} requests used. ' +
    'Consider signing in to increase this limit.',
  /**
   * @description Error message shown when a GitHub Gist does not contain a Lighthouse report file.
   * @example {.lighthouse.report.json} extension
   * @example {abc123} gistId
   */
  gistMissingReport: 'Failed to find a Lighthouse report (*{extension}) in gist {gistId}',
  /** Error message shown when a dropped or pasted file is not valid JSON. */
  couldNotParseJson: 'Could not parse JSON file.',
  /** Error message shown when the provided URL is not a valid URL. */
  invalidUrl: 'Invalid URL',
  /** Error message shown when the provided URL points to something that is not a GitHub Gist. */
  notAGist: 'URL was not a gist',
  /** Error message shown when PageSpeed Insights responds without a Lighthouse report. */
  psiNoResult: 'PSI did not return a Lighthouse Result',
  /**
   * @description Warning message shown when a report was created by an older version of Lighthouse.
   * @example {12.6.0} reportVersion
   * @example {13.0.0} currentVersion
   */
  olderReportWarning: 'Results may not display properly.\nReport was created with an earlier ' +
    'version of Lighthouse ({reportVersion}). The latest version is {currentVersion}.',
  /** Log message shown when an old report is opened with its matching older viewer version. */
  versionMismatchOpening: 'Version mismatch between viewer and JSON. Opening compatible viewer...',
  /** Error message shown when a report file cannot be read. */
  couldNotReadFile: 'Could not read file',
  /** Error message shown when saving a report is requested while another save is still running. */
  saveInProgress: 'Save already in progress',
};

export {UIStrings};
