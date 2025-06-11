/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Ensures `<iframe>` and `<frame>` elements contain a non-empty title attribute.
 * See base class in axe-audit.js for audit() implementation.
 */

import AxeAudit from './axe-audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of an accesibility audit that evaluates if all `<frame>` and `<iframe>` elements on the page have a title HTML attribute to describe their contents. This title is descriptive of the successful state and is shown to users when no user action is required. */
  title: '`<frame>` or `<iframe>` elements have a title',
  /** Title of an accesibility audit that evaluates if all `<frame>` and `<iframe>` elements on the page have a title HTML attribute to describe their contents. This title is descriptive of the failing state and is shown to users when there is a failure that needs to be addressed. */
  failureTitle: '`<frame>` or `<iframe>` elements do not have a title',
  /** Description of a Lighthouse audit that tells the user *why* they should try to pass. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Screen reader users rely on frame titles to describe the contents of frames. ' +
      '[Learn more about frame titles](https://dequeuniversity.com/rules/axe/4.10/frame-title).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class FrameTitle extends AxeAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'frame-title',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Accessibility'],
    };
  }
}

export default FrameTitle;
export {UIStrings};
