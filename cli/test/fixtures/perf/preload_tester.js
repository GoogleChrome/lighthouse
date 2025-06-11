/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable */

document.write('<script src="/perf/level-2.js?delay=500"></script>');
document.write('<script src="/perf/level-2.js?warning&delay=500"></script>');

// delay our preconnect-candidates so that they're not assumed to be working already
setTimeout(() => {
  // load another origin in a way where the `crossorigin` attribute matters
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'http://localhost:10503/perf/preload_style_ranchers.css';
  document.head.append(link);

  link.onload = () => {
    // Make sure LCP is waiting on the network so the above resources are considered important.
    const lcpElement = document.createElement('div');
    lcpElement.style.fontFamily = 'Ranchers';
    lcpElement.textContent = 'Here is some really tall text!'.repeat(50)
    document.body.append(lcpElement);
  };
}, 300);
