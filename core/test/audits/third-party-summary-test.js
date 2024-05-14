/**
 * @license Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ThirdPartySummary from '../../audits/third-party-summary.js';
import {defaultSettings} from '../../config/constants.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const pwaDevtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const noThirdPartyTrace = readJson('../fixtures/traces/no-tracingstarted-m74.json', import.meta);

describe('Third party summary', () => {
  it('surface the discovered third parties', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
      traces: {defaultPass: pwaTrace},
      URL: getURLArtifactFromDevtoolsLog(pwaDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';
    const results = await ThirdPartySummary.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(1);
    expect(results.metricSavings).toEqual({TBT: 32.574000000000076});
    expect(results.displayValue).toBeDisplayString(
      'Third-party code blocked the main thread for 20 ms'
    );
    expect(results.details.items).toEqual([
      {
        entity: 'Google Tag Manager',
        mainThreadTime: 127.15300000000003,
        blockingTime: 18.186999999999998,
        tbtImpact: 28.40875949507274,
        transferSize: 30827,
        subItems: {
          items: [
            {
              blockingTime: 18.186999999999998,
              mainThreadTime: 127.15300000000003,
              tbtImpact: 28.40875949507274,
              transferSize: 30827,
              url: 'https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW',
            },
          ],
          type: 'subitems',
        },
      },
      {
        entity: 'Google Analytics',
        mainThreadTime: 95.15599999999999,
        tbtImpact: 4.1652405049273336,
        blockingTime: 0,
        transferSize: 20913,
        subItems: {
          items: [
            {
              blockingTime: 0,
              mainThreadTime: 55.246999999999986,
              tbtImpact: 4.1652405049273336,
              transferSize: 12906,
              url: 'https://www.google-analytics.com/analytics.js',
            },
            {
              blockingTime: 0,
              mainThreadTime: 5.094,
              tbtImpact: 0,
              transferSize: 3161,
              url: 'https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A',
            },
            {
              blockingTime: 0,
              mainThreadTime: 7.01,
              tbtImpact: 0,
              transferSize: 2949,
              url: 'https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw',
            },
            {
              blockingTime: 0,
              mainThreadTime: 27.805000000000007,
              tbtImpact: 0,
              transferSize: 1425,
              url: 'https://www.google-analytics.com/plugins/ua/linkid.js',
            },
            {
              blockingTime: 0,
              mainThreadTime: 0,
              tbtImpact: 0,
              transferSize: 472,
              url: 'https://www.google-analytics.com/r/collect?v=1&_v=j53&aip=1&a=749319045&t=pageview&_s=1&dl=https%3A%2F%2Fpwa.rocks%2F&ul=en-us&de=UTF-8&dt=A%20selection%20of%20Progressive%20Web%20Apps&sd=24-bit&sr=412x732&vp=412x732&je=0&_u=aGAAAAAjI~&jid=2098926753&gjid=1553792979&cid=601220267.1494017431&tid=UA-58419726-4&_gid=445409680.1494017431&_r=1&gtm=GTM-Q5SW&z=1395339825',
            },
          ],
          type: 'subitems',
        },
      },
    ]);
  });

  it('account for simulated throttling', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
      traces: {defaultPass: pwaTrace},
      URL: getURLArtifactFromDevtoolsLog(pwaDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartySummary.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.metricSavings).toEqual({TBT: 0});
    expect(results.details.items).toHaveLength(2);
    expect(Math.round(results.details.items[0].mainThreadTime)).toEqual(509);
    expect(Math.round(results.details.items[0].blockingTime)).toEqual(250);
    expect(Math.round(results.details.items[1].mainThreadTime)).toEqual(381);
    expect(Math.round(results.details.items[1].blockingTime)).toEqual(157);
  });

  it('be not applicable when no third parties are present', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog([{url: 'chrome://version'}])},
      traces: {defaultPass: noThirdPartyTrace},
      URL: {
        requestedUrl: 'chrome://version',
        mainDocumentUrl: 'chrome://version',
        finalDisplayedUrl: 'chrome://version',
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartySummary.audit(artifacts, {computedCache: new Map(), settings});

    expect(results).toEqual({
      score: 1,
      notApplicable: true,
      metricSavings: {TBT: 0},
    });
  });

  it('does not return third party entity that matches main resource entity', async () => {
    const externalArtifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com'},
          {url: 'http://photos-c.ak.fbcdn.net/photos-ak-sf2p/photo.jpg'},
          {url: 'https://pwa.rocks/'},
          {url: 'https://pwa.rocks/script.js'},
          {url: 'https://pwa.rocks/0ff789bf.js'},
          {url: 'https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A'},
          {url: 'https://www.google-analytics.com/analytics.js'},
          {url: 'https://www.google-analytics.com/plugins/ua/linkid.js'},
        ]),
      },
      traces: {defaultPass: pwaTrace},
      GatherContext: {gatherMode: 'navigation'},
      URL: {
        requestedUrl: 'http://example.com',
        mainDocumentUrl: 'http://example.com',
        finalDisplayedUrl: 'http://example.com',
      },
    };
    const facebookArtifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://facebook.com'},
          {url: 'http://photos-c.ak.fbcdn.net/photos-ak-sf2p/photo.jpg'},
          {url: 'https://pwa.rocks/'},
          {url: 'https://pwa.rocks/script.js'},
          {url: 'https://pwa.rocks/0ff789bf.js'},
          {url: 'https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw'},
          {url: 'https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A'},
          {url: 'https://www.google-analytics.com/analytics.js'},
          {url: 'https://www.google-analytics.com/plugins/ua/linkid.js'},
        ]),
      },
      traces: {defaultPass: pwaTrace},
      GatherContext: {gatherMode: 'navigation'},
      URL: {
        requestedUrl: 'http://facebook.com',
        mainDocumentUrl: 'http://facebook.com',
        finalDisplayedUrl: 'http://facebook.com',
      },
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';
    const context = {computedCache: new Map(), settings};

    const resultsOnExternal = await ThirdPartySummary.audit(externalArtifacts, context);
    const resultsOnFacebook = await ThirdPartySummary.audit(facebookArtifacts, context);

    const externalEntities = resultsOnExternal.details.items.map(item => item.entity);
    const facebookEntities = resultsOnFacebook.details.items.map(item => item.entity);

    expect(externalEntities).toEqual([
      'Google Tag Manager', 'Facebook', 'pwa.rocks', 'Google Analytics']);
    expect(facebookEntities).toEqual(['Google Tag Manager', 'pwa.rocks', 'Google Analytics']);
  });
});
