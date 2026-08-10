#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Updates the local ARD schema file and pinned commit reference
 * from the upstream ards-project/ard-spec repository. Run as part of upgrade-deps.sh.
 */

import fs from 'fs';
import path from 'path';

import {LH_ROOT} from '../../shared/root.js';

const REPO = 'ards-project/ard-spec';
const SCHEMA_REMOTE_URL =
  `https://raw.githubusercontent.com/${REPO}/main/spec/schemas/ai-catalog.schema.json`;
const COMMITS_API_URL =
  `https://api.github.com/repos/${REPO}/commits?path=conformance/bin/conformance-test`;
const COMPARE_API_URL = `https://api.github.com/repos/${REPO}/compare`;
const COMPARE_WEB_URL = `https://github.com/${REPO}/compare`;

const LOCAL_SCHEMA_PATH = path.join(LH_ROOT, 'third-party/ard/spec/schemas/ai-catalog.schema.json');
const LOCAL_README_PATH = path.join(LH_ROOT, 'third-party/ard/README.md');

/**
 * Fetches and displays a terminal diff of upstream changes between two commits.
 * @param {string} oldSha
 * @param {string} newSha
 */
async function printUpstreamDiff(oldSha, newSha) {
  try {
    const compareRes = await fetch(`${COMPARE_API_URL}/${oldSha}...${newSha}`, {
      headers: {'User-Agent': 'Lighthouse-ARD-Update-Script'},
    });
    if (!compareRes.ok) return;

    const compareData = await compareRes.json();
    const files = compareData.files || [];
    const conformanceFile = files.find(
      (/** @type {{ filename: string }} */ f) => f.filename === 'conformance/bin/conformance-test'
    );

    console.log('\n=======================================================');
    console.log(
      `🔍 Upstream changes detected between ${oldSha.slice(0, 8)} and ${newSha.slice(0, 8)}`
    );
    console.log('=======================================================');

    if (conformanceFile && conformanceFile.patch) {
      console.log('--- Changes in conformance/bin/conformance-test ---');
      console.log(conformanceFile.patch);
      console.log('---------------------------------------------------');
    } else {
      console.log('No direct code changes to conformance/bin/conformance-test in this diff.');
    }

    console.log(`\n🔗 Full comparison: ${COMPARE_WEB_URL}/${oldSha}...${newSha}\n`);
  } catch (err) {
    console.warn(`Could not fetch upstream diff: ${err.message}`);
  }
}

async function main() {
  console.log('Fetching latest ARD schema and commit SHA...');

  const schemaRes = await fetch(SCHEMA_REMOTE_URL);
  if (!schemaRes.ok) {
    throw new Error(`Failed to fetch schema: ${schemaRes.statusText}`);
  }
  const schemaJson = await schemaRes.json();
  fs.writeFileSync(LOCAL_SCHEMA_PATH, JSON.stringify(schemaJson, null, 2) + '\n');
  console.log(`Updated ${LOCAL_SCHEMA_PATH}`);

  let readme = fs.readFileSync(LOCAL_README_PATH, 'utf-8');
  const oldShaMatch = readme.match(/Pinned Commit SHA\*?\*?:\s*`([a-f0-9]+)`/);
  const oldSha = oldShaMatch ? oldShaMatch[1] : null;

  const commitsRes = await fetch(COMMITS_API_URL, {
    headers: {'User-Agent': 'Lighthouse-ARD-Update-Script'},
  });

  if (commitsRes.ok) {
    const commits = await commitsRes.json();
    if (Array.isArray(commits) && commits.length > 0) {
      const latestSha = commits[0].sha;

      if (oldSha && oldSha !== latestSha) {
        await printUpstreamDiff(oldSha, latestSha);
      } else if (oldSha === latestSha) {
        console.log(`Pinned commit SHA is already up to date (${latestSha}).`);
      }

      const shaRegex = /(\*?\*?Pinned Commit SHA\*?\*?:\s*)(?:`[^`]*`|[^\r\n]*)/;
      if (shaRegex.test(readme)) {
        readme = readme.replace(shaRegex, `**Pinned Commit SHA**: \`${latestSha}\``);
        fs.writeFileSync(LOCAL_README_PATH, readme);
        console.log(`Updated pinned commit SHA in README.md to ${latestSha}`);
      } else {
        console.warn('Could not find "Pinned Commit SHA" line in README.md to update.');
      }
    }
  } else {
    console.warn(`Could not fetch commit history: ${commitsRes.status} ${commitsRes.statusText}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
