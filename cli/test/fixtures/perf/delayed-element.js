/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable */

/** Create long tasks on the main thread. */
function stall(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) ;
}

// largest-contentful-paint-element: add the largest element later in page load
// layout-shifts: shift down the `<h1>` in the page
setTimeout(() => {
  const imgEl = document.createElement('img');
  imgEl.src = '../dobetterweb/lighthouse-480x318.jpg';
  imgEl.loading = 'lazy';
  const textEl = document.createElement('div');
  textEl.textContent = 'Sorry!';
  textEl.style.height = '18px' // this height can be flaky so we set it manually
  const top = document.getElementById('late-content');

  // Use shadow DOM to verify devtoolsNodePath resolves through it
  const shadowRoot = top.attachShadow({mode: 'open'});
  const sectionEl = document.createElement('section');
  sectionEl.append(imgEl, textEl);
  shadowRoot.append(sectionEl);
}, 1000);

// long-tasks: add a very long task at least 500ms
stall(800);
