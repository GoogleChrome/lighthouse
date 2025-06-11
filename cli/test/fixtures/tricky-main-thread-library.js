/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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

