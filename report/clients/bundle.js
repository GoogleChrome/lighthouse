/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// This file is used to generate a bundle that can be imported
// into an esmodules codebase to render the lighthouse report.
// Currently, embedders must handle some boilerplate themselves (like standalone.js)
// until we work out a common rendering interface.
// See: https://github.com/GoogleChrome/lighthouse/pull/12623

// Modify core/scripts/roll-to-devtools.sh if exports change.
export {DOM} from '../renderer/dom.js';
export {ReportRenderer} from '../renderer/report-renderer.js';
export {ReportUIFeatures} from '../renderer/report-ui-features.js';
export {renderReport} from '../renderer/api.js';
export {swapLocale, format} from '../../shared/localization/i18n-module.js';
