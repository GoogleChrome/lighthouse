/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview This file contains helpers for constructing and rendering the
 * critical request chains network tree.
 */

import {Globals} from './report-globals.js';

/** @typedef {import('./dom.js').DOM} DOM */
/** @typedef {import('./details-renderer.js').DetailsRenderer} DetailsRenderer */
/**
 * @typedef NetworkSegment
 * @property {LH.Audit.Details.SimpleCriticalRequestNode[string]|LH.Audit.Details.NetworkNode[string]} node
 * @property {boolean} isLastChild
 * @property {boolean} hasChildren
 * @property {boolean[]} treeMarkers
 */

class CriticalRequestChainRenderer {
  /**
   * Helper to create context for each critical-request-chain node based on its
   * parent. Calculates if this node is the last child, whether it has any
   * children itself and what the tree looks like all the way back up to the root,
   * so the tree markers can be drawn correctly.
   * @param {LH.Audit.Details.SimpleCriticalRequestNode|LH.Audit.Details.NetworkNode} parent
   * @param {string} id
   * @param {Array<boolean>=} treeMarkers
   * @param {boolean=} parentIsLastChild
   * @return {NetworkSegment}
   */
  static createSegment(parent, id, treeMarkers, parentIsLastChild) {
    const node = parent[id];
    const siblings = Object.keys(parent);
    const isLastChild = siblings.indexOf(id) === (siblings.length - 1);
    const hasChildren = !!node.children && Object.keys(node.children).length > 0;

    // Copy the tree markers so that we don't change by reference.
    const newTreeMarkers = Array.isArray(treeMarkers) ? treeMarkers.slice(0) : [];

    // Add on the new entry.
    if (typeof parentIsLastChild !== 'undefined') {
      newTreeMarkers.push(!parentIsLastChild);
    }

    return {
      node,
      isLastChild,
      hasChildren,
      treeMarkers: newTreeMarkers,
    };
  }

  /**
   * Creates the DOM for a tree segment.
   * @param {DOM} dom
   * @param {NetworkSegment} segment
   * @param {DetailsRenderer} detailsRenderer
   * @return {Node}
   */
  static createChainNode(dom, segment, detailsRenderer) {
    const chainEl = dom.createComponent('crcChain');

    // This can be either the duration or the chain end time depending on the detail type.
    let nodeTiming;
    let nodeTransferSize;
    let nodeUrl;
    let alwaysShowTiming;
    let highlightLongest;

    // `segment.node.request` indicates that this is a legacy critical request chain details node.
    // For historical reasons, the legacy CRC will only show details for leaf nodes and will show
    // the leaf node request duration rather than the duration of the entire tree.
    if ('request' in segment.node) {
      nodeTransferSize = segment.node.request.transferSize;
      nodeUrl = segment.node.request.url;
      nodeTiming = (segment.node.request.endTime - segment.node.request.startTime) * 1000;
      alwaysShowTiming = false;
    } else {
      nodeTransferSize = segment.node.transferSize;
      nodeUrl = segment.node.url;
      nodeTiming = segment.node.navStartToEndTime;
      alwaysShowTiming = true;
      highlightLongest = segment.node.isLongest;
    }

    // Hovering over request shows full URL.
    const nodeEl = dom.find('.lh-crc-node', chainEl);
    nodeEl.setAttribute('title', nodeUrl);
    if (highlightLongest) {
      nodeEl.classList.add('lh-crc-node__longest');
    }

    const treeMarkeEl = dom.find('.lh-crc-node__tree-marker', chainEl);

    // Construct lines and add spacers for sub requests.
    segment.treeMarkers.forEach(separator => {
      const classSeparator = separator ?
        'lh-tree-marker lh-vert' :
        'lh-tree-marker';
      treeMarkeEl.append(
        dom.createElement('span', classSeparator),
        dom.createElement('span', 'lh-tree-marker')
      );
    });

    const classLastChild = segment.isLastChild ?
      'lh-tree-marker lh-up-right' :
      'lh-tree-marker lh-vert-right';
    const classHasChildren = segment.hasChildren ?
      'lh-tree-marker lh-horiz-down' :
      'lh-tree-marker lh-right';

    treeMarkeEl.append(
      dom.createElement('span', classLastChild),
      dom.createElement('span', 'lh-tree-marker lh-right'),
      dom.createElement('span', classHasChildren)
    );

    // Fill in url, host, and request size information.
    const linkEl = detailsRenderer.renderTextURL(nodeUrl);
    const treevalEl = dom.find('.lh-crc-node__tree-value', chainEl);
    treevalEl.append(linkEl);


    if (!segment.hasChildren || alwaysShowTiming) {
      const span = dom.createElement('span', 'lh-crc-node__chain-duration');
      span.textContent =
        ' - ' + Globals.i18n.formatMilliseconds(nodeTiming) + ', ';
      const span2 = dom.createElement('span', 'lh-crc-node__chain-size');
      span2.textContent = Globals.i18n.formatBytesToKiB(nodeTransferSize, 0.01);

      treevalEl.append(span, span2);
    }

    return chainEl;
  }

  /**
   * Recursively builds a tree from segments.
   * @param {DOM} dom
   * @param {NetworkSegment} segment
   * @param {Element} elem Parent element.
   * @param {DetailsRenderer} detailsRenderer
   */
  static buildTree(dom, segment, elem, detailsRenderer) {
    elem.append(CRCRenderer.createChainNode(dom, segment, detailsRenderer));
    if (segment.node.children) {
      for (const key of Object.keys(segment.node.children)) {
        const childSegment = CRCRenderer.createSegment(segment.node.children, key,
          segment.treeMarkers, segment.isLastChild);
        CRCRenderer.buildTree(dom, childSegment, elem, detailsRenderer);
      }
    }
  }

  /**
   * @param {DOM} dom
   * @param {LH.Audit.Details.CriticalRequestChain|LH.Audit.Details.NetworkTree} details
   * @param {DetailsRenderer} detailsRenderer
   * @return {Element}
   */
  static render(dom, details, detailsRenderer) {
    const tmpl = dom.createComponent('crc');
    const containerEl = dom.find('.lh-crc', tmpl);

    // Fill in top summary.
    dom.find('.lh-crc-initial-nav', tmpl).textContent = Globals.strings.crcInitialNavigation;
    dom.find('.lh-crc__longest_duration_label', tmpl).textContent =
        Globals.strings.crcLongestDurationLabel;
    dom.find('.lh-crc__longest_duration', tmpl).textContent =
        Globals.i18n.formatMilliseconds(details.longestChain.duration);

    // Construct visual tree.
    const tree = details.chains;
    for (const key of Object.keys(tree)) {
      const segment = CRCRenderer.createSegment(tree, key);
      CRCRenderer.buildTree(dom, segment, containerEl, detailsRenderer);
    }

    return dom.find('.lh-crc-container', tmpl);
  }
}

// Alias b/c the name is really long.
const CRCRenderer = CriticalRequestChainRenderer;

export {
  CriticalRequestChainRenderer,
};
