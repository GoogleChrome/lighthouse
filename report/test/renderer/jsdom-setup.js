/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {VirtualConsole} from 'jsdom';

/**
 * Creates a JSDOM VirtualConsole that ignores noisy CSS parsing errors.
 * @return {VirtualConsole}
 */
export function createQuietConsole() {
  const virtualConsole = new VirtualConsole();
  // jsdom 12 is old and cannot parse modern CSS (e.g. @container, cqi).
  // We suppress these errors because they create a lot of noise and don't fail the tests.
  virtualConsole.on('error', (err) => {
    if (err.message && err.message.includes('Could not parse CSS stylesheet')) return;
    console.error(err);
  });
  return virtualConsole;
}
