/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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

// Indirect eval so code is run in global scope, and won't have incidental access to the
// esbuild keepNames function wrapper.
const indirectEval = eval;
const result = indirectEval(stringify(pageFunctions.computeBenchmarkIndex, [], []));
if (typeof result !== 'number') throw new Error(`expected number, but got ${result}`);
