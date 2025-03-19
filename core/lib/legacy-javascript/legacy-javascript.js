/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Identifies polyfills and transforms that should not be present if needing to support only Baseline browsers.
 * @see https://docs.google.com/document/d/1ItjJwAd6e0Ts6yMbvh8TN3BBh_sAd58rYE1whnpuxaA/edit Design document (old, based on module/nomodule pattern)
 * @see https://docs.google.com/spreadsheets/d/1z28Au8wo8-c2UsM2lDVEOJcI3jOkb2c951xEBqzBKCc/edit?usp=sharing Legacy babel transforms / polyfills
 * ./core/scripts/legacy-javascript - verification tool.
 */

/** @typedef {{name: string, expression: string, estimateBytes?: (content: string) => number}} Pattern */
/** @typedef {{name: string, line: number, column: number}} PatternMatchResult */
/** @typedef {{matches: PatternMatchResult[], estimatedByteSavings: number}} Result */

import fs from 'fs';

import {LH_ROOT} from '../../../shared/root.js';

const polyfillModuleDataJson = fs.readFileSync(
  `${LH_ROOT}/core/lib/legacy-javascript/polyfill-module-data.json`, 'utf-8');

/** @type {import('../../scripts/legacy-javascript/create-polyfill-module-data.js').PolyfillModuleData} */
const polyfillModuleData = JSON.parse(polyfillModuleDataJson);

const graphJson = fs.readFileSync(
  `${LH_ROOT}/core/lib/legacy-javascript/polyfill-graph-data.json`, 'utf-8');

/** @type {import('../../scripts/legacy-javascript/create-polyfill-size-estimation.js').PolyfillSizeEstimator} */
const graph = JSON.parse(graphJson);

/**
 * Takes a list of patterns (consisting of a name identifier and a RegExp expression string)
 * and via `match` returns match results with line / column information for a given code input.
 * Only returns the first match per pattern given.
 */
class CodePatternMatcher {
  /**
   * @param {Pattern[]} patterns
   */
  constructor(patterns) {
    this.patterns = patterns;
  }

  /**
   * @param {string} code
   * @return {PatternMatchResult[]}
   */
  match(code) {
    if (!this.re) {
      const patternsExpression =
        this.patterns.map(pattern => `(${pattern.expression})`).join('|');
      this.re = new RegExp(`(^\r\n|\r|\n)|${patternsExpression}`, 'g');
    }

    // Reset RegExp state.
    this.re.lastIndex = 0;

    const seen = new Set();
    /** @type {PatternMatchResult[]} */
    const matches = [];
    /** @type {RegExpExecArray | null} */
    let result;
    let line = 0;
    let lineBeginsAtIndex = 0;
    // Each pattern maps to one subgroup in the generated regex. For each iteration of RegExp.exec,
    // only one subgroup will be defined. Exec until no more matches.
    while ((result = this.re.exec(code)) !== null) {
      // Discard first value in `result` - it's just the entire match.
      const captureGroups = result.slice(1);
      // isNewline - truthy if matching a newline, used to track the line number.
      // `patternExpressionMatches` maps to each possible pattern in `this.patterns`.
      // Only one of [isNewline, ...patternExpressionMatches] is ever truthy.
      const [isNewline, ...patternExpressionMatches] = captureGroups;
      if (isNewline) {
        line++;
        lineBeginsAtIndex = result.index + 1;
        continue;
      }
      const pattern = this.patterns[patternExpressionMatches.findIndex(Boolean)];

      if (seen.has(pattern)) {
        continue;
      }
      seen.add(pattern);

      matches.push({
        name: pattern.name,
        line,
        column: result.index - lineBeginsAtIndex,
      });
    }

    return matches;
  }
}

/**
 * @param {string?} object
 * @param {string} property
 * @param {string} coreJs3Module
 */
function buildPolyfillExpression(object, property, coreJs3Module) {
  const qt = (/** @type {string} */ token) =>
    `['"]${token}['"]`; // don't worry about matching string delims

  let expression = '';

  if (object) {
    // String.prototype.startsWith =
    expression += `${object}\\.${property}\\s?=[^=]`;
  } else {
    // Promise =
    // window.Promise =// Promise =Z
    // but not: SomePromise =
    expression += `(?:window\\.|[\\s;]+)${property}\\s?=[^=]`;
  }

  // String.prototype['startsWith'] =
  if (object) {
    expression += `|${object}\\[${qt(property)}\\]\\s?=[^=]`;
  }

  // Object.defineProperty(String.prototype, 'startsWith'
  expression += `|defineProperty\\(${object || 'window'},\\s?${qt(property)}`;

  // es-shims
  // no(Object,{entries:r},{entries:function
  if (object) {
    expression += `|\\(${object},\\s*{${property}:.*},\\s*{${property}`;
  }

  // core-js
  if (object) {
    const objectWithoutPrototype = object.replace('.prototype', '');
    // e(e.S,"Object",{values
    // Minified + mangled pattern found in CDN babel-polyfill.
    // see https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.2.5/polyfill.min.js
    // TODO: perhaps this is the wrong place to check for a CDN polyfill. Remove?
    // expression += `|;e\\([^,]+,${qt(objectWithoutPrototype)},{${property}:`;

    // core-js@3 minified pattern.
    // {target:"Array",proto:true},{fill:fill
    // {target:"Array",proto:true,forced:!HAS_SPECIES_SUPPORT||!USES_TO_LENGTH},{filter:
    expression += `|{target:${qt(objectWithoutPrototype)}[^;]*},{${property}:`;
  } else {
    // Detect polyfills for new classes: Map, Set, WeakSet, etc.
    // TODO: so far, no class polyfills are enabled for detection.
    // See `modulesToSkip` in create-polyfill-module-data.js

    // collection("Map",
    // expression += `|collection\\(${qt(property)},`;
  }

  // Un-minified code may have module names.
  // core-js/modules/es.object.is-frozen
  expression += `|${coreJs3Module.replaceAll('.', '\\.')}(?:\\.js)?"`;

  return expression;
}

function getCoreJsPolyfillData() {
  return polyfillModuleData.filter(d => d.corejs).map(d => {
    return {
      name: d.name,
      coreJs3Module: d.modules[0],
    };
  });
}

/**
 * @return {Pattern[]}
 */
function getPolyfillPatterns() {
  /** @type {Pattern[]} */
  const patterns = [];

  for (const {name, coreJs3Module} of getCoreJsPolyfillData()) {
    const parts = name.split('.');
    const object = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : null;
    const property = parts[parts.length - 1];
    patterns.push({
      name,
      expression: buildPolyfillExpression(object, property, coreJs3Module),
    });
  }

  return patterns;
}

/**
 * @return {Pattern[]}
 */
function getTransformPatterns() {
/**
 * @param {string} content
 * @param {RegExp|string} pattern
 * @return {number}
 */
  const count = (content, pattern) => {
    // Split is slightly faster than match.
    if (typeof pattern === 'string') {
      return content.split(pattern).length - 1;
    }

    return (content.match(pattern) ?? []).length;
  };

  // For expression: prefer a string that is found in the transform runtime support code (those won't ever be minified).

  return [
    // @babel/plugin-transform-classes
    //
    // input:
    //
    // class MyTestClass {
    //   log() {
    //     console.log(1);
    //   }
    // };
    //
    // output:
    //
    // function _classCallCheck(a, n) { if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function"); }
    // function _defineProperties(e, r) { for (var t = 0; t < r.length; t++) { var o = r[t]; o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o); } }
    // function _createClass(e, r, t) { return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e; }
    // function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
    // function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
    // let MyTestClass = function () {
    //   function MyTestClass() {
    //     _classCallCheck(this, MyTestClass);
    //   }
    //   return _createClass(MyTestClass, [{
    //     key: "log",
    //     value: function log() {
    //       console.log(1);
    //     }
    //   }]);
    // }();
    {
      name: '@babel/plugin-transform-classes',
      expression: 'Cannot call a class as a function',
      estimateBytes: content => {
        return 1000 + (count(content, '_classCallCheck') - 1) * '_classCallCheck()'.length;
      },
    },
    {
      name: '@babel/plugin-transform-regenerator',
      expression: 'Generator is already running|regeneratorRuntime',
      // Example of this transform: https://gist.github.com/connorjclark/af8bccfff377ac44efc104a79bc75da2
      // `regeneratorRuntime.awrap` is generated for every usage of `await`, and adds ~80 bytes each.
      estimateBytes: content => {
        return count(content, /regeneratorRuntime\(?\)?\.a?wrap/g) * 80;
      },
    },
    {
      name: '@babel/plugin-transform-spread',
      expression: 'Invalid attempt to spread non-iterable instance',
      estimateBytes: content => {
        const per = '_toConsumableArray()'.length;
        return 1169 + count(content, /\.apply\(void 0,\s?_toConsumableArray/g) * per;
      },
    },
  ];
}

/**
 * @param {string} content
 * @param {PatternMatchResult[]} matches
 * @return {number}
 */
function estimateWastedBytes(content, matches) {
  // Split up results based on polyfill / transform. Only transforms start with @.
  const polyfillResults = matches.filter(m => !m.name.startsWith('@'));
  const transformResults = matches.filter(m => m.name.startsWith('@'));

  let estimatedWastedBytesFromPolyfills = 0;
  const modulesSeen = new Set();
  for (const result of polyfillResults) {
    const modules = graph.dependencies[result.name];
    if (!modules) continue; // Shouldn't happen.
    for (const module of modules) {
      modulesSeen.add(module);
    }
  }

  estimatedWastedBytesFromPolyfills += [...modulesSeen].reduce((acc, moduleIndex) => {
    return acc + graph.moduleSizes[moduleIndex];
  }, 0);
  estimatedWastedBytesFromPolyfills = Math.min(estimatedWastedBytesFromPolyfills, graph.maxSize);

  let estimatedWastedBytesFromTransforms = 0;

  for (const result of transformResults) {
    const pattern = getTransformPatterns().find(p => p.name === result.name);
    if (!pattern || !pattern.estimateBytes || !content) continue;
    estimatedWastedBytesFromTransforms += pattern.estimateBytes(content);
  }

  const estimatedWastedBytes =
    estimatedWastedBytesFromPolyfills + estimatedWastedBytesFromTransforms;
  return estimatedWastedBytes;
}

const matcher = new CodePatternMatcher([
  ...getPolyfillPatterns(),
  ...getTransformPatterns(),
]);

/**
 * @param {string} content
 * @param {import('../cdt/generated/SourceMap.js')|null} map
 * @return {Result}
 */
function detectLegacyJavaScript(content, map) {
  if (!content) return {matches: [], estimatedByteSavings: 0};

  // Start with pattern matching against the downloaded script.
  let matches = matcher.match(content);

  // If it's a bundle with source maps, add in the polyfill modules by name too.
  if (map) {
    for (const {name, modules} of polyfillModuleData) {
      // Skip if the pattern matching found a match for this polyfill.
      if (matches.some(m => m.name === name)) continue;

      const source = map.sourceURLs().find(source => modules.some(module => {
        return source.endsWith(`/${module}.js`) || source.includes(`node_modules/${module}/`);
      }));
      if (!source) continue;

      const mapping = map.mappings().find(m => m.sourceURL === source);
      if (mapping) {
        matches.push({name, line: mapping.lineNumber, column: mapping.columnNumber});
      } else {
        matches.push({name, line: 0, column: 0});
      }
    }
  }

  matches = matches.sort((a, b) => a.name > b.name ? 1 : a.name === b.name ? 0 : -1);

  return {
    matches,
    estimatedByteSavings: estimateWastedBytes(content, matches),
  };
}

export {detectLegacyJavaScript, getTransformPatterns, getCoreJsPolyfillData};
