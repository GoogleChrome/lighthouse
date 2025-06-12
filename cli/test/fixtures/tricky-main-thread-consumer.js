/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable */

if (window.location.search.includes('setTimeout')) {
  window.library.setTimeout(() => {
    window.library.stall(3050);
  }, 0);
}

if (window.location.search.includes('fetch')) {
  window.library.fetch('http://localhost:10200/tricky-main-thread.html').then(() => {
    window.library.stall(3050);
  });
}

if (window.location.search.includes('xhr')) {
  window.library.xhr('http://localhost:10200/tricky-main-thread.html').then(() => {
    window.library.stall(3050);
  });
}
