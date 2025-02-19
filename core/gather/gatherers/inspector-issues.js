/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Capture IssueAdded events
 */


import BaseGatherer from '../base-gatherer.js';
import {NetworkRecords} from '../../computed/network-records.js';
import DevtoolsLog from './devtools-log.js';

class InspectorIssues extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  constructor() {
    super();
    /** @type {Array<LH.Crdp.Audits.InspectorIssue>} */
    this._issues = [];
    this._onIssueAdded = this.onIssueAdded.bind(this);
  }

  /**
   * @param {LH.Crdp.Audits.IssueAddedEvent} entry
   */
  onIssueAdded(entry) {
    this._issues.push(entry.issue);
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    session.on('Audits.issueAdded', this._onIssueAdded);
    await session.sendCommand('Audits.enable');
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async stopInstrumentation(context) {
    const session = context.driver.defaultSession;
    session.off('Audits.issueAdded', this._onIssueAdded);
    await session.sendCommand('Audits.disable');
  }

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['InspectorIssues']>}
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);

    /** @type {LH.Artifacts.InspectorIssues} */
    const artifact = {
      attributionReportingIssue: [],
      blockedByResponseIssue: [],
      bounceTrackingIssue: [],
      clientHintIssue: [],
      contentSecurityPolicyIssue: [],
      cookieDeprecationMetadataIssue: [],
      corsIssue: [],
      deprecationIssue: [],
      federatedAuthRequestIssue: [],
      genericIssue: [],
      heavyAdIssue: [],
      lowTextContrastIssue: [],
      mixedContentIssue: [],
      navigatorUserAgentIssue: [],
      partitioningBlobURLIssue: [],
      propertyRuleIssue: [],
      quirksModeIssue: [],
      cookieIssue: [],
      selectElementAccessibilityIssue: [],
      sharedArrayBufferIssue: [],
      sharedDictionaryIssue: [],
      stylesheetLoadingIssue: [],
      sriMessageSignatureIssue: [],
      federatedAuthUserInfoRequestIssue: [],
    };
    const keys = /** @type {Array<keyof LH.Artifacts['InspectorIssues']>} */(Object.keys(artifact));
    for (const key of keys) {
      /** @type {`${key}Details`} */
      const detailsKey = `${key}Details`;
      const allDetails = this._issues.map(issue => issue.details[detailsKey]);
      for (const detail of allDetails) {
        if (!detail) {
          continue;
        }
        // Duplicate issues can occur for the same request; only use the one with a matching networkRequest.
        const requestId = 'request' in detail && detail.request && detail.request.requestId;
        if (requestId) {
          if (networkRecords.find(req => req.requestId === requestId)) {
            // @ts-expect-error - detail types are not all compatible
            artifact[key].push(detail);
          }
        } else {
          // @ts-expect-error - detail types are not all compatible
          artifact[key].push(detail);
        }
      }
    }

    return artifact;
  }
}

export default InspectorIssues;
