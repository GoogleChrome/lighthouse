/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from './lantern.js';
import {NetworkRequestTypes} from './lantern.js';

const NON_NETWORK_SCHEMES = [
  'blob', // @see https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
  'data', // @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
  'intent', // @see https://developer.chrome.com/docs/multidevice/android/intents/
  'file', // @see https://en.wikipedia.org/wiki/File_URI_scheme
  'filesystem', // @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystem
  'chrome-extension',
];

/**
 * Note: the `protocol` field from CDP can be 'h2', 'http', (not 'https'!) or it'll be url's scheme.
 *   https://source.chromium.org/chromium/chromium/src/+/main:content/browser/devtools/protocol/network_handler.cc;l=598-611;drc=56d4a9a9deb30be73adcee8737c73bcb2a5ab64f
 * However, a `new URL(href).protocol` has a colon suffix.
 *   https://url.spec.whatwg.org/#dom-url-protocol
 * A URL's `scheme` is specced as the `protocol` sans-colon, but isn't exposed on a URL object.
 * This method can take all 3 of these string types as a parameter.
 * @param {string} protocol Either a networkRequest's `protocol` per CDP or a `new URL(href).protocol`
 * @return {boolean}
 */
function isNonNetworkProtocol(protocol) {
  // Strip off any colon
  const urlScheme = protocol.includes(':') ? protocol.slice(0, protocol.indexOf(':')) : protocol;
  return NON_NETWORK_SCHEMES.includes(urlScheme);
}

/**
 * @template [T=any]
 * @extends {Lantern.BaseNode<T>}
 */
class NetworkNode extends Lantern.BaseNode {
  /**
   * @param {Lantern.NetworkRequest<T>} networkRequest
   */
  constructor(networkRequest) {
    super(networkRequest.requestId);
    /** @private */
    this._request = networkRequest;
  }

  get type() {
    return Lantern.BaseNode.TYPES.NETWORK;
  }

  /**
   * @return {number}
   */
  get startTime() {
    return this._request.rendererStartTime * 1000;
  }

  /**
   * @return {number}
   */
  get endTime() {
    return this._request.networkEndTime * 1000;
  }

  /**
   * @return {Readonly<T>}
   */
  get rawRequest() {
    return /** @type {Required<T>} */ (this._request.rawRequest);
  }

  /**
   * @return {Lantern.NetworkRequest<T>}
   */
  get request() {
    return this._request;
  }

  /**
   * @return {string}
   */
  get initiatorType() {
    return this._request.initiator && this._request.initiator.type;
  }

  /**
   * @return {boolean}
   */
  get fromDiskCache() {
    return !!this._request.fromDiskCache;
  }

  /**
   * @return {boolean}
   */
  get isNonNetworkProtocol() {
    // The 'protocol' field in devtools a string more like a `scheme`
    return isNonNetworkProtocol(this.request.protocol) ||
      // But `protocol` can fail to be populated if the request fails, so fallback to scheme.
      isNonNetworkProtocol(this.request.parsedURL.scheme);
  }

  /**
   * Returns whether this network request can be downloaded without a TCP connection.
   * During simulation we treat data coming in over a network connection separately from on-device data.
   * @return {boolean}
   */
  get isConnectionless() {
    return this.fromDiskCache || this.isNonNetworkProtocol;
  }

  /**
   * @return {boolean}
   */
  hasRenderBlockingPriority() {
    const priority = this._request.priority;
    const isScript = this._request.resourceType === NetworkRequestTypes.Script;
    const isDocument = this._request.resourceType === NetworkRequestTypes.Document;
    const isBlockingScript = priority === 'High' && isScript;
    const isBlockingHtmlImport = priority === 'High' && isDocument;
    return priority === 'VeryHigh' || isBlockingScript || isBlockingHtmlImport;
  }

  /**
   * @return {NetworkNode<T>}
   */
  cloneWithoutRelationships() {
    const node = new NetworkNode(this._request);
    node.setIsMainDocument(this._isMainDocument);
    return node;
  }
}

export {NetworkNode};
