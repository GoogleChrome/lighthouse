/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {EventEmitter} from 'events';

declare module 'enquirer' {
  interface ConfirmOption {
    name: string | (() => string);
    message: string | (() => string);
    initial?: boolean | (() => boolean);
    actions?: {'ctrl': {[key: string]: string}}
  }

  class Confirm extends EventEmitter {
    constructor(option: ConfirmOption);
    run: () => Promise<boolean>;
    close: () => Promise<void>
  }
}
