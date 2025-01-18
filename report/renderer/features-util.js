/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env browser */

/** @typedef {import('./dom.js').DOM} DOM */

/**
 * @param {DOM} dom
 * @param {boolean} [force]
 */
export function toggleDarkTheme(dom, force) {
  const el = dom.rootEl;
  // This seems unnecessary, but in DevTools, passing "undefined" as the second
  // parameter acts like passing "false".
  // https://github.com/ChromeDevTools/devtools-frontend/blob/dd6a6d4153647c2a4203c327c595692c5e0a4256/front_end/dom_extension/DOMExtension.js#L809-L819
  if (typeof force === 'undefined') {
    el.classList.toggle('lh-dark');
  } else {
    el.classList.toggle('lh-dark', force);
  }
}
