/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Call this script to update assets/jsonldcontext.json with the latest schema.org spec
 */

const fetch = require('isomorphic-fetch');
const path = require('path');
const fs = require('fs');

const SCHEMA_ORG_URL = 'https://schema.org';
const CONTEXT_FILE = path.join(__dirname, '../assets/jsonldcontext.json');

async function run() {
  try {
    const response = await fetch(SCHEMA_ORG_URL, {headers: {Accept: 'application/ld+json'}});
    const data = await response.json();
    fs.writeFileSync(CONTEXT_FILE, JSON.stringify(data, null, 2));
    console.log('Success.'); // eslint-disable-line no-console
  } catch (e) {
    console.error(e); // eslint-disable-line no-console
  }
}

run();
