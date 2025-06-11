/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import jsdom from 'jsdom';

import {pageFunctions} from '../../lib/page-functions.js';

/* global document */

describe('Page Functions', () => {
  const url = 'http://www.example.com';

  before(async () => {
    const {document, ShadowRoot, Node, HTMLElement} = new jsdom.JSDOM('', {url}).window;
    global.ShadowRoot = ShadowRoot;
    global.Node = Node;
    global.HTMLElement = HTMLElement;
    global.document = document;
    global.window = {
      HTMLElement, // for getBoundingClientRect fallback.
    };
  });

  after(() => {
    global.ShadowRoot = undefined;
    global.Node = undefined;
    global.window = undefined;
    global.document = undefined;
  });

  describe('wrapRuntimeEvalErrorInBrowser()', () => {
    it('returns an error summary object of a regular Error', () => {
      const testMsg = 'custom test error';
      const err = new TypeError(testMsg); // TypeError to ensure `name` is copied over.

      const wrapped = pageFunctions.wrapRuntimeEvalErrorInBrowser(err);
      expect(wrapped).toEqual({
        __failedInBrowser: true,
        name: 'TypeError',
        message: testMsg,
        stack: expect.stringMatching(/^TypeError:.*page-functions-test\.js:\d+:\d+/s),
      });
    });

    it('creates an error summary object from a string error message', () => {
      const errMsg = 'just a string error';

      const wrapped = pageFunctions.wrapRuntimeEvalErrorInBrowser(errMsg);
      expect(wrapped).toEqual({
        __failedInBrowser: true,
        name: 'Error',
        message: errMsg,
        // eslint-disable-next-line max-len
        stack: expect.stringMatching(/^Error:.*wrapRuntimeEvalErrorInBrowser.*page-functions\.js:\d+:\d+/s),
      });
    });

    it('creates the best error summary it can when passed nothing', () => {
      const wrapped = pageFunctions.wrapRuntimeEvalErrorInBrowser();
      expect(wrapped).toEqual({
        __failedInBrowser: true,
        name: 'Error',
        message: 'unknown error',
        // eslint-disable-next-line max-len
        stack: expect.stringMatching(/^Error.*wrapRuntimeEvalErrorInBrowser.*page-functions\.js:\d+:\d+/s),
      });
    });
  });

  describe('get outer HTML snippets', () => {
    it('gets full HTML snippet', () => {
      const elem = document.createElement('div');
      elem.id = '1';
      elem.style = 'width: 1px;';
      assert.equal(pageFunctions.getOuterHTMLSnippet(elem), '<div id="1" style="width: 1px;">');
    });

    it('replaces img.src with img.currentSrc', () => {
      const el = document.createElement('img');
      el.id = '1';
      el.src = 'no';
      Object.defineProperty(el, 'currentSrc', {value: 'yes'});
      assert.equal(pageFunctions.getOuterHTMLSnippet(el), '<img id="1" src="yes">');
    });

    it('does not replace img.src with img.currentSrc if resolve to same URL', () => {
      const el = document.createElement('img');
      el.id = '1';
      el.src = './a.png';
      Object.defineProperty(el, 'currentSrc', {value: `${url}/a.png`});
      assert.equal(pageFunctions.getOuterHTMLSnippet(el), '<img id="1" src="./a.png">');
    });

    it('removes a specific attribute', () => {
      const elem = document.createElement('div');
      elem.id = '1';
      elem.style = 'width: 1px;';
      assert.equal(pageFunctions.getOuterHTMLSnippet(elem, ['style']), '<div id="1">');
    });

    it('removes multiple attributes', () => {
      const elem = document.createElement('div');
      elem.id = '1';
      elem.style = 'width: 1px;';
      elem.setAttribute('aria-label', 'label');
      assert.equal(
        pageFunctions.getOuterHTMLSnippet(elem, ['style', 'aria-label']),
        '<div id="1">');
    });

    it('should handle dom nodes that cannot be cloned', () => {
      const element = document.createElement('div');
      element.cloneNode = () => {
        throw new Error('oops!');
      };
      assert.equal(pageFunctions.getOuterHTMLSnippet(element), '<div>');
    });
    it('ignores when attribute not found', () => {
      const elem = document.createElement('div');
      elem.id = '1';
      elem.style = 'width: 1px;';
      elem.setAttribute('aria-label', 'label');
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        elem,
        ['style-missing', 'aria-label-missing']
      ), '<div id="1" style="width: 1px;" aria-label="label">');
    });

    it('works if attribute values contain line breaks', () => {
      const elem = document.createElement('div');
      elem.style = 'width: 1px;\nheight: 2px;';
      assert.equal(pageFunctions.getOuterHTMLSnippet(elem),
        '<div style="width: 1px; height: 2px;">');
    });

    it('truncates attribute values that are too long', () => {
      const elem = document.createElement('div');
      elem.className = 'a'.repeat(200);
      const truncatedExpectation = 'a'.repeat(74) + '…';
      assert.equal(
        pageFunctions.getOuterHTMLSnippet(elem),
        `<div class="${truncatedExpectation}">`);
    });

    it('removes attributes if the length of the attribute name + value is too long', () => {
      const longValue = 'a'.repeat(200);
      const truncatedValue = 'a'.repeat(74) + '…';
      const elem = document.createElement('div');
      elem.className = longValue;
      elem.id = longValue;
      elem.setAttribute('att1', 'shouldn\'t see this');
      elem.setAttribute('att2', 'shouldn\'t see this either');

      const snippet = pageFunctions.getOuterHTMLSnippet(elem, [], 150);
      assert.equal(snippet, `<div class="${truncatedValue}" id="${truncatedValue}" …>`
      );
    });
  });

  describe('getNodeSelector', () => {
    it('Uses IDs where available and otherwise falls back to classes', () => {
      const parentEl = document.createElement('div');
      parentEl.id = 'wrapper';
      parentEl.className = 'dont-use-this';
      const childEl = document.createElement('div');
      childEl.className = 'child';
      parentEl.append(childEl);
      assert.equal(pageFunctions.getNodeSelector(childEl), 'div#wrapper > div.child');
    });
  });

  describe('getNodeLabel', () => {
    it('Returns innerText if element has visible text', () => {
      const el = document.createElement('div');
      el.innerText = 'Hello';
      assert.equal(pageFunctions.getNodeLabel(el), 'Hello');
    });

    it('Falls back to children and alt/aria-label if a title can\'t be determined', () => {
      const el = document.createElement('div');
      const childEl = document.createElement('div');
      childEl.setAttribute('aria-label', 'Something');
      el.append(childEl);
      assert.equal(pageFunctions.getNodeLabel(el), 'Something');
    });

    it('Truncates long text', () => {
      const el = document.createElement('div');
      el.setAttribute('alt', Array(100).fill('a').join(''));
      assert.equal(pageFunctions.getNodeLabel(el).length, 80);
    });

    it('Truncates long text containing unicode surrogate pairs', () => {
      const el = document.createElement('div');
      // `getNodeLabel` truncates to 80 characters internally.
      // We want to test a unicode character on the boundary.
      el.innerText = Array(78).fill('a').join('') + '💡💡💡';
      assert.equal(pageFunctions.getNodeLabel(el), Array(78).fill('a').join('') + '💡…');
    });

    it('Returns null if there is no better label', () => {
      const el = document.createElement('div');
      const childEl = document.createElement('span');
      el.append(childEl);
      assert.equal(pageFunctions.getNodeLabel(el), null);
    });
  });

  describe('getNodePath', () => {
    it('returns basic node path', () => {
      const el = document.createElement('div');
      el.innerHTML = `
        <section>
          <span>Sup</span>
          <img src="#">
        </section>
      `;
      const img = el.querySelector('img');
      // The img is index 1 of section's children (excluding some whitespace only text nodes).
      assert.equal(pageFunctions.getNodePath(img), '0,SECTION,1,IMG');
    });

    it('returns node path through shadow root', () => {
      const el = document.createElement('div');
      const mainEl = document.createElement('main');
      el.append(mainEl);
      const shadowRoot = mainEl.attachShadow({mode: 'open'});
      const sectionEl = document.createElement('section');
      const img = document.createElement('img');
      img.src = '#';
      sectionEl.append(img);
      shadowRoot.append(sectionEl);

      assert.equal(pageFunctions.getNodePath(img), '0,MAIN,a,#document-fragment,0,SECTION,0,IMG');
    });
  });

  describe('getNodeDetails', () => {
    it('Returns selector as fallback if nodeLabel equals html tag name', () => {
      const el = document.createElement('div');
      el.id = 'parent';
      el.className = 'parent-el';
      const childEl = document.createElement('p');
      childEl.id = 'child';
      childEl.className = 'child-el';
      el.append(childEl);
      const {nodeLabel} = pageFunctions.getNodeDetails(el);
      assert.equal(nodeLabel, 'div#parent');
    });
  });
});
