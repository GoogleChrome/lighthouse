/* eslint-disable max-len */

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Generates a new insight audit for every insight that does not
 * already have one.
 */

import fs from 'fs';

import {LH_ROOT} from '../../shared/root.js';

function getAllInsightNames() {
  const matches = fs.readFileSync('node_modules/@paulirish/trace_engine/models/trace/insights/Models.js', 'utf-8')
    .matchAll(/as ([a-zA-Z]+)/g);
  return [...matches].map(m => m[1]).sort();
}

/**
 * @param {string} str
 * @return {string}
 */
function kebabize(str) {
  return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
}

/**
 * @param {string} insightName
 * @param {string} auditId
 * @return {string}
 */
function createAuditCode(insightName, auditId) {
  return `
/**
 * @license
 * Copyright ${new Date().getFullYear()} Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/${insightName}.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/${insightName}.js', UIStrings);

class ${insightName}Insight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: '${auditId}',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3, // TODO: confirm/change.
      requiredArtifacts: ['traces', 'TraceElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    // TODO: implement.
    return adaptInsightToAuditProduct(artifacts, context, '${insightName}', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = [
      ];
      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default ${insightName}Insight;
`.trim() + '\n';
}

const insightNames = getAllInsightNames();

const allAuditIds = [];
for (const insightName of insightNames) {
  const auditId = `${kebabize(insightName)}-insight`;
  allAuditIds.push(auditId);

  const outputFile = `${LH_ROOT}/core/audits/insights/${auditId}.js`;
  if (fs.existsSync(outputFile)) {
    continue;
  }

  const code = createAuditCode(insightName, auditId);
  fs.writeFileSync(outputFile, code);
}

/**
 * @param {string} text
 * @param {string} needleStart
 * @param {string} needleEnd
 * @param {string} replacementText
 * @return {string}
 */
function insert(text, needleStart, needleEnd, replacementText) {
  const startIndex = text.indexOf(needleStart) + needleStart.length;
  const endIndex = text.indexOf(needleEnd, startIndex);
  return text.slice(0, startIndex) + replacementText + text.slice(endIndex);
}

allAuditIds.sort();

const defaultConfigPath = `${LH_ROOT}/core/config/default-config.js`;
let defaultConfigText = fs.readFileSync(defaultConfigPath, 'utf-8');

const auditListCode = allAuditIds.map(id => `    'insights/${id}',\n`).join('') + '  ';
defaultConfigText = insert(defaultConfigText, `'bf-cache',\n`, ']', auditListCode);

const auditRefListCode = allAuditIds.map(id => `        {id: '${id}', weight: 0, group: 'hidden'},`).join('\n');
defaultConfigText = insert(defaultConfigText, 'Insight audits.\n', '\n\n', auditRefListCode);

fs.writeFileSync(defaultConfigPath, defaultConfigText);
