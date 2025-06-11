/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

/**
 * @fileoverview Used in conjunction with `./download-issues.js` to analyze our Issue and PR response times as a team.
 *
 * This file analyzes GitHub data that resides in `.tmp/_issues.json` primarily around *initial* response times.
 * Future work could do something fancier around responding to replies, followup reviews, closing issues, etc.
 *
 * See the download script for usage information.
 */

import log from 'lighthouse-logger';

import {readJson} from '../../test/test-utils.js';

/** @typedef {import('./download-issues.js').AugmentedGitHubIssue} AugmentedGitHubIssue */

const RESPONSE_LOGINS = new Set([
  'adamraine',
  'Beytoven',
  'brendankenny',
  'connorjclark',
  'exterkamp',
  'jazyan',
  'patrickhulce',
  'paulirish',
]);

const RESPONSE_EVENTS = new Set(['labeled', 'assigned', 'renamed', 'closed']);

// Refilter the issues for what's been *created* in the last 90 days
// The API will be returning everything that's been touched.
const HOUR_IN_MS = 60 * 60 * 1000;
const DAY_FILTER = 90;
const START_AT = new Date(new Date().getTime() - DAY_FILTER * 24 * HOUR_IN_MS).getTime();

/**
 * @param {AugmentedGitHubIssue} issue
 * @return {AugmentedGitHubIssue}
 */
function normalizeIssue(issue) {
  if (!Array.isArray(issue.comments)) issue.comments = [];
  if (!Array.isArray(issue.events)) issue.events = [];
  issue.comments = issue.comments.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  issue.events = issue.events.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  issue.comments.forEach(comment => {
    comment.created_at = comment.created_at || comment.submitted_at || '';
  });

  return issue;
}

/** @type {Array<AugmentedGitHubIssue>} */
const _ISSUES = readJson('.tmp/_issues.json').map(normalizeIssue);
const _ISSUES_SINCE = _ISSUES.filter(issue => new Date(issue.created_at).getTime() > START_AT);
const ISSUES = _ISSUES_SINCE.filter(issue => !issue.pull_request);

/** @param {number} n */
const percent = n => `${(n * 100).toFixed(1)}%`;

/**
 * This function only logs *initial* review responses, but could conceivably log all instances of applying "waiting4reviewer".
 * @param {string} label
 * @param {Array<AugmentedGitHubIssue>} issues
 */
function computeAndLogReviewResponseStats(label, issues) {
  const initialReviewRequests = issues
    .map(issue => {
      const assignEvent = issue.events.find(event => event.event === 'assigned');
      const assignee = assignEvent?.assignee?.login || '';
      const firstCommentByAssignee = issue.comments.find(
        comment => comment.user.login === assignee
      );
      const reviewTimeInHours = firstCommentByAssignee
        ? (new Date(firstCommentByAssignee.created_at).getTime() -
            new Date(issue.created_at).getTime()) /
          HOUR_IN_MS
        : Infinity;
      return {
        issue,
        assignEvent,
        assignee,
        firstCommentByAssignee,
        reviewTimeInHours,
      };
    })
    .filter(review => review.assignee)
    .sort((a, b) => a.reviewTimeInHours - b.reviewTimeInHours);

  const reviews = initialReviewRequests.filter(review => review.firstCommentByAssignee);
  const reviewsByLogin = Object.values(
    initialReviewRequests.reduce(
      (map, view) => {
        const reviews = map[view.assignee] || [];
        reviews.push(view);
        map[view.assignee] = reviews;
        return map;
      },
      /** @type {Record<string, typeof reviews>} */ ({})
    )
  ).sort((a, b) => b.length - a.length);

  const responseTimeInHours = initialReviewRequests.map(r => r.reviewTimeInHours);
  const medianResponseTime = responseTimeInHours[Math.floor(reviews.length / 2)];
  console.log(`${log.bold}${label}${log.reset}`);
  console.log(
    `  ${percent(initialReviewRequests.length / issues.length)} of PRs requested a review`
  );
  console.log(
    `  ${percent(reviews.length / initialReviewRequests.length)} of requests received a review`
  );
  console.log(
    `  Median initial response time of ${log.bold}${medianResponseTime.toFixed(1)} hours${
      log.reset
    }`
  );
  console.log('  By User');
  /** @type {Record<string, Record<string, string | number>>} */
  const byUser = {};
  reviewsByLogin.forEach(requests => {
    const user = requests[0].assignee;
    const reviews = requests.filter(r => r.firstCommentByAssignee);
    const medianResponseTime = requests[Math.floor(reviews.length / 2)].reviewTimeInHours;
    byUser[user] = {reviews: reviews.length, medianResponse: `${medianResponseTime.toFixed(1)} h`};
  });
  console.table(byUser);
}

/**
 * @param {string} label
 * @param {Array<AugmentedGitHubIssue>} issues
 */
function computeAndLogIssueResponseStats(label, issues) {
  /** @param {AugmentedGitHubIssue} issue @return {(e: AugmentedGitHubIssue['events'][0]) => boolean} */
  const isEventResponse = issue => e => {
    const isHumanResponse =
      RESPONSE_LOGINS.has(e.actor.login) &&
      RESPONSE_EVENTS.has(e.event) &&
      e.actor.login !== issue.user.login;
    const isBotClose = e.event === 'closed' && e.actor.login === 'devtools-bot';
    return isHumanResponse || isBotClose;
  };
  /** @param {AugmentedGitHubIssue} issue @return {(c: AugmentedGitHubIssue['comments'][0]) => boolean} */
  const isCommentResponse = issue => c =>
    RESPONSE_LOGINS.has(c.user.login) && c.user.login !== issue.user.login;
  const withResponse = issues.filter(
    i => i.events.some(isEventResponse(i)) || i.comments.some(isCommentResponse(i))
  );

  const firstResponses = withResponse
    .map(issue => {
      const labelResponse = issue.events.find(isEventResponse(issue));
      const labelResponseTs =
        (labelResponse && new Date(labelResponse.created_at).getTime()) || Infinity;
      const commentResponse = issue.comments.find(isCommentResponse(issue));
      const commentResponseTs =
        (commentResponse && new Date(commentResponse.created_at).getTime()) || Infinity;

      let firstResponse = {login: '', created_at: ''};
      if (labelResponse && labelResponseTs < commentResponseTs) {
        firstResponse = {
          login: labelResponse.actor.login,
          created_at: labelResponse.created_at,
        };
      } else {
        if (!commentResponse) {
          throw new Error(`Issue did not have a response:\n${JSON.stringify(issue, null, 2)}`);
        }
        firstResponse = {
          login: commentResponse.user.login,
          created_at: commentResponse.created_at,
        };
      }

      return {
        issue,
        labelResponse,
        commentResponse,
        firstResponse,
        firstResponseTimeInHours:
          (new Date(firstResponse.created_at).getTime() - new Date(issue.created_at).getTime()) /
          HOUR_IN_MS,
      };
    })
    .sort((a, b) => a.firstResponseTimeInHours - b.firstResponseTimeInHours);

  const responseTimeInHours = firstResponses.map(r => r.firstResponseTimeInHours);
  const medianResponseTime = responseTimeInHours[Math.floor(withResponse.length / 2)];

  const responsesByLogin = Object.values(
    firstResponses.reduce(
      (map, response) => {
        const responses = map[response.firstResponse.login] || [];
        responses.push(response);
        map[response.firstResponse.login] = responses;
        return map;
      },
      /** @type {Record<string, typeof firstResponses>} */ ({})
    )
  ).sort((a, b) => b.length - a.length);

  console.log(`${log.bold}${label}${log.reset}`);
  console.log(`  ${percent(withResponse.length / issues.length)} of issues received a response`);
  console.log(
    `  Median response time of ${log.bold}${medianResponseTime.toFixed(1)} hours${log.reset}`
  );
  console.log('  By User');
  /** @type {Record<string, Record<string, string | number>>} */
  const byUser = {};
  responsesByLogin.forEach(responses => {
    const user = responses[0].firstResponse.login;
    const medianResponseTime = responses[Math.floor(responses.length / 2)].firstResponseTimeInHours;
    byUser[user] = {
      responses: responses.length,
      medianResponseTime: `${medianResponseTime.toFixed(1)} hours`,
    };
  });
  console.table(byUser);
}

const PRS = _ISSUES_SINCE.filter(issue => issue.pull_request);
const EXTERNAL_ISSUES = ISSUES.filter(issue => !RESPONSE_LOGINS.has(issue.user.login));
const INTERNAL_ISSUES = ISSUES.filter(issue => RESPONSE_LOGINS.has(issue.user.login));

computeAndLogReviewResponseStats('PRs', PRS);
computeAndLogIssueResponseStats('External Issues', EXTERNAL_ISSUES);
computeAndLogIssueResponseStats('Team Issues', INTERNAL_ISSUES);
