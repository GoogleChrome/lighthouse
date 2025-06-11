/**
 * @license Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
*/

/* eslint-disable no-undef */

import {ExecutionContext} from '../../core/gather/driver/execution-context.js';
import {pageFunctions} from '../../core/lib/page-functions.js';

/**
 *
 * @param {Function} mainFn
 * @param {any[]} args
 * @param {any[]} deps
 * @return {string}
 */
function stringify(mainFn, args, deps) {
  const argsSerialized = ExecutionContext.serializeArguments(args);
  const depsSerialized = ExecutionContext.serializeDeps(deps);
  const expression = `(() => {
    ${depsSerialized}
    return (${mainFn})(${argsSerialized});
  })()`;
  return expression;
}

const fakeWindow = {};
fakeWindow.Node = class FakeNode {
  querySelectorAll() {
    return [
      Object.assign(new HTMLElement(), {innerText: 'interesting'}),
      Object.assign(new HTMLElement(), {innerText: 'not so interesting'}),
    ];
  }
};
fakeWindow.Element = class FakeElement extends fakeWindow.Node {
  matches() {
    return true;
  }
};
fakeWindow.HTMLElement = class FakeHTMLElement extends fakeWindow.Element {};

// @ts-expect-error
globalThis.window = fakeWindow;
// @ts-expect-error
globalThis.document = new fakeWindow.Node();
globalThis.HTMLElement = globalThis.window.HTMLElement;

/**
 * @param {HTMLElement[]} elements
 * @return {HTMLElement[]}
 */
function filterInterestingHtmlElements(elements) {
  return elements.filter(e => e.innerText === 'interesting');
}

function mainFn() {
  const el = Object.assign(new HTMLElement(), {
    tagName: 'FakeHTMLElement',
    innerText: 'contents',
    classList: [],
  });
  /** @type {HTMLElement[]} */
  // @ts-expect-error
  const elements = getElementsInDocument(el);
  return filterInterestingHtmlElements(elements);
}

// Indirect eval so code is run in global scope, and won't have incidental access to the
// esbuild keepNames function wrapper.
const indirectEval = eval;
const result = indirectEval(stringify(mainFn, [], [
  pageFunctions.getElementsInDocument,
  filterInterestingHtmlElements,
]));
if (!result || result.length !== 1 || result[0].innerText !== 'interesting') {
  throw new Error(`unexpected result, got ${JSON.stringify(result, null, 2)}`);
}
