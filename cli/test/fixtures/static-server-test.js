/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import fetch from 'node-fetch';

import {Server} from './static-server.js';

describe('Server', () => {
  let server;
  before(async () => {
    server = new Server(10200);
    await server.listen(10200, 'localhost');
  });

  after(async () => {
    await server.close();
  });

  afterEach(() => {
    server.setDataTransformer(undefined);
  });

  it('fetches fixture', async () => {
    const res = await fetch(`http://localhost:${server.getPort()}/dobetterweb/dbw_tester.html`);
    const data = await res.text();
    const expected = fs.readFileSync(`${server.baseDir}/dobetterweb/dbw_tester.html`, 'utf-8');
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
