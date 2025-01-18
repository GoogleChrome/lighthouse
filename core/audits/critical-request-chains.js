/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {CriticalRequestChains as ComputedChains} from '../computed/critical-request-chains.js';

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to reduce the depth of critical network requests to enhance initial load of a page. Critical request chains are series of dependent network requests that are important for page rendering. For example, here's a 4-request-deep chain: The biglogo.jpg image is required, but is requested via the styles.css style code, which is requested by the initialize.js javascript, which is requested by the page's HTML. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Avoid chaining critical requests',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce the depth of critical network requests to enhance initial load of a page . This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'The Critical Request Chains below show you what resources are ' +
      'loaded with a high priority. Consider reducing ' +
      'the length of chains, reducing the download size of resources, or ' +
      'deferring the download of unnecessary resources to improve page load. ' +
      '[Learn how to avoid chaining critical requests](https://developer.chrome.com/docs/lighthouse/performance/critical-request-chains/).',
  /** [ICU Syntax] Label for an audit identifying the number of sequences of dependent network requests used to load the page. */
  displayValue: `{itemCount, plural,
    =1 {1 chain found}
    other {# chains found}
    }`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class CriticalRequestChains extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'critical-request-chains',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      supportedModes: ['navigation'],
      guidanceLevel: 1,
      requiredArtifacts: ['traces', 'devtoolsLogs', 'URL'],
    };
  }

  /** @typedef {{depth: number, id: string, chainDuration: number, chainTransferSize: number, node: LH.Artifacts.CriticalRequestNode[string]}} CrcNodeInfo */

  /**
   * @param {LH.Artifacts.CriticalRequestNode} tree
   * @param {function(CrcNodeInfo): void} cb
   */
  static _traverse(tree, cb) {
    /**
     * @param {LH.Artifacts.CriticalRequestNode} node
     * @param {number} depth
     * @param {number=} networkRequestTime
     * @param {number=} transferSize
     */
    function walk(node, depth, networkRequestTime, transferSize = 0) {
      const children = Object.keys(node);
      if (children.length === 0) {
        return;
      }
      children.forEach(id => {
        const child = node[id];
        if (!networkRequestTime) {
          networkRequestTime = child.request.networkRequestTime;
        }

        // Call the callback with the info for this child.
        cb({
          depth,
          id,
          node: child,
          chainDuration: child.request.networkEndTime - networkRequestTime,
          chainTransferSize: transferSize + child.request.transferSize,
        });

        // Carry on walking.
        if (child.children) {
          walk(child.children, depth + 1, networkRequestTime);
        }
      }, '');
    }

    walk(tree, 0);
  }

  /**
   * Get stats about the longest initiator chain (as determined by time duration)
   * @param {LH.Artifacts.CriticalRequestNode} tree
   * @return {{duration: number, length: number, transferSize: number}}
   */
  static _getLongestChain(tree) {
    const longest = {
      duration: 0,
      length: 0,
      transferSize: 0,
    };
    CriticalRequestChains._traverse(tree, opts => {
      const duration = opts.chainDuration;
      if (duration > longest.duration) {
        longest.duration = duration;
        longest.transferSize = opts.chainTransferSize;
        longest.length = opts.depth;
      }
    });
    // Always return the longest chain + 1 because the depth is zero indexed.
    longest.length++;
    return longest;
  }

  /**
   * @param {LH.Artifacts.CriticalRequestNode} tree
   * @return {LH.Audit.Details.SimpleCriticalRequestNode}
   */
  static flattenRequests(tree) {
    /** @type {LH.Audit.Details.SimpleCriticalRequestNode} */
    const flattendChains = {};
    /** @type {Map<string, LH.Audit.Details.SimpleCriticalRequestNode[string]>} */
    const chainMap = new Map();

    /** @param {CrcNodeInfo} opts */
    function flatten(opts) {
      const request = opts.node.request;
      const simpleRequest = {
        url: request.url,
        startTime: request.networkRequestTime / 1000,
        endTime: request.networkEndTime / 1000,
        responseReceivedTime: request.responseHeadersEndTime / 1000,
        transferSize: request.transferSize,
      };

      let chain = chainMap.get(opts.id);
      if (chain) {
        chain.request = simpleRequest;
      } else {
        chain = {
          request: simpleRequest,
        };
        flattendChains[opts.id] = chain;
      }

      if (opts.node.children) {
        for (const chainId of Object.keys(opts.node.children)) {
          // Note: cast should be Partial<>, but filled in when child node is traversed.
          const childChain = /** @type {LH.Audit.Details.SimpleCriticalRequestNode[string]} */ ({
            request: {},
          });
          chainMap.set(chainId, childChain);
          if (!chain.children) {
            chain.children = {};
          }
          chain.children[chainId] = childChain;
        }
      }
      chainMap.set(opts.id, chain);
    }

    CriticalRequestChains._traverse(tree, flatten);

    return flattendChains;
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @param {LH.Artifacts} artifacts The artifacts from the gather phase.
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;
    const chains = await ComputedChains.request({devtoolsLog, trace, URL}, context);
    let chainCount = 0;
    /**
     * @param {LH.Audit.Details.SimpleCriticalRequestNode} node
     * @param {number} depth
     */
    function walk(node, depth) {
      const childIds = Object.keys(node);

      childIds.forEach(id => {
        const child = node[id];
        if (child.children) {
          walk(child.children, depth + 1);
        } else {
          // if the node doesn't have a children field, then it is a leaf, so +1
          chainCount++;
        }
      }, '');
    }
    // Convert
    const flattenedChains = CriticalRequestChains.flattenRequests(chains);

    // Account for initial navigation
    const initialNavKey = Object.keys(flattenedChains)[0];
    const initialNavChildren = initialNavKey && flattenedChains[initialNavKey].children;
    if (initialNavChildren && Object.keys(initialNavChildren).length > 0) {
      walk(initialNavChildren, 0);
    }

    const longestChain = CriticalRequestChains._getLongestChain(chains);

    return {
      score: Number(chainCount === 0),
      notApplicable: chainCount === 0,
      displayValue: chainCount ? str_(UIStrings.displayValue, {itemCount: chainCount}) : '',
      details: {
        type: 'criticalrequestchain',
        chains: flattenedChains,
        longestChain,
      },
    };
  }
}

export default CriticalRequestChains;
export {UIStrings};
