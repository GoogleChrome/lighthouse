/**
 * @license
 * Copyright 2020 Google LLC
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
/** @typedef {import('./byte-efficiency-audit.js').ByteEfficiencyProduct} ByteEfficiencyProduct */
/** @typedef {LH.Audit.ByteEfficiencyItem & {subItems: {type: 'subitems', items: SubItem[]}}} Item */
/** @typedef {{signal: string, location: LH.Audit.Details.SourceLocationValue}} SubItem */

import fs from 'fs';

import {Audit} from '../audit.js';
import {ByteEfficiencyAudit} from './byte-efficiency-audit.js';
import {EntityClassification} from '../../computed/entity-classification.js';
import {JSBundles} from '../../computed/js-bundles.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {estimateCompressionRatioForContent} from '../../lib/script-helpers.js';
import {LH_ROOT} from '../../../shared/root.js';

const polyfillModuleDataJson = fs.readFileSync(
  `${LH_ROOT}/core/audits/byte-efficiency/polyfill-module-data.json`, 'utf-8');

/** @type {import('../../scripts/legacy-javascript/create-polyfill-module-data.js').PolyfillModuleData} */
const polyfillModuleData = JSON.parse(polyfillModuleDataJson);

const graphJson = fs.readFileSync(
  `${LH_ROOT}/core/audits/byte-efficiency/polyfill-graph-data.json`, 'utf-8');

/** @type {import('../../scripts/legacy-javascript/create-polyfill-size-estimation.js').PolyfillSizeEstimator} */
const graph = JSON.parse(graphJson);

const UIStrings = {
  /** Title of a Lighthouse audit that tells the user about legacy polyfills and transforms used on the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Avoid serving legacy JavaScript to modern browsers',
  // eslint-disable-next-line max-len
  // TODO: developer.chrome.com article. this codelab is good starting place: https://web.dev/articles/codelab-serve-modern-code
  /** Description of a Lighthouse audit that tells the user about old JavaScript that is no longer needed. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Polyfills and transforms enable legacy browsers to use new JavaScript features. However, many aren\'t necessary for modern browsers. Consider modifying your JavaScript build process to not transpile [Baseline](https://web.dev/baseline) features, unless you know you must support legacy browsers. [Learn why most sites can deploy ES6+ code without transpiling](https://philipwalton.com/articles/the-state-of-es5-on-the-web/)',
  /** Warning text that an outdated version of the library "core-js" was found, and the developer should upgrade. */
  // eslint-disable-next-line max-len
  detectedCoreJs2Warning: 'Version 2 of core-js was detected on the page. You should upgrade to version 3 for many performance improvements.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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
    const patternsExpression = patterns.map(pattern => `(${pattern.expression})`).join('|');
    this.re = new RegExp(`(^\r\n|\r|\n)|${patternsExpression}`, 'g');
    this.patterns = patterns;
  }

  /**
   * @param {string} code
   * @return {PatternMatchResult[]}
   */
  match(code) {
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

class LegacyJavascript extends ByteEfficiencyAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'legacy-javascript',
      scoreDisplayMode: ByteEfficiencyAudit.SCORING_MODES.METRIC_SAVINGS,
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
      guidanceLevel: 2,
      requiredArtifacts: ['devtoolsLogs', 'traces', 'Scripts', 'SourceMaps',
        'GatherContext', 'URL'],
    };
  }

  /**
   * @param {string?} object
   * @param {string} property
   * @param {string} coreJs3Module
   */
  static buildPolyfillExpression(object, property, coreJs3Module) {
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
      expression += `|{target:${qt(objectWithoutPrototype)}\\S*},{${property}:`;
    } else {
      // Detect polyfills for new classes: Map, Set, WeakSet, etc.
      // TODO: so far, no class polyfills are enabled for detection.
      // See `modulesToSkip` in create-polyfill-module-data.js

      // collection("Map",
      // expression += `|collection\\(${qt(property)},`;
    }

    // Un-minified code may have module names.
    // core-js/modules/es.object.is-frozen
    expression += `|core-js/modules/${coreJs3Module}"`;

    return expression;
  }

  static getPolyfillModuleData() {
    return polyfillModuleData;
  }

  static getCoreJsPolyfillData() {
    return this.getPolyfillModuleData().filter(d => d.corejs).map(d => {
      return {
        name: d.name,
        coreJs3Module: d.modules[0],
      };
    });
  }

  /**
   * @return {Pattern[]}
   */
  static getPolyfillPatterns() {
    /** @type {Pattern[]} */
    const patterns = [];

    for (const {name, coreJs3Module} of this.getCoreJsPolyfillData()) {
      const parts = name.split('.');
      const object = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : null;
      const property = parts[parts.length - 1];
      patterns.push({
        name,
        expression: this.buildPolyfillExpression(object, property, coreJs3Module),
      });
    }

    return patterns;
  }

  /**
   * @return {Pattern[]}
   */
  static getTransformPatterns() {
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
   * Returns a collection of match results grouped by script url.
   *
   * @param {CodePatternMatcher} matcher
   * @param {LH.Artifacts['Scripts']} scripts
   * @param {LH.Artifacts.Bundle[]} bundles
   * @return {Map<LH.Artifacts.Script, PatternMatchResult[]>}
   */
  static detectAcrossScripts(matcher, scripts, bundles) {
    /** @type {Map<LH.Artifacts.Script, PatternMatchResult[]>} */
    const scriptToMatchResults = new Map();
    const polyfillData = this.getPolyfillModuleData();

    for (const script of Object.values(scripts)) {
      if (!script.content) continue;

      // Start with pattern matching against the downloaded script.
      const matches = matcher.match(script.content);

      // If it's a bundle with source maps, add in the polyfill modules by name too.
      const bundle = bundles.find(b => b.script.scriptId === script.scriptId);
      if (bundle) {
        for (const {name, modules} of polyfillData) {
          // Skip if the pattern matching found a match for this polyfill.
          if (matches.some(m => m.name === name)) continue;

          const source = bundle.rawMap.sources.find(source => modules.some(module => {
            return source.endsWith(`/${module}.js`) || source.includes(`node_modules/${module}/`);
          }));
          if (!source) continue;

          const mapping = bundle.map.mappings().find(m => m.sourceURL === source);
          if (mapping) {
            matches.push({name, line: mapping.lineNumber, column: mapping.columnNumber});
          } else {
            matches.push({name, line: 0, column: 0});
          }
        }
      }

      if (!matches.length) continue;
      scriptToMatchResults.set(script, matches);
    }

    return scriptToMatchResults;
  }

  /**
   * @param {LH.Artifacts.Script} script
   * @param {PatternMatchResult[]} matches
   * @return {number}
   */
  static estimateWastedBytes(script, matches) {
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
      const pattern = this.getTransformPatterns().find(p => p.name === result.name);
      if (!pattern || !pattern.estimateBytes || !script.content) continue;
      estimatedWastedBytesFromTransforms += pattern.estimateBytes(script.content);
    }

    const estimatedWastedBytes =
      estimatedWastedBytesFromPolyfills + estimatedWastedBytesFromTransforms;
    return estimatedWastedBytes;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Audit.Context} context
   * @return {Promise<ByteEfficiencyProduct>}
   */
  static async audit_(artifacts, networkRecords, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const classifiedEntities = await EntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);

    const bundles = await JSBundles.request(artifacts, context);

    /** @type {Item[]} */
    const items = [];

    const matcher = new CodePatternMatcher([
      ...this.getPolyfillPatterns(),
      ...this.getTransformPatterns(),
    ]);

    /** @type {Map<string, number>} */
    const compressionRatioByUrl = new Map();

    const scriptToMatchResults =
      this.detectAcrossScripts(matcher, artifacts.Scripts, bundles);
    for (const [script, matches] of scriptToMatchResults.entries()) {
      const compressionRatio = estimateCompressionRatioForContent(
        compressionRatioByUrl, script.url, artifacts, networkRecords);
      const wastedBytes = Math.round(this.estimateWastedBytes(script, matches) * compressionRatio);
      /** @type {typeof items[number]} */
      const item = {
        url: script.url,
        wastedBytes,
        subItems: {
          type: 'subitems',
          items: [],
        },
        // Not needed, but keeps typescript happy.
        totalBytes: 0,
      };

      const bundle = bundles.find(bundle => bundle.script.scriptId === script.scriptId);
      for (const match of matches) {
        const {name, line, column} = match;
        /** @type {SubItem} */
        const subItem = {
          signal: name,
          location: ByteEfficiencyAudit.makeSourceLocation(script.url, line, column, bundle),
        };
        item.subItems.items.push(subItem);
      }
      items.push(item);
    }

    const warnings = [];
    for (const bundle of bundles) {
      if (classifiedEntities.isFirstParty(bundle.script.url)) {
        if (bundle.rawMap.sources.some(s => s.match(/node_modules\/core-js\/modules\/es[67]/))) {
          warnings.push(str_(UIStrings.detectedCoreJs2Warning));
          break;
        }
      }
    }

    /** @type {Map<string, number>} */
    const wastedBytesByUrl = new Map();
    for (const item of items) {
      // Only estimate savings if first party code has legacy code.
      if (classifiedEntities.isFirstParty(item.url)) {
        wastedBytesByUrl.set(item.url, item.wastedBytes);
      }
    }

    /** @type {LH.Audit.Details.TableColumnHeading[]} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'url', valueType: 'url', subItemsHeading: {key: 'location', valueType: 'source-location'}, label: str_(i18n.UIStrings.columnURL)},
      {key: null, valueType: 'code', subItemsHeading: {key: 'signal'}, label: ''},
      {key: 'wastedBytes', valueType: 'bytes', label: str_(i18n.UIStrings.columnWastedBytes)},
      /* eslint-enable max-len */
    ];

    return {
      items,
      headings,
      wastedBytesByUrl,
      warnings,
    };
  }
}

export default LegacyJavascript;
export {UIStrings};
