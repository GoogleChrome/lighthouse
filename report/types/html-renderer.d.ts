/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import AuditDetails from '../../types/lhr/audit-details';
import {FormattedIcu as FormattedIcu_, IcuMessage as IcuMessage_} from '../../types/lhr/i18n';
import LHResult from '../../types/lhr/lhr';
import ReportResult_ from './report-result';
import Renderer_ from './report-renderer';
import * as Settings from '../../types/lhr/settings';
import Treemap_ from '../../types/lhr/treemap';

declare global {
  // Expose global types in LH namespace.
  module LH {
    export import Result = LHResult;
    export import ReportResult = ReportResult_;
    export import Renderer = Renderer_;
    export import Locale = Settings.Locale;
    export type IcuMessage = IcuMessage_;
    export type FormattedIcu<T> = FormattedIcu_<T>;

    module Audit {
      export import Details = AuditDetails;
    }

    export import Treemap = Treemap_;
  }
}
