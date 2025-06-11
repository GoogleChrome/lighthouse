/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getNetworkError,
  getInterstitialError,
  getPageLoadError,
  getNonHtmlError,
} from '../../lib/navigation-error.js';
import {NetworkRequest} from '../../lib/network-request.js';

const LoadFailureMode = /** @type {const} */ ({
  fatal: 'fatal',
  ignore: 'ignore',
  warn: 'warn',
});

/**
 * Unless the test specifies otherwise, all status codes will be 200.
 * @return {NetworkRequest}
 */
function makeNetworkRequest() {
  const record = new NetworkRequest();
  record.statusCode = 200;
  return record;
}

describe('#getNetworkError', () => {
  /**
   * @param {NetworkRequest=} mainRecord
   * @param {{warnings: Array<string | LH.IcuMessage>, ignoreStatusCode?: LH.Config.Settings['ignoreStatusCode']}=} context
   */
  function getAndExpectError(mainRecord, context) {
    const error = getNetworkError(mainRecord, {warnings: [], ...context});
    if (!error) throw new Error('expected a network error');
    return error;
  }

  it('passes when the page is loaded', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    expect(getNetworkError(mainRecord, {warnings: []})).toBeUndefined();
  });

  it('fails when page fails to load', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'foobar';
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('FAILED_DOCUMENT_REQUEST');
    expect(error.code).toEqual('FAILED_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(
      /^Lighthouse was unable to reliably load.*foobar/
    );
  });

  it('fails when page times out', () => {
    const error = getAndExpectError(undefined);
    expect(error.message).toEqual('NO_DOCUMENT_REQUEST');
    expect(error.code).toEqual('NO_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/^Lighthouse was unable to reliably load/);
  });

  it('warns when page returns with a 404 with flag', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.statusCode = 404;
    const context = {
      url,
      networkRecords: [mainRecord],
      warnings: [],
      loadFailureMode: LoadFailureMode.warn,
      ignoreStatusCode: true,
    };

    const error = getNetworkError(mainRecord, context);
    expect(error).toBeUndefined();
    expect(context.warnings[0]).toBeDisplayString(/^Lighthouse was unable to reliably load/);
  });

  it('fails when page returns with a 404 without flag', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.statusCode = 404;
    const context = {
      url,
      networkRecords: [mainRecord],
      warnings: [],
      loadFailureMode: LoadFailureMode.warn,
    };

    const error = getAndExpectError(mainRecord, context);
    expect(error).toBeDefined();
    expect(error.message).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.code).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/^Lighthouse was unable to reliably load.*404/);
  });

  it('fails when page returns with a 500 without flag', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.statusCode = 500;
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.code).toEqual('ERRORED_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/^Lighthouse was unable to reliably load.*500/);
  });

  it('fails when page domain doesn\'t resolve', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'net::ERR_NAME_NOT_RESOLVED';
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('DNS_FAILURE');
    expect(error.code).toEqual('DNS_FAILURE');
    expect(error.friendlyMessage).toBeDisplayString(/^DNS servers could not resolve/);
  });
});

describe('#getInterstitialError', () => {
  /**
   * @param {NetworkRequest} mainRecord
   * @param {NetworkRequest[]} networkRecords
   */
  function getAndExpectError(mainRecord, networkRecords) {
    const error = getInterstitialError(mainRecord, networkRecords);
    if (!error) throw new Error('expected an interstitial error');
    return error;
  }

  it('passes when the page was not requested', () => {
    expect(getInterstitialError(undefined, [])).toBeUndefined();
  });

  it('passes when the page is loaded', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    expect(getInterstitialError(mainRecord, [mainRecord])).toBeUndefined();
  });

  it('passes when page fails to load normally', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'foobar';
    expect(getInterstitialError(mainRecord, [mainRecord])).toBeUndefined();
  });

  it('passes when page gets a generic interstitial but somehow also loads everything', () => {
    // This case, AFAIK, is impossible, but we'll err on the side of not tanking the run.
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    const interstitialRecord = makeNetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, interstitialRecord];
    expect(getInterstitialError(mainRecord, records)).toBeUndefined();
  });

  it('fails when page gets a generic interstitial', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'ERR_CONNECTION_RESET';
    const interstitialRecord = makeNetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, interstitialRecord];
    const error = getAndExpectError(mainRecord, records);
    expect(error.message).toEqual('CHROME_INTERSTITIAL_ERROR');
    expect(error.code).toEqual('CHROME_INTERSTITIAL_ERROR');
    expect(error.friendlyMessage).toBeDisplayString(/^Chrome prevented/);
  });

  it('fails when page gets a security interstitial', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = true;
    mainRecord.localizedFailDescription = 'net::ERR_CERT_COMMON_NAME_INVALID';
    const interstitialRecord = makeNetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, interstitialRecord];
    const error = getAndExpectError(mainRecord, records);
    expect(error.message).toEqual('INSECURE_DOCUMENT_REQUEST');
    expect(error.code).toEqual('INSECURE_DOCUMENT_REQUEST');
    expect(error.friendlyMessage).toBeDisplayString(/valid security certificate/);
    expect(error.friendlyMessage).toBeDisplayString(/net::ERR_CERT_COMMON_NAME_INVALID/);
  });

  it('passes when page iframe gets a generic interstitial', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.failed = false;
    const iframeRecord = makeNetworkRequest();
    iframeRecord.failed = true;
    iframeRecord.url = 'https://the-ad.com';
    iframeRecord.documentURL = 'https://the-ad.com';
    const interstitialRecord = makeNetworkRequest();
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
    const records = [mainRecord, iframeRecord, interstitialRecord];
    const error = getInterstitialError(mainRecord, records);
    expect(error).toBeUndefined();
  });
});

describe('#getNonHtmlError', () => {
  /**
   * @param {NetworkRequest} mainRecord
   */
  function getAndExpectError(mainRecord) {
    const error = getNonHtmlError(mainRecord);
    if (!error) throw new Error('expected a non-HTML error');
    return error;
  }

  it('passes when the page was not requested', () => {
    expect(getNonHtmlError(undefined)).toBeUndefined();
  });

  it('passes when the page is of MIME type text/html', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    const mimeType = 'text/html';
    mainRecord.url = url;
    mainRecord.mimeType = mimeType;
    expect(getNonHtmlError(mainRecord)).toBeUndefined();
  });

  it('passes when the page is of MIME type application/xhtml+xml', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    const mimeType = 'application/xhtml+xml';
    mainRecord.url = url;
    mainRecord.mimeType = mimeType;
    expect(getNonHtmlError(mainRecord)).toBeUndefined();
  });

  it('passes when the page document did not load', () => {
    const url = 'http://the-page.com';
    const mainRecord = makeNetworkRequest();
    mainRecord.statusCode = -1;
    mainRecord.url = url;
    mainRecord.mimeType = '';
    expect(getNonHtmlError(mainRecord)).toBeUndefined();
  });

  it('fails when the page is not of MIME type text/html', () => {
    const url = 'http://the-page.com';
    const mimeType = 'application/xml';
    const mainRecord = makeNetworkRequest();
    mainRecord.url = url;
    mainRecord.mimeType = mimeType;
    const error = getAndExpectError(mainRecord);
    expect(error.message).toEqual('NOT_HTML');
    expect(error.code).toEqual('NOT_HTML');
    expect(error.friendlyMessage).toBeDisplayString(/is not HTML \(served as/);
  });
});

describe('#getPageLoadError', () => {
  /**
   * @param {LH.LighthouseError|undefined} navigationError
   * @param {Parameters<typeof getPageLoadError>[1]} context
   */
  function getAndExpectError(navigationError, context) {
    const error = getPageLoadError(navigationError, context);
    if (!error) throw new Error('expected a page load error');
    return error;
  }

  /** @type {LH.LighthouseError} */
  let navigationError;

  beforeEach(() => {
    navigationError = /** @type {LH.LighthouseError} */ (new Error('NAVIGATION_ERROR'));
  });

  it('passes when the page is loaded', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };
    mainRecord.url = context.url;
    mainRecord.mimeType = 'text/html';
    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
  });

  it('passes when the page is loaded, ignoring any fragment', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://example.com/#/page/list',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };
    mainRecord.url = 'http://example.com';
    mainRecord.mimeType = 'text/html';
    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
  });

  it('passes when the page redirects to MIME type text/html', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };
    const finalRecord = makeNetworkRequest();

    mainRecord.url = context.url;
    mainRecord.redirectDestination = finalRecord;
    finalRecord.url = 'http://the-redirected-page.com';
    finalRecord.mimeType = 'text/html';

    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
  });

  it('fails with interstitial error first', () => {
    const mainRecord = makeNetworkRequest();
    const interstitialRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord, interstitialRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };

    mainRecord.url = context.url;
    mainRecord.failed = true;
    interstitialRecord.url = 'data:text/html;base64,abcdef';
    interstitialRecord.documentURL = 'chrome-error://chromewebdata/';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('CHROME_INTERSTITIAL_ERROR');
  });

  it('fails with network error second', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };

    mainRecord.url = context.url;
    mainRecord.failed = true;

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('FAILED_DOCUMENT_REQUEST');
  });

  it('fails with non-HTML error third', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };

    mainRecord.url = context.url;
    mainRecord.mimeType = 'application/xml';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NOT_HTML');
  });

  it('warns with XHTML type', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };

    mainRecord.url = context.url;
    mainRecord.mimeType = 'application/xhtml+xml';

    const error = getPageLoadError(undefined, context);
    expect(error).toBeUndefined();
    expect(context.warnings[0]).toBeDisplayString(
      'The page MIME type is XHTML: Lighthouse does not explicitly support this document type');
  });

  it('fails with nav error last', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };

    mainRecord.url = context.url;
    mainRecord.mimeType = 'text/html';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NAVIGATION_ERROR');
  });

  it('fails when loadFailureMode is warn', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.warn,
      warnings: [],
    };

    mainRecord.url = context.url;
    mainRecord.mimeType = 'text/html';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NAVIGATION_ERROR');
  });

  it('fails with non-HTML when redirect is not HTML', () => {
    const mainRecord = makeNetworkRequest();
    const context = {
      url: 'http://the-page.com',
      networkRecords: [mainRecord],
      loadFailureMode: LoadFailureMode.fatal,
      warnings: [],
    };
    const finalRecord = makeNetworkRequest();

    mainRecord.url = context.url;
    mainRecord.redirectDestination = finalRecord;
    finalRecord.url = 'http://the-redirected-page.com';
    finalRecord.mimeType = 'text/todo';

    const error = getAndExpectError(navigationError, context);
    expect(error.message).toEqual('NOT_HTML');
  });
});
