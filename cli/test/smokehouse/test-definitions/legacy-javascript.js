/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: [
      'performance',
    ],
    onlyAudits: [
      'legacy-javascript',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for sites with polyfills.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/legacy-javascript.html',
    finalDisplayedUrl: 'http://localhost:10200/legacy-javascript.html',
    audits: {
      'legacy-javascript': {
        details: {
          items: [
            {
              url: 'http://localhost:10200/legacy-javascript.js',
              wastedBytes: '73000 +/- 2000',
              subItems: {
                items: [
                  {signal: 'Array.prototype.fill'},
                  {signal: 'Array.prototype.filter'},
                  {signal: 'Array.prototype.findIndex'},
                  {signal: 'Array.prototype.find'},
                  {signal: 'Array.prototype.forEach'},
                  {signal: 'Array.from'},
                  {signal: 'Array.isArray'},
                  {signal: 'Array.prototype.map'},
                  {signal: 'Array.of'},
                  {signal: 'Array.prototype.some'},
                  {signal: 'Date.now'},
                  {signal: 'Date.prototype.toISOString'},
                  {signal: 'Date.prototype.toJSON'},
                  {signal: 'Number.isInteger'},
                  {signal: 'Number.isSafeInteger'},
                  {signal: 'Object.defineProperties'},
                  {signal: 'Object.defineProperty'},
                  {signal: 'Object.entries'},
                  {signal: 'Object.freeze'},
                  {signal: 'Object.getOwnPropertyDescriptors'},
                  {signal: 'Object.getPrototypeOf'},
                  {signal: 'Object.isExtensible'},
                  {signal: 'Object.isFrozen'},
                  {signal: 'Object.isSealed'},
                  {signal: 'Object.keys'},
                  {signal: 'Object.preventExtensions'},
                  {signal: 'Object.seal'},
                  {signal: 'Object.setPrototypeOf'},
                  {signal: 'Object.values'},
                  {signal: 'Reflect.apply'},
                  {signal: 'Reflect.construct'},
                  {signal: 'Reflect.defineProperty'},
                  {signal: 'Reflect.deleteProperty'},
                  {signal: 'Reflect.getOwnPropertyDescriptor'},
                  {signal: 'Reflect.getPrototypeOf'},
                  {signal: 'Reflect.get'},
                  {signal: 'Reflect.has'},
                  {signal: 'Reflect.isExtensible'},
                  {signal: 'Reflect.ownKeys'},
                  {signal: 'Reflect.preventExtensions'},
                  {signal: 'Reflect.setPrototypeOf'},
                  {signal: 'String.prototype.codePointAt'},
                  {signal: 'String.fromCodePoint'},
                  {signal: 'String.raw'},
                  {signal: 'String.prototype.repeat'},
                  {signal: '@babel/plugin-transform-classes'},
                  {signal: '@babel/plugin-transform-regenerator'},
                  {signal: '@babel/plugin-transform-spread'},
                ],
              },
            },
            {
              url: 'http://localhost:10200/legacy-javascript.html',
              subItems: {
                items: [
                  {signal: 'Array.prototype.findIndex'},
                ],
              },
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'legacy-javascript',
  expectations,
  config,
};
