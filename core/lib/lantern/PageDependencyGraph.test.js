/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from './lantern.js';

const {PageDependencyGraph, NetworkRequestTypes} = Lantern;

function createRequest(
  requestId,
  url,
  rendererStartTime = 0,
  initiator = null,
  resourceType = NetworkRequestTypes.Document,
  fromWorker = false
) {
  const networkEndTime = rendererStartTime + 50;
  return {
    requestId,
    url,
    rendererStartTime,
    networkEndTime,
    initiator,
    resourceType,
    fromWorker,
  };
}

const TOPLEVEL_TASK_NAME = 'TaskQueueManager::ProcessTaskFromWorkQueue';
describe('PageDependencyGraph', () => {
  let traceEvents;
  let URL;

  function addTaskEvents(startTs, duration, evts) {
    const mainEvent = {
      name: TOPLEVEL_TASK_NAME,
      tid: 1,
      ts: startTs * 1000,
      dur: duration * 1000,
      args: {},
    };

    traceEvents.push(mainEvent);

    let i = 0;
    for (const evt of evts) {
      i++;
      traceEvents.push({
        name: evt.name,
        ts: (evt.ts * 1000) || (startTs * 1000 + i),
        args: {data: evt.data},
      });
    }
  }

  beforeEach(() => {
    traceEvents = [];
    URL = {requestedUrl: 'https://example.com/', mainDocumentUrl: 'https://example.com/'};
  });

  describe('#getNetworkNodeOutput', () => {
    const request1 = createRequest(1, 'https://example.com/');
    const request2 = createRequest(2, 'https://example.com/page');
    const request3 = createRequest(3, 'https://example.com/page');
    const networkRequests = [request1, request2, request3];

    it('should create network nodes', () => {
      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(networkRequests);
      for (let i = 0; i < networkRequests.length; i++) {
        const node = networkNodeOutput.nodes[i];
        assert.ok(node, `did not create node at index ${i}`);
        assert.equal(node.id, i + 1);
        assert.equal(node.type, 'network');
        assert.equal(node.request, networkRequests[i]);
      }
    });

    it('should ignore worker requests', () => {
      const workerRequest = createRequest(4, 'https://example.com/worker.js', 0, null, 'Script', true);
      const recordsWithWorker = [
        ...networkRequests,
        workerRequest,
      ];

      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(recordsWithWorker);

      expect(networkNodeOutput.nodes).toHaveLength(3);
      expect(networkNodeOutput.nodes.map(node => node.request)).not.toContain(workerRequest);
    });

    it('should index nodes by ID', () => {
      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(networkRequests);
      const indexedById = networkNodeOutput.idToNodeMap;
      for (const request of networkRequests) {
        assert.equal(indexedById.get(request.requestId).request, request);
      }
    });

    it('should index nodes by URL', () => {
      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(networkRequests);
      const nodes = networkNodeOutput.nodes;
      const indexedByUrl = networkNodeOutput.urlToNodeMap;
      assert.deepEqual(indexedByUrl.get('https://example.com/'), [nodes[0]]);
      assert.deepEqual(indexedByUrl.get('https://example.com/page'), [nodes[1], nodes[2]]);
    });

    it('should index nodes by frame', () => {
      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput([
        {...createRequest(1, 'https://example.com/'), documentURL: 'https://example.com/', frameId: 'A'},
        {...createRequest(2, 'https://example.com/page'), documentURL: 'https://example.com/', frameId: 'A'},
        {...createRequest(3, 'https://example.com/page2'), documentURL: 'https://example.com/page2', frameId: 'C',
          resourceType: NetworkRequestTypes.XHR},
        {...createRequest(4, 'https://example.com/page3'), documentURL: 'https://example.com/page3', frameId: 'D'},
        {...createRequest(4, 'https://example.com/page4'), documentURL: 'https://example.com/page4', frameId: undefined},
        {...createRequest(4, 'https://example.com/page5'), documentURL: 'https://example.com/page5', frameId: 'collision'},
        {...createRequest(4, 'https://example.com/page6'), documentURL: 'https://example.com/page6', frameId: 'collision'},
      ]);

      const nodes = networkNodeOutput.nodes;
      const indexedByFrame = networkNodeOutput.frameIdToNodeMap;
      expect([...indexedByFrame.entries()]).toEqual([
        ['A', nodes[0]],
        ['D', nodes[3]],
        ['collision', null],
      ]);
    });
  });

  describe('#getCPUNodes', () => {
    it('should create CPU nodes', () => {
      addTaskEvents(0, 100, [
        {name: 'MyCustomEvent'},
        {name: 'OtherEvent'},
        {name: 'OutsideTheWindow', ts: 200},
        {name: 'OrphanedEvent'}, // should be ignored since we stopped at OutsideTheWindow
      ]);

      addTaskEvents(250, 50, [
        {name: 'LaterEvent'},
      ]);

      assert.equal(traceEvents.length, 7);
      const nodes = PageDependencyGraph.getCPUNodes(traceEvents);
      assert.equal(nodes.length, 2);

      const node1 = nodes[0];
      assert.equal(node1.id, '1.0');
      assert.equal(node1.type, 'cpu');
      assert.equal(node1.event, traceEvents[0]);
      assert.equal(node1.childEvents.length, 2);
      assert.equal(node1.childEvents[1].name, 'OtherEvent');

      const node2 = nodes[1];
      assert.equal(node2.id, '1.250000');
      assert.equal(node2.type, 'cpu');
      assert.equal(node2.event, traceEvents[5]);
      assert.equal(node2.childEvents.length, 1);
      assert.equal(node2.childEvents[0].name, 'LaterEvent');
    });

    it('should correct overlapping tasks', () => {
      addTaskEvents(0, 500, [
        {name: 'MyCustomEvent'},
        {name: 'OtherEvent'},
      ]);

      addTaskEvents(400, 50, [
        {name: 'OverlappingEvent'},
      ]);

      assert.equal(traceEvents.length, 5);
      const nodes = PageDependencyGraph.getCPUNodes(traceEvents);
      assert.equal(nodes.length, 2);

      const node1 = nodes[0];
      assert.equal(node1.id, '1.0');
      assert.equal(node1.type, 'cpu');
      assert.equal(node1.event, traceEvents[0]);
      assert.equal(node1.childEvents.length, 2);
      assert.equal(node1.childEvents[0].name, 'MyCustomEvent');
      assert.equal(node1.childEvents[1].name, 'OtherEvent');

      const node2 = nodes[1];
      assert.equal(node2.id, '1.400000');
      assert.equal(node2.type, 'cpu');
      assert.equal(node2.event, traceEvents[3]);
      assert.equal(node2.childEvents.length, 1);
      assert.equal(node2.childEvents[0].name, 'OverlappingEvent');
    });
  });

  describe('#createGraph', () => {
    it('should compute a simple network graph', () => {
      const request1 = createRequest(1, 'https://example.com/', 0);
      const request2 = createRequest(2, 'https://example.com/page', 5);
      const request3 = createRequest(3, 'https://example.com/page2', 5);
      const request4 = createRequest(4, 'https://example.com/page3', 10, {url: 'https://example.com/page'});
      const networkRequests = [request1, request2, request3, request4];

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 4);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3, 4]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[3].getDependencies(), [nodes[1]]);
    });

    it('should compute a simple network and CPU graph', () => {
      const request1 = createRequest(1, 'https://example.com/', 0);
      const request2 = createRequest(2, 'https://example.com/page', 50);
      const request3 = createRequest(3, 'https://example.com/page2', 50);
      const request4 = createRequest(4, 'https://example.com/page3', 300, null, NetworkRequestTypes.XHR);
      const networkRequests = [request1, request2, request3, request4];

      addTaskEvents(200, 200, [
        {name: 'EvaluateScript', data: {url: 'https://example.com/page'}},
        {name: 'ResourceSendRequest', data: {requestId: 4}},
      ]);

      addTaskEvents(700, 50, [
        {name: 'InvalidateLayout', data: {stackTrace: [{url: 'https://example.com/page2'}]}},
        {name: 'XHRReadyStateChange', data: {readyState: 4, url: 'https://example.com/page3'}},
      ]);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      const getIds = nodes => nodes.map(node => node.id);
      const getDependencyIds = node => getIds(node.getDependencies());

      assert.equal(nodes.length, 6);
      assert.deepEqual(getIds(nodes), [1, 2, 3, 4, '1.200000', '1.700000']);
      assert.deepEqual(getDependencyIds(nodes[0]), []);
      assert.deepEqual(getDependencyIds(nodes[1]), [1]);
      assert.deepEqual(getDependencyIds(nodes[2]), [1]);
      assert.deepEqual(getDependencyIds(nodes[3]), [1, '1.200000']);
      assert.deepEqual(getDependencyIds(nodes[4]), [2]);
      assert.deepEqual(getDependencyIds(nodes[5]), [3, 4]);
    });

    it('should compute a network graph with duplicate URLs', () => {
      const request1 = createRequest(1, 'https://example.com/', 0);
      const request2 = createRequest(2, 'https://example.com/page', 5);
      const request3 = createRequest(3, 'https://example.com/page', 5); // duplicate URL
      const request4 = createRequest(4, 'https://example.com/page3', 10, {url: 'https://example.com/page'});
      const networkRequests = [request1, request2, request3, request4];

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 4);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3, 4]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[3].getDependencies(), [nodes[0]]); // should depend on rootNode instead
    });

    it('should be forgiving without cyclic dependencies', () => {
      const request1 = createRequest(1, 'https://example.com/', 0);
      const request2 = createRequest(2, 'https://example.com/page', 250, null, NetworkRequestTypes.XHR);
      const request3 = createRequest(3, 'https://example.com/page2', 210);
      const request4 = createRequest(4, 'https://example.com/page3', 590);
      const request5 = createRequest(5, 'https://example.com/page4', 595, null, NetworkRequestTypes.XHR);
      const networkRequests = [request1, request2, request3, request4, request5];

      addTaskEvents(200, 200, [
        // CPU 1.2 should depend on Network 1
        {name: 'EvaluateScript', data: {url: 'https://example.com/'}},

        // Network 2 should depend on CPU 1.2, but 1.2 should not depend on Network 1
        {name: 'ResourceSendRequest', data: {requestId: 2}},
        {name: 'XHRReadyStateChange', data: {readyState: 4, url: 'https://example.com/page'}},

        // CPU 1.2 should not depend on Network 3 because it starts after CPU 1.2
        {name: 'EvaluateScript', data: {url: 'https://example.com/page2'}},
      ]);

      addTaskEvents(600, 150, [
        // CPU 1.6 should depend on Network 4 even though it ends at 410ms
        {name: 'InvalidateLayout', data: {stackTrace: [{url: 'https://example.com/page3'}]}},
        // Network 5 should not depend on CPU 1.6 because it started before CPU 1.6
        {name: 'ResourceSendRequest', data: {requestId: 5}},
      ]);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      const getDependencyIds = node => node.getDependencies().map(node => node.id);

      assert.equal(nodes.length, 7);
      assert.deepEqual(getDependencyIds(nodes[0]), []);
      assert.deepEqual(getDependencyIds(nodes[1]), [1, '1.200000']);
      assert.deepEqual(getDependencyIds(nodes[2]), [1]);
      assert.deepEqual(getDependencyIds(nodes[3]), [1]);
      assert.deepEqual(getDependencyIds(nodes[4]), [1]);
      assert.deepEqual(getDependencyIds(nodes[5]), [1]);
      assert.deepEqual(getDependencyIds(nodes[6]), [4]);
    });

    it('should not install timer dependency on itself', () => {
      const request1 = createRequest(1, 'https://example.com/', 0);
      const networkRequests = [request1];

      addTaskEvents(200, 200, [
        // CPU 1.2 should depend on Network 1
        {name: 'EvaluateScript', data: {url: 'https://example.com/'}},
        // CPU 1.2 will install and fire it's own timer, but should not depend on itself
        {name: 'TimerInstall', data: {timerId: 'timer1'}},
        {name: 'TimerFire', data: {timerId: 'timer1'}},
      ]);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      const getDependencyIds = node => node.getDependencies().map(node => node.id);

      assert.equal(nodes.length, 2);
      assert.deepEqual(getDependencyIds(nodes[0]), []);
      assert.deepEqual(getDependencyIds(nodes[1]), [1]);
    });

    it('should prune short tasks', () => {
      const request0 = createRequest(0, 'https://example.com/page0', 0);
      const request1 = createRequest(1, 'https://example.com/', 100, null, NetworkRequestTypes.Script);
      const request2 = createRequest(2, 'https://example.com/page', 200, null, NetworkRequestTypes.XHR);
      const request3 = createRequest(3, 'https://example.com/page2', 300, null, NetworkRequestTypes.Script);
      const request4 = createRequest(4, 'https://example.com/page3', 400, null, NetworkRequestTypes.XHR);
      const networkRequests = [request0, request1, request2, request3, request4];
      URL = {requestedUrl: 'https://example.com/page0', mainDocumentUrl: 'https://example.com/page0'};

      // Long task, should be kept in the output.
      addTaskEvents(120, 50, [
        {name: 'EvaluateScript', data: {url: 'https://example.com/'}},
        {name: 'ResourceSendRequest', data: {requestId: 2}},
        {name: 'XHRReadyStateChange', data: {readyState: 4, url: 'https://example.com/page'}},
      ]);

      // Short task, should be pruned, but the 3->4 relationship should be retained
      addTaskEvents(350, 5, [
        {name: 'EvaluateScript', data: {url: 'https://example.com/page2'}},
        {name: 'ResourceSendRequest', data: {requestId: 4}},
        {name: 'XHRReadyStateChange', data: {readyState: 4, url: 'https://example.com/page3'}},
      ]);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      const getDependencyIds = node => node.getDependencies().map(node => node.id);

      assert.equal(nodes.length, 6);

      assert.deepEqual(getDependencyIds(nodes[0]), []);
      assert.deepEqual(getDependencyIds(nodes[1]), [0]);
      assert.deepEqual(getDependencyIds(nodes[2]), [0, '1.120000']);
      assert.deepEqual(getDependencyIds(nodes[3]), [0]);
      assert.deepEqual(getDependencyIds(nodes[4]), [0, 3]);

      assert.equal('1.120000', nodes[5].id);
      assert.deepEqual(getDependencyIds(nodes[5]), [1]);
    });

    it('should not prune highly-connected short tasks', () => {
      const request0 = createRequest(0, 'https://example.com/page0', 0);
      const request1 = {
        ...createRequest(1, 'https://example.com/', 100, null, NetworkRequestTypes.Document),
        documentURL: 'https://example.com/',
        frameId: 'frame1',
      };
      const request2 = {
        ...createRequest(2, 'https://example.com/page', 200, null, NetworkRequestTypes.Script),
        documentURL: 'https://example.com/',
        frameId: 'frame1',
      };
      const request3 = createRequest(3, 'https://example.com/page2', 300, null, NetworkRequestTypes.XHR);
      const request4 = createRequest(4, 'https://example.com/page3', 400, null, NetworkRequestTypes.XHR);
      const networkRequests = [request0, request1, request2, request3, request4];
      URL = {requestedUrl: 'https://example.com/page0', mainDocumentUrl: 'https://example.com/page0'};

      // Short task, evaluates script (2) and sends two XHRs.
      addTaskEvents(220, 5, [
        {name: 'EvaluateScript', data: {url: 'https://example.com/page', frame: 'frame1'}},

        {name: 'ResourceSendRequest', data: {requestId: 3}},
        {name: 'XHRReadyStateChange', data: {readyState: 4, url: 'https://example.com/page2'}},

        {name: 'ResourceSendRequest', data: {requestId: 4}},
        {name: 'XHRReadyStateChange', data: {readyState: 4, url: 'https://example.com/page3'}},
      ]);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      const getDependencyIds = node => node.getDependencies().map(node => node.id);

      assert.equal(nodes.length, 6);

      assert.deepEqual(getDependencyIds(nodes[0]), []);
      assert.deepEqual(getDependencyIds(nodes[1]), [0]);
      assert.deepEqual(getDependencyIds(nodes[2]), [0]);
      assert.deepEqual(getDependencyIds(nodes[3]), [0, '1.220000']);
      assert.deepEqual(getDependencyIds(nodes[4]), [0, '1.220000']);

      assert.equal('1.220000', nodes[5].id);
      assert.deepEqual(getDependencyIds(nodes[5]), [1, 2]);
    });

    it('should not prune short, first tasks of critical events', () => {
      const request0 = createRequest(0, 'https://example.com/page0', 0);
      const networkRequests = [request0];
      URL = {requestedUrl: 'https://example.com/page0', mainDocumentUrl: 'https://example.com/page0'};

      const makeShortEvent = firstEventName => {
        const startTs = traceEvents.length * 100;
        addTaskEvents(startTs, 5, [
          {name: firstEventName, data: {url: 'https://example.com/page0'}},
        ]);
      };

      const criticalEventNames = [
        'Paint',
        'Layout',
        'ParseHTML',
      ];
      for (const eventName of criticalEventNames) {
        makeShortEvent(eventName);
        makeShortEvent(eventName);
      }

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const cpuNodes = [];
      graph.traverse(node => node.type === 'cpu' && cpuNodes.push(node));

      expect(cpuNodes.map(node => {
        return {
          id: node.id,
          name: node.childEvents[0].name,
        };
      })).toEqual([
        {
          id: '1.0',
          name: 'Paint',
        },
        {
          // ID jumps by 4 between each because each node has 2 CPU tasks and we skip the 2nd of each event type
          id: '1.400000',
          name: 'Layout',
        },
        {
          id: '1.800000',
          name: 'ParseHTML',
        },
      ]);
    });

    it('should set isMainDocument on request with mainDocumentUrl', () => {
      const request1 = createRequest(1, 'https://example.com/', 0, null, NetworkRequestTypes.Other);
      const request2 = createRequest(2, 'https://example.com/page', 5, null, NetworkRequestTypes.Document);
      // Add in another unrelated + early request to make sure we pick the correct chain
      const request3 = createRequest(3, 'https://example.com/page2', 0, null, NetworkRequestTypes.Other);
      request2.redirects = [request1];
      const networkRequests = [request1, request2, request3];
      URL = {requestedUrl: 'https://example.com/', mainDocumentUrl: 'https://example.com/page'};

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 3);
      assert.equal(nodes[0].id, 1);
      assert.equal(nodes[0].isMainDocument(), false);
      assert.equal(nodes[1].isMainDocument(), true);
      assert.equal(nodes[2].isMainDocument(), false);
    });

    it('should link up script initiators', () => {
      const request1 = createRequest(1, 'https://example.com/', 0);
      const request2 = createRequest(2, 'https://example.com/page', 5);
      const request3 = createRequest(3, 'https://example.com/page2', 5);
      const request4 = createRequest(4, 'https://example.com/page3', 20);
      // Set multiple initiator requests through script stack.
      request4.initiator = {
        type: 'script',
        stack: {callFrames: [{url: 'https://example.com/page'}], parent: {parent: {callFrames: [{url: 'https://example.com/page2'}]}}},
      };
      // Also set the initiatorRequest that Lighthouse's network-recorder.js creates.
      // This should be ignored and only used as a fallback.
      request4.initiatorRequest = request1;
      const networkRequests = [request1, request2, request3, request4];

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 4);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3, 4]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[3].getDependencies(), [nodes[1], nodes[2]]);
    });

    it('should link up script initiators only when timing is valid', () => {
      const request1 = createRequest(1, 'https://example.com/', 0);
      const request2 = createRequest(2, 'https://example.com/page', 500);
      const request3 = createRequest(3, 'https://example.com/page2', 500);
      const request4 = createRequest(4, 'https://example.com/page3', 20);
      request4.initiator = {
        type: 'script',
        stack: {callFrames: [{url: 'https://example.com/page'}], parent: {parent: {callFrames: [{url: 'https://example.com/page2'}]}}},
      };
      const networkRequests = [request1, request2, request3, request4];

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 4);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3, 4]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[3].getDependencies(), [nodes[0]]);
    });

    it('should link up script initiators with prefetch requests', () => {
      const request1 = createRequest(1, 'https://a.com/1', 0);
      const request2Prefetch = createRequest(2, 'https://a.com/js', 5);
      const request2Fetch = createRequest(3, 'https://a.com/js', 10);
      const request3 = createRequest(4, 'https://a.com/4', 20);
      // Set the initiator to an ambiguous URL (there are 2 requests for https://a.com/js)
      request3.initiator = {
        type: 'script',
        stack: {callFrames: [{url: 'https://a.com/js'}], parent: {parent: {callFrames: [{url: 'js'}]}}},
      };
      // Set the initiatorRequest that it should fallback to.
      request3.initiatorRequest = request2Fetch;
      const networkRequests = [request1, request2Prefetch, request2Fetch, request3];
      URL = {requestedUrl: 'https://a.com/1', mainDocumentUrl: 'https://a.com/1'};

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 4);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3, 4]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[3].getDependencies(), [nodes[2]]);
    });

    it('should not link up initiators with circular dependencies', () => {
      const rootRequest = createRequest(1, 'https://a.com', 0);
      // jsRequest1 initiated by jsRequest2
      //              *AND*
      // jsRequest2 initiated by jsRequest1
      const jsRequest1 = createRequest(2, 'https://a.com/js1', 1, {url: 'https://a.com/js2'});
      const jsRequest2 = createRequest(3, 'https://a.com/js2', 1, {url: 'https://a.com/js1'});
      const networkRequests = [rootRequest, jsRequest1, jsRequest2];
      URL = {requestedUrl: 'https://a.com', mainDocumentUrl: 'https://a.com'};

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));
      nodes.sort((a, b) => a.id - b.id);

      assert.equal(nodes.length, 3);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      // We don't know which of the initiators to trust in a cycle, so for now we
      // trust the earliest one (mostly because it's simplest).
      // In the wild so far we've only seen this for self-referential relationships.
      // If the evidence changes, then feel free to change these expectations :)
      assert.deepEqual(nodes[1].getDependencies(), [nodes[2]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
    });

    it('should not link up initiatorRequests with circular dependencies', () => {
      const rootRequest = createRequest(1, 'https://a.com', 0);
      // jsRequest1 initiated by jsRequest2
      //              *AND*
      // jsRequest2 initiated by jsRequest1
      const jsRequest1 = createRequest(2, 'https://a.com/js1', 1);
      const jsRequest2 = createRequest(3, 'https://a.com/js2', 1);
      jsRequest1.initiatorRequest = jsRequest2;
      jsRequest2.initiatorRequest = jsRequest1;
      const networkRequests = [rootRequest, jsRequest1, jsRequest2];
      URL = {requestedUrl: 'https://a.com', mainDocumentUrl: 'https://a.com'};

      addTaskEvents(0, 0, []);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));
      nodes.sort((a, b) => a.id - b.id);

      assert.equal(nodes.length, 3);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[2]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
    });

    it('should find root if it is not the first node', () => {
      const request1 = createRequest(1, 'https://example.com/', 0, null, NetworkRequestTypes.Other);
      const request2 = createRequest(2, 'https://example.com/page', 5, null, NetworkRequestTypes.Document);
      const networkRequests = [request1, request2];
      URL = {requestedUrl: 'https://example.com/page', mainDocumentUrl: 'https://example.com/page'};

      // Evaluated before root request.
      addTaskEvents(0.1, 50, [
        {name: 'EvaluateScript'},
      ]);

      const graph = PageDependencyGraph.createGraph(traceEvents, networkRequests, URL);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 1);
      assert.deepEqual(nodes.map(node => node.id), [2]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[0].getDependents(), []);
    });
  });
});
