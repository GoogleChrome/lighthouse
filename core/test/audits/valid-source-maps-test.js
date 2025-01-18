/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createScript, loadSourceMapFixture} from '../test-utils.js';
import ValidSourceMaps from '../../audits/valid-source-maps.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

const largeBundle = loadSourceMapFixture('coursehero-bundle-1');
const smallBundle = loadSourceMapFixture('coursehero-bundle-2');
const LARGE_JS_BYTE_THRESHOLD = 500 * 1024;

if (largeBundle.content.length < LARGE_JS_BYTE_THRESHOLD) {
  const error = {message: 'largeBundle is not large enough'};
  throw error;
}

if (smallBundle.content.length >= LARGE_JS_BYTE_THRESHOLD) {
  const error = {message: 'smallBundle is not small enough'};
  throw error;
}

describe('Valid source maps audit', () => {
  it('passes when no script elements or source maps are provided', async () => {
    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [],
      SourceMaps: [],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
        ]),
      },
    };
    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);
    expect(auditResult.score).toEqual(1);
  });

  it('passes when all large, first-party JS have corresponding source maps', async () => {
    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [
        {scriptId: '1', url: 'https://example.com/script1.min.js', content: largeBundle.content},
        {scriptId: '2', url: 'https://example.com/script2.min.js', content: largeBundle.content},
      ].map(createScript),
      SourceMaps: [
        {scriptId: '1', scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
        {scriptId: '2', scriptUrl: 'https://example.com/script2.min.js', map: largeBundle.map},
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
          {url: 'https://example.com/script1.min.js'},
          {url: 'https://example.com/script2.min.js'},
        ]),
      },
    };

    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);
    expect(auditResult.score).toEqual(1);
  });

  it('fails when any large, first-party JS has no corresponding source map', async () => {
    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [
        {scriptId: '1', url: 'https://example.com/script1.min.js', content: largeBundle.content},
        {scriptId: '2', url: 'https://example.com/script2.min.js', content: largeBundle.content},
      ].map(createScript),
      SourceMaps: [
        {scriptId: '1', scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
        //  Missing corresponding source map for large, first-party JS (script2.min.js)
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
          {url: 'https://example.com/script1.min.js'},
          {url: 'https://example.com/script2.min.js'},
        ]),
      },
    };

    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);
    expect(auditResult.details.items[0].subItems.items.length).toEqual(1);
    expect(auditResult.details.items[0].subItems.items[0].error).toBeDisplayString(
      'Large JavaScript file is missing a source map');
    expect(auditResult.score).toEqual(0);
  });

  it('passes when small, first-party JS have no corresponding source maps', async () => {
    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [
        {scriptId: '1', url: 'https://example.com/script1.min.js', content: largeBundle.content},
        {scriptId: '2', url: 'https://example.com/script2.min.js', content: smallBundle.content},
      ].map(createScript),
      SourceMaps: [
        {scriptId: '1', scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
        //  Missing corresponding source map for small, first-party JS (script2.min.js)
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
          {url: 'https://example.com/script1.min.js'},
          {url: 'https://example.com/script2.min.js'},
        ]),
      },
    };

    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);
    expect(auditResult.score).toEqual(1);
  });

  it('passes when large, third-party JS have no corresponding source maps', async () => {
    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [
        {scriptId: '1', url: 'https://example.com/script1.min.js', content: largeBundle.content},
        {scriptId: '2', url: 'https://d36mpcpuzc4ztk.cloudfront.net/script2.js', content: largeBundle.content},
      ].map(createScript),
      SourceMaps: [
        {scriptId: '1', scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
          {url: 'https://example.com/script1.min.js'},
          {url: 'https://d36mpcpuzc4ztk.cloudfront.net/script2.js'},
        ]),
      },
    };

    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);
    expect(auditResult.score).toEqual(1);
  });

  it('discovers missing source map contents while passing', async () => {
    const bundleNormal = loadSourceMapFixture('squoosh');
    const bundleWithMissingContent = loadSourceMapFixture('squoosh');
    delete bundleWithMissingContent.map.sourcesContent[0];

    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [
        {scriptId: '1', url: 'https://example.com/script1.min.js', content: bundleNormal.content},
        {scriptId: '2', url: 'https://example.com/script2.min.js', content: bundleWithMissingContent.content},
      ].map(createScript),
      SourceMaps: [
        {scriptId: '1', scriptUrl: 'https://example.com/script1.min.js', map: bundleNormal.map},
        {scriptId: '2', scriptUrl: 'https://example.com/script2.min.js', map: bundleWithMissingContent.map},
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
          {url: 'https://example.com/script1.min.js'},
          {url: 'https://example.com/script2.min.js'},
        ]),
      },
    };

    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);

    // The first result should warn there's a missing source map item
    expect(auditResult.details.items[0].subItems.items.length).toEqual(1);
    expect(auditResult.details.items[0].subItems.items[0].error).toBeDisplayString(
      'Warning: missing 1 item in `.sourcesContent`');

    // The second result should have no warnings
    expect(auditResult.details.items[1].subItems.items.length).toEqual(0);

    // The audit should pass because these warnings don't affect your score
    expect(auditResult.score).toEqual(1);
  });

  it('discovers missing source map contents while failing', async () => {
    const bundleWithMissingContent = loadSourceMapFixture('squoosh');
    delete bundleWithMissingContent.map.sourcesContent[0];

    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [
        {scriptId: '1', url: 'https://example.com/script1.min.js', content: bundleWithMissingContent.content},
        {scriptId: '2', url: 'https://example.com/script2.min.js', content: largeBundle.content},
      ].map(createScript),
      SourceMaps: [
        {scriptId: '1', scriptUrl: 'https://example.com/script1.min.js', map: bundleWithMissingContent.map},
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
          {url: 'https://example.com/script1.min.js'},
          {url: 'https://example.com/script2.min.js'},
        ]),
      },
    };

    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);

    // The first result should be the one that fails the audit
    expect(auditResult.details.items[0].subItems.items.length).toEqual(1);
    expect(auditResult.details.items[0].subItems.items[0].error).toBeDisplayString(
      'Large JavaScript file is missing a source map');

    // The second result should warn there's a missing source map item
    expect(auditResult.details.items[1].subItems.items.length).toEqual(1);
    expect(auditResult.details.items[1].subItems.items[0].error).toBeDisplayString(
      'Warning: missing 1 item in `.sourcesContent`');

    expect(auditResult.score).toEqual(0);
  });

  it('does not consider unrecognized third-party entities as first-party', async () => {
    const artifacts = {
      URL: {finalDisplayedUrl: 'https://example.com'},
      Scripts: [
        {scriptId: '1', url: 'https://example.com/script1.min.js', content: largeBundle.content},
        {scriptId: '2', url: 'https://foobarbaz.com/script2.min.js', content: largeBundle.content},
      ].map(createScript),
      SourceMaps: [
        {scriptId: '1', scriptUrl: 'https://example.com/script1.min.js', map: largeBundle.map},
        //  Missing corresponding source map for large, unrecognized third-party JS (script2.min.js)
      ],
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'https://example.com'},
          {url: 'https://example.com/script1.min.js'},
          {url: 'https://foobarbaz.com/script2.min.js'},
        ]),
      },
    };

    const context = {settings: {}, computedCache: new Map()};
    const auditResult = await ValidSourceMaps.audit(artifacts, context);
    expect(auditResult.details.items.length).toEqual(1);
    expect(auditResult.details.items[0].scriptUrl).toEqual('https://example.com/script1.min.js');
    expect(auditResult.details.items[0].subItems.items.length).toEqual(1);
    expect(auditResult.score).toEqual(1);
  });
});
