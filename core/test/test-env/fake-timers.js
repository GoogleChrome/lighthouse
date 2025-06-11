/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ModernFakeTimers} from '@jest/fake-timers';

/**
 * @param {string} id
 */
function timerIdToRef(id) {
  return {
    id,
    ref() {
      return this;
    },
    unref() {
      return this;
    },
  };
}

/**
 * @param {{id: string}} timer
 */
const timerRefToId = timer => (timer && timer.id) || undefined;

const timers = new ModernFakeTimers({
  global,
  config: {
    // @ts-expect-error
    idToRef: timerIdToRef,
    refToId: timerRefToId,
  },
});

export {timers};
