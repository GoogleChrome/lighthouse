/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import {MessageChannel} from 'worker_threads';

import jestMock from 'jest-mock';
import {JSDOM, VirtualConsole} from 'jsdom';
import * as preact from 'preact';

import {LH_ROOT} from '../../../shared/root.js';

// These modules aren't imported correctly if these directories aren't defined to use ES modules.
// Similar to this, which was resolved but their fix didn't work for us:
// https://github.com/testing-library/preact-testing-library/issues/36#issuecomment-1136484478
fs.writeFileSync(`${LH_ROOT}/node_modules/@testing-library/preact/dist/esm/package.json`,
  '{"type": "module"}');
fs.writeFileSync(`${LH_ROOT}/node_modules/@testing-library/preact-hooks/src/package.json`,
  '{"type": "module"}');

const rootHooks = {
  beforeAll() {
    // @ts-expect-error
    global.React = preact;
  },
  beforeEach() {
    const virtualConsole = new VirtualConsole();
    // jsdom 12 is old and cannot parse modern CSS (e.g. @container, cqi).
    // We suppress these errors because they create a lot of noise and don't fail the tests.
    virtualConsole.on('error', (err) => {
      if (err.message && err.message.includes('Could not parse CSS stylesheet')) return;
      console.error(err);
    });

    const {window} = new JSDOM(undefined, {
      url: 'file:///Users/example/report.html/',
      virtualConsole,
    });
    global.window = window as any;
    global.document = window.document;
    global.location = window.location;
    global.self = global.window;

    // Use JSDOM types as necessary.
    global.Blob = window.Blob;
    global.HTMLElement = window.HTMLElement;
    global.HTMLInputElement = window.HTMLInputElement;
    global.CustomEvent = window.CustomEvent;

    // Functions not implemented in JSDOM.
    window.Element.prototype.scrollIntoView = jestMock.fn();
    global.self.matchMedia = jestMock.fn<any>(() => ({
      addListener: jestMock.fn(),
    }));

    // @ts-expect-error: for @testing-library/preact-hooks
    global.MessageChannel = MessageChannel;

    // @ts-expect-error
    global.requestAnimationFrame = fn => fn();
  },
};

export {
  rootHooks,
};
