/**
 * @license Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import LayoutShiftsAudit from '../../audits/layout-shifts.js';
import {createTestTrace} from '../create-test-trace.js';

describe('Performance: layout-shifts audit', () => {
  it('correctly surfaces layout shifts', async () => {
    const trace = createTestTrace({});
    trace.traceEvents.push({
      args: {
        data: {
          had_recent_input: false,
          is_main_frame: true,
          weighted_score_delta: 0.3,
          impacted_nodes: [{
            node_id: 1,
            old_rect: [0, 0, 1, 1],
            new_rect: [0, 0, 2, 2],
          }],
        },
        frame: 'ROOT_FRAME',
      },
      name: 'LayoutShift',
      cat: 'loading',
    }, {
      args: {
        data: {
          had_recent_input: false,
          is_main_frame: true,
          weighted_score_delta: 0.1,
          impacted_nodes: [{
            node_id: 1,
            old_rect: [0, 0, 1, 1],
            new_rect: [0, 0, 2, 2],
          }],
        },
        frame: 'ROOT_FRAME',
      },
      name: 'LayoutShift',
      cat: 'loading',
    });

    const artifacts = {
      traces: {defaultPass: trace},
      TraceElements: [{
        traceEventType: 'layout-shift',
        nodeId: 1,
        node: {
          devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
          selector: 'div.l-header > div.chorus-emc__content',
          nodeLabel: 'My Test Label',
          snippet: '<h1 class="test-class">',
        },
      }],
      RootCauses: {layoutShifts: {}},
    };

    const auditResult = await LayoutShiftsAudit.audit(artifacts, {computedCache: new Map()});
    expect(auditResult.score).toEqual(0);
    expect(auditResult.displayValue).toBeDisplayString('2 layout shifts found');
    expect(auditResult.metricSavings).toEqual({CLS: 0.4});
    expect(auditResult.details.items).toHaveLength(2);
    expect(auditResult.details.items[0]).toHaveProperty('node');
    expect(auditResult.details.items[0].node).toHaveProperty('type', 'node');
    expect(auditResult.details.items[0].score).toEqual(0.3);
    expect(auditResult.details.items[1]).toHaveProperty('node');
    expect(auditResult.details.items[1].node).toHaveProperty('type', 'node');
    expect(auditResult.details.items[1].score).toEqual(0.1);
  });

  it('correctly surfaces layout shifts with root causes', async () => {
    const trace = createTestTrace({});
    trace.traceEvents.push({
      args: {
        data: {
          had_recent_input: false,
          is_main_frame: true,
          weighted_score_delta: 0.3,
          impacted_nodes: [{
            node_id: 1,
            old_rect: [0, 0, 1, 1],
            new_rect: [0, 0, 2, 2],
          }],
        },
        frame: 'ROOT_FRAME',
      },
      name: 'LayoutShift',
      cat: 'loading',
    }, {
      args: {
        data: {
          had_recent_input: false,
          is_main_frame: true,
          weighted_score_delta: 0.1,
          impacted_nodes: [{
            node_id: 1,
            old_rect: [0, 0, 1, 1],
            new_rect: [0, 0, 2, 2],
          }],
        },
        frame: 'ROOT_FRAME',
      },
      name: 'LayoutShift',
      cat: 'loading',
    });

    const artifacts = {
      traces: {defaultPass: trace},
      TraceElements: [{
        traceEventType: 'layout-shift',
        nodeId: 1,
        node: {
          devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
          selector: 'div.l-header > div.chorus-emc__content',
          nodeLabel: 'My Test Label',
          snippet: '<h1 class="test-class">',
        },
      }],
      RootCauses: {layoutShifts: {
        0: {
          unsizedMedia: [],
          fontChanges: [{request: {args: {data: {url: 'lol.com'}}}}],
          iframes: [],
          renderBlockingRequests: [],
        },
      }},
    };

    const auditResult = await LayoutShiftsAudit.audit(artifacts, {computedCache: new Map()});
    expect(auditResult.score).toEqual(0);
    expect(auditResult.displayValue).toBeDisplayString('2 layout shifts found');
    expect(auditResult.metricSavings).toEqual({CLS: 0.4});
    expect(auditResult.details.items).toHaveLength(2);
    expect(auditResult.details.items[0]).toHaveProperty('node');
    expect(auditResult.details.items[0].node).toHaveProperty('type', 'node');
    expect(auditResult.details.items[0].score).toEqual(0.3);
    expect(auditResult.details.items[0].subItems.items[0].cause)
      .toBeDisplayString('Web font loaded');
    expect(auditResult.details.items[1]).toHaveProperty('node');
    expect(auditResult.details.items[1].node).toHaveProperty('type', 'node');
    expect(auditResult.details.items[1].score).toEqual(0.1);
    expect(auditResult.details.items[1].subItems).toBeUndefined();
  });

  it('correctly surfaces many layout shifts', async () => {
    const trace = createTestTrace({});
    const traceElements = [];

    for (let i = 1; i <= 4; ++i) {
      trace.traceEvents.push({
        args: {
          data: {
            had_recent_input: false,
            is_main_frame: true,
            weighted_score_delta: 0.3,
            impacted_nodes: [{
              node_id: i,
              old_rect: [0, 0, 1, 1],
              new_rect: [0, 0, 2, 2],
            }],
          },
          frame: 'ROOT_FRAME',
        },
        name: 'LayoutShift',
        cat: 'loading',
      });

      traceElements.push({
        traceEventType: 'layout-shift',
        nodeId: i,
        node: {
          devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
          selector: 'div.l-header > div.chorus-emc__content',
          nodeLabel: 'My Test Label',
          snippet: '<h1 class="test-class">',
        },
      });
    }

    const artifacts = {
      traces: {defaultPass: trace},
      TraceElements: traceElements,
      RootCauses: {layoutShifts: {}},
    };

    const auditResult = await LayoutShiftsAudit.audit(artifacts, {computedCache: new Map()});
    expect(auditResult.score).toEqual(0);
    expect(auditResult.notApplicable).toEqual(false);
    expect(auditResult.displayValue).toBeDisplayString('4 layout shifts found');
    expect(auditResult.details.items).toHaveLength(4);
  });
});
