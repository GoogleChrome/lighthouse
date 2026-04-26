/**
 * @license Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview - Used to generate which polyfills to check for in LegacyJavaScript audit.
 *
 * Produces a list of polyfills that a Baseline-targeting babel config should not include.
 * In addition to listing the corejs module, also assigns a "name" that distinguishes between
 * a instance property polyfill (Array.protoype.at) and a static property (Array.from). This
 * is necessary for the regexp generation in the audit.
 *
 * Result is written to core/lib/legacy-javascript/polyfill-module-data.json
 */

import fs from 'fs';

import coreJsCompat from 'core-js-compat';

import {LH_ROOT} from '../../../shared/root.js';

/**
 * @typedef {Array<{name: string, modules: string[], corejs?: boolean}>} PolyfillModuleData
*/

/**
 * @param {string} str
 */
function kebabCaseToCamelCase(str) {
  return str.replace(/(-\w)/g, m => m[1].toUpperCase());
}

const polyfillsNotNeededForBaseline = coreJsCompat({
  targets: [
    'chrome >0 and last 2.5 years',
    'edge >0 and last 2.5 years',
    'safari >0 and last 2.5 years',
    'firefox >0 and last 2.5 years',
    'and_chr >0 and last 2.5 years',
    'and_ff >0 and last 2.5 years',
    'ios >0 and last 2.5 years',
  ],
  modules: 'core-js/actual',
  inverse: true,
});

// Note: if you want to explore more:
// - see https://github.com/zloirock/core-js/blob/master/packages/core-js-compat/src/data.mjs
// - remove `inverse: true` above and log `polyfillsNotNeededForBaseline.targets`

console.log('num polyfills to check for:', polyfillsNotNeededForBaseline.list.length);

const modulesToSkip = [
  // Deprecated.
  'es.string.anchor',
  'es.string.big',
  'es.string.blink',
  'es.string.bold',
  'es.string.fixed',
  'es.string.fontcolor',
  'es.string.fontsize',
  'es.string.italics',
  'es.string.small',
  'es.string.strike',
  'es.string.sub',
  'es.string.sup',

  // Problematic detection for minified rollup due to inlining some code.
  // ex:
  //   var WEBKIT_BUG = requireStringPadWebkitBug();
  //   $({ target: 'String', proto: true, forced: WEBKIT_BUG }, {
  //     padStart: function padStart(maxLength) {
  //       return $padStart(this, maxLength, arguments.length > 1 ? arguments[1] : undefined);
  //     }
  //   });
  // minifies to:
  //   {target:"String",proto:!0,forced:function(){if(Ft)return Ct;Ft=1;var r=hr();return Ct=/Version\/10(?:\.\d+){1,2}(?: [\w./]+)?(?: Mobile\/\w+)? Safari\//.test(r)}()},{padStart:function(r){return n(this,r,arguments.length>1?arguments[1]:void 0)}}),o}kt||(kt=1,Wt())}();
  //                                              ^^^^ hard to skip via regex
  'es.reflect.set',
  'es.string.pad-end',
  'es.string.pad-start',

  // Internals of core-js@3 currently emit the code for these polyfills even if not needed
  // by the target environment.
  // Example: https://github.com/zloirock/core-js/blob/2da152ff2b23d483be6e2e30e4fcb93582bd9be7/packages/core-js/internals/composite-key.js#L2-L3
  'es.map',
  'es.set',
  'es.weak-map',
  'es.weak-set',

  // Haven't worked out how to detect polyfils for new classes yet.
  'es.promise',

  // Skip some tricky stuff. Would be good to reduce this array.
  'es.symbol',
  'es.symbol.description',
  'es.symbol.async-iterator',
  'es.symbol.has-instance',
  'es.symbol.is-concat-spreadable',
  'es.symbol.iterator',
  'es.symbol.match',
  'es.symbol.match-all',
  'es.symbol.replace',
  'es.symbol.search',
  'es.symbol.species',
  'es.symbol.split',
  'es.symbol.to-primitive',
  'es.symbol.to-string-tag',
  'es.symbol.unscopables',
  'es.error.to-string',
  'es.aggregate-error',
  'es.aggregate-error.cause',
  'es.array.iterator',
  'es.array.last-index-of',
  'es.array.reduce',
  'es.array.reduce-right',
  'es.array.reverse',
  'es.array.species',
  'es.array.splice',
  'es.array.unscopables.flat',
  'es.array.unscopables.flat-map',
  'es.array-buffer.constructor',
  'es.array-buffer.is-view',
  'es.array-buffer.slice',
  'es.data-view',
  'es.date.get-year',
  'es.date.now',
  'es.date.set-year',
  'es.date.to-gmt-string',
  'es.date.to-iso-string',
  'es.date.to-json',
  'es.date.to-primitive',
  'es.date.to-string',
  'es.escape',
  'es.function.bind',
  'es.function.has-instance',
  'es.function.name',
  'es.global-this',
  'es.json.stringify',
  'es.json.to-string-tag',
  'es.math.to-string-tag',
  'es.number.constructor',
  'es.number.epsilon',
  'es.number.is-finite',
  'es.number.is-integer',
  'es.number.is-nan',
  'es.number.is-safe-integer',
  'es.number.max-safe-integer',
  'es.number.min-safe-integer',
  'es.number.parse-float',
  'es.number.parse-int',
  'es.number.to-exponential',
  'es.number.to-fixed',
  'es.number.to-precision',
  'es.object.define-getter',
  'es.object.define-properties',
  'es.object.define-property',
  'es.object.define-setter',
  'es.object.get-own-property-names',
  'es.object.lookup-getter',
  'es.object.lookup-setter',
  'es.object.proto',
  'es.object.to-string',
  'es.parse-float',
  'es.parse-int',
  'es.promise.all-settled',
  'es.promise.finally',
  'es.reflect.define-property',
  'es.reflect.to-string-tag',
  'es.regexp.constructor',
  'es.regexp.dot-all',
  'es.regexp.exec',
  'es.regexp.flags',
  'es.regexp.sticky',
  'es.regexp.test',
  'es.regexp.to-string',
  'es.string.at-alternative',
  'es.string.iterator',
  'es.string.match',
  'es.string.replace',
  'es.string.search',
  'es.string.split',
  'es.typed-array.float32-array',
  'es.typed-array.float64-array',
  'es.typed-array.int8-array',
  'es.typed-array.int16-array',
  'es.typed-array.int32-array',
  'es.typed-array.uint8-array',
  'es.typed-array.uint8-clamped-array',
  'es.typed-array.uint16-array',
  'es.typed-array.uint32-array',
  'es.typed-array.at',
  'es.typed-array.copy-within',
  'es.typed-array.every',
  'es.typed-array.fill',
  'es.typed-array.filter',
  'es.typed-array.find',
  'es.typed-array.find-index',
  'es.typed-array.find-last',
  'es.typed-array.find-last-index',
  'es.typed-array.for-each',
  'es.typed-array.from',
  'es.typed-array.includes',
  'es.typed-array.index-of',
  'es.typed-array.iterator',
  'es.typed-array.join',
  'es.typed-array.last-index-of',
  'es.typed-array.map',
  'es.typed-array.of',
  'es.typed-array.reduce',
  'es.typed-array.reduce-right',
  'es.typed-array.reverse',
  'es.typed-array.set',
  'es.typed-array.slice',
  'es.typed-array.some',
  'es.typed-array.sort',
  'es.typed-array.subarray',
  'es.typed-array.to-locale-string',
  'es.typed-array.to-string',
  'es.unescape',
  'esnext.aggregate-error',
  'esnext.global-this',
  'esnext.typed-array.at',
  'esnext.typed-array.find-last',
  'esnext.typed-array.find-last-index',
  'web.atob',
  'web.btoa',
  'web.dom-collections.for-each',
  'web.dom-collections.iterator',
  'web.dom-exception.constructor',
  'web.dom-exception.to-string-tag',
  'web.queue-microtask',
  'web.self',
  'web.timers',
  'web.url',
  'web.url.to-json',
  'web.url-search-params',
];

const unneededSkips = modulesToSkip.filter(m => !polyfillsNotNeededForBaseline.list.includes(m));
if (unneededSkips.length) {
  console.error('Remove these skipped modules:');
  console.error(unneededSkips);
  process.exit(1);
}

/** @type {PolyfillModuleData} */
const data = [
  // These don't match the automated patterns that add most things.

  // This doesn't have a JS api.
  {name: 'focus-visible', modules: ['focus-visible']},
  // Must pass a value to Error ctor to see this property.
  {name: 'Error.prototype.cause', modules: ['es.error.cause']},
];

for (const polyfillModuleName of polyfillsNotNeededForBaseline.list) {
  // Skip if manualy defined above already.
  if (data.some(d => d.modules.includes(polyfillModuleName))) {
    continue;
  }

  if (modulesToSkip.includes(polyfillModuleName)) {
    console.log(`skipping: ${polyfillModuleName}`);
    continue;
  }

  const parts = polyfillModuleName.split('.').slice(1);

  let className = kebabCaseToCamelCase(parts[0]);
  className = className[0].toUpperCase() + className.slice(1);
  if (parts[0] === 'json') className = 'JSON';
  if (parts[0] === 'url') className = 'URL';

  let prop = parts.length > 1 ? kebabCaseToCamelCase(parts[1]) : '';
  if (parts[1] === 'to-json') prop = 'toJSON';

  // @ts-expect-error
  const maybeGlobal = global[className];

  if (parts.length === 1) {
    if (!maybeGlobal) {
      throw new Error(polyfillModuleName);
    }

    data.push({name: className, modules: [polyfillModuleName], corejs: true});
  } else {
    try {
      const instance = maybeGlobal();
      if (instance[prop] !== undefined) {
        // eslint-disable-next-line max-len
        data.push({name: `${className}.prototype.${prop}`, modules: [polyfillModuleName], corejs: true});
        continue;
      }
    } catch {} // example polyfill that can't be constructed: es.math.acosh (Math.acosh). handled below.

    // Should be a global then. Look for a property on it.
    if (maybeGlobal && Object.hasOwn(maybeGlobal, prop)) {
      data.push({name: `${className}.${prop}`, modules: [polyfillModuleName], corejs: true});
    } else {
      throw new Error(polyfillModuleName);
    }
  }
}

// Not sure why core-js emits multiple polyfills for the same thing.
// Ex: esnext.promise.any and es.promise.any, esnext.string.match-all and es.string.match-all.
// Combine these into a single entry.
for (const entry of [...data]) {
  const module = entry.modules[0];
  if (!module.startsWith('esnext')) continue;

  const otherEntry = data.find(e => e !== entry && e.name === entry.name);
  if (!otherEntry) continue;

  otherEntry.modules.push(...entry.modules);
  data.splice(data.indexOf(entry), 1);
}

fs.writeFileSync(`${LH_ROOT}/core/lib/legacy-javascript/polyfill-module-data.json`,
  JSON.stringify(data, null, 2));
