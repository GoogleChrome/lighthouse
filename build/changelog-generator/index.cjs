/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const readFileSync = require('fs').readFileSync;
const resolve = require('path').resolve;
const mainTemplate = readFileSync(resolve(__dirname, 'templates/template.hbs')).toString();
const headerPartial = readFileSync(resolve(__dirname, 'templates/header.hbs')).toString();
const commitPartial = readFileSync(resolve(__dirname, 'templates/commit.hbs')).toString();

/** @typedef {{type: string, header: string, hash?: string, message?: string, PR?: string}} Commit */

const pullRequestRegex = /\(#(\d+)\)$/;
const parserOpts = {
  headerPattern: /^(\w*)(?:\((.*)\))?: (.*)$/,
  headerCorrespondence: [
    'type',
    'scope',
    'message',
  ],
};

process.stderr.write(`
> Be sure to have the latest git tags locally:
    git fetch --tags

`);

const titlePrecedence = [
  'New Audits',
  'Core',
  'CLI',
  'Report',
  'Deps',
  'Clients',
  'I18n',
  'Docs',
  'Tests',
  'Misc',
];

const writerOpts = {
  mainTemplate,
  headerPartial,
  commitPartial,
  /** @param {Commit} commit */
  transform: commit => {
    if (typeof commit.hash === 'string') {
      commit.hash = commit.hash.substring(0, 7);
    }

    if (commit.type === 'test') {
      commit.type = 'tests';
    } else if (commit.type === 'cli') {
      commit.type = 'CLI';
    } else if (commit.type === 'new_audit') {
      commit.type = 'New Audits';
    }

    if (commit.type) {
      commit.type = commit.type.replace(/_/g, ' ');
      commit.type = commit.type.substring(0, 1).toUpperCase() + commit.type.substring(1);
    } else {
      commit.type = 'Misc';
    }

    let pullRequestMatch = commit.header.match(pullRequestRegex);
    // if header does not provide a PR we try the message
    if (!pullRequestMatch && commit.message) {
      pullRequestMatch = commit.message.match(pullRequestRegex);
    }

    if (pullRequestMatch) {
      commit.header = commit.header.replace(pullRequestMatch[0], '').trim();
      if (commit.message) {
        commit.message = commit.message.replace(pullRequestMatch[0], '').trim();
      }

      commit.PR = pullRequestMatch[1];
    }

    return commit;
  },
  groupBy: 'type',
  /** @param {{title: string}} a @param {{title: string}} b */
  commitGroupsSort: (a, b) => {
    const aIndex = titlePrecedence.indexOf(a.title);
    const bIndex = titlePrecedence.indexOf(b.title);

    // If neither value has a title with a predefined order, use an alphabetical comparison.
    if (aIndex === -1 && bIndex === -1) {
      return a.title.localeCompare(b.title);
    }

    // If just one value has a title with a predefined order, it is greater.
    if (aIndex === -1 && bIndex >= 0) {
      return 1;
    }
    if (bIndex === -1 && aIndex >= 0) {
      return -1;
    }

    // Both values have a title with a predefined order, so do a simple comparison.
    return aIndex - bIndex;
  },
  commitsSort: ['type', 'scope'],
};

module.exports = {
  writerOpts,
  parserOpts,
};
