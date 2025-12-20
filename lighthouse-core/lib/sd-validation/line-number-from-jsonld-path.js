/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @param {*} obj - JSON-LD object
 * @param {string} path - slash-separated path in the JSON-LD object (uses relative URIs)
 * @returns {null | number} - line number of the path value in the prettified JSON
 */
function getLineNumberFromJsonLDPath(obj, path) {
  // To avoid having an extra dependency on a JSON parser we set a unique key in the
  // object and then use that to identify the correct line
  const searchKey = Math.random().toString();
  obj = JSON.parse(JSON.stringify(obj));

  setValueAtJsonLDPath(obj, path, searchKey);
  const jsonLines = JSON.stringify(obj, null, 2).split('\n');
  const lineIndex = jsonLines.findIndex(line => line.includes(searchKey));

  return lineIndex === -1 ? null : lineIndex + 1;
}

/**
 * @param {*} obj
 * @param {string} path
 * @param {*} value
 */
function setValueAtJsonLDPath(obj, path, value) {
  const pathParts = path.split('/').filter(p => !!p);
  let currentObj = obj;
  pathParts.forEach((pathPart, i) => {
    if (pathPart === '0' && !Array.isArray(currentObj)) {
      // jsonld expansion turns single values into arrays
      return;
    }

    const isLastPart = pathParts.length - 1 === i;
    for (const key of Object.keys(currentObj)) {
      // The actual key in JSON might be an absolute IRI like "http://schema.org/author"
      // but key provided by validator is "author"
      const keyParts = key.split('/');
      const relativeKey = keyParts[keyParts.length - 1];
      if (relativeKey === pathPart) {
        // If we've arrived at the end of the provided path set the value, otherwise
        // continue iterating with the object at the key location
        if (isLastPart) {
          currentObj[key] = value;
        } else {
          currentObj = currentObj[key];
        }
        return;
      }
    }
  });
}

module.exports = getLineNumberFromJsonLDPath;
