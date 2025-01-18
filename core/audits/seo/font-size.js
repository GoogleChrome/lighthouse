/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {LH.Artifacts.FontSize['analyzedFailingNodesData'][0]} FailingNodeData */

import * as i18n from '../../lib/i18n/i18n.js';
import {Audit} from '../audit.js';
import {ViewportMeta} from '../../computed/viewport-meta.js';

const MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT = 60;

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the font sizes used on the page. This descriptive title is shown to users when the fonts used on the page are large enough to be considered legible. */
  title: 'Document uses legible font sizes',
  /** Title of a Lighthouse audit that provides detail on the font sizes used on the page. This descriptive title is shown to users when there is a font that may be too small to be read by users. */
  failureTitle: 'Document doesn\'t use legible font sizes',
  /** Description of a Lighthouse audit that tells the user *why* they need to use a larger font size. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Font sizes less than 12px are too small to be legible and require mobile visitors to “pinch to zoom” in order to read. Strive to have >60% of page text ≥12px. [Learn more about legible font sizes](https://developer.chrome.com/docs/lighthouse/seo/font-size/).',
  /** Label for the audit identifying font sizes that are too small. */
  displayValue: '{decimalProportion, number, extendedPercent} legible text',
  /** Explanatory message stating that there was a failure in an audit caused by a missing page viewport meta tag configuration. "viewport" and "meta" are HTML terms and should not be translated. */
  explanationViewport: 'Text is illegible because there\'s no viewport meta tag optimized ' +
    'for mobile screens.',
  /** Label for the table row which summarizes all failing nodes that were not fully analyzed. "Add'l" is shorthand for "Additional" */
  additionalIllegibleText: 'Add\'l illegible text',
  /** Label for the table row which displays the percentage of nodes that have proper font size. */
  legibleText: 'Legible text',
  /** Label for a column in a data table; entries will be css style rule selectors. */
  columnSelector: 'Selector',
  /** Label for a column in a data table; entries will be the percent of page text a specific CSS rule applies to. */
  columnPercentPageText: '% of Page Text',
  /** Label for a column in a data table; entries will be text font sizes. */
  columnFontSize: 'Font Size',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @param {Array<FailingNodeData>} fontSizeArtifact
 * @return {Array<FailingNodeData>}
 */
function getUniqueFailingRules(fontSizeArtifact) {
  /** @type {Map<string, FailingNodeData>} */
  const failingRules = new Map();

  fontSizeArtifact.forEach((failingNodeData) => {
    const {nodeId, cssRule, fontSize, textLength, parentNode} = failingNodeData;
    const artifactId = getFontArtifactId(cssRule, nodeId);
    const failingRule = failingRules.get(artifactId);

    if (!failingRule) {
      failingRules.set(artifactId, {
        nodeId,
        parentNode,
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
 * @param {Array<string|undefined>=} attributes
 * @return {Map<string, string>}
 */
function getAttributeMap(attributes = []) {
  const map = new Map();

  for (let i = 0; i < attributes.length; i += 2) {
    const name = attributes[i];
    const value = attributes[i + 1];
    if (!name || !value) continue;

    const normalizedValue = value.trim();

    if (normalizedValue) {
      map.set(name.toLowerCase(), normalizedValue);
    }
  }

  return map;
}

/**
 * TODO: return unique selector, like axe-core does, instead of just id/class/name of a single node
 * @param {FailingNodeData['parentNode']} parentNode
 * @return {string}
 */
function getSelector(parentNode) {
  const attributeMap = getAttributeMap(parentNode.attributes);

  if (attributeMap.has('id')) {
    return '#' + attributeMap.get('id');
  } else {
    const attrClass = attributeMap.get('class');
    if (attrClass) {
      return '.' + attrClass.split(/\s+/).join('.');
    }
  }

  return parentNode.nodeName.toLowerCase();
}

/**
 * @param {FailingNodeData['parentNode']} parentNode
 * @return {LH.Audit.Details.NodeValue}
 */
function nodeToTableNode(parentNode) {
  const attributes = parentNode.attributes || [];
  const attributesString = attributes.map((value, idx) =>
    (idx % 2 === 0) ? ` ${value}` : `="${value}"`
  ).join('');

  return {
    type: 'node',
    selector: parentNode.parentNode ? getSelector(parentNode.parentNode) : '',
    snippet: `<${parentNode.nodeName.toLowerCase()}${attributesString}>`,
  };
}

/**
 * @param {string} baseURL
 * @param {FailingNodeData['cssRule']} styleDeclaration
 * @param {FailingNodeData['parentNode']} parentNode
 * @return {{source: LH.Audit.Details.UrlValue | LH.Audit.Details.SourceLocationValue | LH.Audit.Details.CodeValue, selector: string | LH.Audit.Details.NodeValue}}
 */
function findStyleRuleSource(baseURL, styleDeclaration, parentNode) {
  if (!styleDeclaration ||
    styleDeclaration.type === 'Attributes' ||
    styleDeclaration.type === 'Inline'
  ) {
    return {
      source: {type: 'url', value: baseURL},
      selector: nodeToTableNode(parentNode),
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

    const source = Audit.makeSourceLocation(stylesheet.sourceURL, line, column);
    source.urlProvider = urlProvider;

    return {
      source,
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
 * @param {number} textNodeId
 * @return {string}
 */
function getFontArtifactId(styleDeclaration, textNodeId) {
  if (styleDeclaration && styleDeclaration.type === 'Regular') {
    const startLine = styleDeclaration.range ? styleDeclaration.range.startLine : 0;
    const startColumn = styleDeclaration.range ? styleDeclaration.range.startColumn : 0;
    return `${styleDeclaration.styleSheetId}@${startLine}:${startColumn}`;
  } else {
    return `node_${textNodeId}`;
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
      requiredArtifacts: ['FontSize', 'URL', 'MetaElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    if (context.settings.formFactor === 'desktop') {
      // Font size isn't important to desktop SEO
      return {
        score: 1,
        notApplicable: true,
      };
    }

    const viewportMeta = await ViewportMeta.request(artifacts.MetaElements, context);
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
    const pageUrl = artifacts.URL.finalDisplayedUrl;

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', valueType: 'source-location', label: str_(i18n.UIStrings.columnSource)},
      {key: 'selector', valueType: 'code', label: str_(UIStrings.columnSelector)},
      {key: 'coverage', valueType: 'text', label: str_(UIStrings.columnPercentPageText)},
      {key: 'fontSize', valueType: 'text', label: str_(UIStrings.columnFontSize)},
    ];

    const tableData = failingRules.sort((a, b) => b.textLength - a.textLength)
      .map(({cssRule, textLength, fontSize, parentNode}) => {
        const percentageOfAffectedText = textLength / totalTextLength * 100;
        const origin = findStyleRuleSource(pageUrl, cssRule, parentNode);

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
        source: {type: 'code', value: str_(UIStrings.additionalIllegibleText)},
        selector: '',
        coverage: `${percentageOfUnanalyzedFailingText.toFixed(2)}%`,
        fontSize: '< 12px',
      });
    }

    if (percentageOfPassingText > 0) {
      tableData.push({
        // Overrides default `source-location`
        source: {type: 'code', value: str_(UIStrings.legibleText)},
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

export default FontSize;
export {UIStrings};
