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
const redirectTrace = readJson('../fixtures/artifacts/redirect/trace.json', import.meta);
const redirectDevtoolsLog =
  readJson('../fixtures/artifacts/redirect/devtoolslog.json', import.meta);

describe('PageDependencyGraph computed artifact', () => {
  describe('#compute_', () => {
    it('should compute the dependency graph', async () => {
      const context = {computedCache: new Map()};
      const output = await PageDependencyGraph.request({
        trace: sampleTrace,
        devtoolsLog: sampleDevtoolsLog,
        URL: getURLArtifactFromDevtoolsLog(sampleDevtoolsLog),
        SourceMaps: [],
        HostDPR: 1,
        settings: {},
        fromTrace: process.env.INTERNAL_LANTERN_USE_TRACE !== undefined,
      }, context);
      assert.ok(output instanceof Lantern.Graph.BaseNode, 'did not return a graph');
      const dependents = output.getDependents();
      const nodeWithNestedDependents = dependents.find(node => node.getDependents().length);
      assert.ok(nodeWithNestedDependents, 'did not link initiators');
    });

    it('should handle cross-origin redirect URLs scrubbed to origin in trace', async () => {
      const context = {computedCache: new Map()};
      const url = getURLArtifactFromDevtoolsLog(redirectDevtoolsLog);
      const output = await PageDependencyGraph.request({
        trace: redirectTrace,
        devtoolsLog: redirectDevtoolsLog,
        URL: {
          ...url,
          requestedUrl: 'http://www.vkontakte.ru/docs',
        },
        SourceMaps: [],
        HostDPR: 1,
        settings: {},
        fromTrace: true,
      }, context);
      assert.ok(output instanceof Lantern.Graph.BaseNode, 'did not return a graph');
      assert.equal(output.type, 'network');
      assert.equal(output.request.url, 'http://www.vkontakte.ru/');
    });
  });
});
