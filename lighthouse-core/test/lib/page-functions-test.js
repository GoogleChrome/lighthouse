/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const jsdom = require('jsdom');
const DOM = require('../../report/html/renderer/dom.js');
const pageFunctions = require('../../lib/page-functions.js');

/* eslint-env jest */

describe('Page Functions', () => {
  let dom;

  beforeAll(() => {
    const {document, ShadowRoot} = new jsdom.JSDOM().window;
    global.ShadowRoot = ShadowRoot;
    dom = new DOM(document);
  });

  afterAll(() => {
    global.ShadowRoot = undefined;
  });

  describe('get outer HTML snippets', () => {
    it('gets full HTML snippet', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {id: '1', style: 'style'})), '<div id="1" style="style">');
    });

    it('removes a specific attribute', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {id: '1', style: 'style'}), ['style']), '<div id="1">');
    });

    it('removes multiple attributes', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {'id': '1', 'style': 'style', 'aria-label': 'label'}),
        ['style', 'aria-label']
      ), '<div id="1">');
    });

    it('should handle dom nodes that cannot be cloned', () => {
      const element = dom.createElement('div');
      element.cloneNode = () => {
        throw new Error('oops!');
      };
      assert.equal(pageFunctions.getOuterHTMLSnippet(element), '<div>');
    });
    it('ignores when attribute not found', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {'id': '1', 'style': 'style', 'aria-label': 'label'}),
        ['style-missing', 'aria-label-missing']
      ), '<div id="1" style="style" aria-label="label">');
    });

    it('works if attribute values contain line breaks', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {style: 'style1\nstyle2'})), '<div style="style1\nstyle2">');
    });
  });

  describe('getNodeSelector', () => {
    it('Uses IDs where available and otherwise falls back to classes', () => {
      const parentEl = dom.createElement('div', '', {id: 'wrapper', class: 'dont-use-this'});
      const childEl = dom.createElement('div', '', {class: 'child'});
      parentEl.appendChild(childEl);
      assert.equal(pageFunctions.getNodeSelector(childEl), 'div#wrapper > div.child');
    });
  });

  describe('getNodeLabel', () => {
    it('Returns innerText if element has visible text', () => {
      const el = dom.createElement('div');
      el.innerText = 'Hello';
      assert.equal(pageFunctions.getNodeLabel(el), 'Hello');
    });

    it('Falls back to children and alt/aria-label if a title can\'t be determined', () => {
      const el = dom.createElement('div');
      const childEl = dom.createElement('div', '', {'aria-label': 'Something'});
      el.appendChild(childEl);
      assert.equal(pageFunctions.getNodeLabel(el), 'Something');
    });

    it('Truncates long text', () => {
      const el = dom.createElement('div');
      el.setAttribute('alt', Array(100).fill('a').join(''));
      assert.equal(pageFunctions.getNodeLabel(el).length, 80);
    });

    it('Uses tag name for html tags', () => {
      const el = dom.createElement('html');
      assert.equal(pageFunctions.getNodeLabel(el), 'html');
    });

    it('Uses tag name if there is no better label', () => {
      const el = dom.createElement('div');
      const childEl = dom.createElement('span');
      el.appendChild(childEl);
      assert.equal(pageFunctions.getNodeLabel(el), 'div');
    });
  });
});
