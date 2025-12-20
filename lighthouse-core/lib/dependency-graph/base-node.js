/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * A union of all types derived from BaseNode, allowing type check discrimination
 * based on `node.type`. If a new node type is created, it should be added here.
 * @typedef {import('./cpu-node.js') | import('./network-node.js')} Node
 */

/**
 * @fileoverview This class encapsulates logic for handling resources and tasks used to model the
 * execution dependency graph of the page. A node has a unique identifier and can depend on other
 * nodes/be depended on. The construction of the graph maintains some important invariants that are
 * inherent to the model:
 *
 *    1. The graph is a DAG, there are no cycles.
 *    2. There is always a root node upon which all other nodes eventually depend.
 *
 * This allows particular optimizations in this class so that we do no need to check for cycles as
 * these methods are called and we can always start traversal at the root node.
 */
class BaseNode {
  /**
   * @param {string} id
   */
  constructor(id) {
    this._id = id;
    this._isMainDocument = false;
    /** @type {Node[]} */
    this._dependents = [];
    /** @type {Node[]} */
    this._dependencies = [];
  }

  /**
   * @return {string}
   */
  get id() {
    return this._id;
  }

  /**
   * @return {typeof BaseNode.TYPES[keyof typeof BaseNode.TYPES]}
   */
  get type() {
    throw new Error('Unimplemented');
  }

  /**
   * @return {number}
   */
  get startTime() {
    throw new Error('Unimplemented');
  }

  /**
   * @return {number}
   */
  get endTime() {
    throw new Error('Unimplemented');
  }

  /**
   * @param {boolean} value
   */
  setIsMainDocument(value) {
    this._isMainDocument = value;
  }

  /**
   * @return {boolean}
   */
  isMainDocument() {
    return this._isMainDocument;
  }

  /**
   * @return {Node[]}
   */
  getDependents() {
    return this._dependents.slice();
  }

  /**
   * @return {number}
   */
  getNumberOfDependents() {
    return this._dependents.length;
  }

  /**
   * @return {Node[]}
   */
  getDependencies() {
    return this._dependencies.slice();
  }

  /**
   * @return {number}
   */
  getNumberOfDependencies() {
    return this._dependencies.length;
  }

  /**
   * @return {Node}
   */
  getRootNode() {
    let rootNode = /** @type {Node} */ (/** @type {BaseNode} */ (this));
    while (rootNode._dependencies.length) {
      rootNode = rootNode._dependencies[0];
    }

    return rootNode;
  }

  /**
   * @param {Node} node
   */
  addDependent(node) {
    node.addDependency(/** @type {Node} */ (/** @type {BaseNode} */ (this)));
  }

  /**
   * @param {Node} node
   */
  addDependency(node) {
    // @ts-ignore - in checkJs, ts doesn't know that CPUNode and NetworkNode *are* BaseNodes.
    if (node === this) throw new Error('Cannot add dependency on itself');

    if (this._dependencies.includes(node)) {
      return;
    }

    node._dependents.push(/** @type {Node} */ (/** @type {BaseNode} */ (this)));
    this._dependencies.push(node);
  }

  /**
   * @param {Node} node
   */
  removeDependent(node) {
    node.removeDependency(/** @type {Node} */ (/** @type {BaseNode} */ (this)));
  }

  /**
   * @param {Node} node
   */
  removeDependency(node) {
    if (!this._dependencies.includes(node)) {
      return;
    }

    const thisIndex = node._dependents.indexOf(/** @type {Node} */ (/** @type {BaseNode} */(this)));
    node._dependents.splice(thisIndex, 1);
    this._dependencies.splice(this._dependencies.indexOf(node), 1);
  }

  removeAllDependencies() {
    for (const node of this._dependencies.slice()) {
      this.removeDependency(node);
    }
  }

  /**
   * Clones the node's information without adding any dependencies/dependents.
   * @return {Node}
   */
  cloneWithoutRelationships() {
    const node = /** @type {Node} */ (new BaseNode(this.id));
    node.setIsMainDocument(this._isMainDocument);
    return node;
  }

  /**
   * Clones the entire graph connected to this node filtered by the optional predicate. If a node is
   * included by the predicate, all nodes along the paths between the node and the root will be included. If the
   * node this was called on is not included in the resulting filtered graph, the method will throw.
   * @param {function(Node):boolean} [predicate]
   * @return {Node}
   */
  cloneWithRelationships(predicate) {
    const rootNode = this.getRootNode();

    /** @type {Map<string, Node>} */
    const idsToIncludedClones = new Map();

    // Walk down dependents.
    rootNode.traverse(node => {
      if (idsToIncludedClones.has(node.id)) return;

      if (predicate === undefined) {
        // No condition for entry, so clone every node.
        idsToIncludedClones.set(node.id, node.cloneWithoutRelationships());
        return;
      }

      if (predicate(node)) {
        // Node included, so walk back up dependencies, cloning nodes from here back to the root.
        node.traverse(
          node => idsToIncludedClones.set(node.id, node.cloneWithoutRelationships()),
          // Dependencies already cloned have already cloned ancestors, so no need to visit again.
          node => node._dependencies.filter(parent => !idsToIncludedClones.has(parent.id))
        );
      }
    });

    // Copy dependencies between nodes.
    rootNode.traverse(originalNode => {
      const clonedNode = idsToIncludedClones.get(originalNode.id);
      if (!clonedNode) return;

      for (const dependency of originalNode._dependencies) {
        const clonedDependency = idsToIncludedClones.get(dependency.id);
        if (!clonedDependency) throw new Error('Dependency somehow not cloned');
        clonedNode.addDependency(clonedDependency);
      }
    });

    const clonedThisNode = idsToIncludedClones.get(this.id);
    if (!clonedThisNode) throw new Error('Cloned graph missing node');
    return clonedThisNode;
  }

  /**
   * Traverses all connected nodes in BFS order, calling `callback` exactly once
   * on each. `traversalPath` is the shortest (though not necessarily unique)
   * path from `node` to the root of the iteration.
   *
   * The `getNextNodes` function takes a visited node and returns which nodes to
   * visit next. It defaults to returning the node's dependents.
   * @param {(node: Node, traversalPath: Node[]) => void} callback
   * @param {function(Node): Node[]} [getNextNodes]
   */
  traverse(callback, getNextNodes) {
    if (!getNextNodes) {
      getNextNodes = node => node.getDependents();
    }

    /** @type {Node[][]} */
    // @ts-ignore - only traverses graphs of Node, so force tsc to treat `this` as one
    const queue = [[this]];
    const visited = new Set([this.id]);

    while (queue.length) {
      /** @type {Node[]} */
      // @ts-ignore - queue has length so it's guaranteed to have an item
      const traversalPath = queue.shift();
      const node = traversalPath[0];
      callback(node, traversalPath);

      for (const nextNode of getNextNodes(node)) {
        if (visited.has(nextNode.id)) continue;
        visited.add(nextNode.id);

        queue.push([nextNode, ...traversalPath]);
      }
    }
  }

  /**
   * Returns whether the given node has a cycle in its dependent graph by performing a DFS.
   * @param {Node} node
   * @param {'dependents'|'dependencies'|'both'} [direction]
   * @return {boolean}
   */
  static hasCycle(node, direction = 'both') {
    // Checking 'both' is the default entrypoint to recursively check both directions
    if (direction === 'both') {
      return BaseNode.hasCycle(node, 'dependents') || BaseNode.hasCycle(node, 'dependencies');
    }

    const visited = new Set();
    /** @type {Node[]} */
    const currentPath = [];
    const toVisit = [node];
    const depthAdded = new Map([[node, 0]]);

    // Keep going while we have nodes to visit in the stack
    while (toVisit.length) {
      // Get the last node in the stack (DFS uses stack, not queue)
      /** @type {Node} */
      // @ts-ignore - toVisit has length so it's guaranteed to have an item
      const currentNode = toVisit.pop();

      // We've hit a cycle if the node we're visiting is in our current dependency path
      if (currentPath.includes(currentNode)) return true;
      // If we've already visited the node, no need to revisit it
      if (visited.has(currentNode)) continue;

      // Since we're visiting this node, clear out any nodes in our path that we had to backtrack
      // @ts-ignore
      while (currentPath.length > depthAdded.get(currentNode)) currentPath.pop();

      // Update our data structures to reflect that we're adding this node to our path
      visited.add(currentNode);
      currentPath.push(currentNode);

      // Add all of its dependents to our toVisit stack
      const nodesToExplore = direction === 'dependents' ?
        currentNode._dependents :
        currentNode._dependencies;
      for (const nextNode of nodesToExplore) {
        if (toVisit.includes(nextNode)) continue;
        toVisit.push(nextNode);
        depthAdded.set(nextNode, currentPath.length);
      }
    }

    return false;
  }
}

BaseNode.TYPES = /** @type {{NETWORK: 'network', CPU: 'cpu'}} */({
  NETWORK: 'network',
  CPU: 'cpu',
});

module.exports = BaseNode;
