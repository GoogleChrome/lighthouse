/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env browser */

import * as api from '../../index.js';
import {createTestState} from './pptr-test-utils.js';
import {LH_ROOT} from '../../../shared/root.js';

describe('Disconnect', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(120_000);

  const state = createTestState();

  state.installSetupAndTeardownHooks();

  before(() => {
    state.server.baseDir = `${LH_ROOT}/core/test/fixtures/user-flows/snapshot-basic`;
  });

  it('should reset the listeners/protocol when LH is done', async () => {
    const pageUrl = `${state.serverBaseUrl}/onclick.html`;
    await state.page.goto(pageUrl, {waitUntil: ['networkidle0']});

    const session = await state.page.target().createCDPSession();
    await session.send('Network.enable');

    const timespan = await api.startTimespan(state.page, {
      flags: {
        blockedUrlPatterns: ['*'],
      },
    });

    await state.page.evaluate(() => fetch(`/onclick.html`).catch(() => null));

    const result = await timespan.endTimespan();
    if (!result) throw new Error('Lighthouse failed to produce a result');

    const networkDetails = result.lhr.audits['network-requests'].details;
    if (!networkDetails || networkDetails.type !== 'table') throw new Error('Invalid details');
    const fetchRequest = networkDetails.items[0];
    expect(fetchRequest).toMatchObject({statusCode: -1}); // should be blocked

    /** @type {Array<*>} */
    const failedMessages = [];
    /** @type {Array<*>} */
    const debugMessages = [];
    /** @param {*} request */
    const failedListener = request => failedMessages.push(request);
    /** @param {*} request */
    const debugListener = request => debugMessages.push(request);
    session.on('Network.requestWillBeSent', debugListener);
    session.on('Network.responseReceived', debugListener);
    session.on('Network.loadingFinished', debugListener);
    session.on('Network.loadingFailed', failedListener);

    await state.page.evaluate(() => fetch(`/onclick.html`).catch(() => null));

    session.off('Network.requestWillBeSent', debugListener);
    session.off('Network.responseReceived', debugListener);
    session.off('Network.loadingFinished', debugListener);
    session.off('Network.loadingFailed', failedListener);

    expect(debugMessages.length).toBeGreaterThan(0); // make sure we observed the request
    expect(failedMessages).toHaveLength(0); // should NOT be blocked (driver disconnected)
  });
});
