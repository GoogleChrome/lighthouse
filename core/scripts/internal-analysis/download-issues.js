/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

/**
 * @fileoverview Used in conjunction with `./analyze-issues.js` to analyze our Issue and PR response times
 * as a team. This file downloads GitHub data to `.tmp/_issues.json` for analysis.
 * _issues.json holds data on all issues for the last DAY_FILTER (90) days.
 * Any comments and events are then fetched separately and added to their parent issue's object.
 *
 * Usage
 *
 * export GH_TOKEN=<your personal GitHub token> # needed to get around API rate limits
 * node ./core/scripts/internal-analysis/download-issues.js
 * node ./core/scripts/internal-analysis/analyze-issues.js
 */

import fs from 'fs';
import path from 'path';

import fetch from 'node-fetch';

import {LH_ROOT} from '../../../shared/root.js';

const DAY_FILTER = 90;
const HOUR_IN_MS = 60 * 60 * 1000;
const START_FROM = new Date(
  new Date().getTime() - DAY_FILTER * 24 * HOUR_IN_MS
);
const GITHUB_API = 'https://api.github.com/';
const HEADERS = {Authorization: `token ${process.env.GH_TOKEN}`};

/**
 * @typedef AugmentedGitHubIssue
 * @property {string} title
 * @property {string} url
 * @property {string} events_url
 * @property {string} comments_url
 * @property {string} created_at
 * @property {'MEMBER'|'NONE'|'FIRST_TIME_CONTRIBUTOR'} author_association
 * @property {{login: string}} user
 * @property {{login: string}} [assigne]
 * @property {{}} [pull_request]
 * @property {Array<{body: string, user: {login: string}, submitted_at?: string, created_at: string}>} comments
 * @property {Array<{event: 'labeled'|'unlabeled'|'closed'|'assigned', actor: {login: string}, assignee?: {login: string}, label?: {name: string}, created_at: string}>} events
 */

/** @param {number} ms @return {Promise<void>} */
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * @param {AugmentedGitHubIssue} issue
 */
async function fetchAndInjectEvents(issue) {
  process.stdout.write(`Fetching ${issue.events_url}...\n`);
  const response = await fetch(issue.events_url, {headers: HEADERS});
  const events = await response.json();
  issue.events = events;
}

/**
 * @param {AugmentedGitHubIssue} issue
 */
async function fetchAndInjectComments(issue) {
  process.stdout.write(`Fetching ${issue.comments_url}...\n`);
  const response = await fetch(issue.comments_url, {headers: HEADERS});
  if (!response.ok) throw new Error(`Invalid API response: ${await response.text()}`);
  const comments = await response.json();
  issue.comments = comments;
  if (!Array.isArray(issue.comments)) {
    console.warn('Comments was not an array', issue.comments);
    issue.comments = [];
  }

  if (issue.pull_request) {
    const prCommentsUrl = issue.comments_url
      .replace('/issues/', '/pulls/')
      .replace('/comments', '/reviews');
    process.stdout.write(`Fetching ${prCommentsUrl}...\n`);
    const response = await fetch(prCommentsUrl, {headers: HEADERS});
    if (!response.ok) throw new Error(`Invalid API response: ${await response.text()}`);
    const comments = await response.json();
    issue.comments = issue.comments.concat(comments);
  }
}

/**
 * @param {string} [urlToStartAt]
 * @return {Promise<Array<AugmentedGitHubIssue>>}
 */
async function downloadIssues(urlToStartAt) {
  const url = new URL(`/repos/GoogleChrome/lighthouse/issues`, GITHUB_API);
  url.searchParams.set('state', 'all');
  url.searchParams.set('since', START_FROM.toISOString());
  const urlToFetch = urlToStartAt || url.href;
  process.stdout.write(`Fetching ${urlToFetch}...\n`);
  const response = await fetch(urlToFetch, {headers: HEADERS});
  if (!response.ok) throw new Error(`Invalid API response: ${await response.text()}`);
  /** @type {Array<AugmentedGitHubIssue>} */
  const issues = await response.json();
  const linkHeader = response.headers.get('link') || '';
  const nextLink = linkHeader
    .split(',')
    .find(link => link.split(';')[1].includes('rel="next"'));
  const nextUrlMatch = (nextLink && nextLink.match(/<(https.*?)>/)) || [];
  const nextUrl = nextUrlMatch[1] || '';
  const restOfIssues = nextUrl ? await downloadIssues(nextUrl) : [];

  // Yes really do this in series to avoid hitting abuse limits of GitHub API
  for (const issue of issues) {
    await Promise.all([
      fetchAndInjectEvents(issue).catch(async err => {
        console.error('Events failed! Trying again', err);
        await wait(60 * 1000);
        return fetchAndInjectEvents(issue);
      }),
      fetchAndInjectComments(issue).catch(async err => {
        console.error('Comments failed! Trying again', err);
        await wait(60 * 1000);
        return fetchAndInjectComments(issue);
      }),
    ]);
  }

  return [...issues, ...restOfIssues];
}

async function go() {
  const issues = await downloadIssues();
  fs.writeFileSync(
    path.join(LH_ROOT, '.tmp/_issues.json'),
    JSON.stringify(issues, null, 2)
  );
}

go();
