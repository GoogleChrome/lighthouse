/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

import fs from 'fs';
import fetch from 'node-fetch';
import { LH_ROOT } from '../../shared/root.js';

const artifactsDefinitionPath = LH_ROOT +
  '/types/artifacts.d.ts';
const artifactsDefinitionSource = fs.readFileSync(artifactsDefinitionPath, 'utf-8');

describe('issueAdded types', () => {
  /** @type {Array<LH.Crdp.Audits.InspectorIssueDetails>} */
  let inspectorIssueDetailsTypes;

  before(async () => {
    const browserProtocolUrl =
      'https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/browser_protocol.json';
    const json = await fetch(browserProtocolUrl).then(r => r.json());

    inspectorIssueDetailsTypes = json.domains
      .find(d => d.domain === 'Audits').types
      .find(t => t.id === 'InspectorIssueDetails').properties
      .map(t => t.name)
      .sort();
  });

  it('should notify us if something changed', () => {
    expect(inspectorIssueDetailsTypes).toMatchInlineSnapshot(`
Array [
  "attributionReportingIssueDetails",
  "blockedByResponseIssueDetails",
  "bounceTrackingIssueDetails",
  "clientHintIssueDetails",
  "contentSecurityPolicyIssueDetails",
  "cookieDeprecationMetadataIssueDetails",
  "cookieIssueDetails",
  "corsIssueDetails",
  "deprecationIssueDetails",
  "federatedAuthRequestIssueDetails",
  "federatedAuthUserInfoRequestIssueDetails",
  "genericIssueDetails",
  "heavyAdIssueDetails",
  "lowTextContrastIssueDetails",
  "mixedContentIssueDetails",
  "navigatorUserAgentIssueDetails",
  "propertyRuleIssueDetails",
  "quirksModeIssueDetails",
  "sharedArrayBufferIssueDetails",
  "stylesheetLoadingIssueDetails",
]
`);
  });

  it('are each handled explicitly in the gatherer', () => {
    const sourceTypeMatches = artifactsDefinitionSource.matchAll(
      /Crdp\.Audits\.(.*?Details)/g
    );

    const sourceTypeMatchIds = [...sourceTypeMatches]
      .map(match => match[1])
      // mapping TS type casing (TitleCase) to protocol types (camelCase)
      .map(id => `${id.slice(0, 1).toLowerCase()}${id.slice(1)}`)
      .sort();

    expect(sourceTypeMatchIds).toMatchObject(inspectorIssueDetailsTypes);
  });
});
