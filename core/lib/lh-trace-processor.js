/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LighthouseError} from '../lib/lh-error.js';
import {TraceProcessor} from '../lib/tracehouse/trace-processor.js';

// TraceProcessor throws generic errors, but we'd like our special localized and code-specific LighthouseError
// objects to be thrown instead.
class LHTraceProcessor extends TraceProcessor {
  /**
   * @return {Error}
   */
  static createNoNavstartError() {
    return new LighthouseError(LighthouseError.errors.NO_NAVSTART);
  }

  /**
   * This isn't currently used, but will be when the time origin of trace processing is changed.
   * @see {TraceProcessor.computeTimeOrigin}
   * @see https://github.com/GoogleChrome/lighthouse/pull/11253#discussion_r507985527
   * @return {Error}
   */
  static createNoResourceSendRequestError() {
    return new LighthouseError(LighthouseError.errors.NO_RESOURCE_REQUEST);
  }

  /**
   * @return {Error}
   */
  static createNoTracingStartedError() {
    return new LighthouseError(LighthouseError.errors.NO_TRACING_STARTED);
  }

  /**
   * @return {Error}
   */
  static createNoFirstContentfulPaintError() {
    return new LighthouseError(LighthouseError.errors.NO_FCP);
  }
}

export default LHTraceProcessor;
