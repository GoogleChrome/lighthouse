/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import {resolveNodeIdToObjectId} from '../driver/dom.js';
import {pageFunctions} from '../../lib/page-functions.js';
import {ExecutionContext} from '../driver/execution-context.js';

class WebMcpSchemaIssues extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['navigation', 'snapshot'],
  };

  constructor() {
    super();
    /** @type {LH.Artifacts.WebMcpSchemaIssue[]} */
    this._issues = [];
    this._onIssueAdded = this.onIssueAdded.bind(this);
  }

  /**
   * @param {Record<string, any>} event
   */
  onIssueAdded(event) {
    const issue = event.issue;
    if (!issue || issue.code !== 'GenericIssue') return;

    const details = issue.details?.genericIssueDetails;
    if (!details) return;

    const errorType = details.errorType;
    if (errorType && (
      errorType === 'FormModelContextMissingToolName' ||
      errorType === 'FormModelContextMissingToolDescription' ||
      errorType === 'FormModelContextRequiredParameterMissingName' ||
      errorType === 'FormModelContextParameterMissingTitleAndDescription' ||
      errorType === 'FormModelContextParameterMissingName'
    )) {
      this._issues.push(details);
    }
  }

  /**
   * @param {LH.Gatherer.Context} passContext
   */
  async startInstrumentation(passContext) {
    const session = passContext.driver.defaultSession;
    session.on('Audits.issueAdded', this._onIssueAdded);
    await session.sendCommand('Audits.enable');
  }

  /**
   * @param {LH.Gatherer.Context} passContext
   */
  async stopInstrumentation(passContext) {
    const session = passContext.driver.defaultSession;
    session.off('Audits.issueAdded', this._onIssueAdded);
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts.WebMcpSchemaIssue[]>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;

    const deps = ExecutionContext.serializeDeps([
      pageFunctions.getNodeDetails,
    ]);

    const promises = this._issues.map(async (issue) => {
      const processedIssue = {...issue};
      if (issue.violatingNodeId) {
        try {
          const objectId = await resolveNodeIdToObjectId(session, issue.violatingNodeId);
          if (objectId) {
            const response = await session.sendCommand('Runtime.callFunctionOn', {
              objectId,
              functionDeclaration: `function () {
                ${deps}
                return getNodeDetails(this);
              }`,
              returnByValue: true,
              awaitPromise: true,
            });
            if (response && response.result && response.result.value) {
              processedIssue.nodeDetails = response.result.value;
            }
          }
        } catch (err) {
          // Ignore error
        }
      }
      return processedIssue;
    });

    return Promise.all(promises);
  }
}

export default WebMcpSchemaIssues;
