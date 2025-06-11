/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NetworkRequest} from './network-request.js';

/**
 * @param {LH.Artifacts.Script} script
 * @return {boolean}
 */
function isInline(script) {
  return Boolean(script.startLine || script.startColumn);
}

/**
 * @param {LH.Artifacts.NetworkRequest[]} networkRecords
 * @param {LH.Artifacts.Script} script
 * @return {LH.Artifacts.NetworkRequest|undefined}
 */
function getRequestForScript(networkRecords, script) {
  let networkRequest = networkRecords.find(request => request.url === script.url);
  while (networkRequest?.redirectDestination) {
    networkRequest = networkRequest.redirectDestination;
  }
  return networkRequest;
}

/**
 * Estimates the number of bytes this network record would have consumed on the network based on the
 * uncompressed size (totalBytes). Uses the actual transfer size from the network record if applicable.
 *
 * @param {LH.Artifacts.NetworkRequest|undefined} networkRecord
 * @param {number} totalBytes Uncompressed size of the resource
 * @param {LH.Crdp.Network.ResourceType=} resourceType
 * @return {number}
 */
function estimateTransferSize(networkRecord, totalBytes, resourceType) {
  if (!networkRecord) {
    // We don't know how many bytes this asset used on the network, but we can guess it was
    // roughly the size of the content gzipped.
    // See https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer for specific CSS/Script examples
    // See https://discuss.httparchive.org/t/file-size-and-compression-savings/145 for fallback multipliers
    switch (resourceType) {
      case 'Stylesheet':
        // Stylesheets tend to compress extremely well.
        return Math.round(totalBytes * 0.2);
      case 'Script':
      case 'Document':
        // Scripts and HTML compress fairly well too.
        return Math.round(totalBytes * 0.33);
      default:
        // Otherwise we'll just fallback to the average savings in HTTPArchive
        return Math.round(totalBytes * 0.5);
    }
  } else if (networkRecord.resourceType === resourceType) {
    // This was a regular standalone asset, just use the transfer size.
    return networkRecord.transferSize || 0;
  } else {
    // This was an asset that was inlined in a different resource type (e.g. HTML document).
    // Use the compression ratio of the resource to estimate the total transferred bytes.
    const transferSize = networkRecord.transferSize || 0;
    const resourceSize = networkRecord.resourceSize || 0;
    // Get the compression ratio, if it's an invalid number, assume no compression.
    const compressionRatio = Number.isFinite(resourceSize) && resourceSize > 0 ?
      (transferSize / resourceSize) : 1;
    return Math.round(totalBytes * compressionRatio);
  }
}

/**
 * Estimates the number of bytes the content of this network record would have consumed on the network based on the
 * uncompressed size (totalBytes). Uses the actual transfer size from the network record if applicable,
 * minus the size of the response headers.
 *
 * This differs from `estimateTransferSize` only in that is subtracts the response headers from the estimate.
 *
 * @param {LH.Artifacts.NetworkRequest|undefined} networkRecord
 * @param {number} totalBytes Uncompressed size of the resource
 * @param {LH.Crdp.Network.ResourceType=} resourceType
 * @return {number}
 */
function estimateCompressedContentSize(networkRecord, totalBytes, resourceType) {
  if (!networkRecord) {
    // We don't know how many bytes this asset used on the network, but we can guess it was
    // roughly the size of the content gzipped.
    // See https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer for specific CSS/Script examples
    // See https://discuss.httparchive.org/t/file-size-and-compression-savings/145 for fallback multipliers
    switch (resourceType) {
      case 'Stylesheet':
        // Stylesheets tend to compress extremely well.
        return Math.round(totalBytes * 0.2);
      case 'Script':
      case 'Document':
        // Scripts and HTML compress fairly well too.
        return Math.round(totalBytes * 0.33);
      default:
        // Otherwise we'll just fallback to the average savings in HTTPArchive
        return Math.round(totalBytes * 0.5);
    }
  }

  // Get the size of the response body on the network.
  let contentTransferSize = networkRecord.transferSize || 0;
  if (!NetworkRequest.isContentEncoded(networkRecord)) {
    // This is not encoded, so we can use resourceSize directly.
    // This would be equivalent to transfer size minus headers transfer size, but transfer size
    // may also include bytes for SSL connection etc.
    contentTransferSize = networkRecord.resourceSize;
  } else if (networkRecord.responseHeadersTransferSize) {
    // Subtract the size of the encoded headers.
    contentTransferSize =
      Math.max(0, contentTransferSize - networkRecord.responseHeadersTransferSize);
  }

  if (networkRecord.resourceType === resourceType) {
    // This was a regular standalone asset, just use the transfer size.
    return contentTransferSize;
  } else {
    // This was an asset that was inlined in a different resource type (e.g. HTML document).
    // Use the compression ratio of the resource to estimate the total transferred bytes.
    const resourceSize = networkRecord.resourceSize || 0;
    // Get the compression ratio, if it's an invalid number, assume no compression.
    const compressionRatio = Number.isFinite(resourceSize) && resourceSize > 0 ?
      (contentTransferSize / resourceSize) : 1;
    return Math.round(totalBytes * compressionRatio);
  }
}

/**
 * Utility function to estimate the ratio of the compression on the resource.
 * This excludes the size of the response headers.
 * Also caches the calculation.
 * @param {Map<string, number>} compressionRatioByUrl
 * @param {string} url
 * @param {LH.Artifacts} artifacts
 * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
 */
function estimateCompressionRatioForContent(compressionRatioByUrl, url,
  artifacts, networkRecords) {
  let compressionRatio = compressionRatioByUrl.get(url);
  if (compressionRatio !== undefined) return compressionRatio;

  const script = artifacts.Scripts.find(script => script.url === url);

  if (!script) {
    // Can't find content, so just use 1.
    compressionRatio = 1;
  } else {
    const networkRecord = getRequestForScript(networkRecords, script);
    const contentLength = networkRecord?.resourceSize || script.length || 0;
    const compressedSize = estimateCompressedContentSize(networkRecord, contentLength, 'Script');
    compressionRatio = compressedSize / contentLength;
  }

  compressionRatioByUrl.set(url, compressionRatio);
  return compressionRatio;
}

export {
  getRequestForScript,
  isInline,
  estimateCompressedContentSize,
  estimateTransferSize,
  estimateCompressionRatioForContent,
};
