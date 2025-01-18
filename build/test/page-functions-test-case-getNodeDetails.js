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

const fakeWindow = {
  HTMLElement: class FakeHTMLElement {
    getAttribute() {
      return '';
    }

    getBoundingClientRect() {
      return {left: 42};
    }
  },
};

// @ts-expect-error
globalThis.window = fakeWindow;
globalThis.HTMLElement = globalThis.window.HTMLElement;
// @ts-expect-error
globalThis.ShadowRoot = class FakeShadowRoot {};
// @ts-expect-error
globalThis.Node = {DOCUMENT_FRAGMENT_NODE: 11};

function mainFn() {
  const el = Object.assign(new HTMLElement(), {
    tagName: 'FakeHTMLElement',
    innerText: 'contents',
    classList: [],
  });
  // @ts-expect-error
  return getNodeDetails(el);
}

// Indirect eval so code is run in global scope, and won't have incidental access to the
// esbuild keepNames function wrapper.
const indirectEval = eval;
const result = indirectEval(stringify(mainFn, [], [pageFunctions.getNodeDetails]));
if (result.lhId !== 'page-0-FakeHTMLElement' || result.boundingRect.left !== 42) {
  throw new Error(`unexpected result, got ${JSON.stringify(result, null, 2)}`);
}
