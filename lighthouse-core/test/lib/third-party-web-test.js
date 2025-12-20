/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const thirdPartyWeb = require('../../lib/third-party-web.js');

describe('third party web', () => {
  it('basic', () => {
    expect(thirdPartyWeb.isThirdParty('https://www.example.com', undefined)).toBe(false);
    expect(thirdPartyWeb.isFirstParty('https://www.example.com', undefined)).toBe(true);

    expect(thirdPartyWeb.isThirdParty('https://www.googletagmanager.com', undefined)).toBe(true);
    expect(thirdPartyWeb.isFirstParty('https://www.googletagmanager.com', undefined)).toBe(false);
  });

  it('not third party if main document is same entity', () => {
    const mainDocumentEntity = thirdPartyWeb.getEntity('https://www.googletagmanager.com');
    expect(thirdPartyWeb.isThirdParty('https://www.googletagmanager.com/a.js', mainDocumentEntity)).toBe(false);
    expect(thirdPartyWeb.isThirdParty('https://blah.atdmt.com', mainDocumentEntity)).toBe(true);
    expect(thirdPartyWeb.isThirdParty('https://www.example.com', mainDocumentEntity)).toBe(false);
  });
});
