/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import CharsetDefinedAudit, {
  CHARSET_HTML_REGEX, CHARSET_HTTP_REGEX, IANA_REGEX,
} from '../../../audits/dobetterweb/charset.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

const HTML_PRE = '<!doctype html><head>';
const HTML_POST = '</head><body><h1>hello';

function generateArtifacts(htmlContent, contentTypeValue = 'text/html') {
  const mainDocumentUrl = 'https://example.com/';
  const mainResource = {
    url: mainDocumentUrl,
    responseHeaders: [
      {name: 'content-type', value: contentTypeValue},
    ],
  };
  const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
  const context = {computedCache: new Map()};
  return [{
    devtoolsLogs: {[CharsetDefinedAudit.DEFAULT_PASS]: devtoolsLog},
    URL: {mainDocumentUrl},
    MainDocumentContent: htmlContent,
    MetaElements: [],
  }, context];
}

describe('Charset defined audit', () => {
  it('succeeds where the page contains the charset meta tag', async () => {
    const htmlContent = HTML_PRE + '<meta charset="utf-8" >' + HTML_POST;
    const [artifacts, context] = generateArtifacts(htmlContent);
    artifacts.MetaElements = [{name: '', content: '', charset: 'utf-8'}];
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 1);
  });

  it('succeeds where the page contains the charset meta tag regardless of casing', async () => {
    const htmlContent = HTML_PRE + '<meta cHaRsEt="uTf-8" >' + HTML_POST;
    const [artifacts, context] = generateArtifacts(htmlContent);
    artifacts.MetaElements = [{name: '', content: '', charset: 'utf-8'}];
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 1);
  });

  it('succeeds when the page has the charset defined in the content-type meta tag', async () => {
    const htmlContent = HTML_PRE +
      '<meta http-equiv="Content-type" content="text/html; charset=utf-8" />' + HTML_POST;
    const [artifacts, context] = generateArtifacts(htmlContent);
    artifacts.MetaElements = [
      {name: '', content: 'text/html; charset=utf-8', httpEquiv: 'content-type'},
    ];
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 1);
  });

  it('succeeds when the page has the charset defined in the content-type http header', async () => {
    const htmlContent = HTML_PRE +
      '<meta http-equiv="Content-type" content="text/html" />' + HTML_POST;
    const contentTypeVal = 'text/html; charset=UTF-8';
    const [artifacts, context] = generateArtifacts(htmlContent, contentTypeVal);
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 1);
  });

  it('succeeds when the page has the charset defined via BOM', async () => {
    const htmlContent = '\ufeff' + HTML_PRE +
      '<meta http-equiv="Content-type" content="text/html" />' + HTML_POST;
    const [artifacts, context] = generateArtifacts(htmlContent);
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 1);
  });

  it('fails when the page does not have charset defined', async () => {
    const htmlContent = HTML_PRE + '<meta http-equiv="Content-type" content="text/html" />';
    const [artifacts, context] = generateArtifacts(htmlContent);
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 0);
  });

  it('fails when the page has charset defined too late in the page', async () => {
    const bigString = ' '.repeat(1024);
    const htmlContent = HTML_PRE + bigString + '<meta charset="utf-8" />' + HTML_POST;
    const [artifacts, context] = generateArtifacts(htmlContent);
    artifacts.MetaElements = [{name: '', content: '', charset: 'utf-8'}];
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 0);
  });

  it('passes when the page has charset defined almost too late in the page', async () => {
    const bigString = ' '.repeat(900);
    const htmlContent = HTML_PRE + bigString + '<meta charset="utf-8" />' + HTML_POST;
    const [artifacts, context] = generateArtifacts(htmlContent);
    artifacts.MetaElements = [{name: '', content: '', charset: 'utf-8'}];
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 1);
  });

  it('fails when charset only partially defined in the first 1024 bytes of the page', async () => {
    const charsetHTML = '<meta charset="utf-8" />';
    // 1024 bytes should be halfway through the meta tag
    const bigString = ' '.repeat(1024 - HTML_PRE.length - charsetHTML.length / 2);
    const htmlContent = HTML_PRE + bigString + charsetHTML + HTML_POST;
    const [artifacts, context] = generateArtifacts(htmlContent);
    artifacts.MetaElements = [{name: '', content: '', charset: 'utf-8'}];
    const auditResult = await CharsetDefinedAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 0);
  });
});

describe('Charset regex check', () => {
  const HTML_REGEX = CHARSET_HTML_REGEX;
  const HTTP_REGEX = CHARSET_HTTP_REGEX;

  it('handles html correctly', () => {
    // Positive cases
    assert.equal(HTML_REGEX.test('<meta charset=utf-8 />'), true);
    assert.equal(HTML_REGEX.test(`<!doctype html><meta charset=utf-8 /><body>`), true);
    assert.equal(HTML_REGEX.test(`<!doctype html><meta   charset=utf-8  /><body>`), true);
    assert.equal(HTML_REGEX.test(`<!doctype html><meta charset=utf-8><body>`), true);
    assert.equal(HTML_REGEX.test(`<!doctype html><meta charset=UTF-8><body>`), true);
    assert.equal(HTML_REGEX.test(
      `<!doctype html><meta http-equiv="Content-type" content="text/html; charset=utf-8"/><body>'`),
      true);
    assert.equal(HTML_REGEX.test(
      `<!doctype html><meta content="text/html; charset=utf-8" http-equiv="Content-type"/><body>'`),
      true);

    // Negative cases
    assert.equal(HTML_REGEX.test(`<!doctype html><meta description=hello><body>`), false);
    assert.equal(HTML_REGEX.test(`<!doctype html><meta charset=utf-8<body>`), false);
    assert.equal(HTML_REGEX.test(
      `<!doctype html><meta http-equiv="Content-type" content="text/html; nope-tf8" /><body>'`),
      false);
    assert.equal(HTML_REGEX.test(
      `<!doctype html><meta http-equiv="Content-type" content="text/html; charset=utf-8" <body>'`),
      false);
  });

  it('handles http header correctly', () => {
    // Positive cases
    assert.equal(HTTP_REGEX.test('text/html; charset=UTF-8'), true);
    assert.equal(HTTP_REGEX.test('text/html; charset = UTF-8'), true);

    // Negative cases
    assert.equal(HTTP_REGEX.test('text/html; charset='), false);
    assert.equal(HTTP_REGEX.test('text/html; charset=x'), false);
    assert.equal(HTTP_REGEX.test('text/html; charset=  '), false);
  });

  it('handles charset name validation correctly', () => {
    // Positive cases
    assert.equal(IANA_REGEX.test('utf-8'), true);
    assert.equal(IANA_REGEX.test('utf-16'), true);
    assert.equal(IANA_REGEX.test('IT'), true);
    assert.equal(IANA_REGEX.test('NS_4551-1'), true);
    assert.equal(IANA_REGEX.test('ISO_646.basic:1983'), true);
    assert.equal(IANA_REGEX.test('NF_Z_62-010_(1973)'), true);

    // Negative cases
    assert.equal(IANA_REGEX.test('a'), false);
    assert.equal(IANA_REGEX.test(''), false);
    assert.equal(IANA_REGEX.test('utf+8'), false);
    assert.equal(IANA_REGEX.test('utf-16*'), false);
  });
});
