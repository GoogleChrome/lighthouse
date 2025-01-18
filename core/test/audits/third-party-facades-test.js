/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ThirdPartyFacades from '../../audits/third-party-facades.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {createTestTrace} from '../create-test-trace.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';
import {defaultSettings} from '../../config/constants.js';

const pwaTrace = readJson('../fixtures/artifacts/progressive-app/trace.json', import.meta);
const pwaDevtoolsLog = readJson('../fixtures/artifacts/progressive-app/devtoolslog.json', import.meta);
const videoEmbedsTrace = readJson('../fixtures/artifacts/video-embed/trace.json.gz', import.meta);
const videoEmbedsDevtolsLog = readJson('../fixtures/artifacts/video-embed/devtoolslog.json.gz', import.meta);
const blockingWidgetTrace = readJson('../fixtures/artifacts/intercom-widget/trace.json.gz', import.meta);
const blockingWidgetDevtoolsLog = readJson('../fixtures/artifacts/intercom-widget/devtoolslog.json.gz', import.meta);
const noThirdPartyTrace = readJson('../fixtures/artifacts/animation/trace.json.gz', import.meta);
const noThirdPartyDevtoolsLog = readJson('../fixtures/artifacts/animation/devtoolslog.json.gz', import.meta);

function intercomProductUrl(id) {
  return `https://widget.intercom.io/widget/${id}`;
}

function intercomResourceUrl(id) {
  return `https://js.intercomcdn.com/frame-modern.${id}.js`;
}

function youtubeProductUrl(id) {
  return `https://www.youtube.com/embed/${id}`;
}

function youtubeResourceUrl(id) {
  return `https://i.ytimg.com/${id}/maxresdefault.jpg`;
}
describe('Third party facades audit', () => {
  it('correctly identifies a third party product with facade alternative', async () => {
    const networkRecords = [
      {transferSize: 2000, url: 'https://example.com', priority: 'High'},
      {transferSize: 4000, url: intercomProductUrl('1')},
      {transferSize: 8000, url: intercomResourceUrl('a')},
    ];
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog(networkRecords),
      },
      traces: {defaultPass: createTestTrace({
        timeOrigin: 0,
        largestContentfulPaint: 15,
        traceEnd: 2000,
        networkRecords,
      })},
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.metricSavings).toEqual({TBT: 0});
    expect(results.displayValue).toBeDisplayString('1 facade alternative available');
    expect(results.details.items[0].product)
      .toBeDisplayString('Intercom Widget (Customer Success)');
    expect(results.details.items).toMatchObject([
      {
        entity: 'Intercom',
        transferSize: 12000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://js.intercomcdn.com/frame-modern.a.js',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 8000,
            },
            {
              url: 'https://widget.intercom.io/widget/1',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 4000,
            },
          ],
        },
      },
    ]);
  });

  it('handles multiple products with facades', async () => {
    const networkRecords = [
      {transferSize: 2000, url: 'https://example.com', priority: 'High'},
      {transferSize: 4000, url: intercomProductUrl('1')},
      {transferSize: 3000, url: youtubeProductUrl('2')},
      {transferSize: 8000, url: intercomResourceUrl('a')},
      {transferSize: 7000, url: youtubeResourceUrl('b')},
    ];
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog(networkRecords),
      },
      traces: {defaultPass: createTestTrace({
        timeOrigin: 0,
        largestContentfulPaint: 15,
        traceEnd: 2000,
        networkRecords,
      })},
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.displayValue).toBeDisplayString('2 facade alternatives available');
    expect(results.details.items[0].product)
      .toBeDisplayString('Intercom Widget (Customer Success)');
    expect(results.details.items[1].product).toBeDisplayString('YouTube Embedded Player (Video)');
    expect(results.details.items).toMatchObject([
      {
        entity: 'Intercom',
        transferSize: 12000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://js.intercomcdn.com/frame-modern.a.js',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 8000,
            },
            {
              url: 'https://widget.intercom.io/widget/1',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 4000,
            },
          ],
        },
      },
      {
        entity: 'YouTube',
        transferSize: 10000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://i.ytimg.com/b/maxresdefault.jpg',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 7000,
            },
            {
              url: 'https://www.youtube.com/embed/2',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 3000,
            },
          ],
        },
      },
    ]);
  });

  it('handle multiple requests to same product resource', async () => {
    const networkRecords = [
      {transferSize: 2000, url: 'https://example.com', priority: 'High'},
      {transferSize: 2000, url: intercomProductUrl('1')},
      {transferSize: 8000, url: intercomResourceUrl('a')},
      {transferSize: 2000, url: intercomProductUrl('1')},
    ];
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog(networkRecords),
      },
      traces: {defaultPass: createTestTrace({
        timeOrigin: 0,
        largestContentfulPaint: 15,
        traceEnd: 2000,
        networkRecords,
      })},
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.displayValue).toBeDisplayString('1 facade alternative available');
    expect(results.details.items[0].product)
      .toBeDisplayString('Intercom Widget (Customer Success)');
    expect(results.details.items).toMatchObject([
      {
        entity: 'Intercom',
        transferSize: 12000,
        blockingTime: 0,
        subItems: {
          type: 'subitems',
          items: [
            {
              url: 'https://js.intercomcdn.com/frame-modern.a.js',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 8000,
            },
            {
              url: 'https://widget.intercom.io/widget/1',
              mainThreadTime: 0,
              blockingTime: 0,
              transferSize: 4000,
            },
          ],
        },
      },
    ]);
  });

  it('does not report first party resources', async () => {
    const networkRecords = [
      {transferSize: 2000, url: 'https://intercomcdn.com', priority: 'High'},
      {transferSize: 4000, url: intercomProductUrl('1')},
    ];
    const artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog(networkRecords),
      },
      traces: {defaultPass: createTestTrace({
        timeOrigin: 0,
        largestContentfulPaint: 15,
        traceEnd: 2000,
        networkRecords,
      })},
      URL: {
        requestedUrl: 'https://intercomcdn.com',
        mainDocumentUrl: 'https://intercomcdn.com',
        finalDisplayedUrl: 'https://intercomcdn.com',
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results).toEqual({
      score: 1,
      notApplicable: true,
      metricSavings: {TBT: 0},
    });
  });

  it('only reports resources which have facade alternatives', async () => {
    const artifacts = {
      // This devtools log has third party requests but none have facades
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
      traces: {defaultPass: pwaTrace},
      URL: getURLArtifactFromDevtoolsLog(pwaDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results).toEqual({
      score: 1,
      notApplicable: true,
      metricSavings: {TBT: 0},
    });
  });

  it('not applicable when no third party resources are present', async () => {
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
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results).toEqual({
      score: 1,
      notApplicable: true,
      metricSavings: {TBT: 0},
    });
  });

  it('handles real trace', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: videoEmbedsDevtolsLog},
      traces: {defaultPass: videoEmbedsTrace},
      URL: getURLArtifactFromDevtoolsLog(videoEmbedsDevtolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.metricSavings).toEqual({TBT: 0});
    expect(results.displayValue).toBeDisplayString('2 facade alternatives available');
    expect(results.details.items[0].product).toBeDisplayString('YouTube Embedded Player (Video)');
    expect(results.details.items[1].product).toBeDisplayString('Vimeo Embedded Player (Video)');
    expect(results.details.items).toMatchInlineSnapshot(`
Array [
  Object {
    "blockingTime": 0,
    "entity": "YouTube",
    "product": Object {
      "formattedDefault": "YouTube Embedded Player (Video)",
      "i18nId": "core/audits/third-party-facades.js | categoryVideo",
      "values": Object {
        "productName": "YouTube Embedded Player",
      },
    },
    "subItems": Object {
      "items": Array [
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 824806,
          "url": "https://www.youtube.com/s/player/4b63a6a1/player_ias.vflset/en_US/base.js",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 129402,
          "url": "https://i.ytimg.com/vi/t_rzYnXEQlE/maxresdefault.jpg",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 98747,
          "url": "https://www.youtube.com/s/player/4b63a6a1/www-embed-player.vflset/www-embed-player.js",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 48296,
          "url": "https://www.youtube.com/s/player/4b63a6a1/www-player.css",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0.384,
          "tbtImpact": 0,
          "transferSize": 40447,
          "url": "https://www.youtube.com/embed/t_rzYnXEQlE",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 22879,
          "url": Object {
            "formattedDefault": "Other resources",
            "i18nId": "core/lib/i18n/i18n.js | otherResourcesLabel",
            "values": undefined,
          },
        },
      ],
      "type": "subitems",
    },
    "transferSize": 1164577,
  },
  Object {
    "blockingTime": 0,
    "entity": "Vimeo",
    "product": Object {
      "formattedDefault": "Vimeo Embedded Player (Video)",
      "i18nId": "core/audits/third-party-facades.js | categoryVideo",
      "values": Object {
        "productName": "Vimeo Embedded Player",
      },
    },
    "subItems": Object {
      "items": Array [
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 143719,
          "url": "https://f.vimeocdn.com/p/4.33.11/js/player.module.js",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 104244,
          "url": "https://f.vimeocdn.com/p/4.33.11/js/vendor.module.js",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 22326,
          "url": "https://f.vimeocdn.com/p/4.33.11/css/player.css",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0.128,
          "tbtImpact": 0,
          "transferSize": 20465,
          "url": "https://player.vimeo.com/video/517294790?h=da863dae0d",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 6329,
          "url": "https://i.vimeocdn.com/video/1071113919-b94500e76071b48f12f379fb6fc9573b52eac89eac80438679f34564bb66cd6e-d?mw=1280&mh=720&q=70",
        },
        Object {
          "blockingTime": 0,
          "mainThreadTime": 0,
          "tbtImpact": 0,
          "transferSize": 4903,
          "url": Object {
            "formattedDefault": "Other resources",
            "i18nId": "core/lib/i18n/i18n.js | otherResourcesLabel",
            "values": undefined,
          },
        },
      ],
      "type": "subitems",
    },
    "transferSize": 301986,
  },
]
`);
  });

  it('handles real trace that blocks the main thread', async () => {
    const artifacts = {
      devtoolsLogs: {defaultPass: blockingWidgetDevtoolsLog},
      traces: {defaultPass: blockingWidgetTrace},
      URL: getURLArtifactFromDevtoolsLog(blockingWidgetDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    const results = await ThirdPartyFacades.audit(artifacts, {computedCache: new Map(), settings});

    expect(results.score).toBe(0);
    expect(results.metricSavings).toEqual({TBT: 145});
    expect(results.displayValue).toBeDisplayString('1 facade alternative available');
    expect(results.details.items[0].blockingTime).toBeCloseTo(145);
    expect(results.details.items[0].product)
      .toBeDisplayString('Intercom Widget (Customer Success)');
  });

  describe('.condenseItems', () => {
    it('basic case', () => {
      const items = [
        {url: 'd', transferSize: 500, blockingTime: 5},
        {url: 'b', transferSize: 1000, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 5},
        {url: 'e', transferSize: 500, blockingTime: 5},
        {url: 'a', transferSize: 5000, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'b', transferSize: 1000, blockingTime: 0},
        {url: {formattedDefault: 'Other resources'}, transferSize: 1500, blockingTime: 15},
      ]);
    });

    it('only shown top 5 items', () => {
      const items = [
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 5},
        {url: 'a', transferSize: 5000, blockingTime: 5},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: {formattedDefault: 'Other resources'}, transferSize: 10000, blockingTime: 10},
      ]);
    });

    it('hide condensed row if total transfer size <1KB', () => {
      const items = [
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'b', transferSize: 100, blockingTime: 0},
        {url: 'c', transferSize: 100, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
      ]);
    });

    it('always show at least one item', () => {
      const items = [
        {url: 'a', transferSize: 500, blockingTime: 0},
        {url: 'b', transferSize: 500, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 500, blockingTime: 0},
        {url: {formattedDefault: 'Other resources'}, transferSize: 1000, blockingTime: 0},
      ]);
    });

    it('single small item', () => {
      const items = [
        {url: 'a', transferSize: 500, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 500, blockingTime: 0},
      ]);
    });

    it('do not condense if only one item to condense', () => {
      const items = [
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 0},
      ];
      ThirdPartyFacades.condenseItems(items);
      expect(items).toMatchObject([
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'a', transferSize: 5000, blockingTime: 0},
        {url: 'c', transferSize: 500, blockingTime: 0},
      ]);
    });
  });
});
