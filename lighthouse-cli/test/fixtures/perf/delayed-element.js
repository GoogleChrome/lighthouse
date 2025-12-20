/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/* eslint-disable */

// largest-contentful-paint-element: add the largest element later in page load
// layout-shift-elements: shift down the `<h1>` in the page
setTimeout(() => {
  const imgEl = document.createElement('img');
  imgEl.src = '../dobetterweb/lighthouse-480x318.jpg';
  const textEl = document.createElement('span');
  textEl.textContent = 'Sorry!';
  const top = document.getElementById('late-content');
  top.appendChild(imgEl);
  top.appendChild(textEl);
}, 1000);

// long-tasks: add a very long task at least 500ms
const start = performance.now();
while (performance.now() - start < 800) {
  for (let i = 0; i < 1000000; i++) ;
}
