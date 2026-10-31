/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as jestMock from 'jest-mock';
import {JSDOM, VirtualConsole} from 'jsdom';
import * as preact from 'preact';

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

    // @ts-expect-error
    global.requestAnimationFrame = fn => fn();
  },
};

export {
  rootHooks,
};
