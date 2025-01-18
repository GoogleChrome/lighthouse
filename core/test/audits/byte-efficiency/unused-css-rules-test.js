/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import UnusedCSSAudit from '../../../audits/byte-efficiency/unused-css-rules.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

describe('Best Practices: unused css rules audit', () => {
  function generate(content, length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(content);
    }
    return arr.join('');
  }

  describe('#audit', () => {
    const defaultNetworkRecords = [
      {
        url: 'file://a.css',
        transferSize: 100 * 1024,
        resourceSize: 100 * 1024,
        resourceType: 'Stylesheet',
      },
    ];

    const context = {computedCache: new Map()};

    function getArtifacts({rules, stylesheets, networkRecords = defaultNetworkRecords}) {
      return {
        devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
        URL: {finalDisplayedUrl: ''},
        CSSUsage: rules,
        Stylesheets: stylesheets,
      };
    }

    beforeEach(() => {
      context.computedCache.clear();
    });

    it('ignores missing stylesheets', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        rules: [{styleSheetId: 'a', used: false}], stylesheets: [],
      }), defaultNetworkRecords, context).then(result => {
        assert.equal(result.items.length, 0);
      });
    });

    it('ignores stylesheets that are 100% used', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        rules: [
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'a', used: true},
          {styleSheetId: 'b', used: true},
        ],
        stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}',
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: '.my.favorite.selector { rule: content; }',
          },
        ],
      }), defaultNetworkRecords, context).then(result => {
        assert.equal(result.items.length, 0);
      });
    });

    it('fails when lots of rules are unused', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        rules: [
          {styleSheetId: 'a', used: true, startOffset: 0, endOffset: 11}, // 44 * 25% = 11
          {styleSheetId: 'b', used: true, startOffset: 0, endOffset: 60000}, // 40000 * 3 * 50% = 60000
        ],
        stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: '.my.selector {color: #ccc;}\n a {color: #fff}',
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: `${generate('123', 40000)}`,
          },
          {
            header: {styleSheetId: 'c', sourceURL: ''},
            content: `${generate('123', 450)}`, // will be filtered out
          },
        ],
      }), defaultNetworkRecords, context).then(result => {
        assert.equal(result.items.length, 2);
        assert.equal(result.items[0].totalBytes, 100 * 1024);
        assert.equal(result.items[1].totalBytes, 40000 * 3 * 0.2);
        assert.equal(result.items[0].wastedPercent, 75);
        assert.equal(result.items[1].wastedPercent, 50);
      });
    });

    it('handles phantom network records without size data', async () => {
      const networkRecords = [
        {
          url: 'file://a.html',
          transferSize: 100 * 1024 * 0.5, // compression ratio of 0.5
          resourceSize: 100 * 1024,
          resourceType: 'Document', // this is a document so it'll use the compressionRatio but not the raw size
          responseHeaders: [{name: 'Content-Encoding', value: 'gzip'}],
        },
        {
          url: 'file://a.html',
          transferSize: 0,
          resourceSize: 0,
          resourceType: 'Document',
        },
      ];
      const artifacts = getArtifacts({
        rules: [
          {styleSheetId: 'a', used: true, startOffset: 0, endOffset: 60000}, // 40000 * 3 * 50% = 60000
        ],
        stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.html'},
            content: `${generate('123', 40000)}`, // stylesheet size of 40000 * 3 uncompressed bytes
          },
        ],
        networkRecords,
      });

      const result = await UnusedCSSAudit.audit_(artifacts, networkRecords, context);
      expect(result.items).toMatchObject([
        {totalBytes: 40000 * 3 * 0.5, wastedPercent: 50},
      ]);
    });

    it('does not include empty or small sheets', () => {
      return UnusedCSSAudit.audit_(getArtifacts({
        rules: [
          {styleSheetId: 'a', used: true, startOffset: 0, endOffset: 8000}, // 4000 * 3 / 2
          {styleSheetId: 'b', used: true, startOffset: 0, endOffset: 500}, // 500 * 3 / 3
        ],
        stylesheets: [
          {
            header: {styleSheetId: 'a', sourceURL: 'file://a.css'},
            content: `${generate('123', 4000)}`,
          },
          {
            header: {styleSheetId: 'b', sourceURL: 'file://b.css'},
            content: `${generate('123', 500)}`,
          },
          {
            header: {styleSheetId: 'c', sourceURL: 'file://c.css'},
            content: '@import url(http://googlefonts.com?myfont)',
          },
          {
            header: {styleSheetId: 'd', sourceURL: 'file://d.css'},
            content: '/* nothing to see here */',
          },
          {
            header: {styleSheetId: 'e', sourceURL: 'file://e.css'},
            content: '       ',
          },
        ],
      }), defaultNetworkRecords, context).then(result => {
        assert.equal(result.items.length, 1);
        assert.equal(Math.floor(result.items[0].wastedPercent), 33);
      });
    });
  });
});
