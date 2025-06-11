/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {render, h} from 'preact';

import {App} from './src/app';

export function renderFlowReport(
  flowResult: LH.FlowResult,
  root: HTMLElement,
  options?: LH.FlowReportOptions
) {
  root.classList.add('flow-vars', 'lh-vars', 'lh-root');
  render(h(App, {flowResult, options}), root);
}
