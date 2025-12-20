/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Extracts information about illegible text from the page.
 *
 * In effort to keep this audit's execution time around 1s, maximum number of protocol calls was limited.
 * Firstly, number of visited nodes (text nodes for which font size was checked) is capped.
 * Secondly, number of failing nodes that are analyzed (for which detailed CSS information is extracted) is also limited.
 *
 * The applicable CSS rule is also determined by the code here with some simplifications (namely !important is ignored).
 * This gatherer collects stylesheet metadata by itself, instead of relying on the styles gatherer which is slow (because it parses the stylesheet content).
 */

const Gatherer = require('../gatherer.js');
const FONT_SIZE_PROPERTY_NAME = 'font-size';
const MINIMAL_LEGIBLE_FONT_SIZE_PX = 12;
// limit number of protocol calls to make sure that gatherer doesn't take more than 1-2s
const MAX_NODES_SOURCE_RULE_FETCHED = 50; // number of nodes to fetch the source font-size rule

/** @typedef {import('../../driver.js')} Driver */
/** @typedef {LH.Artifacts.FontSize['analyzedFailingNodesData'][0]} NodeFontData */
/** @typedef {LH.Artifacts.FontSize.DomNodeMaybeWithParent} DomNodeMaybeWithParent*/
/** @typedef {Map<number, {fontSize: number, textLength: number}>} BackendIdsToFontData */

/**
 * @param {LH.Artifacts.FontSize.DomNodeMaybeWithParent=} node
 * @returns {node is LH.Artifacts.FontSize.DomNodeWithParent}
 */
function nodeInBody(node) {
  if (!node) {
    return false;
  }
  if (node.nodeName === 'BODY') {
    return true;
  }
  return nodeInBody(node.parentNode);
}

/**
 * Get list of all nodes from the document body.
 *
 * @param {Driver} driver
 * @returns {Promise<LH.Artifacts.FontSize.DomNodeWithParent[]>}
 */
async function getAllNodesFromBody(driver) {
  const nodes = /** @type {DomNodeMaybeWithParent[]} */ (await driver.getNodesInDocument());
  /** @type {Map<number|undefined, LH.Artifacts.FontSize.DomNodeMaybeWithParent>} */
  const nodeMap = new Map();
  nodes.forEach(node => nodeMap.set(node.nodeId, node));
  nodes.forEach(node => (node.parentNode = nodeMap.get(node.parentId)));
  return nodes.filter(nodeInBody);
}

/**
 * @param {LH.Crdp.CSS.CSSStyle} [style]
 * @return {boolean}
 */
function hasFontSizeDeclaration(style) {
  return !!style && !!style.cssProperties.find(({name}) => name === FONT_SIZE_PROPERTY_NAME);
}

/**
 * Computes the CSS specificity of a given selector, i.e. #id > .class > div
 * LIMITATION: !important is not respected
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity
 * @see https://www.smashingmagazine.com/2010/04/css-specificity-and-inheritance/
 *
 * @param {string} selector
 * @return {number}
 */
function computeSelectorSpecificity(selector) {
  const tokens = selector.split(' ');

  let numIDs = 0;
  let numClasses = 0;
  let numTypes = 0;

  for (const token of tokens) {
    const ids = token.match(/\b#[a-z0-9]+/g) || [];
    const classes = token.match(/\b\.[a-z0-9]+/g) || [];
    const types = token.match(/^[a-z]+/) ? [1] : [];
    numIDs += ids.length;
    numClasses += classes.length;
    numTypes += types.length;
  }

  return Math.min(9, numIDs) * 100 + Math.min(9, numClasses) * 10 + Math.min(9, numTypes);
}

/**
 * Finds the most specific directly matched CSS font-size rule from the list.
 *
 * @param {Array<LH.Crdp.CSS.RuleMatch>} [matchedCSSRules]
 * @returns {NodeFontData['cssRule']|undefined}
 */
function findMostSpecificMatchedCSSRule(matchedCSSRules = []) {
  let maxSpecificity = -Infinity;
  /** @type {LH.Crdp.CSS.CSSRule|undefined} */
  let maxSpecificityRule;

  for (const {rule, matchingSelectors} of matchedCSSRules) {
    if (hasFontSizeDeclaration(rule.style)) {
      const specificities = matchingSelectors.map(idx =>
        computeSelectorSpecificity(rule.selectorList.selectors[idx].text)
      );
      const specificity = Math.max(...specificities);
      // Use greater OR EQUAL so that the last rule wins in the event of a tie
      if (specificity >= maxSpecificity) {
        maxSpecificity = specificity;
        maxSpecificityRule = rule;
      }
    }
  }

  if (maxSpecificityRule) {
    return {
      type: 'Regular',
      ...maxSpecificityRule.style,
      parentRule: {
        origin: maxSpecificityRule.origin,
        selectors: maxSpecificityRule.selectorList.selectors,
      },
    };
  }
}

/**
 * Finds the most specific directly matched CSS font-size rule from the list.
 *
 * @param {Array<LH.Crdp.CSS.InheritedStyleEntry>} [inheritedEntries]
 * @returns {NodeFontData['cssRule']|undefined}
 */
function findInheritedCSSRule(inheritedEntries = []) {
  // The inherited array contains the array of matched rules for all parents in ascending tree order.
  // i.e. for an element whose path is `html > body > #main > #nav > p`
  // `inherited` will be an array of styles like `[#nav, #main, body, html]`
  // The closest parent with font-size will win
  for (const {inlineStyle, matchedCSSRules} of inheritedEntries) {
    if (hasFontSizeDeclaration(inlineStyle)) return {type: 'Inline', ...inlineStyle};

    const directRule = findMostSpecificMatchedCSSRule(matchedCSSRules);
    if (directRule) return directRule;
  }
}

/**
 * Returns the governing/winning CSS font-size rule for the set of styles given.
 * This is roughly a stripped down version of the CSSMatchedStyle class in DevTools.
 *
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/CSSMatchedStyles.js?q=CSSMatchedStyles+f:devtools+-f:out&sq=package:chromium&dr=C&l=59-134
 * @param {LH.Crdp.CSS.GetMatchedStylesForNodeResponse} matched CSS rules
 * @returns {NodeFontData['cssRule']|undefined}
 */
function getEffectiveFontRule({attributesStyle, inlineStyle, matchedCSSRules, inherited}) {
  // Inline styles have highest priority
  if (hasFontSizeDeclaration(inlineStyle)) return {type: 'Inline', ...inlineStyle};

  // Rules directly referencing the node come next
  const matchedRule = findMostSpecificMatchedCSSRule(matchedCSSRules);
  if (matchedRule) return matchedRule;

  // Then comes attributes styles (<font size="1">)
  if (hasFontSizeDeclaration(attributesStyle)) return {type: 'Attributes', ...attributesStyle};

  // Finally, find an inherited property if there is one
  const inheritedRule = findInheritedCSSRule(inherited);
  if (inheritedRule) return inheritedRule;

  return undefined;
}

/**
 * @param {string} text
 * @returns {number}
 */
function getTextLength(text) {
  // Array.from to count symbols not unicode code points. See: #6973
  return !text ? 0 : Array.from(text.trim()).length;
}

/**
 * @param {Driver} driver
 * @param {LH.Crdp.DOM.Node} node text node
 * @returns {Promise<NodeFontData['cssRule']|undefined>}
 */
async function fetchSourceRule(driver, node) {
  const matchedRules = await driver.sendCommand('CSS.getMatchedStylesForNode', {
    nodeId: node.nodeId,
  });
  const sourceRule = getEffectiveFontRule(matchedRules);
  if (!sourceRule) return undefined;

  return {
    type: sourceRule.type,
    range: sourceRule.range,
    styleSheetId: sourceRule.styleSheetId,
    parentRule: sourceRule.parentRule && {
      origin: sourceRule.parentRule.origin,
      selectors: sourceRule.parentRule.selectors,
    },
  };
}

class FontSize extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext['driver']} driver
   * @param {Array<NodeFontData>} failingNodes
   */
  static async fetchFailingNodeSourceRules(driver, failingNodes) {
    const analysisPromises = failingNodes
      .sort((a, b) => b.textLength - a.textLength)
      .slice(0, MAX_NODES_SOURCE_RULE_FETCHED)
      .map(async failingNode => {
        try {
          const cssRule = await fetchSourceRule(driver, failingNode.node);
          failingNode.cssRule = cssRule;
        } catch (err) {
          // The node was deleted. We don't need to distinguish between lack-of-rule
          // due to a deleted node vs due to failed attribution, so just set to undefined.
          failingNode.cssRule = undefined;
        }
        return failingNode;
      });

    const analyzedFailingNodesData = await Promise.all(analysisPromises);

    const analyzedFailingTextLength = analyzedFailingNodesData.reduce(
      (sum, {textLength}) => (sum += textLength),
      0
    );

    return {analyzedFailingNodesData, analyzedFailingTextLength};
  }

  /**
   * Maps backendNodeId of TextNodes to {fontSize, textLength}.
   *
   * @param {LH.Crdp.DOMSnapshot.CaptureSnapshotResponse} snapshot
   * @return {BackendIdsToFontData}
   */
  calculateBackendIdsToFontData(snapshot) {
    const strings = snapshot.strings;

    /** @type {BackendIdsToFontData} */
    const backendIdsToFontData = new Map();

    for (let j = 0; j < snapshot.documents.length; j++) {
      // `doc` is a flattened property list describing all the Nodes in a document, with all string
      // values deduped in the `strings` array.
      const doc = snapshot.documents[j];

      if (!doc.nodes.backendNodeId) {
        throw new Error('Unexpected response from DOMSnapshot.captureSnapshot.');
      }

      for (const layoutIndex of doc.textBoxes.layoutIndex) {
        const text = strings[doc.layout.text[layoutIndex]];
        if (!text) continue;

        const nodeIndex = doc.layout.nodeIndex[layoutIndex];
        const styles = doc.layout.styles[layoutIndex];
        const [fontSizeStringId] = styles;

        const fontSize = parseFloat(strings[fontSizeStringId]);
        backendIdsToFontData.set(doc.nodes.backendNodeId[nodeIndex], {
          fontSize,
          textLength: getTextLength(text),
        });
      }
    }

    return backendIdsToFontData;
  }

  /**
   * The only connection between a snapshot Node and an actual Protocol Node is backendId,
   * so that is used to join the two data structures. DOMSnapshot.captureSnapshot doesn't
   * give the entire Node object, so DOM.getFlattenedDocument is used.
   * @param {BackendIdsToFontData} backendIdsToFontData
   * @param {LH.Artifacts.FontSize.DomNodeWithParent[]} crdpNodes
   */
  findFailingNodes(backendIdsToFontData, crdpNodes) {
    /** @type {NodeFontData[]} */
    const failingNodes = [];
    let totalTextLength = 0;
    let failingTextLength = 0;

    for (const crdpNode of crdpNodes) {
      const partialFontData = backendIdsToFontData.get(crdpNode.backendNodeId);
      if (!partialFontData) continue;
      // `crdpNode` is a non-empty TextNode that is in the layout tree (not display: none).

      const {fontSize, textLength} = partialFontData;
      totalTextLength += textLength;
      if (fontSize < MINIMAL_LEGIBLE_FONT_SIZE_PX) {
        // Once a bad TextNode is identified, its parent Node is needed.
        failingTextLength += textLength;
        failingNodes.push({
          node: crdpNode.parentNode,
          textLength,
          fontSize,
        });
      }
    }

    return {totalTextLength, failingTextLength, failingNodes};
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts.FontSize>} font-size analysis
   */
  async afterPass(passContext) {
    /** @type {Map<string, LH.Crdp.CSS.CSSStyleSheetHeader>} */
    const stylesheets = new Map();
    /** @param {LH.Crdp.CSS.StyleSheetAddedEvent} sheet */
    const onStylesheetAdded = sheet => stylesheets.set(sheet.header.styleSheetId, sheet.header);
    passContext.driver.on('CSS.styleSheetAdded', onStylesheetAdded);

    await Promise.all([
      passContext.driver.sendCommand('DOMSnapshot.enable'),
      passContext.driver.sendCommand('DOM.enable'),
      passContext.driver.sendCommand('CSS.enable'),
    ]);

    // Get the computed font-size style of every node.
    const snapshotPromise = passContext.driver.sendCommand('DOMSnapshot.captureSnapshot', {
      computedStyles: ['font-size'],
    });
    const allNodesPromise = getAllNodesFromBody(passContext.driver);
    const [snapshot, crdpNodes] = await Promise.all([snapshotPromise, allNodesPromise]);
    const backendIdsToFontData = this.calculateBackendIdsToFontData(snapshot);
    // `backendIdsToFontData` will include all non-empty TextNodes.
    // `crdpNodes` will only contain the body node and its descendants.

    const {
      totalTextLength,
      failingTextLength,
      failingNodes,
    } = this.findFailingNodes(backendIdsToFontData, crdpNodes);
    const {
      analyzedFailingNodesData,
      analyzedFailingTextLength,
    } = await FontSize.fetchFailingNodeSourceRules(passContext.driver, failingNodes);

    passContext.driver.off('CSS.styleSheetAdded', onStylesheetAdded);

    // For the nodes whose computed style we could attribute to a stylesheet, assign
    // the stylsheet to the data.
    analyzedFailingNodesData
      .filter(data => data.cssRule && data.cssRule.styleSheetId)
      // @ts-ignore - guaranteed to exist from the filter immediately above
      .forEach(data => (data.cssRule.stylesheet = stylesheets.get(data.cssRule.styleSheetId)));

    await Promise.all([
      passContext.driver.sendCommand('DOMSnapshot.disable'),
      passContext.driver.sendCommand('DOM.disable'),
      passContext.driver.sendCommand('CSS.disable'),
    ]);

    return {
      analyzedFailingNodesData,
      analyzedFailingTextLength,
      failingTextLength,
      totalTextLength,
    };
  }
}

module.exports = FontSize;
module.exports.computeSelectorSpecificity = computeSelectorSpecificity;
module.exports.getEffectiveFontRule = getEffectiveFontRule;
