/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import jsdom from 'jsdom';

import {I18nFormatter} from '../../renderer/i18n-formatter.js';
import {DOM} from '../../renderer/dom.js';
import {DetailsRenderer} from '../../renderer/details-renderer.js';
import {CriticalRequestChainRenderer} from '../../renderer/crc-details-renderer.js';
import {Globals} from '../../renderer/report-globals.js';

const superLongURL =
    'https://example.com/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWeWantToTest.js';
const DETAILS = {
  type: 'criticalrequestchain',
  chains: {
    0: {
      request: {
        endTime: 1,
        responseReceivedTime: 5,
        startTime: 0,
        url: 'https://example.com/',
        transferSize: 1000,
      },
      children: {
        1: {
          request: {
            endTime: 16,
            responseReceivedTime: 14,
            startTime: 11,
            url: 'https://example.com/b.js',
            transferSize: 2000,
          },
          children: {},
        },
        2: {
          request: {
            endTime: 17.123456789,
            responseReceivedTime: 15,
            startTime: 12,
            url: superLongURL,
            transferSize: 3000,
          },
          children: {},
        },
        3: {
          request: {
            endTime: 18,
            responseReceivedTime: 16,
            startTime: 13,
            url: 'about:blank',
            transferSize: 4000,
          },
          children: {},
        },
      },
    },
  },
  longestChain: {
    duration: 7000,
    length: 2,
    transferSize: 1,
  },
};

describe('DetailsRenderer', () => {
  let dom;
  let detailsRenderer;

  before(() => {
    Globals.apply({
      providedStrings: {},
      i18n: new I18nFormatter('en'),
      reportJson: null,
    });

    const {document} = new jsdom.JSDOM().window;
    dom = new DOM(document);
    detailsRenderer = new DetailsRenderer(dom);
  });

  after(() => {
    Globals.i18n = undefined;
  });

  it('renders tree structure', () => {
    const el = CriticalRequestChainRenderer.render(dom, DETAILS, detailsRenderer);
    const chains = el.querySelectorAll('.lh-crc-node');

    // Main request
    assert.equal(chains.length, 4, 'generates correct number of chain nodes');
    assert.ok(!chains[0].querySelector('.lh-text__url-host'), 'should be no origin for root url');
    assert.equal(chains[0].querySelector('.lh-text__url a').textContent, 'https://example.com');
    assert.equal(chains[0].querySelector('.lh-text__url a').href, 'https://example.com/');
    assert.equal(chains[0].querySelector('.lh-text__url a').rel, 'noopener');
    assert.equal(chains[0].querySelector('.lh-text__url a').target, '_blank');

    // Children
    assert.ok(chains[1].querySelector('.lh-crc-node__tree-marker .lh-vert-right'));
    assert.equal(chains[1].querySelectorAll('.lh-crc-node__tree-marker .lh-right').length, 2);
    assert.equal(chains[1].querySelector('.lh-text__url a').textContent, '/b.js');
    assert.equal(chains[1].querySelector('.lh-text__url a').href, 'https://example.com/b.js');
    assert.equal(chains[1].querySelector('.lh-text__url a').rel, 'noopener');
    assert.equal(chains[1].querySelector('.lh-text__url a').target, '_blank');
    assert.equal(chains[1].querySelector('.lh-text__url-host').textContent, '(example.com)');
    const durationNodes = chains[1].querySelectorAll('.lh-crc-node__chain-duration');
    assert.equal(durationNodes[0].textContent, ' - 5,000\xa0ms, ');
    // Note: actual transferSize is 2000 bytes but formatter formats to KiBs.
    assert.equal(durationNodes[1].textContent, '1.95\xa0KiB');
  });
});
