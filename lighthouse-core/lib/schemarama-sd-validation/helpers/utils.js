/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Store = require('n3').Store;

/**
 * Removes duplicates from objects array
 * @param {Array<Object.<string, any>>} items
 * @param {string[]} keys
 * @returns {*}
 */
function uniqueBy(items, keys) {
  /** @type {Object.<string, any>} */
  const seen = {};
  return items.filter(function(item) {
    let val = '';
    keys.forEach(key => val += item[key]);
    return seen.hasOwnProperty(val) ? false : (seen[val] = true);
  });
}

/**
 *  Generates random URL as base
 *  @param {number} length
 *  @return {string}
 */
function dummyUrl(length = 16) {
  let result = 'https://example.org/';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Finds strongly connected components in the data graph
 * @param {import('n3').Store} store
 * @return {Map<string, number>} - map from subject uris to
 * component ids
 */
function stronglyConnectedComponents(store) {
  const nodes = [...new Set(store.getSubjects()
    .map(x => x.id))];

  /** @type {Array<string>}*/
  const order = [];
  /** @type {Array<string>}*/
  let component = [];
  let componentIdx = 0;
  const components = new Map();
  const used = new Map();

  /**
   * @param {string} vertex
   */
  const forwardDfs = (vertex) => {
    used.set(vertex, true);
    for (const quad of store.getQuads(vertex, undefined, undefined)) {
      if (quad.object.termType !== 'Literal' && nodes.includes(quad.object.id) &&
        !used.get(quad.object.id)) {
        forwardDfs(quad.object.id);
      }
    }
    order.push(vertex);
  };

  /**
   * @param {string} vertex
   */
  const backwardDfs = (vertex) => {
    used.set(vertex, true);
    component.push(vertex);
    for (const quad of store.getQuads(undefined, undefined, vertex)) {
      if (!used.get(quad.subject.id)) {
        backwardDfs(quad.subject.id);
      }
    }
  };

  for (const node of nodes) used.set(node, false);
  for (const node of nodes) {
    if (!used.get(node)) {
      forwardDfs(node);
    }
  }
  for (const node of nodes) used.set(node, false);
  for (let i = 0; i < nodes.length; i++) {
    const node = order[nodes.length - 1 - i];
    if (!used.get(node)) {
      backwardDfs(node);
      component.forEach(x => components.set(x, componentIdx));
      componentIdx++;
      component = [];
    }
  }
  return components;
}

/**
 * Parses quads to multiple stores, one for each typed shape
 * @param {import('n3').Store} store
 */
function quadsToShapes(store) {
  const components = stronglyConnectedComponents(store);
  const notRoot = new Set();
  for (const quad of store.getQuads()) {
    if (quad.object.termType !== 'Literal' &&
      components.has(quad.subject.id) &&
      components.has(quad.object.id) &&
      components.get(quad.subject.id) !== components.get(quad.object.id)) {
      notRoot.add(components.get(quad.object.id));
    }
  }

  const shapes = new Map();
  for (const [node, component] of components.entries()) {
    if (!notRoot.has(component)) {
      shapes.set(node, getShape(node, store, shapes, []));
      notRoot.add(component);
    }
  }
  return shapes;
}

/**
 * Recursively gets all triples, related to the shape
 * @param {any} id - id of the constructed shape
 * @param {import('n3').Store} store - store, containing all the triples
 * @param {Map<any, import('n3').Store>} shapes - map [id -> shape Store]
 * @param {Array<any>} parsed - array for tracking recursive loops
 */
function getShape(id, store, shapes, parsed) {
  parsed.push(id.id);
  const shapeQuads = store.getQuads(id, undefined, undefined);
  if (shapeQuads.length === 0) return;
  for (const quad of store.getQuads(id, undefined, undefined)) {
    if (quad.object.termType !== 'Literal' && parsed.includes(quad.object.id)) continue;
    let nestedStore;
    if (shapes.get(quad.object)) {
      nestedStore = shapes.get(quad.object);
    } else {
      nestedStore = getShape(quad.object, store, shapes, parsed);
    }
    if (nestedStore && nestedStore.getQuads().length > 0) {
      shapeQuads.push(...nestedStore.getQuads());
    }
  }
  const shapeStore = new Store();
  for (const quad of shapeQuads) {
    shapeStore.addQuad(quad);
  }
  return shapeStore;
}

/**
 * Removes all url-like substrings for the given string
 * @param {string} text
 */
function removeUrls(text) {
  const urlRegexp = /https?:\/\/[^\s]+[/#]/g;
  while (text.match(urlRegexp)) {
    text = text.replace(urlRegexp, '');
  }
  return text;
}

/**
 * Represents namespace and builds IRIs using the same base
 * @param {string} base
 * @returns {function(string): string}
 */
function namespace(base) {
  return (prop) => base + prop;
}

/**
 * Format string (for localization)
 * @param {string} s
 * @param {Object.<string, string|undefined>} args
 * @returns {string}
 */
function formatString(s, args) {
  /**
   * @param {string} match
   * @param {string} val
   */
  const replacer = function(match, val) {
    return args.hasOwnProperty(val) ? args[val] || '' : match;
  };
  return s.replace(/{(.+)}/g, replacer);
}

module.exports = {
  dummyUrl: dummyUrl,
  removeUrls: removeUrls,
  uniqueBy: uniqueBy,
  quadsToShapes: quadsToShapes,
  namespace: namespace,
  formatString: formatString,
};
