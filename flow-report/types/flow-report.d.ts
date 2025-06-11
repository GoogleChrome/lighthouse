/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import FlowResult_ from '../../types/lhr/flow-result';
import * as Settings from '../../types/lhr/settings';

// Import to augment querySelector/querySelectorAll with stricter type checking.
import '../../types/query-selector';
import '../../report/types/html-renderer';

declare global {
  interface Window {
    __LIGHTHOUSE_FLOW_JSON__: FlowResult_;
    __initLighthouseFlowReport__: () => void;
  }

  // Expose global types in LH namespace.
  module LH {
    export type ConfigSettings = Settings.ConfigSettings;

    export interface FlowReportOptions {
      getReportHtml?: (flowResult: FlowResult_) => string;
      saveAsGist?: (flowResult: FlowResult_) => void;
    }

    export interface HashState {
      currentLhr: Result;
      index: number;
      anchor: string|null;
    }

    export import FlowResult = FlowResult_;
  }
}

export {};
