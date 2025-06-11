/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import UrlUtils from '../../lib/url-utils.js';

const superLongName =
    'https://example.com/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWeWantToTest.js';

describe('UrlUtils', () => {
  it('handles URLs beginning with multiple digits', () => {
    // from https://github.com/GoogleChrome/lighthouse/issues/1186
    const url = 'http://5321212.fls.doubleclick.net/activityi;src=5321212;type=unvsn_un;cat=unvsn_uv;ord=7762287885264.98?';
    assert.doesNotThrow(_ => new URL(url));
  });

  it.skip('handles URLs with multiple dashes', () => {
    // from https://github.com/GoogleChrome/lighthouse/issues/1972
    const url = 'https://r15---sn-o097znl7.googlevideo.com/generate_204?conn2';
    assert.doesNotThrow(_ => new URL(url));
  });

  it('safely identifies valid URLs', () => {
    assert.ok(UrlUtils.isValid('https://5321212.fls.net/page?query=string#hash'));
    assert.ok(UrlUtils.isValid('https://localhost:8080/page?query=string#hash'));
    assert.ok(UrlUtils.isValid('https://google.co.uk/deep/page?query=string#hash'));
  });

  it('safely identifies invalid URLs', () => {
    assert.equal(UrlUtils.isValid(''), false);
    assert.equal(UrlUtils.isValid('eval(<context>):45:16'), false);
  });

  it('safely identifies allowed URL protocols', () => {
    assert.ok(UrlUtils.isProtocolAllowed('http://google.com/'));
    assert.ok(UrlUtils.isProtocolAllowed('https://google.com/'));
    assert.ok(UrlUtils.isProtocolAllowed('chrome://version'));
    assert.ok(UrlUtils.isProtocolAllowed('chrome-extension://blipmdconlkpinefehnmjammfjpmpbjk/popup.html'));
  });

  it('safely identifies disallowed URL protocols', () => {
    assert.equal(UrlUtils.isProtocolAllowed('file:///i/am/a/fake/file.html'), false);
    assert.equal(UrlUtils.isProtocolAllowed('ftp://user:password@private.ftp.example.com/index.html'), false);
    assert.equal(UrlUtils.isProtocolAllowed('gopher://underground:9090/path'), false);
  });

  it('safely identifies same hosts', () => {
    const urlA = 'https://5321212.fls.net/page?query=string#hash';
    const urlB = 'http://5321212.fls.net/deeply/nested/page';
    assert.ok(UrlUtils.hostsMatch(urlA, urlB));
  });

  it('safely identifies different hosts', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'http://google.co.uk/deeply/nested/page';
    assert.equal(UrlUtils.hostsMatch(urlA, urlB), false);
  });

  it('safely identifies invalid hosts', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'anonymous:45';
    assert.equal(UrlUtils.hostsMatch(urlA, urlB), false);
  });

  it('safely identifies same origins', () => {
    const urlA = 'https://5321212.fls.net/page?query=string#hash';
    const urlB = 'https://5321212.fls.net/deeply/nested/page';
    assert.ok(UrlUtils.originsMatch(urlA, urlB));
  });

  it('safely identifies different origins', () => {
    const urlA = 'https://5321212.fls.net/page?query=string#hash';
    const urlB = 'http://5321212.fls.net/deeply/nested/page';
    assert.equal(UrlUtils.originsMatch(urlA, urlB), false);
  });

  it('safely identifies different invalid origins', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'anonymous:90';
    assert.equal(UrlUtils.originsMatch(urlA, urlB), false);
  });

  it('safely gets valid origins', () => {
    const urlA = 'https://google.com/page?query=string#hash';
    const urlB = 'https://5321212.fls.net/page?query=string#hash';
    const urlC = 'http://example.com/deeply/nested/page';
    assert.equal(UrlUtils.getOrigin(urlA), 'https://google.com');
    assert.equal(UrlUtils.getOrigin(urlB), 'https://5321212.fls.net');
    assert.equal(UrlUtils.getOrigin(urlC), 'http://example.com');
  });

  it('safely gets URLs with no origin', () => {
    const urlA = 'data:image/jpeg;base64,foobar';
    const urlB = 'anonymous:90';
    const urlC = '!!garbage';
    const urlD = 'file:///opt/lighthouse/index.js';
    assert.equal(UrlUtils.getOrigin(urlA), null);
    assert.equal(UrlUtils.getOrigin(urlB), null);
    assert.equal(UrlUtils.getOrigin(urlC), null);
    assert.equal(UrlUtils.getOrigin(urlD), null);
  });

  describe('rootDomainsMatch', () => {
    it('matches a subdomain and a root domain', () => {
      const urlA = 'http://example.com/js/test.js';
      const urlB = 'http://example.com/';
      const urlC = 'http://sub.example.com/js/test.js';
      const urlD = 'http://sub.otherdomain.com/js/test.js';

      assert.ok(UrlUtils.rootDomainsMatch(urlA, urlB));
      assert.ok(UrlUtils.rootDomainsMatch(urlA, urlC));
      assert.ok(!UrlUtils.rootDomainsMatch(urlA, urlD));
      assert.ok(!UrlUtils.rootDomainsMatch(urlB, urlD));
    });

    it(`doesn't break on urls without a valid host`, () => {
      const urlA = 'http://example.com/js/test.js';
      const urlB = 'data:image/jpeg;base64,foobar';
      const urlC = 'anonymous:90';
      const urlD = '!!garbage';
      const urlE = 'file:///opt/lighthouse/index.js';

      assert.ok(!UrlUtils.rootDomainsMatch(urlA, urlB));
      assert.ok(!UrlUtils.rootDomainsMatch(urlA, urlC));
      assert.ok(!UrlUtils.rootDomainsMatch(urlA, urlD));
      assert.ok(!UrlUtils.rootDomainsMatch(urlA, urlE));
      assert.ok(!UrlUtils.rootDomainsMatch(urlB, urlC));
      assert.ok(!UrlUtils.rootDomainsMatch(urlB, urlD));
      assert.ok(!UrlUtils.rootDomainsMatch(urlB, urlE));
    });

    it(`matches tld plus domains`, () => {
      const coUkA = 'http://example.co.uk/js/test.js';
      const coUkB = 'http://sub.example.co.uk/js/test.js';
      const testUkA = 'http://example.test.uk/js/test.js';
      const testUkB = 'http://sub.example.test.uk/js/test.js';
      const ltdBrA = 'http://example.ltd.br/js/test.js';
      const ltdBrB = 'http://sub.example.ltd.br/js/test.js';
      const privAtA = 'http://examplepriv.at/js/test.js';
      const privAtB = 'http://sub.examplepriv.at/js/test.js';

      assert.ok(UrlUtils.rootDomainsMatch(coUkA, coUkB));
      assert.ok(UrlUtils.rootDomainsMatch(testUkA, testUkB));
      assert.ok(UrlUtils.rootDomainsMatch(ltdBrA, ltdBrB));
      assert.ok(UrlUtils.rootDomainsMatch(privAtA, privAtB));
    });
  });

  describe('getURLDisplayName', () => {
    it('respects numPathParts option', () => {
      const url = 'http://example.com/a/deep/nested/file.css';
      const result = UrlUtils.getURLDisplayName(url, {numPathParts: 3});
      assert.equal(result, '\u2026deep/nested/file.css');
    });

    it('respects preserveQuery option', () => {
      const url = 'http://example.com/file.css?aQueryString=true';
      const result = UrlUtils.getURLDisplayName(url, {preserveQuery: false});
      assert.equal(result, '/file.css');
    });

    it('respects preserveHost option', () => {
      const url = 'http://example.com/file.css';
      const result = UrlUtils.getURLDisplayName(url, {preserveHost: true});
      assert.equal(result, 'example.com/file.css');
    });

    it('Elides hashes', () => {
      const url = 'http://example.com/file-f303dec6eec305a4fab8025577db3c2feb418148ac75ba378281399fb1ba670b.css';
      const result = UrlUtils.getURLDisplayName(url);
      assert.equal(result, '/file-f303dec\u2026.css');
    });

    it('Elides hashes in the middle', () => {
      const url = 'http://example.com/file-f303dec6eec305a4fab80378281399fb1ba670b-somethingmore.css';
      const result = UrlUtils.getURLDisplayName(url);
      assert.equal(result, '/file-f303dec\u2026-somethingmore.css');
    });

    it('Elides google-fonts hashes', () => {
      const url = 'https://fonts.gstatic.com/s/droidsans/v8/s-BiyweUPV0v-yRb-cjciAzyDMXhdD8sAj6OAJTFsBI.woff2';
      const result = UrlUtils.getURLDisplayName(url);
      assert.equal(result, '\u2026v8/s-BiyweUP\u2026.woff2');
    });

    it('Elides long number sequences', () => {
      const url = 'http://cdn.cnn.com/cnnnext/dam/assets/150507173438-11-week-in-photos-0508-large-169.jpg';
      const result = UrlUtils.getURLDisplayName(url);
      assert.equal(result, '\u2026assets/150\u2026-11-week-in-photos-0508-large-169.jpg');
    });


    it('Elides query strings when can first parameter', () => {
      const url = 'http://example.com/file.css?aQueryString=true&other_long_query_stuff=false&some_other_super_long_query';
      const result = UrlUtils.getURLDisplayName(url);
      assert.equal(result, '/file.css?aQueryString=\u2026');
    });

    it('Elides query strings when cannot preserve first parameter', () => {
      const url = 'http://example.com/file.css?superDuperNoGoodVeryLongExtraSpecialOnlyTheBestEnourmousQueryString=true';
      const result = UrlUtils.getURLDisplayName(url);
      assert.equal(result, '/file.css?\u2026');
    });

    it('Elides long names', () => {
      const result = UrlUtils.getURLDisplayName(superLongName);
      const expected = '/thisIsASuperLongURLThatWillTriggerFilenameTruncationWhichWe\u2026.js';
      assert.equal(result, expected);
    });

    it('Elides long names with hash', () => {
      const url = superLongName.slice(0, -3) +
          '-f303dec6eec305a4fab8025577db3c2feb418148ac75ba378281399fb1ba670b.css';
      const result = UrlUtils.getURLDisplayName(url);
      const expected = '/thisIsASu\u2026.css';
      assert.equal(result, expected);
    });

    it('Elides path parts properly', () => {
      assert.equal(UrlUtils.getURLDisplayName('http://example.com/file.css'), '/file.css');
      assert.equal(UrlUtils.getURLDisplayName('http://t.co//file.css'), '//file.css');
      assert.equal(UrlUtils.getURLDisplayName('http://t.co/a/file.css'), '/a/file.css');
      assert.equal(UrlUtils.getURLDisplayName('http://t.co/a/b/file.css'), '\u2026b/file.css');
    });

    it('Elides path parts properly when used with preserveHost', () => {
      const getResult = path => UrlUtils.getURLDisplayName(`http://g.co${path}`, {preserveHost: true});
      assert.equal(getResult('/file.css'), 'g.co/file.css');
      assert.equal(getResult('/img/logo.jpg'), 'g.co/img/logo.jpg');
      assert.equal(getResult('//logo.jpg'), 'g.co//logo.jpg');
      assert.equal(getResult('/a/b/logo.jpg'), 'g.co/\u2026b/logo.jpg');
    });
  });

  describe('elideDataURI', () => {
    it('elides long data URIs', () => {
      let longDataURI = '';
      for (let i = 0; i < 1000; i++) {
        longDataURI += 'abcde';
      }

      const elided = UrlUtils.elideDataURI(`data:image/jpeg;base64,${longDataURI}`);
      assert.ok(elided.length < longDataURI.length, 'did not shorten string');
    });

    it('returns all other inputs', () => {
      const urls = [
        'data:image/jpeg;base64,foobar',
        'https://example.com/page?query=string#hash',
        'http://example-2.com',
        'chrome://settings',
        'blob://something',
      ];

      urls.forEach(url => assert.equal(UrlUtils.elideDataURI(url), url));
    });
  });

  describe('equalWithExcludedFragments', () => {
    it('correctly checks equality of URLs regardless of fragment', () => {
      const equalPairs = [
        ['https://example.com/', 'https://example.com/'],
        ['https://example.com/', 'https://example.com/#/login?_k=dt915a'],
        ['https://example.com/', 'https://example.com#anchor'],
      ];
      equalPairs.forEach(pair => assert.ok(UrlUtils.equalWithExcludedFragments(...pair)));
    });

    it('correctly checks inequality of URLs regardless of fragment', () => {
      const unequalPairs = [
        ['https://example.com/', 'https://www.example.com/'],
        ['https://example.com/', 'http://example.com/'],
        ['https://example.com/#/login?_k=dt915a', 'https://example.com/index.html#/login?_k=dt915a'],
        ['https://example.com#anchor', 'https://example.com?t=1#anchor'],
      ];
      unequalPairs.forEach(pair => assert.ok(!UrlUtils.equalWithExcludedFragments(...pair)));
    });

    // Bug #1776
    it('rewrites chrome://settings urls', () => {
      const pair = [
        'chrome://settings/',
        'chrome://chrome/settings/',
      ];
      assert.ok(UrlUtils.equalWithExcludedFragments(...pair));
    });

    // https://github.com/GoogleChrome/lighthouse/pull/3941#discussion_r154026009
    it('canonicalizes chrome:// urls without a trailing slash', () => {
      const pair = [
        'chrome://version/',
        'chrome://version',
      ];
      assert.ok(UrlUtils.equalWithExcludedFragments(...pair));
    });

    it('returns false for invalid URLs', () => {
      assert.ok(!UrlUtils.equalWithExcludedFragments('utter nonsense', 'http://example.com'));
    });
  });

  it('isLikeLocalhost', () => {
    assert.ok(UrlUtils.isLikeLocalhost(new URL('http://localhost/').hostname));
    assert.ok(UrlUtils.isLikeLocalhost(new URL('http://localhost:10200/').hostname));
    assert.ok(UrlUtils.isLikeLocalhost(new URL('http://127.0.0.1/page.html').hostname));
    assert.ok(UrlUtils.isLikeLocalhost(new URL('https://localhost/').hostname));
    assert.ok(UrlUtils.isLikeLocalhost(new URL('https://dev.localhost/').hostname));

    assert.ok(!UrlUtils.isLikeLocalhost(new URL('http://8.8.8.8/').hostname));
    assert.ok(!UrlUtils.isLikeLocalhost(new URL('http://example.com/').hostname));
  });

  it('isSecureScheme', () => {
    assert.ok(UrlUtils.isSecureScheme('wss'));
    assert.ok(UrlUtils.isSecureScheme('about'));
    assert.ok(UrlUtils.isSecureScheme('data'));
    assert.ok(UrlUtils.isSecureScheme('filesystem'));

    assert.ok(!UrlUtils.isSecureScheme('http'));
    assert.ok(!UrlUtils.isSecureScheme('ws'));
  });

  it('isNonNetworkProtocol', () => {
    assert.ok(UrlUtils.isNonNetworkProtocol('blob'));
    assert.ok(UrlUtils.isNonNetworkProtocol('data'));
    assert.ok(UrlUtils.isNonNetworkProtocol('data:'));
    assert.ok(UrlUtils.isNonNetworkProtocol('intent:'));
    assert.ok(UrlUtils.isNonNetworkProtocol('file:'));
    assert.ok(UrlUtils.isNonNetworkProtocol('filesystem:'));
    assert.ok(UrlUtils.isNonNetworkProtocol('filesystem'));
    assert.ok(UrlUtils.isNonNetworkProtocol('chrome-extension'));

    assert.ok(!UrlUtils.isNonNetworkProtocol('https:'));
    assert.ok(!UrlUtils.isNonNetworkProtocol('http'));
    assert.ok(!UrlUtils.isNonNetworkProtocol('ws'));
  });

  describe('guessMimeType', () => {
    it('handles invalid url', () => {
      expect(UrlUtils.guessMimeType('')).toEqual(undefined);
      expect(UrlUtils.guessMimeType('I_AM_NO_URL')).toEqual(undefined);
    });

    it('uses mime type from data URI', () => {
      expect(UrlUtils.guessMimeType('data:image/png;DATA')).toEqual('image/png');
      expect(UrlUtils.guessMimeType('data:image/jpeg;DATA')).toEqual('image/jpeg');
      expect(UrlUtils.guessMimeType('data:image/svg+xml;DATA')).toEqual('image/svg+xml');
      expect(UrlUtils.guessMimeType('data:image/svg+xml,DATA')).toEqual('image/svg+xml');
      expect(UrlUtils.guessMimeType('data:text/html;DATA')).toEqual(undefined);
      expect(UrlUtils.guessMimeType('data:image/jpg;DATA')).toEqual(undefined);
      expect(UrlUtils.guessMimeType('data:text/plain,image/png;base64,DATA')).toEqual(undefined);
    });

    it('uses path extension for normal files', () => {
      expect(UrlUtils.guessMimeType('https://example.com/img.png')).toEqual('image/png');
      expect(UrlUtils.guessMimeType('https://example.com/img.png?test')).toEqual('image/png');
      expect(UrlUtils.guessMimeType('https://example.com/IMG.PNG')).toEqual('image/png');
      expect(UrlUtils.guessMimeType('https://example.com/img.jpeg')).toEqual('image/jpeg');
      expect(UrlUtils.guessMimeType('https://example.com/img.jpg')).toEqual('image/jpeg');
      expect(UrlUtils.guessMimeType('https://example.com/img.svg')).toEqual('image/svg+xml');
      expect(UrlUtils.guessMimeType('https://example.com/page.html')).toEqual(undefined);
      expect(UrlUtils.guessMimeType('https://example.com/')).toEqual(undefined);
    });
  });

  describe('normalizeUrl', () => {
    it('returns normalized URL', () => {
      expect(UrlUtils.normalizeUrl('https://example.com')).toEqual('https://example.com/');
    });

    it('rejects when not given a URL', () => {
      expect(() => {
        UrlUtils.normalizeUrl(undefined);
      }).toThrow('INVALID_URL');
    });

    it('rejects when given a URL of zero length', () => {
      expect(() => {
        UrlUtils.normalizeUrl('');
      }).toThrow('INVALID_URL');
    });

    it('rejects when given a URL without protocol', () => {
      expect(() => {
        UrlUtils.normalizeUrl('localhost');
      }).toThrow('INVALID_URL');
    });

    it('rejects when given a URL without hostname', () => {
      expect(() => {
        UrlUtils.normalizeUrl('https://');
      }).toThrow('INVALID_URL');
    });
  });

  describe('getRootDomain', () => {
    it('returns the correct rootDomain from a string from PSL', () => {
      assert.equal(UrlUtils.getRootDomain('https://www.example.com/index.html'), 'example.com');
      assert.equal(UrlUtils.getRootDomain('https://example.com'), 'example.com');
      assert.equal(UrlUtils.getRootDomain('https://www.example.co.uk'), 'example.co.uk');
      assert.equal(UrlUtils.getRootDomain('https://example.com.br/app/'), 'example.com.br');
      assert.equal(UrlUtils.getRootDomain('https://example.tokyo.jp'), 'example.tokyo.jp');
      assert.equal(UrlUtils.getRootDomain('https://sub.example.com'), 'example.com');
      assert.equal(UrlUtils.getRootDomain('https://sub.example.tokyo.jp'), 'example.tokyo.jp');
      assert.equal(UrlUtils.getRootDomain('http://localhost'), 'localhost');
      assert.equal(UrlUtils.getRootDomain('http://localhost:8080'), 'localhost');
      assert.equal(UrlUtils.getRootDomain('https://www.hydro.mb.ca'), 'hydro.mb.ca');
    });

    it('returns the correct rootDomain from an URL object', () => {
      assert.equal(UrlUtils.getRootDomain(new URL('https://www.example.com/index.html')), 'example.com');
      assert.equal(UrlUtils.getRootDomain(new URL('https://example.com')), 'example.com');
      assert.equal(UrlUtils.getRootDomain(new URL('https://www.example.co.uk')), 'example.co.uk');
      assert.equal(UrlUtils.getRootDomain(new URL('https://example.com.br/app/')), 'example.com.br');
      assert.equal(UrlUtils.getRootDomain(new URL('https://example.tokyo.jp')), 'example.tokyo.jp');
      assert.equal(UrlUtils.getRootDomain(new URL('https://sub.example.com')), 'example.com');
      assert.equal(UrlUtils.getRootDomain(new URL('https://sub.example.tokyo.jp')), 'example.tokyo.jp');
      assert.equal(UrlUtils.getRootDomain(new URL('http://localhost')), 'localhost');
      assert.equal(UrlUtils.getRootDomain(new URL('http://localhost:8080')), 'localhost');
      assert.equal(UrlUtils.getRootDomain(new URL('https://www.hydro.mb.ca')), 'hydro.mb.ca');
    });
  });
});
