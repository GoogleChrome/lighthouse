/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const pkg = require('../../package.json');
const assert = require('assert').strict;
const lighthouse = require('../index.js');

describe('Module Tests', function() {
  it('should have a main attribute defined in the package.json', function() {
    assert.ok(pkg.main);
  });

  it('should be able to require in the package.json\'s main file', function() {
    assert.ok(lighthouse);
  });

  it('should require lighthouse as a function', function() {
    assert.ok(typeof lighthouse === 'function');
  });

  it('should throw an error when the first parameter is not defined', function() {
    return lighthouse()
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is an empty string', function() {
    return lighthouse('')
      .then(() => {
        throw new Error('Should not have resolved when first arg is an empty string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the first parameter is not a string', function() {
    return lighthouse({})
      .then(() => {
        throw new Error('Should not have resolved when first arg is not a string');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the second parameter is not an object', function() {
    return lighthouse('chrome://version', 'flags')
      .then(() => {
        throw new Error('Should not have resolved when second arg is not an object');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the config is invalid', function() {
    return lighthouse('chrome://version', {}, {})
      .then(() => {
        throw new Error('Should not have resolved when second arg is not an object');
      }, err => {
        assert.ok(err);
      });
  });

  it('should throw an error when the config contains incorrect audits', function() {
    return lighthouse('chrome://version', {}, {
      passes: [{
        gatherers: [
          'script-elements',
        ],
      }],
      audits: [
        'fluff',
      ],
    })
      .then(() => {
        throw new Error('Should not have resolved');
      }, err => {
        assert.ok(err.message.includes('fluff'));
      });
  });

  it('should throw an error when the url is invalid', async () => {
    expect.hasAssertions();
    try {
      await lighthouse('i-am-not-valid', {}, {});
    } catch (err) {
      expect(err.friendlyMessage)
          .toBeDisplayString('The URL you have provided appears to be invalid.');
      expect(err.code).toEqual('INVALID_URL');
    }
  });

  it('should throw an error when the url is invalid protocol (file:///)', async () => {
    expect.hasAssertions();
    try {
      await lighthouse('file:///a/fake/index.html', {}, {});
    } catch (err) {
      expect(err.friendlyMessage)
          .toBeDisplayString('The URL you have provided appears to be invalid.');
      expect(err.code).toEqual('INVALID_URL');
    }
  });

  it('should return formatted LHR when given no categories', function() {
    const exampleUrl = 'https://www.reddit.com/r/nba';
    return lighthouse(exampleUrl, {
      output: 'html',
    }, {
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'viewport',
      ],
    }).then(results => {
      assert.ok(/<html/.test(results.report), 'did not create html report');
      assert.ok(results.artifacts.ViewportDimensions, 'did not set artifacts');
      assert.ok(results.lhr.lighthouseVersion);
      assert.ok(results.lhr.fetchTime);
      assert.equal(results.lhr.finalUrl, exampleUrl);
      assert.equal(results.lhr.requestedUrl, exampleUrl);
      assert.equal(Object.values(results.lhr.categories).length, 0);
      assert.ok(results.lhr.audits.viewport);
      assert.strictEqual(results.lhr.audits.viewport.score, 0);
      assert.ok(results.lhr.audits.viewport.explanation);
      assert.ok(results.lhr.timing);
      assert.ok(results.lhr.timing.entries.length > 3, 'timing entries not populated');
    });
  });

  it('should specify the channel as node by default', async function() {
    const exampleUrl = 'https://www.reddit.com/r/nba';
    const results = await lighthouse(exampleUrl, {}, {
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [],
    });
    assert.equal(results.lhr.configSettings.channel, 'node');
  });

  it('lets consumers pass in a custom channel', async function() {
    const exampleUrl = 'https://www.reddit.com/r/nba';
    const results = await lighthouse(exampleUrl, {}, {
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
        channel: 'custom',
      },
      audits: [],
    });
    assert.equal(results.lhr.configSettings.channel, 'custom');
  });

  it('should return a list of audits', function() {
    assert.ok(Array.isArray(lighthouse.getAuditList()));
  });

  it('should return a list of trace categories required by the driver', function() {
    const lighthouseTraceCategories = lighthouse.traceCategories;
    assert.ok(Array.isArray(lighthouseTraceCategories));
    assert.notEqual(lighthouseTraceCategories.length, 0);
  });
});
