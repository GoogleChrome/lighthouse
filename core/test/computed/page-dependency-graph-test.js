/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from '../../lib/lantern/lantern.js';
import {PageDependencyGraph} from '../../computed/page-dependency-graph.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';

const sampleTrace = readJson('../fixtures/artifacts/iframe/trace.json', import.meta);
const sampleDevtoolsLog = readJson('../fixtures/artifacts/iframe/devtoolslog.json', import.meta);

describe('PageDependencyGraph computed artifact', () => {
  describe('#compute_', () => {
    it('should compute the dependency graph', async () => {
      const context = {computedCache: new Map()};
      const output = await PageDependencyGraph.request({
        trace: sampleTrace,
        devtoolsLog: sampleDevtoolsLog,
        URL: getURLArtifactFromDevtoolsLog(sampleDevtoolsLog),
      }, context);
      assert.ok(output instanceof Lantern.Graph.BaseNode, 'did not return a graph');
      const dependents = output.getDependents();
      const nodeWithNestedDependents = dependents.find(node => node.getDependents().length);
      assert.ok(nodeWithNestedDependents, 'did not link initiators');
    });
  });
});
