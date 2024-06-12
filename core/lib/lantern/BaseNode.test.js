/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from './lantern.js';

const {BaseNode, NetworkNode} = Lantern;

function sortedById(nodeArray) {
  return nodeArray.sort((node1, node2) => node1.id.localeCompare(node2.id));
}

function createComplexGraph() {
  //   B       F
  //  / \     /
  // A   D - E
  //  \ /     \
  //   C       G - H

  const nodeA = new BaseNode('A');
  const nodeB = new BaseNode('B');
  const nodeC = new BaseNode('C');
  const nodeD = new BaseNode('D');
  const nodeE = new BaseNode('E');
  const nodeF = new BaseNode('F');
  const nodeG = new BaseNode('G');
  const nodeH = new BaseNode('H');

  nodeA.addDependent(nodeB);
  nodeA.addDependent(nodeC);
  nodeB.addDependent(nodeD);
  nodeC.addDependent(nodeD);
  nodeD.addDependent(nodeE);
  nodeE.addDependent(nodeF);
  nodeE.addDependent(nodeG);
  nodeG.addDependent(nodeH);

  return {
    nodeA,
    nodeB,
    nodeC,
    nodeD,
    nodeE,
    nodeF,
    nodeG,
    nodeH,
  };
}
describe('DependencyGraph/Node', () => {
  describe('#constructor', () => {
    it('should set the ID', () => {
      const node = new BaseNode('foo');
      assert.equal(node.id, 'foo');
    });
  });

  describe('.addDependent', () => {
    it('should add the correct edge', () => {
      const nodeA = new BaseNode(1);
      const nodeB = new BaseNode(2);
      nodeA.addDependent(nodeB);

      assert.deepEqual(nodeA.getDependents(), [nodeB]);
      assert.deepEqual(nodeB.getDependencies(), [nodeA]);
    });
  });

  describe('.addDependency', () => {
    it('should add the correct edge', () => {
      const nodeA = new BaseNode(1);
      const nodeB = new BaseNode(2);
      nodeA.addDependency(nodeB);

      assert.deepEqual(nodeA.getDependencies(), [nodeB]);
      assert.deepEqual(nodeB.getDependents(), [nodeA]);
    });

    it('throw when trying to add a dependency on itself', () => {
      const nodeA = new BaseNode(1);
      expect(() => nodeA.addDependency(nodeA)).toThrow();
    });
  });

  describe('.isDependentOn', () => {
    it('should identify the dependency relationships', () => {
      const graph = createComplexGraph();
      const nodes = Object.values(graph);
      const {nodeA, nodeB, nodeD, nodeF, nodeH} = graph;

      for (const node of nodes) {
        expect(nodeA.isDependentOn(node)).toBe(node === nodeA);
        expect(nodeB.isDependentOn(node)).toBe(node === nodeA || node === nodeB);
        expect(nodeH.isDependentOn(node)).toBe(node !== nodeF);
      }

      expect(nodeD.isDependentOn(nodeA)).toBe(true);
      expect(nodeD.isDependentOn(nodeB)).toBe(true);
      expect(nodeD.isDependentOn(nodeD)).toBe(true);

      expect(nodeD.isDependentOn(nodeH)).toBe(false);
      expect(nodeH.isDependentOn(nodeD)).toBe(true);

      expect(nodeF.isDependentOn(nodeH)).toBe(false);
      expect(nodeH.isDependentOn(nodeF)).toBe(false);
    });
  });

  describe('.getRootNode', () => {
    it('should return the root node', () => {
      const graph = createComplexGraph();

      assert.equal(graph.nodeA.getRootNode(), graph.nodeA);
      assert.equal(graph.nodeB.getRootNode(), graph.nodeA);
      assert.equal(graph.nodeD.getRootNode(), graph.nodeA);
      assert.equal(graph.nodeF.getRootNode(), graph.nodeA);
    });
  });

  describe('.cloneWithoutRelationships', () => {
    it('should create a copy', () => {
      const node = new BaseNode(1);
      const neighbor = new BaseNode(2);
      node.addDependency(neighbor);
      const clone = node.cloneWithoutRelationships();

      assert.equal(clone.id, 1);
      assert.notEqual(node, clone);
      assert.equal(clone.getDependencies().length, 0);
    });

    it('should copy isMainDocument', () => {
      const node = new BaseNode(1);
      node.setIsMainDocument(true);
      const networkNode = new NetworkNode({});
      networkNode.setIsMainDocument(true);

      assert.ok(node.cloneWithoutRelationships().isMainDocument());
      assert.ok(networkNode.cloneWithoutRelationships().isMainDocument());
    });
  });

  describe('.cloneWithRelationships', () => {
    it('should create a copy of a basic graph', () => {
      const node = new BaseNode(1);
      const neighbor = new BaseNode(2);
      node.addDependency(neighbor);
      const clone = node.cloneWithRelationships();

      assert.equal(clone.id, 1);
      assert.notEqual(node, clone);

      const dependencies = clone.getDependencies();
      assert.equal(dependencies.length, 1);

      const neighborClone = dependencies[0];
      assert.equal(neighborClone.id, neighbor.id);
      assert.notEqual(neighborClone, neighbor);
      assert.equal(neighborClone.getDependents()[0], clone);
    });

    it('should create a copy of a complex graph', () => {
      const graph = createComplexGraph();
      const clone = graph.nodeA.cloneWithRelationships();

      const clonedIdMap = new Map();
      clone.traverse(node => clonedIdMap.set(node.id, node));
      assert.equal(clonedIdMap.size, 8);

      graph.nodeA.traverse(node => {
        const clone = clonedIdMap.get(node.id);
        assert.equal(clone.id, node.id);
        assert.notEqual(clone, node);

        const actualDependents = sortedById(clone.getDependents());
        const expectedDependents = sortedById(node.getDependents());
        actualDependents.forEach((cloneDependent, index) => {
          const originalDependent = expectedDependents[index];
          assert.equal(cloneDependent.id, originalDependent.id);
          assert.notEqual(cloneDependent, originalDependent);
        });
      });
    });

    it('should create a copy of a graph with long dependency chains', () => {
      //   C - D - E - F
      //  /             \
      // A - - - - - - - B
      const nodeA = new BaseNode('A');
      const nodeB = new BaseNode('B');
      const nodeC = new BaseNode('C');
      const nodeD = new BaseNode('D');
      const nodeE = new BaseNode('E');
      const nodeF = new BaseNode('F');

      nodeA.addDependent(nodeB);
      nodeF.addDependent(nodeB);

      nodeA.addDependent(nodeC);
      nodeC.addDependent(nodeD);
      nodeD.addDependent(nodeE);
      nodeE.addDependent(nodeF);

      const clone = nodeA.cloneWithRelationships();

      const clonedIdMap = new Map();
      clone.traverse(node => clonedIdMap.set(node.id, node));
      assert.equal(clonedIdMap.size, 6);
    });

    it('should create a copy when not starting at root node', () => {
      const graph = createComplexGraph();
      const cloneD = graph.nodeD.cloneWithRelationships();
      assert.equal(cloneD.id, 'D');
      assert.equal(cloneD.getRootNode().id, 'A');
    });

    it('should create a partial copy of a complex graph', () => {
      const graph = createComplexGraph();
      // create a clone with F and all its dependencies
      const clone = graph.nodeA.cloneWithRelationships(node => node.id === 'F');

      const clonedIdMap = new Map();
      clone.traverse(node => clonedIdMap.set(node.id, node));

      assert.equal(clonedIdMap.size, 6);
      assert.ok(clonedIdMap.has('F'), 'did not include target node');
      assert.ok(clonedIdMap.has('E'), 'did not include dependency');
      assert.ok(clonedIdMap.has('B'), 'did not include branched dependency');
      assert.ok(clonedIdMap.has('C'), 'did not include branched dependency');
      assert.equal(clonedIdMap.get('G'), undefined);
      assert.equal(clonedIdMap.get('H'), undefined);
    });

    it('should throw if original node is not in cloned graph', () => {
      const graph = createComplexGraph();
      assert.throws(
        // clone from root to nodeB, but called on nodeD
        _ => graph.nodeD.cloneWithRelationships(node => node.id === 'B'),
        /^Error: Cloned graph missing node$/
      );
    });
  });

  describe('.traverse', () => {
    it('should visit every dependent node', () => {
      const graph = createComplexGraph();
      const ids = [];
      graph.nodeA.traverse(node => ids.push(node.id));

      assert.deepEqual(ids, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    });

    it('should include a shortest traversal path to every dependent node', () => {
      const graph = createComplexGraph();
      const paths = [];
      graph.nodeA.traverse((node, traversalPath) => {
        assert.strictEqual(node.id, traversalPath[0].id);
        paths.push(traversalPath.map(node => node.id));
      });

      assert.deepStrictEqual(paths, [
        ['A'],
        ['B', 'A'],
        ['C', 'A'],
        ['D', 'B', 'A'],
        ['E', 'D', 'B', 'A'],
        ['F', 'E', 'D', 'B', 'A'],
        ['G', 'E', 'D', 'B', 'A'],
        ['H', 'G', 'E', 'D', 'B', 'A'],
      ]);
    });

    it('should respect getNext', () => {
      const graph = createComplexGraph();
      const ids = [];
      graph.nodeF.traverse(
        node => ids.push(node.id),
        node => node.getDependencies()
      );

      assert.deepEqual(ids, ['F', 'E', 'D', 'B', 'C', 'A']);
    });
  });

  describe('#hasCycle', () => {
    it('should return false for DAGs', () => {
      const graph = createComplexGraph();
      assert.equal(BaseNode.hasCycle(graph.nodeA), false);
    });

    it('should return false for triangular DAGs', () => {
      //   B
      //  / \
      // A - C
      const nodeA = new BaseNode('A');
      const nodeB = new BaseNode('B');
      const nodeC = new BaseNode('C');

      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);

      assert.equal(BaseNode.hasCycle(nodeA), false);
    });

    it('should return true for basic cycles', () => {
      // A - B - C - A!
      const nodeA = new BaseNode('A');
      const nodeB = new BaseNode('B');
      const nodeC = new BaseNode('C');

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeC.addDependent(nodeA);

      assert.equal(BaseNode.hasCycle(nodeA), true);
    });

    it('should return true for children', () => {
      //       A!
      //      /
      // A - B - C
      const nodeA = new BaseNode('A');
      const nodeB = new BaseNode('B');
      const nodeC = new BaseNode('C');

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeB.addDependent(nodeA);

      assert.equal(BaseNode.hasCycle(nodeC), true);
    });

    it('should return true for complex cycles', () => {
      //   B - D - F - G - C!
      //  /      /
      // A - - C - E - H
      const nodeA = new BaseNode('A');
      const nodeB = new BaseNode('B');
      const nodeC = new BaseNode('C');
      const nodeD = new BaseNode('D');
      const nodeE = new BaseNode('E');
      const nodeF = new BaseNode('F');
      const nodeG = new BaseNode('G');
      const nodeH = new BaseNode('H');

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeB.addDependent(nodeD);
      nodeC.addDependent(nodeE);
      nodeC.addDependent(nodeF);
      nodeD.addDependent(nodeF);
      nodeE.addDependent(nodeH);
      nodeF.addDependent(nodeG);
      nodeG.addDependent(nodeC);

      assert.equal(BaseNode.hasCycle(nodeA), true);
      assert.equal(BaseNode.hasCycle(nodeB), true);
      assert.equal(BaseNode.hasCycle(nodeC), true);
      assert.equal(BaseNode.hasCycle(nodeD), true);
      assert.equal(BaseNode.hasCycle(nodeE), true);
      assert.equal(BaseNode.hasCycle(nodeF), true);
      assert.equal(BaseNode.hasCycle(nodeG), true);
      assert.equal(BaseNode.hasCycle(nodeH), true);
    });

    it('works for very large graphs', () => {
      const root = new BaseNode('root');

      let lastNode = root;
      for (let i = 0; i < 10000; i++) {
        const nextNode = new BaseNode(`child${i}`);
        lastNode.addDependent(nextNode);
        lastNode = nextNode;
      }

      lastNode.addDependent(root);
      assert.equal(BaseNode.hasCycle(root), true);
    });
  });
});
