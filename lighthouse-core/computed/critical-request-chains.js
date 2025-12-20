/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkRequest = require('../lib/network-request.js');
const NetworkRecords = require('./network-records.js');
const MainResource = require('./main-resource.js');

class CriticalRequestChains {
  /**
   * For now, we use network priorities as a proxy for "render-blocking"/critical-ness.
   * It's imperfect, but there is not a higher-fidelity signal available yet.
   * @see https://docs.google.com/document/d/1bCDuq9H1ih9iNjgzyAL0gpwNFiEP4TZS-YLRp_RuMlc
   * @param {LH.Artifacts.NetworkRequest} request
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @return {boolean}
   */
  static isCritical(request, mainResource) {
    if (!mainResource) {
      throw new Error('mainResource not provided');
    }

    // Treat any preloaded resource as non-critical
    if (request.isLinkPreload) {
      return false;
    }

    // Whenever a request is a redirect, we don't know if it's critical until we resolve the final
    // destination. At that point we can assign all the properties (priority, resourceType) of the
    // final request back to the redirect(s) that led to it.
    // See https://github.com/GoogleChrome/lighthouse/pull/6704
    while (request.redirectDestination) {
      request = request.redirectDestination;
    }

    // Iframes are considered High Priority but they are not render blocking
    const isIframe = request.resourceType === NetworkRequest.TYPES.Document
      && request.frameId !== mainResource.frameId;
    // XHRs are fetched at High priority, but we exclude them, as they are unlikely to be critical
    // Images are also non-critical.
    // Treat any missed images, primarily favicons, as non-critical resources
    /** @type {Array<LH.Crdp.Network.ResourceType>} */
    const nonCriticalResourceTypes = [
      NetworkRequest.TYPES.Image,
      NetworkRequest.TYPES.XHR,
      NetworkRequest.TYPES.Fetch,
      NetworkRequest.TYPES.EventSource,
    ];
    if (nonCriticalResourceTypes.includes(request.resourceType || 'Other') ||
        isIframe ||
        request.mimeType && request.mimeType.startsWith('image/')) {
      return false;
    }

    return ['VeryHigh', 'High', 'Medium'].includes(request.priority);
  }

  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {LH.Artifacts.NetworkRequest} mainResource
   * @return {LH.Artifacts.CriticalRequestNode}
   */
  static extractChain(networkRecords, mainResource) {
    networkRecords = networkRecords.filter(req => req.finished);

    // Build a map of requestID -> Node.
    /** @type {Map<string, LH.Artifacts.NetworkRequest>} */
    const requestIdToRequests = new Map();
    for (const request of networkRecords) {
      requestIdToRequests.set(request.requestId, request);
    }

    // Get all the critical requests.
    /** @type {Array<LH.Artifacts.NetworkRequest>} */
    const criticalRequests = networkRecords.filter(request =>
      CriticalRequestChains.isCritical(request, mainResource));

    // Create a tree of critical requests.
    /** @type {LH.Artifacts.CriticalRequestNode} */
    const criticalRequestChains = {};
    for (const request of criticalRequests) {
      // Work back from this request up to the root. If by some weird quirk we are giving request D
      // here, which has ancestors C, B and A (where A is the root), we will build array [C, B, A]
      // during this phase.
      /** @type {Array<string>} */
      const ancestors = [];
      let ancestorRequest = request.initiatorRequest;
      /** @type {LH.Artifacts.CriticalRequestNode|undefined} */
      let node = criticalRequestChains;
      while (ancestorRequest) {
        const ancestorIsCritical = CriticalRequestChains.isCritical(ancestorRequest, mainResource);

        // If the parent request isn't a high priority request it won't be in the
        // requestIdToRequests map, and so we can break the chain here. We should also
        // break it if we've seen this request before because this is some kind of circular
        // reference, and that's bad.
        if (!ancestorIsCritical || ancestors.includes(ancestorRequest.requestId)) {
          // Set the ancestors to an empty array and unset node so that we don't add
          // the request in to the tree.
          ancestors.length = 0;
          node = undefined;
          break;
        }
        ancestors.push(ancestorRequest.requestId);
        ancestorRequest = ancestorRequest.initiatorRequest;
      }

      // With the above array we can work from back to front, i.e. A, B, C, and during this process
      // we can build out the tree for any nodes that have yet to be created.
      let ancestor = ancestors.pop();
      while (ancestor && node) {
        const parentRequest = requestIdToRequests.get(ancestor);
        if (!parentRequest) {
          throw new Error(`request with id ${ancestor} not found.`);
        }

        const parentRequestId = parentRequest.requestId;
        if (!node[parentRequestId]) {
          node[parentRequestId] = {
            request: parentRequest,
            children: {},
          };
        }

        // Step to the next iteration.
        ancestor = ancestors.pop();
        node = node[parentRequestId].children;
      }

      if (!node) {
        continue;
      }

      // If the node already exists, bail.
      if (node[request.requestId]) {
        continue;
      }

      // node should now point to the immediate parent for this request.
      node[request.requestId] = {
        request,
        children: {},
      };
    }

    return criticalRequestChains;
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.CriticalRequestNode>}
   */
  static async compute_(data, context) {
    const [networkRecords, mainResource] = await Promise.all([
      NetworkRecords.request(data.devtoolsLog, context),
      MainResource.request(data, context),
    ]);

    return CriticalRequestChains.extractChain(networkRecords, mainResource);
  }
}

module.exports = makeComputedArtifact(CriticalRequestChains);
