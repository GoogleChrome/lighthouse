/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import CLSCulpritsInsight from '../../../audits/insights/cls-culprits-insight.js';
import {createTestTrace} from '../../create-test-trace.js';

/**
 * @param {number} nodeId
 * @param {number} score
 * @param {number} tsMs
 */
function makeLayoutShift(nodeId, score, tsMs) {
  return {
    ts: tsMs * 1000,
    pid: 1111,
    tid: 222,
    ph: 'I',
    args: {
      data: {
        had_recent_input: false,
        is_main_frame: true,
        weighted_score_delta: score,
        impacted_nodes: [{
          node_id: nodeId,
          old_rect: [0, 0, 1, 1],
          new_rect: [0, 0, 2, 2],
        }],
      },
      frame: 'ROOT_FRAME',
    },
    name: 'LayoutShift',
    cat: 'loading',
  };
}

describe('CLSCulpritsInsight audit', () => {
  it('explains when a shifted element could not be found', async () => {
    // The insight only counts shift clusters inside the navigation's bounds, so the
    // shifts need timestamps within a trace that lasts long enough.
    const trace = createTestTrace({traceEnd: 10_000});
    trace.traceEvents.push(makeLayoutShift(1, 0.3, 1000), makeLayoutShift(2, 0.1, 1100));

    const artifacts = {
      Trace: trace,
      // Only node 1 was resolved. Node 2 is missing, e.g. because the page removed it.
      TraceElements: [{
        traceEventType: 'trace-engine',
        nodeId: 1,
        node: {
          devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
          selector: 'div.l-header > div.chorus-emc__content',
          nodeLabel: 'My Test Label',
          snippet: '<h1 class="test-class">',
        },
      }],
      SourceMaps: [],
      HostDPR: 1,
    };

    const auditResult = await CLSCulpritsInsight.audit(artifacts, {
      computedCache: new Map(),
      settings: {},
    });

    const table = auditResult.details.items[0];
    // First row is the cluster total; the shifts follow, sorted by score.
    const [totalRow, foundRow, missingRow] = table.items;
    expect(totalRow.node.value).toBeDisplayString('Total');
    expect(foundRow.node.type).toEqual('node');
    expect(foundRow.score).toEqual(0.3);
    expect(missingRow.node.type).toEqual('text');
    expect(missingRow.node.value)
      .toBeDisplayString('Element not found (it may have been removed from the page)');
    expect(missingRow.score).toEqual(0.1);
  });
});
