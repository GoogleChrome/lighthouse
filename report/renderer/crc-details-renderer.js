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
 * @typedef CRCSegment
 * @property {LH.Audit.Details.SimpleCriticalRequestNode[string]} node
 * @property {boolean} isLastChild
 * @property {boolean} hasChildren
 * @property {number} startTime
 * @property {number} transferSize
 * @property {boolean[]} treeMarkers
 */

class CriticalRequestChainRenderer {
  /**
   * Create render context for critical-request-chain tree display.
   * @param {LH.Audit.Details.SimpleCriticalRequestNode} tree
   * @return {{tree: LH.Audit.Details.SimpleCriticalRequestNode, startTime: number, transferSize: number}}
   */
  static initTree(tree) {
    let startTime = 0;
    const rootNodes = Object.keys(tree);
    if (rootNodes.length > 0) {
      const node = tree[rootNodes[0]];
      startTime = node.request.startTime;
    }

    return {tree, startTime, transferSize: 0};
  }

  /**
   * Helper to create context for each critical-request-chain node based on its
   * parent. Calculates if this node is the last child, whether it has any
   * children itself and what the tree looks like all the way back up to the root,
   * so the tree markers can be drawn correctly.
   * @param {LH.Audit.Details.SimpleCriticalRequestNode} parent
   * @param {string} id
   * @param {number} startTime
   * @param {number} transferSize
   * @param {Array<boolean>=} treeMarkers
   * @param {boolean=} parentIsLastChild
   * @return {CRCSegment}
   */
  static createSegment(parent, id, startTime, transferSize, treeMarkers, parentIsLastChild) {
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
      startTime,
      transferSize: transferSize + node.request.transferSize,
      treeMarkers: newTreeMarkers,
    };
  }

  /**
   * Creates the DOM for a tree segment.
   * @param {DOM} dom
   * @param {CRCSegment} segment
   * @param {DetailsRenderer} detailsRenderer
   * @return {Node}
   */
  static createChainNode(dom, segment, detailsRenderer) {
    const chainEl = dom.createComponent('crcChain');

    // Hovering over request shows full URL.
    dom.find('.lh-crc-node', chainEl).setAttribute('title', segment.node.request.url);

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
    const url = segment.node.request.url;
    const linkEl = detailsRenderer.renderTextURL(url);
    const treevalEl = dom.find('.lh-crc-node__tree-value', chainEl);
    treevalEl.append(linkEl);

    if (!segment.hasChildren) {
      const {startTime, endTime, transferSize} = segment.node.request;
      const span = dom.createElement('span', 'lh-crc-node__chain-duration');
      span.textContent =
        ' - ' + Globals.i18n.formatMilliseconds((endTime - startTime) * 1000) + ', ';
      const span2 = dom.createElement('span', 'lh-crc-node__chain-duration');
      span2.textContent = Globals.i18n.formatBytesToKiB(transferSize, 0.01);

      treevalEl.append(span, span2);
    }

    return chainEl;
  }

  /**
   * Recursively builds a tree from segments.
   * @param {DOM} dom
   * @param {DocumentFragment} tmpl
   * @param {CRCSegment} segment
   * @param {Element} elem Parent element.
   * @param {LH.Audit.Details.CriticalRequestChain} details
   * @param {DetailsRenderer} detailsRenderer
   */
  static buildTree(dom, tmpl, segment, elem, details, detailsRenderer) {
    elem.append(CRCRenderer.createChainNode(dom, segment, detailsRenderer));
    if (segment.node.children) {
      for (const key of Object.keys(segment.node.children)) {
        const childSegment = CRCRenderer.createSegment(segment.node.children, key,
          segment.startTime, segment.transferSize, segment.treeMarkers, segment.isLastChild);
        CRCRenderer.buildTree(dom, tmpl, childSegment, elem, details, detailsRenderer);
      }
    }
  }

  /**
   * @param {DOM} dom
   * @param {LH.Audit.Details.CriticalRequestChain} details
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
    const root = CRCRenderer.initTree(details.chains);
    for (const key of Object.keys(root.tree)) {
      const segment = CRCRenderer.createSegment(root.tree, key, root.startTime, root.transferSize);
      CRCRenderer.buildTree(dom, tmpl, segment, containerEl, details, detailsRenderer);
    }

    return dom.find('.lh-crc-container', tmpl);
  }
}

// Alias b/c the name is really long.
const CRCRenderer = CriticalRequestChainRenderer;

export {
  CriticalRequestChainRenderer,
};
