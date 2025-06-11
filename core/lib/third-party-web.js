/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import thirdPartyWebLib from 'third-party-web/nostats-subset.js';

let thirdPartyWeb = thirdPartyWebLib;

/**
 * For use by DevTools.
 *
 * @param {typeof import('third-party-web/nostats-subset.js')} providedThirdPartyWeb
 */
function provideThirdPartyWeb(providedThirdPartyWeb) {
  thirdPartyWeb = providedThirdPartyWeb;
}

/** @typedef {import("third-party-web").IEntity} ThirdPartyEntity */
/** @typedef {import("third-party-web").IProduct} ThirdPartyProduct */

/**
 * @param {string} url
 * @return {ThirdPartyEntity|undefined}
 */
function getEntity(url) {
  return thirdPartyWeb.getEntity(url);
}

/**
 * @param {string} url
 * @return {ThirdPartyProduct|undefined}
 */
function getProduct(url) {
  return thirdPartyWeb.getProduct(url);
}

/**
 * @param {string} url
 * @param {ThirdPartyEntity | undefined} mainDocumentEntity
 */
function isThirdParty(url, mainDocumentEntity) {
  const entity = getEntity(url);
  if (!entity) return false;
  if (entity === mainDocumentEntity) return false;
  return true;
}

/**
 * @param {string} url
 * @param {ThirdPartyEntity | undefined} mainDocumentEntity
 */
function isFirstParty(url, mainDocumentEntity) {
  return !isThirdParty(url, mainDocumentEntity);
}

export default {
  provideThirdPartyWeb,
  getEntity,
  getProduct,
  isThirdParty,
  isFirstParty,
};
