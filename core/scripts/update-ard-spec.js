#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Checks or updates the local ARD schema file and pinned commit reference
 * from the upstream ards-project/ard-spec repository.
 *
 * Usage:
 *   node core/scripts/update-ard-spec.js          # Updates local schema and README SHA
 *   node core/scripts/update-ard-spec.js --check  # Checks if upstream has changes (exits 1 if out of sync)
 */

import fs from 'fs';
import path from 'path';

import {LH_ROOT} from '../../shared/root.js';

const REPO = 'ards-project/ard-spec';
const COMMITS_API_URL = `https://api.github.com/repos/${REPO}/commits?per_page=1`;
const COMPARE_API_URL = `https://api.github.com/repos/${REPO}/compare`;
const COMPARE_WEB_URL = `https://github.com/${REPO}/compare`;

const RELEVANT_PREFIXES = [
  'spec/schemas/',
  'conformance/',
];

const LOCAL_SCHEMA_PATH = path.join(LH_ROOT, 'third-party/ard/spec/schemas/ai-catalog.schema.json');
const LOCAL_README_PATH = path.join(LH_ROOT, 'third-party/ard/README.md');

const HEADERS = {'User-Agent': 'Lighthouse-ARD-Update-Script'};

/**
 * Fetches and displays a terminal diff of upstream changes between two commits.
 * @param {string} oldSha
 * @param {string} newSha
 * @param {Array<{ filename: string, patch?: string, status?: string }>} [files]
 */
async function printUpstreamDiff(oldSha, newSha, files) {
  try {
    let fileList = files;
    if (!fileList) {
      const compareRes = await fetch(`${COMPARE_API_URL}/${oldSha}...${newSha}`, {
        headers: HEADERS,
      });
      if (!compareRes.ok) return;

      const compareData = await compareRes.json();
      fileList = compareData.files || [];
    }

    if (!fileList) return;

    const conformanceFile = fileList.find(
      (/** @type {{ filename: string }} */ f) => f.filename === 'conformance/bin/conformance-test'
    );

    console.log('\n=======================================================');
    console.log(
      `Upstream changes detected between ${oldSha.slice(0, 8)} and ${newSha.slice(0, 8)}`
    );
    console.log('=======================================================');

    if (conformanceFile && conformanceFile.patch) {
      console.log('--- Changes in conformance/bin/conformance-test ---');
      console.log(conformanceFile.patch);
      console.log('---------------------------------------------------');
    } else {
      console.log('No direct code changes to conformance/bin/conformance-test in this diff.');
    }

    console.log(`\nFull comparison: ${COMPARE_WEB_URL}/${oldSha}...${newSha}\n`);
  } catch (err) {
    console.warn(`Could not fetch upstream diff: ${err.message}`);
  }
}

async function main() {
  const isCheckMode = process.argv.includes('--check');

  console.log('Fetching latest ARD commit SHA...');

  const commitsRes = await fetch(COMMITS_API_URL, {
    headers: HEADERS,
  });
  if (!commitsRes.ok) {
    throw new Error(
      `Failed to fetch commit history: ${commitsRes.status} ${commitsRes.statusText}`
    );
  }

  const commits = await commitsRes.json();
  if (!Array.isArray(commits) || commits.length === 0 || !commits[0].sha) {
    throw new Error('No commits found on main branch.');
  }
  const latestSha = commits[0].sha;

  let readme = fs.readFileSync(LOCAL_README_PATH, 'utf-8');
  const oldShaMatch = readme.match(/Pinned Commit SHA\*?\*?:\s*`([a-f0-9]+)`/);
  const oldSha = oldShaMatch ? oldShaMatch[1] : null;

  if (isCheckMode) {
    if (!oldSha) {
      throw new Error('Could not find "Pinned Commit SHA" line in third-party/ard/README.md.');
    }

    if (oldSha === latestSha) {
      console.log(`ARD spec is in sync with upstream pinned commit (${latestSha.slice(0, 8)}).`);
      return;
    }

    const compareRes = await fetch(`${COMPARE_API_URL}/${oldSha}...${latestSha}`, {
      headers: HEADERS,
    });
    if (!compareRes.ok) {
      throw new Error(
        `Failed to compare commits (${oldSha}...${latestSha}): ` +
        `${compareRes.status} ${compareRes.statusText}`
      );
    }

    const compareData = await compareRes.json();
    const files = compareData.files || [];
    const relevantChangedFiles = files.filter(
      (/** @type {{ filename: string }} */ f) =>
        RELEVANT_PREFIXES.some(prefix => f.filename.startsWith(prefix))
    );

    if (relevantChangedFiles.length === 0) {
      console.log(
        `ARD spec is effectively in sync with upstream (${latestSha.slice(0, 8)}).\n` +
        '   Upstream commits exist, but no schema or conformance files were modified.'
      );
      return;
    }

    console.error('\n=======================================================');
    console.error('ARD spec is out of sync with upstream!');
    console.error(`   Pinned SHA: ${oldSha}`);
    console.error(`   Latest SHA: ${latestSha}`);
    console.error(`   Comparison: ${COMPARE_WEB_URL}/${oldSha}...${latestSha}`);
    console.error('   Relevant changed files:');
    for (const f of relevantChangedFiles) {
      console.error(`     - ${f.filename} (${f.status})`);
    }
    console.error('=======================================================');
    console.error('\nAction required:');
    console.error('1. Run `yarn update:ard-spec` to fetch the updated schema.');
    console.error('2. Review changes to `conformance/bin/conformance-test` via the compare link.');
    console.error('3. Update `third-party/ard/ard.js` and `third-party/ard/ard-test.js` to match.');
    console.error('4. Run `yarn build-ard-schema` to rebuild the precompiled validator.');
    console.error('5. Verify tests with `yarn mocha third-party/ard/ard-test.js` and commit.\n');

    process.exit(1);
  }

  const schemaRemoteUrl =
    `https://raw.githubusercontent.com/${REPO}/${latestSha}/spec/schemas/ai-catalog.schema.json`;
  const schemaRes = await fetch(schemaRemoteUrl);
  if (!schemaRes.ok) {
    throw new Error(`Failed to fetch schema: ${schemaRes.status} ${schemaRes.statusText}`);
  }
  const schemaJson = await schemaRes.json();

  if (oldSha && oldSha !== latestSha) {
    await printUpstreamDiff(oldSha, latestSha);
  } else if (oldSha === latestSha) {
    console.log(`Pinned commit SHA is already up to date (${latestSha}).`);
  }

  fs.writeFileSync(LOCAL_SCHEMA_PATH, JSON.stringify(schemaJson, null, 2) + '\n');
  console.log(`Updated ${LOCAL_SCHEMA_PATH}`);

  const shaRegex = /(\*?\*?Pinned Commit SHA\*?\*?:\s*)(?:`[^`]*`|[^\r\n]*)/;
  if (shaRegex.test(readme)) {
    readme = readme.replace(shaRegex, `**Pinned Commit SHA**: \`${latestSha}\``);
    fs.writeFileSync(LOCAL_README_PATH, readme);
    console.log(`Updated pinned commit SHA in README.md to ${latestSha}`);
  } else {
    console.warn('Could not find "Pinned Commit SHA" line in README.md to update.');
  }

  console.log('\nNext steps:');
  console.log('1. Review upstream conformance-test diff above.');
  console.log('2. Update third-party/ard/ard.js if validation rules changed.');
  console.log('3. Run `yarn build-ard-schema` if schema changed.');
  console.log('4. Run `yarn mocha third-party/ard/ard-test.js` to verify.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
