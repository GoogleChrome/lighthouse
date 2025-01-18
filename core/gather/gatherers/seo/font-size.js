/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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

import BaseGatherer from '../../base-gatherer.js';

const FONT_SIZE_PROPERTY_NAME = 'font-size';
const MINIMAL_LEGIBLE_FONT_SIZE_PX = 12;
// limit number of protocol calls to make sure that gatherer doesn't take more than 1-2s
const MAX_NODES_SOURCE_RULE_FETCHED = 50; // number of nodes to fetch the source font-size rule

/** @typedef {LH.Artifacts.FontSize['analyzedFailingNodesData'][0]} NodeFontData */
/** @typedef {Map<number, {fontSize: number, textLength: number}>} BackendIdsToFontData */

/**
 * @param {LH.Crdp.CSS.CSSStyle} [style]
 * @return {boolean}
 */
function hasFontSizeDeclaration(style) {
  return !!style && !!style.cssProperties.find(({name}) => name === FONT_SIZE_PROPERTY_NAME);
}

/**
 * Finds the most specific directly matched CSS font-size rule from the list.
 *
 * @param {Array<LH.Crdp.CSS.RuleMatch>} matchedCSSRules
 * @param {function(LH.Crdp.CSS.CSSStyle):boolean|string|undefined} isDeclarationOfInterest
 * @return {NodeFontData['cssRule']|undefined}
 */
function findMostSpecificMatchedCSSRule(matchedCSSRules = [], isDeclarationOfInterest) {
  let mostSpecificRule;
  for (let i = matchedCSSRules.length - 1; i >= 0; i--) {
    if (isDeclarationOfInterest(matchedCSSRules[i].rule.style)) {
      mostSpecificRule = matchedCSSRules[i].rule;
      break;
    }
  }

  if (mostSpecificRule) {
    return {
      type: 'Regular',
      ...mostSpecificRule.style,
      parentRule: {
        origin: mostSpecificRule.origin,
        selectors: mostSpecificRule.selectorList.selectors,
      },
    };
  }
}

/**
 * Finds the most specific directly matched CSS font-size rule from the list.
 *
 * @param {Array<LH.Crdp.CSS.InheritedStyleEntry>} [inheritedEntries]
 * @return {NodeFontData['cssRule']|undefined}
 */
function findInheritedCSSRule(inheritedEntries = []) {
  // The inherited array contains the array of matched rules for all parents in ascending tree order.
  // i.e. for an element whose path is `html > body > #main > #nav > p`
  // `inherited` will be an array of styles like `[#nav, #main, body, html]`
  // The closest parent with font-size will win
  for (const {inlineStyle, matchedCSSRules} of inheritedEntries) {
    if (hasFontSizeDeclaration(inlineStyle)) return {type: 'Inline', ...inlineStyle};

    const directRule = findMostSpecificMatchedCSSRule(matchedCSSRules, hasFontSizeDeclaration);
    if (directRule) return directRule;
  }
}

/**
 * Returns the governing/winning CSS font-size rule for the set of styles given.
 * This is roughly a stripped down version of the CSSMatchedStyle class in DevTools.
 *
 * @see https://cs.chromium.org/chromium/src/third_party/blink/renderer/devtools/front_end/sdk/CSSMatchedStyles.js?q=CSSMatchedStyles+f:devtools+-f:out&sq=package:chromium&dr=C&l=59-134
 * @param {LH.Crdp.CSS.GetMatchedStylesForNodeResponse} matched CSS rules
 * @return {NodeFontData['cssRule']|undefined}
 */
function getEffectiveFontRule({attributesStyle, inlineStyle, matchedCSSRules, inherited}) {
  // Inline styles have highest priority
  if (hasFontSizeDeclaration(inlineStyle)) return {type: 'Inline', ...inlineStyle};

  // Rules directly referencing the node come next
  const matchedRule = findMostSpecificMatchedCSSRule(matchedCSSRules, hasFontSizeDeclaration);
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
 * @return {number}
 */
function getTextLength(text) {
  // Array.from to count symbols not unicode code points. See: #6973
  return !text ? 0 : Array.from(text.trim()).length;
}

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {number} nodeId text node
 * @return {Promise<NodeFontData['cssRule']|undefined>}
 */
async function fetchSourceRule(session, nodeId) {
  const matchedRules = await session.sendCommand('CSS.getMatchedStylesForNode', {
    nodeId,
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

class FontSize extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.ProtocolSession} session
   * @param {Array<NodeFontData>} failingNodes
   */
  static async fetchFailingNodeSourceRules(session, failingNodes) {
    const nodesToAnalyze = failingNodes
      .sort((a, b) => b.textLength - a.textLength)
      .slice(0, MAX_NODES_SOURCE_RULE_FETCHED);

    // DOM.getDocument is necessary for pushNodesByBackendIdsToFrontend to properly retrieve nodeIds if the `DOM` domain was enabled before this gatherer, invoke it to be safe.
    await session.sendCommand('DOM.getDocument', {depth: -1, pierce: true});

    const {nodeIds} = await session.sendCommand('DOM.pushNodesByBackendIdsToFrontend', {
      backendNodeIds: nodesToAnalyze.map(node => node.parentNode.backendNodeId),
    });

    const analysisPromises = nodesToAnalyze
      .map(async (failingNode, i) => {
        failingNode.nodeId = nodeIds[i];
        try {
          const cssRule = await fetchSourceRule(session, nodeIds[i]);
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
   * Returns the TextNodes in a DOM Snapshot.
   * Every entry is associated with a TextNode in the layout tree (not display: none).
   * @param {LH.Crdp.DOMSnapshot.CaptureSnapshotResponse} snapshot
   */
  getTextNodesInLayoutFromSnapshot(snapshot) {
    const strings = snapshot.strings;
    /** @param {number} index */
    const getString = (index) => strings[index];
    /** @param {number} index */
    const getFloat = (index) => parseFloat(strings[index]);

    const textNodesData = [];
    for (let j = 0; j < snapshot.documents.length; j++) {
      // `doc` is a flattened property list describing all the Nodes in a document, with all string
      // values deduped in the `strings` array.
      const doc = snapshot.documents[j];

      if (!doc.nodes.backendNodeId || !doc.nodes.parentIndex ||
          !doc.nodes.attributes || !doc.nodes.nodeName) {
        throw new Error('Unexpected response from DOMSnapshot.captureSnapshot.');
      }
      const nodes = /** @type {Required<typeof doc['nodes']>} */ (doc.nodes);

      /** @param {number} parentIndex */
      const getParentData = (parentIndex) => ({
        backendNodeId: nodes.backendNodeId[parentIndex],
        attributes: nodes.attributes[parentIndex].map(getString),
        nodeName: getString(nodes.nodeName[parentIndex]),
      });

      for (const layoutIndex of doc.textBoxes.layoutIndex) {
        const text = strings[doc.layout.text[layoutIndex]];
        if (!text) continue;

        const nodeIndex = doc.layout.nodeIndex[layoutIndex];
        const styles = doc.layout.styles[layoutIndex];
        const [fontSizeStringId, visibilityStringId] = styles;
        const fontSize = getFloat(fontSizeStringId);
        const visibility = getString(visibilityStringId);

        const parentIndex = nodes.parentIndex[nodeIndex];
        const grandParentIndex = nodes.parentIndex[parentIndex];
        const parentNode = getParentData(parentIndex);
        const grandParentNode =
          grandParentIndex !== undefined ? getParentData(grandParentIndex) : undefined;

        textNodesData.push({
          nodeIndex,
          backendNodeId: nodes.backendNodeId[nodeIndex],
          fontSize,
          visibility,
          textLength: getTextLength(text),
          parentNode: {
            ...parentNode,
            parentNode: grandParentNode,
          },
        });
      }
    }

    return textNodesData;
  }

  /**
   * Get all the failing text nodes that don't meet the legible text threshold.
   * @param {LH.Crdp.DOMSnapshot.CaptureSnapshotResponse} snapshot
   */
  findFailingNodes(snapshot) {
    /** @type {NodeFontData[]} */
    const failingNodes = [];
    let totalTextLength = 0;
    let failingTextLength = 0;

    for (const textNodeData of this.getTextNodesInLayoutFromSnapshot(snapshot)) {
      if (textNodeData.visibility === 'hidden') {
        continue;
      }

      totalTextLength += textNodeData.textLength;

      if (textNodeData.fontSize >= MINIMAL_LEGIBLE_FONT_SIZE_PX) {
        continue;
      }

      // Once a bad TextNode is identified, its parent Node is needed.
      failingTextLength += textNodeData.textLength;
      failingNodes.push({
        nodeId: 0, // Set later in fetchFailingNodeSourceRules.
        parentNode: textNodeData.parentNode,
        textLength: textNodeData.textLength,
        fontSize: textNodeData.fontSize,
      });
    }

    return {totalTextLength, failingTextLength, failingNodes};
  }

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts.FontSize>} font-size analysis
   */
  async getArtifact(passContext) {
    const session = passContext.driver.defaultSession;

    /** @type {Map<string, LH.Crdp.CSS.CSSStyleSheetHeader>} */
    const stylesheets = new Map();
    /** @param {LH.Crdp.CSS.StyleSheetAddedEvent} sheet */
    const onStylesheetAdded = sheet => stylesheets.set(sheet.header.styleSheetId, sheet.header);
    session.on('CSS.styleSheetAdded', onStylesheetAdded);

    await Promise.all([
      session.sendCommand('DOMSnapshot.enable'),
      session.sendCommand('DOM.enable'),
      session.sendCommand('CSS.enable'),
    ]);

    // Get the computed font-size style of every node.
    const snapshot = await session.sendCommand('DOMSnapshot.captureSnapshot', {
      computedStyles: ['font-size', 'visibility'],
    });

    const {
      totalTextLength,
      failingTextLength,
      failingNodes,
    } = this.findFailingNodes(snapshot);
    const {
      analyzedFailingNodesData,
      analyzedFailingTextLength,
    } = await FontSize.fetchFailingNodeSourceRules(session, failingNodes);

    session.off('CSS.styleSheetAdded', onStylesheetAdded);

    // For the nodes whose computed style we could attribute to a stylesheet, assign
    // the stylsheet to the data.
    analyzedFailingNodesData
      .filter(data => data.cssRule?.styleSheetId)
      // @ts-expect-error - guaranteed to exist from the filter immediately above
      .forEach(data => (data.cssRule.stylesheet = stylesheets.get(data.cssRule.styleSheetId)));

    await Promise.all([
      session.sendCommand('DOMSnapshot.disable'),
      session.sendCommand('DOM.disable'),
      session.sendCommand('CSS.disable'),
    ]);

    return {
      analyzedFailingNodesData,
      analyzedFailingTextLength,
      failingTextLength,
      totalTextLength,
    };
  }
}

export default FontSize;
export {
  getEffectiveFontRule,
  findMostSpecificMatchedCSSRule,
};
