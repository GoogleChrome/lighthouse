/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {IcuMessage as IcuMessage_} from '../../types/lhr/i18n';
import LHResult from '../../types/lhr/lhr';
import FlowResult_ from '../../types/lhr/flow-result';

import {Locale as Locale_} from '../../types/lhr/settings';

declare global {
  // Expose global types in LH namespace.
  module LH {
    export import Result = LHResult;
    export import FlowResult = FlowResult_;
    export type IcuMessage = IcuMessage_;
    export type IcuMessagePaths = LHResult.IcuMessagePaths;
    export type Locale = Locale_;
  }
}

export {};
