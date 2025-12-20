/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable */

window.library = {};
window.library.setTimeout = (fn, time) => {
  setTimeout(() => {
    window.library.stall(50);
    console.log('Custom timeout hook');
    fn();
  }, time);
};

window.library.fetch = (...args) => {
  console.log('Custom fetch hook 1');
  return fetch(...args).then(response => {
    console.log('Custom fetch hook 2');
    window.library.stall(50);
    return response;
  });
};

window.library.xhr = url => {
  console.log('Custom xhr hook 1');
  return new Promise(resolve => {
    const oReq = new XMLHttpRequest();
    oReq.addEventListener('load', resolve);
    oReq.open('GET', url);
    oReq.send();
    console.log('Custom xhr hook 2');
    window.library.stall(50);
  });
};

/**
 * Stalls the main thread for timeInMs
 */
window.library.stall = function(timeInMs) {
  const start = performance.now();
  while (performance.now() - start < timeInMs) {
    for (let i = 0; i < 1000000; i++) ;
  }
};

