/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-disable */

document.write('<script src="/perf/level-2.js?delay=500"></script>');
document.write('<script src="/perf/level-2.js?warning&delay=500"></script>');

// delay our preconnect-candidates so that they're not assumed to be working already
setTimeout(() => {
  // load another origin
  fetch('http://localhost:10503/preload.html');

  // load another origin in a way where the `crossorigin` attribute matters
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css?family=Lobster%20Two';
  document.head.appendChild(link);
}, 300);
