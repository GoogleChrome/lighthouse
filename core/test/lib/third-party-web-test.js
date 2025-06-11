/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import thirdPartyWeb from '../../lib/third-party-web.js';

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
    expect(thirdPartyWeb.isThirdParty('https://www.google-analytics.com', mainDocumentEntity)).toBe(true);
    expect(thirdPartyWeb.isThirdParty('https://www.example.com', mainDocumentEntity)).toBe(false);
  });
});
