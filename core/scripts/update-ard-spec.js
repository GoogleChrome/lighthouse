#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Checks or updates the local ARD schema and the record of which upstream
 * files the Lighthouse port (third-party/ard/ard.js, core/gather/gatherers/agentic/ard.js)
 * has been verified against.
 *
 * The schema is vendored verbatim, so it can be synced automatically. The conformance
 * script and spec are ported by hand, so this script only records a content hash of the
 * upstream version that was last reviewed. "In sync" means upstream HEAD matches the
 * vendored schema and the recorded hashes, not merely that the pinned commit is recent.
 *
 * Usage:
 *   node core/scripts/update-ard-spec.js --check     # Exits 1 if upstream differs from what was reviewed
 *   node core/scripts/update-ard-spec.js             # Syncs schema; refuses to bump SHA if port needs work
 *   node core/scripts/update-ard-spec.js --ack-port  # As above, and records that the port now matches HEAD
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {LH_ROOT} from '../../shared/root.js';

const REPO = 'ards-project/ard-spec';
const COMMITS_API_URL = `https://api.github.com/repos/${REPO}/commits?per_page=1`;
const COMPARE_API_URL = `https://api.github.com/repos/${REPO}/compare`;
const COMPARE_WEB_URL = `https://github.com/${REPO}/compare`;
const RAW_URL = `https://raw.githubusercontent.com/${REPO}`;

/** Vendored verbatim; synced automatically. */
const SCHEMA_PATH = 'spec/schemas/ard-entry.schema.json';

/**
 * Ported by hand; only a hash of the reviewed upstream content is recorded.
 * - conformance-test → third-party/ard/ard.js
 * - spec/ard.md §5.1 (Discovery Mechanisms) → core/gather/gatherers/agentic/ard.js
 */
const REVIEWED_FILES = ['conformance/bin/conformance-test', 'spec/ard.md'];

const LOCAL_SCHEMA_PATH = path.join(LH_ROOT, 'third-party/ard', SCHEMA_PATH);
const LOCAL_README_PATH = path.join(LH_ROOT, 'third-party/ard/README.md');

const HEADERS = {'User-Agent': 'Lighthouse-ARD-Update-Script'};

/**
 * @param {string} url
 * @return {Promise<string>}
 */
async function fetchText(url) {
  const res = await fetch(url, {headers: HEADERS});
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

/** @param {string} text */
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * README line format: ``- `<upstream path>`: `<sha256>` ``
 * @param {string} filePath
 */
function readmeHashRegex(filePath) {
  const escaped = filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(\`${escaped}\`:\\s*\`)([a-f0-9]*)(\`)`);
}

/**
 * Best-effort: prints the upstream diff of the conformance script between two commits.
 * @param {string} oldSha
 * @param {string} newSha
 */
async function printUpstreamDiff(oldSha, newSha) {
  try {
    const compareRes = await fetch(`${COMPARE_API_URL}/${oldSha}...${newSha}`, {headers: HEADERS});
    if (!compareRes.ok) return;
    const compareData = await compareRes.json();
    const files = compareData.files || [];

    const conformanceFile = files.find(
      (/** @type {{ filename: string }} */ f) => f.filename === REVIEWED_FILES[0]
    );
    if (conformanceFile && conformanceFile.patch) {
      const range = `${oldSha.slice(0, 8)}...${newSha.slice(0, 8)}`;
      console.log(`--- Changes in ${REVIEWED_FILES[0]} (${range}) ---`);
      console.log(conformanceFile.patch);
      console.log('---------------------------------------------------');
    }
  } catch (err) {
    console.warn(`Could not fetch upstream diff: ${err.message}`);
  }
}

async function main() {
  const isCheckMode = process.argv.includes('--check');
  const ackPort = process.argv.includes('--ack-port');

  console.log('Fetching latest ARD commit SHA...');
  const commits = JSON.parse(await fetchText(COMMITS_API_URL));
  if (!Array.isArray(commits) || commits.length === 0 || !commits[0].sha) {
    throw new Error('No commits found on main branch.');
  }
  /** @type {string} */
  const latestSha = commits[0].sha;

  let readme = fs.readFileSync(LOCAL_README_PATH, 'utf-8');
  const oldShaMatch = readme.match(/Pinned Commit SHA\*?\*?:\s*`([a-f0-9]+)`/);
  const oldSha = oldShaMatch ? oldShaMatch[1] : null;
  if (!oldSha) {
    throw new Error('Could not find "Pinned Commit SHA" line in third-party/ard/README.md.');
  }

  const upstreamSchema = await fetchText(`${RAW_URL}/${latestSha}/${SCHEMA_PATH}`);
  const localSchema = fs.existsSync(LOCAL_SCHEMA_PATH) ?
    fs.readFileSync(LOCAL_SCHEMA_PATH, 'utf-8') : '';
  const schemaChanged = upstreamSchema !== localSchema;

  const reviewed = [];
  for (const filePath of REVIEWED_FILES) {
    const match = readme.match(readmeHashRegex(filePath));
    if (!match) {
      throw new Error(`Could not find reviewed hash line for \`${filePath}\` in ` +
        'third-party/ard/README.md.');
    }
    const actual = sha256(await fetchText(`${RAW_URL}/${latestSha}/${filePath}`));
    reviewed.push({filePath, recorded: match[2], actual, changed: match[2] !== actual});
  }
  const portChanges = reviewed.filter(r => r.changed);

  if (isCheckMode) {
    if (!schemaChanged && portChanges.length === 0) {
      const note = oldSha === latestSha ? '' :
        ` (pinned ${oldSha.slice(0, 8)} is behind HEAD, but no reviewed content changed)`;
      console.log(`ARD spec is in sync with upstream ${latestSha.slice(0, 8)}${note}.`);
      return;
    }

    console.error('\n=======================================================');
    console.error('ARD spec is out of sync with upstream!');
    console.error(`   Pinned SHA: ${oldSha}`);
    console.error(`   Latest SHA: ${latestSha}`);
    console.error(`   Comparison: ${COMPARE_WEB_URL}/${oldSha}...${latestSha}`);
    if (schemaChanged) console.error(`   - ${SCHEMA_PATH} differs from vendored copy`);
    for (const r of portChanges) console.error(`   - ${r.filePath} changed since last review`);
    console.error('=======================================================');
    console.error('\nAction required (see third-party/ard/README.md, update-ard-port skill):');
    console.error('1. Run `yarn update:ard-spec` to sync the schema and see the upstream diff.');
    console.error('2. Port changes to `third-party/ard/ard.js` (conformance-test) and');
    console.error('   `core/gather/gatherers/agentic/ard.js` (spec §5.1), with tests.');
    console.error('3. Run `yarn update:ard-spec --ack-port` to record the reviewed content.\n');
    process.exit(1);
  }

  // Update mode: the schema is always safe to sync.
  if (schemaChanged) {
    fs.writeFileSync(LOCAL_SCHEMA_PATH, upstreamSchema);
    console.log(`Updated ${LOCAL_SCHEMA_PATH} (run \`yarn build-ard-schema\`).`);
  } else {
    console.log('Schema already up to date.');
  }

  if (portChanges.length > 0) {
    console.log(`\nUpstream changes between ${oldSha.slice(0, 8)} and ${latestSha.slice(0, 8)}:`);
    for (const r of portChanges) console.log(`   - ${r.filePath}`);
    console.log(`   Full comparison: ${COMPARE_WEB_URL}/${oldSha}...${latestSha}\n`);
    await printUpstreamDiff(oldSha, latestSha);

    if (!ackPort) {
      console.error('\nThe hand-ported files above changed upstream. Pinned SHA NOT bumped.');
      console.error('Port the changes (see the update-ard-port skill), then re-run with ' +
        '`--ack-port` to record them as reviewed.');
      process.exit(1);
    }

    for (const r of portChanges) {
      readme = readme.replace(readmeHashRegex(r.filePath), `$1${r.actual}$3`);
      console.log(`Recorded reviewed hash for ${r.filePath}.`);
    }
  }

  if (oldSha !== latestSha) {
    readme = readme.replace(
      /(\*?\*?Pinned Commit SHA\*?\*?:\s*)`[^`]*`/, `$1\`${latestSha}\``);
    console.log(`Updated pinned commit SHA in README.md to ${latestSha}`);
  }
  fs.writeFileSync(LOCAL_README_PATH, readme);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
