/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck - TODO: cut down on exported artifact properties not needed by audits
/**
 * @fileoverview
 *   Identifies stylesheets, HTML Imports, and scripts that potentially block
 *   the first paint of the page by running several scripts in the page context.
 *   Candidate blocking tags are collected by querying for all script tags in
 *   the head of the page and all link tags that are either matching media
 *   stylesheets or non-async HTML imports. These are then compared to the
 *   network requests to ensure they were initiated by the parser and not
 *   injected with script. To avoid false positives from strategies like
 *   (http://filamentgroup.github.io/loadCSS/test/preload.html), a separate
 *   script is run to flag all links that at one point were rel=preload.
 */

'use strict';

const Gatherer = require('../gatherer.js');
const Driver = require('../../driver.js'); // eslint-disable-line no-unused-vars

/* global document,window,HTMLLinkElement */

/* istanbul ignore next */
function installMediaListener() {
  window.___linkMediaChanges = [];
  Object.defineProperty(HTMLLinkElement.prototype, 'media', {
    set: function(val) {
      window.___linkMediaChanges.push({
        href: this.href,
        media: val,
        msSinceHTMLEnd: Date.now() - window.performance.timing.responseEnd,
        matches: window.matchMedia(val).matches,
      });

      return this.setAttribute('media', val);
    },
  });
}

/**
 * @return {Promise<{tagName: string, url: string, src: string, href: string, rel: string, media: string, disabled: boolean, mediaChanges: {href: string, media: string, msSinceHTMLEnd: number, matches: boolean}}>}
 */
/* istanbul ignore next */
function collectTagsThatBlockFirstPaint() {
  return new Promise((resolve, reject) => {
    try {
      const tagList = [...document.querySelectorAll('link, head script[src]')]
        .filter(tag => {
          if (tag.tagName === 'SCRIPT') {
            const scriptTag = /** @type {HTMLScriptElement} */ (tag);
            return (
              !scriptTag.hasAttribute('async') &&
              !scriptTag.hasAttribute('defer') &&
              !/^data:/.test(scriptTag.src) &&
              !/^blob:/.test(scriptTag.src) &&
              scriptTag.getAttribute('type') !== 'module'
            );
          } else if (tag.tagName === 'LINK') {
            // Filter stylesheet/HTML imports that block rendering.
            // https://www.igvita.com/2012/06/14/debunking-responsive-css-performance-myths/
            // https://www.w3.org/TR/html-imports/#dfn-import-async-attribute
            const linkTag = /** @type {HTMLLinkElement} */ (tag);
            const blockingStylesheet = linkTag.rel === 'stylesheet' &&
              window.matchMedia(linkTag.media).matches && !linkTag.disabled;
            const blockingImport = linkTag.rel === 'import' && !linkTag.hasAttribute('async');
            return blockingStylesheet || blockingImport;
          }

          return false;
        })
        .map(tag => {
          return {
            tagName: tag.tagName,
            url: tag.tagName === 'LINK' ? tag.href : tag.src,
            src: tag.src,
            href: tag.href,
            rel: tag.rel,
            media: tag.media,
            disabled: tag.disabled,
            mediaChanges: window.___linkMediaChanges.filter(item => item.href === tag.href),
          };
        });
      resolve(tagList);
    } catch (e) {
      const friendly = 'Unable to gather Scripts/Stylesheets/HTML Imports on the page';
      reject(new Error(`${friendly}: ${e.message}`));
    }
  });
}

class TagsBlockingFirstPaint extends Gatherer {
  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   */
  static _filteredAndIndexedByUrl(networkRecords) {
    /** @type {Object<string, {isLinkPreload: boolean, transferSize: number, startTime: number, endTime: number}>} */
    const result = {};

    return networkRecords.reduce((prev, record) => {
      if (!record.finished) {
        return prev;
      }

      const isParserGenerated = record.initiator.type === 'parser';
      // A stylesheet only blocks script if it was initiated by the parser
      // https://html.spec.whatwg.org/multipage/semantics.html#interactions-of-styling-and-scripting
      const isParserScriptOrStyle = /(css|script)/.test(record.mimeType) && isParserGenerated;
      const isFailedRequest = record._failed;
      const isHtml = record.mimeType && record.mimeType.includes('html');

      // Filter stylesheet, javascript, and html import mimetypes.
      // Include 404 scripts/links generated by the parser because they are likely blocking.
      if (isHtml || isParserScriptOrStyle || (isFailedRequest && isParserGenerated)) {
        prev[record.url] = {
          isLinkPreload: !!record.isLinkPreload,
          transferSize: record.transferSize,
          startTime: record.startTime,
          endTime: record.endTime,
        };
      }

      return prev;
    }, result);
  }

  /**
   * @param {Driver} driver
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   */
  static findBlockingTags(driver, networkRecords) {
    const scriptSrc = `(${collectTagsThatBlockFirstPaint.toString()}())`;
    const firstRequestEndTime = networkRecords.reduce(
      (min, record) => Math.min(min, record.endTime),
      Infinity
    );
    return driver.evaluateAsync(scriptSrc).then(tags => {
      const requests = TagsBlockingFirstPaint._filteredAndIndexedByUrl(networkRecords);

      return tags.reduce((prev, tag) => {
        const request = requests[tag.url];
        if (request && !request.isLinkPreload) {
          // Even if the request was initially blocking or appeared to be blocking once the
          // page was loaded, the media attribute could have been changed during load, capping the
          // amount of time it was render blocking. See https://github.com/GoogleChrome/lighthouse/issues/2832.
          const timesResourceBecameNonBlocking = (tag.mediaChanges || [])
            .filter(change => !change.matches)
            .map(change => change.msSinceHTMLEnd);
          const earliestNonBlockingTime = Math.min(...timesResourceBecameNonBlocking);
          const lastTimeResourceWasBlocking = Math.max(
            request.startTime,
            firstRequestEndTime + earliestNonBlockingTime / 1000
          );

          prev.push({
            tag,
            transferSize: request.transferSize || 0,
            startTime: request.startTime,
            endTime: Math.min(request.endTime, lastTimeResourceWasBlocking),
          });

          // Prevent duplicates from showing up again
          requests[tag.url] = null;
        }

        return prev;
      }, []);
    });
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  beforePass(passContext) {
    return passContext.driver.evaluateScriptOnNewDocument(`(${installMediaListener.toString()})()`);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['TagsBlockingFirstPaint']>}
   */
  afterPass(passContext, loadData) {
    return TagsBlockingFirstPaint.findBlockingTags(passContext.driver, loadData.networkRecords);
  }
}

module.exports = TagsBlockingFirstPaint;
