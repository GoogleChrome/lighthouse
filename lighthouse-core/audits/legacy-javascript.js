/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Identifies polyfills and transforms that should not be present if using module/nomodule pattern.
 * @see https://docs.google.com/document/d/1ItjJwAd6e0Ts6yMbvh8TN3BBh_sAd58rYE1whnpuxaA/edit Design document
 * @see https://docs.google.com/spreadsheets/d/1z28Au8wo8-c2UsM2lDVEOJcI3jOkb2c951xEBqzBKCc/edit?usp=sharing Legacy babel transforms / polyfills
 * ./lighthouse-core/scripts/legacy-javascript - verification tool.
 */

/** @typedef {{name: string, expression: string}} Pattern */
/** @typedef {{name: string, line: number, column: number}} PatternMatchResult */

const Audit = require('./audit.js');
const NetworkRecords = require('../computed/network-records.js');
const JSBundles = require('../computed/js-bundles.js');
const i18n = require('../lib/i18n/i18n.js');
const thirdPartyWeb = require('../lib/third-party-web.js');

const UIStrings = {
  /** Title of a Lighthouse audit that tells the user about legacy polyfills and transforms used on the page. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Legacy JavaScript',
  // eslint-disable-next-line max-len
  // TODO: web.dev article. this codelab is good starting place: https://web.dev/codelab-serve-modern-code/
  /** Description of a Lighthouse audit that tells the user about old JavaScript that is no longer needed. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Polyfills and transforms enable legacy browsers to use new JavaScript features. However, many aren\'t necessary for modern browsers. For your bundled JavaScript, adopt a modern script deployment strategy using module/nomodule feature detection to reduce the amount of code shipped to modern browsers, while retaining support for legacy browsers. [Learn More](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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

      // Don't report more than one instance of a pattern for this code.
      // Would result in multiple matches for the same pattern, ex: if both '='
      // and 'Object.defineProperty' are used conditionally based on feature detection.
      // Would also result in many matches for transform patterns.
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

class LegacyJavascript extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'legacy-javascript',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      description: str_(UIStrings.description),
      title: str_(UIStrings.title),
      requiredArtifacts: ['devtoolsLogs', 'ScriptElements', 'SourceMaps', 'URL'],
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
    return [
      /* eslint-disable max-len */
      ['Array.prototype.fill', 'es6.array.fill'],
      ['Array.prototype.filter', 'es6.array.filter'],
      ['Array.prototype.find', 'es6.array.find'],
      ['Array.prototype.findIndex', 'es6.array.find-index'],
      ['Array.prototype.forEach', 'es6.array.for-each'],
      ['Array.from', 'es6.array.from'],
      ['Array.isArray', 'es6.array.is-array'],
      ['Array.prototype.lastIndexOf', 'es6.array.last-index-of'],
      ['Array.prototype.map', 'es6.array.map'],
      ['Array.of', 'es6.array.of'],
      ['Array.prototype.reduce', 'es6.array.reduce'],
      ['Array.prototype.reduceRight', 'es6.array.reduce-right'],
      ['Array.prototype.some', 'es6.array.some'],
      ['Date.now', 'es6.date.now'],
      ['Date.prototype.toISOString', 'es6.date.to-iso-string'],
      ['Date.prototype.toJSON', 'es6.date.to-json'],
      ['Date.prototype.toString', 'es6.date.to-string'],
      ['Function.prototype.name', 'es6.function.name'],
      ['Map', 'es6.map'],
      ['Number.isInteger', 'es6.number.is-integer'],
      ['Number.isSafeInteger', 'es6.number.is-safe-integer'],
      ['Number.parseFloat', 'es6.number.parse-float'],
      ['Number.parseInt', 'es6.number.parse-int'],
      ['Object.assign', 'es6.object.assign'],
      ['Object.create', 'es6.object.create'],
      ['Object.defineProperties', 'es6.object.define-properties'],
      ['Object.defineProperty', 'es6.object.define-property'],
      ['Object.freeze', 'es6.object.freeze'],
      ['Object.getOwnPropertyDescriptor', 'es6.object.get-own-property-descriptor'],
      ['Object.getOwnPropertyNames', 'es6.object.get-own-property-names'],
      ['Object.getPrototypeOf', 'es6.object.get-prototype-of'],
      ['Object.isExtensible', 'es6.object.is-extensible'],
      ['Object.isFrozen', 'es6.object.is-frozen'],
      ['Object.isSealed', 'es6.object.is-sealed'],
      ['Object.keys', 'es6.object.keys'],
      ['Object.preventExtensions', 'es6.object.prevent-extensions'],
      ['Object.seal', 'es6.object.seal'],
      ['Object.setPrototypeOf', 'es6.object.set-prototype-of'],
      ['Promise', 'es6.promise'],
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
      ['Reflect.set', 'es6.reflect.set'],
      ['Reflect.setPrototypeOf', 'es6.reflect.set-prototype-of'],
      ['Set', 'es6.set'],
      ['String.prototype.codePointAt', 'es6.string.code-point-at'],
      ['String.prototype.endsWith', 'es6.string.ends-with'],
      ['String.fromCodePoint', 'es6.string.from-code-point'],
      ['String.prototype.includes', 'es6.string.includes'],
      ['String.raw', 'es6.string.raw'],
      ['String.prototype.repeat', 'es6.string.repeat'],
      ['String.prototype.startsWith', 'es6.string.starts-with'],
      ['String.prototype.trim', 'es6.string.trim'],
      // These break the coreJs2/coreJs3 naming pattern so are set explicitly.
      {name: 'ArrayBuffer', coreJs2Module: 'es6.typed.array-buffer', coreJs3Module: 'es.array-buffer.constructor'},
      {name: 'DataView', coreJs2Module: 'es6.typed.data-view', coreJs3Module: 'es.data-view'},
      ['Float32Array', 'es6.typed.float32-array'],
      ['Float64Array', 'es6.typed.float64-array'],
      ['Int16Array', 'es6.typed.int16-array'],
      ['Int32Array', 'es6.typed.int32-array'],
      ['Int8Array', 'es6.typed.int8-array'],
      ['Uint16Array', 'es6.typed.uint16-array'],
      ['Uint32Array', 'es6.typed.uint32-array'],
      ['Uint8Array', 'es6.typed.uint8-array'],
      ['Uint8ClampedArray', 'es6.typed.uint8-clamped-array'],
      ['WeakMap', 'es6.weak-map'],
      ['WeakSet', 'es6.weak-set'],
      ['Array.prototype.includes', 'es7.array.includes'],
      ['Object.entries', 'es7.object.entries'],
      ['Object.getOwnPropertyDescriptors', 'es7.object.get-own-property-descriptors'],
      ['Object.values', 'es7.object.values'],
      ['String.prototype.padEnd', 'es7.string.pad-end'],
      ['String.prototype.padStart', 'es7.string.pad-start'],
      /* eslint-enable max-len */
    ].map(data => {
      if (!Array.isArray(data)) return data;

      const [name, coreJs2Module] = data;
      return {
        name,
        coreJs2Module,
        coreJs3Module: coreJs2Module
          .replace('es6.', 'es.')
          .replace('es7.', 'es.')
          .replace('typed.', 'typed-array.'),
      };
    });
  }

  /**
   * @return {Pattern[]}
   */
  static getPolyfillPatterns() {
    return this.getPolyfillData().map(({name}) => {
      const parts = name.split('.');
      const object = parts.length > 1 ? parts.slice(0, parts.length - 1).join('.') : null;
      const property = parts[parts.length - 1];
      return {
        name,
        expression: this.buildPolyfillExpression(object, property),
      };
    });
  }

  /**
   * @return {Pattern[]}
   */
  static getTransformPatterns() {
    return [
      {
        name: '@babel/plugin-transform-classes',
        expression: 'Cannot call a class as a function',
      },
      {
        name: '@babel/plugin-transform-regenerator',
        expression: /regeneratorRuntime\.a?wrap/.source,
      },
      {
        name: '@babel/plugin-transform-spread',
        expression: /\.apply\(void 0,\s?_toConsumableArray/.source,
      },
    ];
  }

  /**
   * Returns a collection of match results grouped by script url.
   *
   * @param {CodePatternMatcher} matcher
   * @param {LH.GathererArtifacts['ScriptElements']} scripts
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @param {LH.Artifacts.Bundle[]} bundles
   * @return {Map<string, PatternMatchResult[]>}
   */
  static detectAcrossScripts(matcher, scripts, networkRecords, bundles) {
    /** @type {Map<string, PatternMatchResult[]>} */
    const urlToMatchResults = new Map();
    const polyfillData = this.getPolyfillData();

    for (const {requestId, content} of Object.values(scripts)) {
      if (!content) continue;
      const networkRecord = networkRecords.find(record => record.requestId === requestId);
      if (!networkRecord) continue;

      // Start with pattern matching against the downloaded script.
      const matches = matcher.match(content);

      // If it's a bundle with source maps, add in the polyfill modules by name too.
      const bundle = bundles.find(b => b.script.src === networkRecord.url);
      if (bundle) {
        for (const {coreJs2Module, coreJs3Module, name} of polyfillData) {
          // Skip if the pattern matching found a match for this polyfill.
          if (matches.some(m => m.name === name)) continue;

          const source = bundle.rawMap.sources.find(source =>
            source.endsWith(`${coreJs2Module}.js`) || source.endsWith(`${coreJs3Module}.js`));
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
      urlToMatchResults.set(networkRecord.url, matches);
    }

    return urlToMatchResults;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[LegacyJavascript.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const bundles = await JSBundles.request(artifacts, context);

    /** @type {Array<{url: string, signals: string[], locations: LH.Audit.Details.SourceLocationValue[]}>} */
    const tableRows = [];
    let signalCount = 0;

    // TODO(cjamcl): Use SourceMaps, and only pattern match if maps are not available.
    const matcher = new CodePatternMatcher([
      ...this.getPolyfillPatterns(),
      ...this.getTransformPatterns(),
    ]);

    const urlToMatchResults =
      this.detectAcrossScripts(matcher, artifacts.ScriptElements, networkRecords, bundles);
    urlToMatchResults.forEach((matches, url) => {
      /** @type {typeof tableRows[number]} */
      const row = {url, signals: [], locations: []};
      for (const match of matches) {
        const {name, line, column} = match;
        row.signals.push(name);
        row.locations.push({
          type: 'source-location',
          url,
          line,
          column,
          urlProvider: 'network',
        });
      }
      tableRows.push(row);
      signalCount += row.signals.length;
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'url', itemType: 'url', subRows: {key: 'locations', itemType: 'source-location'}, text: str_(i18n.UIStrings.columnURL)},
      {key: null, itemType: 'code', subRows: {key: 'signals'}, text: ''},
      /* eslint-enable max-len */
    ];
    const details = Audit.makeTableDetails(headings, tableRows);

    // Only fail if first party code has legacy code.
    const mainDocumentEntity = thirdPartyWeb.getEntity(artifacts.URL.finalUrl);
    const foundSignalInFirstPartyCode = tableRows.some(row => {
      return thirdPartyWeb.isFirstParty(row.url, mainDocumentEntity);
    });
    return {
      score: foundSignalInFirstPartyCode ? 0 : 1,
      notApplicable: !foundSignalInFirstPartyCode,
      extendedInfo: {
        signalCount,
      },
      details,
    };
  }
}

module.exports = LegacyJavascript;
module.exports.UIStrings = UIStrings;
