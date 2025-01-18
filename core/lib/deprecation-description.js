/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as i18n from '../lib/i18n/i18n.js';
import {DEPRECATIONS_METADATA, UIStrings as DeprecationUIStrings} from './deprecations-strings.js';

const UIStrings = {
  // Store strings used across messages in this block.
  /**
   * @description This links to the chrome feature status page when one exists.
   */
  feature: 'Check the feature status page for more details.',
  /**
   * @description This links to the chromium dash schedule when a milestone is set.
   * @example {100} milestone
   */
  milestone: 'This change will go into effect with milestone {milestone}.',
  /**
   * @description Title of issue raised when a deprecated feature is used
   */
  title: 'Deprecated Feature Used',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);
const deprecationsStr_ = i18n.createIcuMessageFn(import.meta.url, DeprecationUIStrings);

/**
 * @param {LH.Crdp.Audits.DeprecationIssueDetails} issueDetails
 */
function getIssueDetailDescription(issueDetails) {
  let message;
  const type = /** @type {keyof DEPRECATIONS_METADATA} */ (issueDetails.type);
  const maybeEnglishMessage = DeprecationUIStrings[type];
  if (maybeEnglishMessage) {
    message = deprecationsStr_(maybeEnglishMessage);
  }

  const links = [];
  /** @type {{chromeStatusFeature?: number, milestone?: number}|undefined} */
  const deprecationMeta = DEPRECATIONS_METADATA[type];
  const feature = deprecationMeta?.chromeStatusFeature ?? 0;
  if (feature !== 0) {
    links.push({
      link: `https://chromestatus.com/feature/${feature}`,
      linkTitle: str_(UIStrings.feature),
    });
  }
  const milestone = deprecationMeta?.milestone ?? 0;
  if (milestone !== 0) {
    links.push({
      link: 'https://chromiumdash.appspot.com/schedule',
      linkTitle: str_(UIStrings.milestone, {milestone}),
    });
  }
  return ({
    substitutions: new Map([
      ['PLACEHOLDER_title', str_(UIStrings.title)],
      ['PLACEHOLDER_message', message],
    ]),
    links,
    message,
  });
}

export {
  getIssueDetailDescription,
  UIStrings,
};
