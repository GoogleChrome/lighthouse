/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Print names and GitHub usernames of new contributors in specified range.
 * Ex: node core/scripts/print-contributors.js v6.4.0 HEAD
 */

/* eslint-disable no-console */

import {execFileSync} from 'child_process';

import fetch from 'node-fetch';

const startingHash = process.argv[2];
const endingHash = process.argv[3];

async function main() {
  // '!!' is used as a delimeter because it is unlikey that will show in a name,
  // and because two special characters in a row is invalid in email addresses.
  const previousAuthors = execFileSync('git', [
    '--no-pager',
    'log',
    '--format=%ae!!%aN',
    `v2.3.0..${startingHash}`,
  ], {encoding: 'utf8'}).trim().split('\n').map(line => {
    const [email, name] = line.split('!!');
    return {email, name};
  });

  const commits = execFileSync('git', [
    '--no-pager',
    'log',
    '--format=%h!!%ae!!%aN',
    `${startingHash}..${endingHash}`,
  ], {encoding: 'utf8'}).trim().split('\n').map(line => {
    const [hash, email, name] = line.split('!!');
    return {hash, email, name};
  });

  /** @type {typeof commits} */
  const authors = [];
  for (const commit of commits) {
    if (authors.find(a => a.email === commit.email)) continue;
    if (previousAuthors.find(a => a.email === commit.email)) continue;

    authors.push(commit);
  }

  for (const author of authors) {
    const response = await fetch(`https://api.github.com/repos/GoogleChrome/lighthouse/commits/${author.hash}`);
    const json = await response.json();
    try {
      console.log(`${json.commit.author.name} @${json.author.login}`);
    } catch {
      console.log(`https://api.github.com/repos/GoogleChrome/lighthouse/commits/${author.hash}`, 'unexpected json', json);
    }
  }
}

main();
