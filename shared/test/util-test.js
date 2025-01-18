/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {Util} from '../util.js';

describe('util helpers', () => {
  describe('getPseudoTld', () => {
    it('returns the correct tld', () => {
      assert.equal(Util.getPseudoTld('example.com'), '.com');
      assert.equal(Util.getPseudoTld('example.co.uk'), '.co.uk');
      assert.equal(Util.getPseudoTld('example.com.br'), '.com.br');
      assert.equal(Util.getPseudoTld('example.tokyo.jp'), '.jp');
    });
  });

  describe('getPseudoRootDomain', () => {
    it('returns the correct rootDomain from a string', () => {
      assert.equal(Util.getPseudoRootDomain('https://www.example.com/index.html'), 'example.com');
      assert.equal(Util.getPseudoRootDomain('https://example.com'), 'example.com');
      assert.equal(Util.getPseudoRootDomain('https://www.example.co.uk'), 'example.co.uk');
      assert.equal(Util.getPseudoRootDomain('https://example.com.br/app/'), 'example.com.br');
      assert.equal(Util.getPseudoRootDomain('https://example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getPseudoRootDomain('https://sub.example.com'), 'example.com');
      assert.equal(Util.getPseudoRootDomain('https://sub.example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getPseudoRootDomain('http://localhost'), 'localhost');
      assert.equal(Util.getPseudoRootDomain('http://localhost:8080'), 'localhost');
    });

    it('returns the correct rootDomain from an URL object', () => {
      assert.equal(Util.getPseudoRootDomain(new URL('https://www.example.com/index.html')), 'example.com');
      assert.equal(Util.getPseudoRootDomain(new URL('https://example.com')), 'example.com');
      assert.equal(Util.getPseudoRootDomain(new URL('https://www.example.co.uk')), 'example.co.uk');
      assert.equal(Util.getPseudoRootDomain(new URL('https://example.com.br/app/')), 'example.com.br');
      assert.equal(Util.getPseudoRootDomain(new URL('https://example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getPseudoRootDomain(new URL('https://sub.example.com')), 'example.com');
      assert.equal(Util.getPseudoRootDomain(new URL('https://sub.example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getPseudoRootDomain(new URL('http://localhost')), 'localhost');
      assert.equal(Util.getPseudoRootDomain(new URL('http://localhost:8080')), 'localhost');
    });
  });

  describe('#splitMarkdownCodeSpans', () => {
    it('handles strings with no backticks in them', () => {
      expect(Util.splitMarkdownCodeSpans('regular text')).toEqual([
        {isCode: false, text: 'regular text'},
      ]);
    });

    it('does not split on a single backtick', () => {
      expect(Util.splitMarkdownCodeSpans('regular `text')).toEqual([
        {isCode: false, text: 'regular `text'},
      ]);
    });

    it('splits on backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular `code` text')).toEqual([
        {isCode: false, text: 'regular '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' text'},
      ]);
    });

    it('splits on backticked code at the beginning of the string', () => {
      expect(Util.splitMarkdownCodeSpans('`start code` regular text')).toEqual([
        {isCode: true, text: 'start code'},
        {isCode: false, text: ' regular text'},
      ]);
    });

    it('splits on backticked code at the end of the string', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `end code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'end code'},
      ]);
    });

    it('does not split on a single backtick after split out backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `code` and more `text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' and more `text'},
      ]);
    });

    it('splits on two instances of backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `code` more text `and more code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' more text '},
        {isCode: true, text: 'and more code'},
      ]);
    });

    it('splits on two directly adjacent instances of backticked code', () => {
      // eslint-disable-next-line max-len
      expect(Util.splitMarkdownCodeSpans('regular text `first code``second code` end text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
        {isCode: false, text: ' end text'},
      ]);
    });

    it('handles text only within backticks', () => {
      expect(Util.splitMarkdownCodeSpans('`first code``second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
      ]);
    });

    it('splits on two instances of backticked code separated by only a space', () => {
      // eslint-disable-next-line max-len
      expect(Util.splitMarkdownCodeSpans('`first code` `second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: false, text: ' '},
        {isCode: true, text: 'second code'},
      ]);
    });
  });

  describe('#splitMarkdownLink', () => {
    it('handles strings with no links in them', () => {
      expect(Util.splitMarkdownLink('some text')).toEqual([
        {isLink: false, text: 'some text'},
      ]);
    });

    it('does not split on an incomplete markdown link', () => {
      expect(Util.splitMarkdownLink('some [not link text](text')).toEqual([
        {isLink: false, text: 'some [not link text](text'},
      ]);
    });

    it('splits on a markdown link', () => {
      expect(Util.splitMarkdownLink('some [link text](https://example.com) text')).toEqual([
        {isLink: false, text: 'some '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' text'},
      ]);
    });

    it('splits on an http markdown link', () => {
      expect(Util.splitMarkdownLink('you should [totally click here](http://never-mitm.com) now')).toEqual([
        {isLink: false, text: 'you should '},
        {isLink: true, text: 'totally click here', linkHref: 'http://never-mitm.com'},
        {isLink: false, text: ' now'},
      ]);
    });

    it('does not split on a non-http/https link', () => {
      expect(Util.splitMarkdownLink('some [link text](ftp://example.com) text')).toEqual([
        {isLink: false, text: 'some [link text](ftp://example.com) text'},
      ]);
    });

    it('does not split on a malformed markdown link', () => {
      expect(Util.splitMarkdownLink('some [link ]text](https://example.com')).toEqual([
        {isLink: false, text: 'some [link ]text](https://example.com'},
      ]);

      expect(Util.splitMarkdownLink('some [link text] (https://example.com')).toEqual([
        {isLink: false, text: 'some [link text] (https://example.com'},
      ]);
    });

    it('does not split on empty link text', () => {
      expect(Util.splitMarkdownLink('some [](https://example.com) empty link')).toEqual([
        {isLink: false, text: 'some [](https://example.com) empty link'},
      ]);
    });

    it('splits on a markdown link at the beginning of a string', () => {
      expect(Util.splitMarkdownLink('[link text](https://example.com) end text')).toEqual([
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' end text'},
      ]);
    });

    it('splits on a markdown link at the end of a string', () => {
      expect(Util.splitMarkdownLink('start text [link text](https://example.com)')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string consisting only of a markdown link', () => {
      expect(Util.splitMarkdownLink(`[I'm only a link](https://example.com)`)).toEqual([
        {isLink: true, text: `I'm only a link`, linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string starting and ending with a markdown link', () => {
      expect(Util.splitMarkdownLink('[first link](https://first.com) other text [second link](https://second.com)')).toEqual([
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: false, text: ' other text '},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
      ]);
    });

    it('handles a string with adjacent markdown links', () => {
      expect(Util.splitMarkdownLink('start text [first link](https://first.com)[second link](https://second.com) and scene')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
        {isLink: false, text: ' and scene'},
      ]);
    });
  });

  describe('truncate', () => {
    it('truncates based on visual characters', () => {
      expect(Util.truncate('aaa', 30)).toEqual('aaa');
      expect(Util.truncate('aaa', 3)).toEqual('aaa');
      expect(Util.truncate('aaa', 2)).toEqual('a…');
      expect(Util.truncate('aaa🥳', 4)).toEqual('aaa🥳');
      expect(Util.truncate('aaa🥳', 3)).toEqual('aa…');
      expect(Util.truncate('aaa👨‍👨‍👦‍👦', 4)).toEqual('aaa👨‍👨‍👦‍👦');
      expect(Util.truncate('aaa👨‍👨‍👦‍👦', 3)).toEqual('aa…');
      expect(Util.truncate('देवनागरी', 5)).toEqual('देवनागरी');
      expect(Util.truncate('देवनागरी', 4)).toEqual('देवना…');

      expect(Util.truncate('aaa', 3, '')).toEqual('aaa');
      expect(Util.truncate('aaa', 2, '')).toEqual('aa');

      expect(Util.truncate('aaaaa', 5, '...')).toEqual('aaaaa');
      expect(Util.truncate('aaaaa', 4, '...')).toEqual('a...');
      expect(Util.truncate('aaaaa', 3, '...')).toEqual('...');
      expect(Util.truncate('aaaaa', 1, '...')).toEqual('...');
    });
  });
});
