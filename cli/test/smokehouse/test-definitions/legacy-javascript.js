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
              wastedBytes: '124000 +/- 2000',
              subItems: {
                items: [
                  {signal: '@babel/plugin-transform-classes'},
                  {signal: '@babel/plugin-transform-regenerator'},
                  {signal: '@babel/plugin-transform-spread'},
                  {signal: 'Array.from'},
                  {signal: 'Array.isArray'},
                  {signal: 'Array.of'},
                  {signal: 'Array.prototype.concat'},
                  {signal: 'Array.prototype.copyWithin'},
                  {signal: 'Array.prototype.every'},
                  {signal: 'Array.prototype.fill'},
                  {signal: 'Array.prototype.filter'},
                  {signal: 'Array.prototype.find'},
                  {signal: 'Array.prototype.findIndex'},
                  {signal: 'Array.prototype.flat'},
                  {signal: 'Array.prototype.flatMap'},
                  {signal: 'Array.prototype.forEach'},
                  {signal: 'Array.prototype.includes'},
                  {signal: 'Array.prototype.indexOf'},
                  {signal: 'Array.prototype.join'},
                  {signal: 'Array.prototype.map'},
                  {signal: 'Array.prototype.slice'},
                  {signal: 'Array.prototype.some'},
                  {signal: 'Array.prototype.sort'},
                  {signal: 'Math.acosh'},
                  {signal: 'Math.asinh'},
                  {signal: 'Math.atanh'},
                  {signal: 'Math.cbrt'},
                  {signal: 'Math.clz32'},
                  {signal: 'Math.cosh'},
                  {signal: 'Math.expm1'},
                  {signal: 'Math.fround'},
                  {signal: 'Math.hypot'},
                  {signal: 'Math.imul'},
                  {signal: 'Math.log10'},
                  {signal: 'Math.log1p'},
                  {signal: 'Math.log2'},
                  {signal: 'Math.sign'},
                  {signal: 'Math.sinh'},
                  {signal: 'Math.tanh'},
                  {signal: 'Math.trunc'},
                  {signal: 'Object.assign'},
                  {signal: 'Object.create'},
                  {signal: 'Object.entries'},
                  {signal: 'Object.freeze'},
                  {signal: 'Object.fromEntries'},
                  {signal: 'Object.getOwnPropertyDescriptor'},
                  {signal: 'Object.getOwnPropertyDescriptors'},
                  {signal: 'Object.getPrototypeOf'},
                  {signal: 'Object.is'},
                  {signal: 'Object.isExtensible'},
                  {signal: 'Object.isFrozen'},
                  {signal: 'Object.isSealed'},
                  {signal: 'Object.keys'},
                  {signal: 'Object.preventExtensions'},
                  {signal: 'Object.seal'},
                  {signal: 'Object.setPrototypeOf'},
                  {signal: 'Object.values'},
                  {signal: 'Promise.allSettled'},
                  {signal: 'Promise.any'},
                  {signal: 'Reflect.apply'},
                  {signal: 'Reflect.construct'},
                  {signal: 'Reflect.deleteProperty'},
                  {signal: 'Reflect.get'},
                  {signal: 'Reflect.getOwnPropertyDescriptor'},
                  {signal: 'Reflect.getPrototypeOf'},
                  {signal: 'Reflect.has'},
                  {signal: 'Reflect.isExtensible'},
                  {signal: 'Reflect.ownKeys'},
                  {signal: 'Reflect.preventExtensions'},
                  {signal: 'Reflect.setPrototypeOf'},
                  {signal: 'String.fromCodePoint'},
                  {signal: 'String.prototype.codePointAt'},
                  {signal: 'String.prototype.endsWith'},
                  {signal: 'String.prototype.includes'},
                  {signal: 'String.prototype.link'},
                  {signal: 'String.prototype.matchAll'},
                  {signal: 'String.prototype.repeat'},
                  {signal: 'String.prototype.replaceAll'},
                  {signal: 'String.prototype.startsWith'},
                  {signal: 'String.prototype.trim'},
                  {signal: 'String.prototype.trimEnd'},
                  {signal: 'String.prototype.trimStart'},
                  {signal: 'String.raw'},
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
