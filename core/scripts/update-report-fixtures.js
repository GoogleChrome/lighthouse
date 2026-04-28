/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cli from '../../cli/run.js';
import * as cliFlags from '../../cli/cli-flags.js';
import * as assetSaver from '../lib/asset-saver.js';
import {Server} from '../../cli/test/fixtures/static-server.js';
import sampleConfig from '../test/results/sample-config.js';

const artifactPath = 'core/test/results/artifacts';
// All artifacts must have resources from a consistent port, to ensure reproducibility.
// https://github.com/GoogleChrome/lighthouse/issues/11776
const MAGIC_SERVER_PORT = 10200;

/**
 * Update the report artifacts.
 * If artifactNames is nonempty, only those artifacts will be updated.
 * @param {Array<keyof LH.Artifacts>} artifactNames
 */
async function update(artifactNames) {
  const server = new Server(MAGIC_SERVER_PORT);
  await server.listen(MAGIC_SERVER_PORT, 'localhost');

  const oldArtifacts = assetSaver.loadArtifacts(artifactPath);

  const url = `http://localhost:${MAGIC_SERVER_PORT}/dobetterweb/dbw_tester.html`;
  const rawFlags = [
    `--gather-mode=${artifactPath}`,
    url,
  ].join(' ');
  const flags = cliFlags.getFlags(rawFlags);
  await cli.runLighthouse(url, flags, sampleConfig);
  await server.close();

  const newArtifacts = assetSaver.loadArtifacts(artifactPath);

  assetSaver.normalizeTimingEntries(newArtifacts.Timing);

  if (artifactNames.length === 0) {
    await assetSaver.saveArtifacts(newArtifacts, artifactPath);
    return;
  }

  // Revert everything except these artifacts.
  const artifactsToKeep = {...oldArtifacts};
  for (const artifactName of artifactNames) {
    if (!(artifactName in newArtifacts) && !(artifactName in oldArtifacts)) {
      throw Error('Unknown artifact name: ' + artifactName);
    }

    // @ts-expect-error tsc can't yet express that artifactName is only a single type in each iteration, not a union of types.
    artifactsToKeep[artifactName] = newArtifacts[artifactName];
  }

  await assetSaver.saveArtifacts(artifactsToKeep, artifactPath);
}

update(/** @type {Array<keyof LH.Artifacts>} */ (process.argv.slice(2)));
