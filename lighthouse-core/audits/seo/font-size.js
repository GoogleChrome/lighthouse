/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {LH.Artifacts.FontSize['analyzedFailingNodesData'][0]} FailingNodeData */

const i18n = require('../../lib/i18n/i18n.js');
const Audit = require('../audit.js');
const ComputedViewportMeta = require('../../computed/viewport-meta.js');
const MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT = 60;

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the font sizes used on the page. This descriptive title is shown to users when the fonts used on the page are large enough to be considered legible. */
  title: 'Document uses legible font sizes',
  /** Title of a Lighthouse audit that provides detail on the font sizes used on the page. This descriptive title is shown to users when there is a font that may be too small to be read by users. */
  failureTitle: 'Document doesn\'t use legible font sizes',
  /** Description of a Lighthouse audit that tells the user *why* they need to use a larger font size. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Font sizes less than 12px are too small to be legible and require mobile visitors to “pinch to zoom” in order to read. Strive to have >60% of page text ≥12px. [Learn more](https://web.dev/font-size).',
  /** Label for the audit identifying font sizes that are too small. */
  displayValue: '{decimalProportion, number, extendedPercent} legible text',
  /** Explanatory message stating that there was a failure in an audit caused by a missing page viewport meta tag configuration. "viewport" and "meta" are HTML terms and should not be translated. */
  explanationViewport: 'Text is illegible because there\'s no viewport meta tag optimized ' +
    'for mobile screens.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @param {Array<FailingNodeData>} fontSizeArtifact
 * @returns {Array<FailingNodeData>}
 */
function getUniqueFailingRules(fontSizeArtifact) {
  /** @type {Map<string, FailingNodeData>} */
  const failingRules = new Map();

  fontSizeArtifact.forEach(({cssRule, fontSize, textLength, node}) => {
    const artifactId = getFontArtifactId(cssRule, node);
    const failingRule = failingRules.get(artifactId);

    if (!failingRule) {
      failingRules.set(artifactId, {
        node,
        cssRule,
        fontSize,
        textLength,
      });
    } else {
      failingRule.textLength += textLength;
    }
  });

  return [...failingRules.values()];
}

/**
 * @param {Array<string>=} attributes
 * @returns {Map<string, string>}
 */
function getAttributeMap(attributes = []) {
  const map = new Map();

  for (let i = 0; i < attributes.length; i += 2) {
    const name = attributes[i].toLowerCase();
    const value = attributes[i + 1].trim();

    if (value) {
      map.set(name, value);
    }
  }

  return map;
}

/**
 * TODO: return unique selector, like axe-core does, instead of just id/class/name of a single node
 * @param {FailingNodeData['node']} node
 * @returns {string}
 */
function getSelector(node) {
  const attributeMap = getAttributeMap(node.attributes);

  if (attributeMap.has('id')) {
    return '#' + attributeMap.get('id');
  } else {
    const attrClass = attributeMap.get('class');
    if (attrClass) {
      return '.' + attrClass.split(/\s+/).join('.');
    }
  }

  return node.localName.toLowerCase();
}

/**
 * @param {FailingNodeData['node']} node
 * @return {{type: 'node', selector: string, snippet: string}}
 */
function nodeToTableNode(node) {
  const attributes = node.attributes || [];
  const attributesString = attributes.map((value, idx) =>
    (idx % 2 === 0) ? ` ${value}` : `="${value}"`
  ).join('');

  return {
    type: 'node',
    selector: node.parentNode ? getSelector(node.parentNode) : '',
    snippet: `<${node.localName}${attributesString}>`,
  };
}

/**
 * @param {string} baseURL
 * @param {FailingNodeData['cssRule']} styleDeclaration
 * @param {FailingNodeData['node']} node
 * @returns {{source: LH.Audit.Details.UrlValue | LH.Audit.Details.SourceLocationValue | LH.Audit.Details.CodeValue, selector: string | LH.Audit.Details.NodeValue}}
 */
function findStyleRuleSource(baseURL, styleDeclaration, node) {
  if (!styleDeclaration ||
    styleDeclaration.type === 'Attributes' ||
    styleDeclaration.type === 'Inline'
  ) {
    return {
      source: {type: 'url', value: baseURL},
      selector: nodeToTableNode(node),
    };
  }

  if (styleDeclaration.parentRule &&
    styleDeclaration.parentRule.origin === 'user-agent') {
    return {
      source: {type: 'code', value: 'User Agent Stylesheet'},
      selector: styleDeclaration.parentRule.selectors.map(item => item.text).join(', '),
    };
  }

  // Combine all the selectors for the associated style rule
  // example: .some-selector, .other-selector {...} => `.some-selector, .other-selector`
  let selector = '';
  if (styleDeclaration.parentRule) {
    const rule = styleDeclaration.parentRule;
    selector = rule.selectors.map(item => item.text).join(', ');
  }

  if (styleDeclaration.stylesheet && !styleDeclaration.stylesheet.sourceURL) {
    // Dynamically injected into page.
    return {
      source: {type: 'code', value: 'dynamic'},
      selector,
    };
  }

  // !!range == has defined location in a source file (.css or .html)
  // sourceURL == stylesheet URL || raw value of magic `sourceURL` comment
  // hasSourceURL == flag that signals sourceURL is the raw value of a magic `sourceURL` comment, *not* a real resource
  if (styleDeclaration.stylesheet && styleDeclaration.range) {
    const {range, stylesheet} = styleDeclaration;

    // DevTools protocol does not provide the resource URL if there is a magic `sourceURL` comment.
    // `sourceURL` will be the raw value of the magic `sourceURL` comment, which likely refers to
    // a file at build time, not one that is served over the network that we could link to.
    const urlProvider = stylesheet.hasSourceURL ? 'comment' : 'network';

    let line = range.startLine;
    let column = range.startColumn;

    // Add the startLine/startColumn of the <style> element to the range, if stylesheet
    // is inline.
    // Always use the rule's location if a sourceURL magic comment is
    // present (`hasSourceURL` is true) - this makes the line/col relative to the start
    // of the style tag, which makes them relevant when the "file" is open in DevTool's
    // Sources panel.
    const addHtmlLocationOffset = stylesheet.isInline && urlProvider !== 'comment';
    if (addHtmlLocationOffset) {
      line += stylesheet.startLine;
      // The column the stylesheet begins on is only relevant if the rule is declared on the same line.
      if (range.startLine === 0) {
        column += stylesheet.startColumn;
      }
    }

    const url = stylesheet.sourceURL;
    return {
      source: {type: 'source-location', url, urlProvider, line, column},
      selector,
    };
  }

  // The responsible style declaration was not captured in the font-size gatherer due to
  // the rate limiting we do in `fetchFailingNodeSourceRules`.
  return {
    selector,
    source: {type: 'code', value: 'Unknown'},
  };
}

/**
 * @param {FailingNodeData['cssRule']} styleDeclaration
 * @param {FailingNodeData['node']} node
 * @return {string}
 */
function getFontArtifactId(styleDeclaration, node) {
  if (styleDeclaration && styleDeclaration.type === 'Regular') {
    const startLine = styleDeclaration.range ? styleDeclaration.range.startLine : 0;
    const startColumn = styleDeclaration.range ? styleDeclaration.range.startColumn : 0;
    return `${styleDeclaration.styleSheetId}@${startLine}:${startColumn}`;
  } else {
    return `node_${node.nodeId}`;
  }
}

class FontSize extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'font-size',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['FontSize', 'URL', 'MetaElements', 'TestedAsMobileDevice'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    if (!artifacts.TestedAsMobileDevice) {
      // Font size isn't important to desktop SEO
      return {
        score: 1,
        notApplicable: true,
      };
    }

    const viewportMeta = await ComputedViewportMeta.request(artifacts.MetaElements, context);
    if (!viewportMeta.isMobileOptimized) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationViewport),
      };
    }

    const {
      analyzedFailingNodesData,
      analyzedFailingTextLength,
      failingTextLength,
      totalTextLength,
    } = artifacts.FontSize;

    if (totalTextLength === 0) {
      return {
        score: 1,
      };
    }

    const failingRules = getUniqueFailingRules(analyzedFailingNodesData);
    const percentageOfPassingText =
      (totalTextLength - failingTextLength) / totalTextLength * 100;
    const pageUrl = artifacts.URL.finalUrl;

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', itemType: 'source-location', text: 'Source'},
      {key: 'selector', itemType: 'code', text: 'Selector'},
      {key: 'coverage', itemType: 'text', text: '% of Page Text'},
      {key: 'fontSize', itemType: 'text', text: 'Font Size'},
    ];

    const tableData = failingRules.sort((a, b) => b.textLength - a.textLength)
      .map(({cssRule, textLength, fontSize, node}) => {
        const percentageOfAffectedText = textLength / totalTextLength * 100;
        const origin = findStyleRuleSource(pageUrl, cssRule, node);

        return {
          source: origin.source,
          selector: origin.selector,
          coverage: `${percentageOfAffectedText.toFixed(2)}%`,
          fontSize: `${fontSize}px`,
        };
      });

    // all failing nodes that were not fully analyzed will be displayed in a single row
    if (analyzedFailingTextLength < failingTextLength) {
      const percentageOfUnanalyzedFailingText =
        (failingTextLength - analyzedFailingTextLength) / totalTextLength * 100;

      tableData.push({
        // Overrides default `source-location`
        source: {type: 'code', value: 'Add\'l illegible text'},
        selector: '',
        coverage: `${percentageOfUnanalyzedFailingText.toFixed(2)}%`,
        fontSize: '< 12px',
      });
    }

    if (percentageOfPassingText > 0) {
      tableData.push({
        // Overrides default `source-location`
        source: {type: 'code', value: 'Legible text'},
        selector: '',
        coverage: `${percentageOfPassingText.toFixed(2)}%`,
        fontSize: '≥ 12px',
      });
    }

    const decimalProportion = (percentageOfPassingText / 100);
    const displayValue = str_(UIStrings.displayValue, {decimalProportion});
    const details = Audit.makeTableDetails(headings, tableData);
    const passed = percentageOfPassingText >= MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT;

    return {
      score: Number(passed),
      details,
      displayValue,
    };
  }
}

module.exports = FontSize;
module.exports.UIStrings = UIStrings;
