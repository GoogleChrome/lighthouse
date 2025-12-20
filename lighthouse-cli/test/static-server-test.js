/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const fetch = require('isomorphic-fetch');
const {server} = require('./fixtures/static-server.js');

/* eslint-env jest */

describe('Server', () => {
  beforeAll(async () => {
    await server.listen(10200, 'localhost');
  });

  afterAll(async () => {
    await server.close();
  });

  afterEach(() => {
    server.setDataTransformer(undefined);
  });

  it('fetches fixture', async () => {
    const res = await fetch(`http://localhost:${server.getPort()}/dobetterweb/dbw_tester.html`);
    const data = await res.text();
    const expected = fs.readFileSync(`${__dirname}/fixtures/dobetterweb/dbw_tester.html`, 'utf-8');
    expect(data).toEqual(expected);
  });

  it('setDataTransformer', async () => {
    server.setDataTransformer(() => {
      return 'hello there';
    });

    const res = await fetch(`http://localhost:${server.getPort()}/dobetterweb/dbw_tester.html`);
    const data = await res.text();
    expect(data).toEqual('hello there');
  });
});
