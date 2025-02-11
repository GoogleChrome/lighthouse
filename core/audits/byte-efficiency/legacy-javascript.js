/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Identifies polyfills and transforms that should not be present if using module/nomodule pattern.
 * @see https://docs.google.com/document/d/1ItjJwAd6e0Ts6yMbvh8TN3BBh_sAd58rYE1whnpuxaA/edit Design document
 * @see https://docs.google.com/spreadsheets/d/1z28Au8wo8-c2UsM2lDVEOJcI3jOkb2c951xEBqzBKCc/edit?usp=sharing Legacy babel transforms / polyfills
 * ./core/scripts/legacy-javascript - verification tool.
 */

/** @typedef {{name: string, expression: string, estimateBytes?: (result: PatternMatchResult) => number}} Pattern */
/** @typedef {{name: string, line: number, column: number, count: number}} PatternMatchResult */
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
  description: 'Polyfills and transforms enable legacy browsers to use new JavaScript features. However, many aren\'t necessary for modern browsers. For your bundled JavaScript, adopt a modern script deployment strategy using [module/nomodule feature detection](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/) to reduce the amount of code shipped to modern browsers, while retaining support for legacy browsers. [Learn how to serve modern JavaScript](https://web.dev/articles/codelab-serve-modern-code)',
  /** Warning text that an outdated version of the library "core-js" was found, and the developer should upgrade. */
  // eslint-disable-next-line max-len
  detectedCoreJs2Warning: 'Version 2 of core-js was detected on the page. You should upgrade to version 3 for many performance improvements.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * Takes a list of patterns (consisting of a name identifier and a RegExp expression string)
 * and returns match results with line / column information for a given code input.
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
        const existingMatch = matches.find(m => m.name === pattern.name);
        if (existingMatch) existingMatch.count += 1;
        continue;
      }
      seen.add(pattern);

      matches.push({
        name: pattern.name,
        line,
        column: result.index - lineBeginsAtIndex,
        count: 1,
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
   */
  static buildPolyfillExpression(object, property) {
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

      // core-js@2 minified pattern.
      // $export($export.S,"Date",{now:function
      expression += `|\\$export\\([^,]+,${qt(objectWithoutPrototype)},{${property}:`;

      // core-js@3 minified pattern.
      // {target:"Array",proto:true},{fill:fill
      // {target:"Array",proto:true,forced:!HAS_SPECIES_SUPPORT||!USES_TO_LENGTH},{filter:
      expression += `|{target:${qt(objectWithoutPrototype)}\\S*},{${property}:`;
    } else {
      // WeakSet, etc.
      expression += `|function ${property}\\(`;
    }

    return expression;
  }

  static getPolyfillData() {
    /** @type {Array<{name: string, modules: string[], corejs?: boolean}>} */
    const data = [
      {name: 'focus-visible', modules: ['focus-visible']},
    ];

    const coreJsPolyfills = [
      ['Array.prototype.fill', 'es6.array.fill'],
      ['Array.prototype.filter', 'es6.array.filter'],
      ['Array.prototype.find', 'es6.array.find'],
      ['Array.prototype.findIndex', 'es6.array.find-index'],
      ['Array.prototype.forEach', 'es6.array.for-each'],
      ['Array.from', 'es6.array.from'],
      ['Array.isArray', 'es6.array.is-array'],
      ['Array.prototype.map', 'es6.array.map'],
      ['Array.of', 'es6.array.of'],
      ['Array.prototype.some', 'es6.array.some'],
      ['Date.now', 'es6.date.now'],
      ['Date.prototype.toISOString', 'es6.date.to-iso-string'],
      ['Date.prototype.toJSON', 'es6.date.to-json'],
      ['Date.prototype.toString', 'es6.date.to-string'],
      ['Function.prototype.name', 'es6.function.name'],
      ['Number.isInteger', 'es6.number.is-integer'],
      ['Number.isSafeInteger', 'es6.number.is-safe-integer'],
      ['Object.defineProperties', 'es6.object.define-properties'],
      ['Object.defineProperty', 'es6.object.define-property'],
      ['Object.freeze', 'es6.object.freeze'],
      ['Object.getPrototypeOf', 'es6.object.get-prototype-of'],
      ['Object.isExtensible', 'es6.object.is-extensible'],
      ['Object.isFrozen', 'es6.object.is-frozen'],
      ['Object.isSealed', 'es6.object.is-sealed'],
      ['Object.keys', 'es6.object.keys'],
      ['Object.preventExtensions', 'es6.object.prevent-extensions'],
      ['Object.seal', 'es6.object.seal'],
      ['Object.setPrototypeOf', 'es6.object.set-prototype-of'],
      ['Reflect.apply', 'es6.reflect.apply'],
      ['Reflect.construct', 'es6.reflect.construct'],
      ['Reflect.defineProperty', 'es6.reflect.define-property'],
      ['Reflect.deleteProperty', 'es6.reflect.delete-property'],
      ['Reflect.get', 'es6.reflect.get'],
      ['Reflect.getOwnPropertyDescriptor', 'es6.reflect.get-own-property-descriptor'],
      ['Reflect.getPrototypeOf', 'es6.reflect.get-prototype-of'],
      ['Reflect.has', 'es6.reflect.has'],
      ['Reflect.isExtensible', 'es6.reflect.is-extensible'],
      ['Reflect.ownKeys', 'es6.reflect.own-keys'],
      ['Reflect.preventExtensions', 'es6.reflect.prevent-extensions'],
      ['Reflect.setPrototypeOf', 'es6.reflect.set-prototype-of'],
      ['String.prototype.codePointAt', 'es6.string.code-point-at'],
      ['String.raw', 'es6.string.raw'],
      ['String.prototype.repeat', 'es6.string.repeat'],
      ['Object.entries', 'es7.object.entries'],
      ['Object.getOwnPropertyDescriptors', 'es7.object.get-own-property-descriptors'],
      ['Object.values', 'es7.object.values'],
    ];

    for (const [name, coreJs2Module] of coreJsPolyfills) {
      // es-shims follows a pattern for its packages.
      // Tack it onto the corejs size estimation, as it is likely close in size.
      const esShimModule = name.toLowerCase();
      data.push({
        name,
        modules: [
          coreJs2Module,
          // corejs 3 module name
          coreJs2Module
            .replace('es6.', 'es.')
            .replace('es7.', 'es.')
            .replace('typed.', 'typed-array.'),
          esShimModule,
        ],
        corejs: true,
      });
    }

    return data;
  }

  static getCoreJsPolyfillData() {
    return this.getPolyfillData().filter(d => d.corejs).map(d => {
      return {
        name: d.name,
        coreJs2Module: d.modules[0],
        coreJs3Module: d.modules[1],
      };
    });
  }

  /**
   * @return {Pattern[]}
   */
  static getPolyfillPatterns() {
    /** @type {Pattern[]} */
    const patterns = [];

    for (const {name} of this.getCoreJsPolyfillData()) {
      const parts = name.split('.');
      const object = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : null;
      const property = parts[parts.length - 1];
      patterns.push({
        name,
        expression: this.buildPolyfillExpression(object, property),
      });
    }

    return patterns;
  }

  /**
   * @return {Pattern[]}
   */
  static getTransformPatterns() {
    return [
      {
        name: '@babel/plugin-transform-classes',
        expression: 'Cannot call a class as a function',
        estimateBytes: result => 150 + result.count * '_classCallCheck()'.length,
      },
      {
        name: '@babel/plugin-transform-regenerator',
        expression: /regeneratorRuntime\(?\)?\.a?wrap/.source,
        // Example of this transform: https://gist.github.com/connorjclark/af8bccfff377ac44efc104a79bc75da2
        // `regeneratorRuntime.awrap` is generated for every usage of `await`, and adds ~80 bytes each.
        estimateBytes: result => result.count * 80,
      },
      {
        name: '@babel/plugin-transform-spread',
        expression: /\.apply\(void 0,\s?_toConsumableArray/.source,
        estimateBytes: result => 1169 + result.count * '_toConsumableArray()'.length,
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
    const polyfillData = this.getPolyfillData();

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
            matches.push({name, line: mapping.lineNumber, column: mapping.columnNumber, count: 1});
          } else {
            matches.push({name, line: 0, column: 0, count: 1});
          }
        }
      }

      if (!matches.length) continue;
      scriptToMatchResults.set(script, matches);
    }

    return scriptToMatchResults;
  }

  /**
   * @param {PatternMatchResult[]} matches
   * @return {number}
   */
  static estimateWastedBytes(matches) {
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
      if (!pattern || !pattern.estimateBytes) continue;
      estimatedWastedBytesFromTransforms += pattern.estimateBytes(result);
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
      const wastedBytes = Math.round(this.estimateWastedBytes(matches) * compressionRatio);
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
