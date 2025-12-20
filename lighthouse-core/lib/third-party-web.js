/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const thirdPartyWeb = require('third-party-web/httparchive-nostats-subset');

/** @typedef {import("third-party-web").IEntity} ThirdPartyEntity */

/**
 * `third-party-web` throws when the passed in string doesn't appear to have any domain whatsoever.
 * We pass in some not-so-url-like things, so make the dependent-code simpler by making this call safe.
 * @param {string} url
 * @return {ThirdPartyEntity|undefined}
 */
function getEntity(url) {
  try {
    return thirdPartyWeb.getEntity(url);
  } catch (_) {
    return undefined;
  }
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

module.exports = {
  getEntity,
  isThirdParty,
  isFirstParty,
};
