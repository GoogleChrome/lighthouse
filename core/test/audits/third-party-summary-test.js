/**
 * @license Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ThirdPartySummary from '../../audits/third-party-summary.js';
import {defaultSettings} from '../../config/constants.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';

const trace = readJson('../fixtures/artifacts/cnn/defaultPass.trace.json.gz', import.meta);
const devtoolsLog = readJson('../fixtures/artifacts/cnn/defaultPass.devtoolslog.json.gz', import.meta);
const noThirdPartyTrace = readJson('../fixtures/artifacts/animation/trace.json.gz', import.meta);
const noThirdPartyDevtoolsLog = readJson('../fixtures/artifacts/animation/devtoolslog.json.gz', import.meta);

describe('Third party summary', () => {
  it('surface the discovered third parties', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: devtoolsLog},
      traces: {defaultPass: trace},
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';
    const results = await ThirdPartySummary.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.metricSavings).toEqual({TBT: 245});
    expect(results.displayValue).toBeDisplayString(
      'Third-party code blocked the main thread for 300 ms'
    );
    expect(results.details.items).toMatchSnapshot();
  });

  it('account for simulated throttling', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: devtoolsLog},
      traces: {defaultPass: trace},
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartySummary.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.metricSavings).toEqual({TBT: 2570});
    expect(results.details.items).toHaveLength(145);
    expect(Math.round(results.details.items[0].mainThreadTime)).toEqual(3520);
    expect(Math.round(results.details.items[0].blockingTime)).toEqual(1182);
    expect(Math.round(results.details.items[1].mainThreadTime)).toEqual(1392);
    expect(Math.round(results.details.items[1].blockingTime)).toEqual(508);
  });

  it('be not applicable when no third parties are present', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: noThirdPartyDevtoolsLog},
      traces: {defaultPass: noThirdPartyTrace},
      URL: {
        requestedUrl: 'http://localhost:65178/animation.html',
        mainDocumentUrl: 'http://localhost:65178/animation.html',
        finalDisplayedUrl: 'http://localhost:65178/animation.html',
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
      traces: {defaultPass: trace},
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
      traces: {defaultPass: trace},
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
      'Facebook', 'pwa.rocks', 'Google Tag Manager', 'Google Analytics']);
    expect(facebookEntities).toEqual(['pwa.rocks', 'Google Tag Manager', 'Google Analytics']);
  });
});
