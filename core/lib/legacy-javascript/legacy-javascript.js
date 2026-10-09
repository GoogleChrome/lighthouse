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

/** @typedef {{name: string, expression: string, estimateBytes?: (content: string) => number, resolveName?: (match: string) => string}} Pattern */
/** @typedef {{name: string, line: number, column: number}} PatternMatchResult */
/** @typedef {{matches: PatternMatchResult[], estimatedByteSavings: number}} Result */

import polyfillModuleData_ from './polyfill-module-data.json' with { type: 'json' };
import graph_ from './polyfill-graph-data.json' with { type: 'json' };

/** @type {import('../../scripts/legacy-javascript/create-polyfill-module-data.js').PolyfillModuleData} */
const polyfillModuleData = polyfillModuleData_;

/** @type {import('../../scripts/legacy-javascript/create-polyfill-size-estimation.js').PolyfillSizeEstimator} */
const graph = graph_;

/**
 * Takes a list of patterns (consisting of a name identifier and a RegExp expression string)
 * and via `match` returns match results with line / column information for a given code input.
 * Only returns the first match per pattern name.
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
      this.re = new RegExp(patternsExpression, 'g');
    }

    // Reset RegExp state.
    this.re.lastIndex = 0;

    /** @type {Set<string>} */
    const seen = new Set();
    /** @type {PatternMatchResult[]} */
    const matches = [];
    /** @type {RegExpExecArray | null} */
    let result;
    let line = 0;
    let lineBeginsAtIndex = 0;
    let scannedToIndex = 0;
    // Each pattern maps to one subgroup in the generated regex. For each iteration of RegExp.exec,
    // only one subgroup will be defined. Exec until no more matches.
    while ((result = this.re.exec(code)) !== null) {
      let patternIndex = -1;
      for (let i = 1; i < result.length; i++) {
        if (result[i] !== undefined) {
          patternIndex = i - 1;
          break;
        }
      }
      if (patternIndex === -1) continue;

      const pattern = this.patterns[patternIndex];
      const name = pattern.resolveName ? pattern.resolveName(result[0]) : pattern.name;
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);

      // Lazily advance line and column tracking up to `result.index`.
      // Because `[scannedToIndex, result.index)` includes the text of any previous matches,
      // this also accounts for newlines inside multi-line matches.
      // Scanning for `\n` handles both LF (`\n`) and CRLF (`\r\n`) line endings since
      // the next line always begins at `nlIdx + 1`.
      let nlIdx = code.indexOf('\n', scannedToIndex);
      while (nlIdx !== -1 && nlIdx < result.index) {
        line++;
        lineBeginsAtIndex = nlIdx + 1;
        nlIdx = code.indexOf('\n', lineBeginsAtIndex);
      }
      scannedToIndex = result.index;

      matches.push({
        name,
        line,
        column: result.index - lineBeginsAtIndex,
      });
    }

    return matches;
  }
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
 * Builds factored polyfill patterns grouped by receiver object, core-js target, and
 * core-js module prefix so the regex engine evaluates a few shared branches instead
 * of repeating common prefixes (like `defineProperty(`, `{target:`, `Array.prototype.`)
 * once per polyfill.
 *
 * @return {Pattern[]}
 */
function getPolyfillPatterns() {
  /** @param {string} str */
  const escapeRegExp = str => str.replaceAll('.', '\\.');

  /** @type {Map<string, string[]>} */
  const byObject = new Map();
  /** @type {Map<string, string[]>} */
  const byTarget = new Map();
  /** @type {Map<string, string>} */
  const targetPropToName = new Map();
  /** @type {Map<string, string>} */
  const coreJsModuleToName = new Map();
  /** @type {Map<string, string[]>} */
  const byModulePrefix = new Map();

  for (const {name, coreJs3Module} of getCoreJsPolyfillData()) {
    const parts = name.split('.');
    const object = parts.slice(0, parts.length - 1).join('.');
    const property = parts[parts.length - 1];

    let objProps = byObject.get(object);
    if (!objProps) {
      objProps = [];
      byObject.set(object, objProps);
    }
    objProps.push(property);

    const target = object.replace('.prototype', '');
    let targetProps = byTarget.get(target);
    if (!targetProps) {
      targetProps = [];
      byTarget.set(target, targetProps);
    }
    targetProps.push(property);
    targetPropToName.set(`${target}.${property}`, name);

    coreJsModuleToName.set(coreJs3Module, name);
    const modParts = coreJs3Module.split('.');
    const modPrefix = modParts.slice(0, 2).join('.');
    const modRest = modParts.slice(2).join('.');
    let modRests = byModulePrefix.get(modPrefix);
    if (!modRests) {
      modRests = [];
      byModulePrefix.set(modPrefix, modRests);
    }
    modRests.push(modRest);
  }

  // 1. Direct property assignment: `String.prototype.startsWith =`
  const directBranches = [];
  for (const [object, props] of byObject) {
    directBranches.push(`${escapeRegExp(object)}\\.(?:${props.join('|')})\\s?=[^=]`);
  }

  // 2. Bracket property assignment: `String.prototype['startsWith'] =`
  const bracketBranches = [];
  for (const [object, props] of byObject) {
    bracketBranches.push(`${escapeRegExp(object)}\\[['"](?:${props.join('|')})['"]\\]\\s?=[^=]`);
  }

  // 3. Object.defineProperty: `Object.defineProperty(String.prototype, 'startsWith'`
  const definePropBranches = [];
  for (const [object, props] of byObject) {
    definePropBranches.push(`${escapeRegExp(object)},\\s?['"](?:${props.join('|')})['"]`);
  }

  // 4. es-shims: `no(Object,{entries:r},{entries:function`
  const esShimsBranches = [];
  for (const [object, props] of byObject) {
    const propAlt = `(?:${props.join('|')})`;
    esShimsBranches.push(`${escapeRegExp(object)},\\s*{${propAlt}:.*},\\s*{${propAlt}`);
  }

  // 5. core-js@3 minified pattern:
  // `{target:"Array",proto:true},{fill:fill`
  // `{target:"Array",proto:true,forced:!HAS_SPECIES_SUPPORT||!USES_TO_LENGTH},{filter:`
  const targetBranches = [];
  for (const [target, props] of byTarget) {
    targetBranches.push(`['"]${escapeRegExp(target)}['"][^;]*?},{(?:${props.join('|')}):`);
  }

  // 6. Un-minified core-js module names: `core-js/modules/es.object.is-frozen`
  const moduleBranches = [];
  for (const [prefix, rests] of byModulePrefix) {
    moduleBranches.push(
      `${escapeRegExp(prefix)}\\.(?:${rests.map(escapeRegExp).join('|')})`
    );
  }

  return [
    {
      name: 'direct-assignment',
      expression: directBranches.join('|'),
      resolveName: match => match.slice(0, match.indexOf('=')).trimEnd(),
    },
    {
      name: 'bracket-assignment',
      expression: bracketBranches.join('|'),
      resolveName: match => {
        const bracketIdx = match.indexOf('[');
        const closeIdx = match.indexOf(']', bracketIdx);
        return `${match.slice(0, bracketIdx)}.${match.slice(bracketIdx + 2, closeIdx - 1)}`;
      },
    },
    {
      name: 'defineProperty',
      expression: `defineProperty\\((?:${definePropBranches.join('|')})`,
      resolveName: match => {
        const openIdx = match.indexOf('(');
        const commaIdx = match.indexOf(',', openIdx);
        const obj = match.slice(openIdx + 1, commaIdx);
        const prop = match.slice(commaIdx + 1).trimStart().slice(1, -1);
        return `${obj}.${prop}`;
      },
    },
    {
      name: 'es-shims',
      expression: `\\((?:${esShimsBranches.join('|')})`,
      resolveName: match => {
        const commaIdx = match.indexOf(',');
        const obj = match.slice(1, commaIdx);
        const braceIdx = match.indexOf('{', commaIdx);
        const colonIdx = match.indexOf(':', braceIdx);
        const prop = match.slice(braceIdx + 1, colonIdx);
        return `${obj}.${prop}`;
      },
    },
    {
      name: 'core-js-target',
      expression: `{target:(?:${targetBranches.join('|')})`,
      resolveName: match => {
        const targetEnd = match.indexOf(match[8], 9);
        const target = match.slice(9, targetEnd);
        const lastBrace = match.lastIndexOf('{');
        const prop = match.slice(lastBrace + 1, -1);
        return /** @type {string} */ (targetPropToName.get(`${target}.${prop}`));
      },
    },
    {
      name: 'core-js-module',
      expression: `(?:${moduleBranches.join('|')})(?:\\.js)?"`,
      resolveName: match => {
        const mod = match.endsWith('.js"') ? match.slice(0, -4) : match.slice(0, -1);
        return /** @type {string} */ (coreJsModuleToName.get(mod));
      },
    },
  ];
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

const transformPatterns = getTransformPatterns();
const transformPatternsByName = new Map(transformPatterns.map(p => [p.name, p]));

/** @type {Map<string, string>} */
const moduleToPolyfillName = new Map();
for (const {name, modules} of polyfillModuleData) {
  for (const mod of modules) {
    moduleToPolyfillName.set(mod, name);
  }
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
    const pattern = transformPatternsByName.get(result.name);
    if (!pattern || !pattern.estimateBytes || !content) continue;
    estimatedWastedBytesFromTransforms += pattern.estimateBytes(content);
  }

  const estimatedWastedBytes =
    estimatedWastedBytesFromPolyfills + estimatedWastedBytesFromTransforms;
  return estimatedWastedBytes;
}

const matcher = new CodePatternMatcher([
  ...getPolyfillPatterns(),
  ...transformPatterns,
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
    const matchedNames = new Set(matches.map(m => m.name));
    /** @type {Array<{name: string, source: string}>} */
    const foundInMap = [];

    for (const source of map.sourceURLs()) {
      if (source.endsWith('.js')) {
        const slashIdx = source.lastIndexOf('/');
        if (slashIdx !== -1) {
          const polyfillName = moduleToPolyfillName.get(source.slice(slashIdx + 1, -3));
          if (polyfillName && !matchedNames.has(polyfillName)) {
            matchedNames.add(polyfillName);
            foundInMap.push({name: polyfillName, source});
          }
        }
      }
      if (source.includes('node_modules/')) {
        let nmIdx = source.indexOf('node_modules/');
        while (nmIdx !== -1) {
          const modStart = nmIdx + 13; // 'node_modules/'.length
          const nextSlash = source.indexOf('/', modStart);
          if (nextSlash !== -1) {
            const polyfillName = moduleToPolyfillName.get(source.slice(modStart, nextSlash));
            if (polyfillName && !matchedNames.has(polyfillName)) {
              matchedNames.add(polyfillName);
              foundInMap.push({name: polyfillName, source});
            }
          }
          nmIdx = source.indexOf('node_modules/', modStart);
        }
      }
    }

    if (foundInMap.length > 0) {
      const mappings = map.mappings();
      for (const {name, source} of foundInMap) {
        const mapping = mappings.find(m => m.sourceURL === source);
        if (mapping) {
          matches.push({name, line: mapping.lineNumber, column: mapping.columnNumber});
        } else {
          matches.push({name, line: 0, column: 0});
        }
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
