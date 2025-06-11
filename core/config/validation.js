/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audits/audit.js';
import BaseGatherer from '../gather/base-gatherer.js';
import * as i18n from '../lib/i18n/i18n.js';

/**
 * Determines if the artifact dependency direction is valid. The dependency's minimum supported mode
 * must be less than or equal to the dependent's.
 *
 * @param {LH.Config.AnyGathererDefn} dependent The artifact that depends on the other.
 * @param {LH.Config.AnyGathererDefn} dependency The artifact that is being depended on by the other.
 * @return {boolean}
 */
function isValidArtifactDependency(dependent, dependency) {
  const levels = {timespan: 0, snapshot: 1, navigation: 2};
  const dependentLevel = Math.min(...dependent.instance.meta.supportedModes.map(l => levels[l]));
  const dependencyLevel = Math.min(...dependency.instance.meta.supportedModes.map(l => levels[l]));

  // A timespan artifact cannot depend on a snapshot/navigation artifact because it might run without a snapshot.
  if (dependentLevel === levels.timespan) return dependencyLevel === levels.timespan;
  // A snapshot artifact cannot depend on a timespan/navigation artifact because it might run without a timespan.
  if (dependentLevel === levels.snapshot) return dependencyLevel === levels.snapshot;
  // A navigation artifact can depend on anything.
  return true;
}

/**
 * Throws if pluginName is invalid or (somehow) collides with a category in the
 * config being added to.
 * @param {LH.Config} config
 * @param {string} pluginName
 */
function assertValidPluginName(config, pluginName) {
  if (!pluginName.startsWith('lighthouse-plugin-')) {
    throw new Error(`plugin name '${pluginName}' does not start with 'lighthouse-plugin-'`);
  }

  if (config.categories?.[pluginName]) {
    throw new Error(`plugin name '${pluginName}' not allowed because it is the id of a category already found in config`); // eslint-disable-line max-len
  }
}

/**
 * Throws an error if the provided object does not implement the required gatherer interface.
 * @param {LH.Config.AnyArtifactDefn} artifactDefn
 */
function assertValidArtifact(artifactDefn) {
  const gatherer = artifactDefn.gatherer.instance;

  if (typeof gatherer.meta !== 'object') {
    throw new Error(`Gatherer for ${artifactDefn.id} did not provide a meta object.`);
  }

  if (gatherer.meta.supportedModes.length === 0) {
    throw new Error(`Gatherer for ${artifactDefn.id} did not support any gather modes.`);
  }

  if (
    typeof gatherer.getArtifact !== 'function' ||
    gatherer.getArtifact === BaseGatherer.prototype.getArtifact
  ) {
    throw new Error(`Gatherer for ${artifactDefn.id} did not define a "getArtifact" method.`);
  }
}

/**
 * Throws an error if the provided object does not implement the required properties of an audit
 * definition.
 * @param {LH.Config.AuditDefn} auditDefinition
 */
function assertValidAudit(auditDefinition) {
  const {implementation, path: auditPath} = auditDefinition;
  const auditName = auditPath ||
    implementation?.meta?.id ||
    'Unknown audit';

  if (typeof implementation.audit !== 'function' || implementation.audit === Audit.audit) {
    throw new Error(`${auditName} has no audit() method.`);
  }

  if (typeof implementation.meta.id !== 'string') {
    throw new Error(`${auditName} has no meta.id property, or the property is not a string.`);
  }

  if (!i18n.isStringOrIcuMessage(implementation.meta.title)) {
    throw new Error(`${auditName} has no meta.title property, or the property is not a string.`);
  }

  // If it'll have a ✔ or ✖ displayed alongside the result, it should have failureTitle
  const scoreDisplayMode = implementation.meta.scoreDisplayMode || Audit.SCORING_MODES.BINARY;
  if (
    !i18n.isStringOrIcuMessage(implementation.meta.failureTitle) &&
    scoreDisplayMode === Audit.SCORING_MODES.BINARY
  ) {
    throw new Error(`${auditName} has no meta.failureTitle and should.`);
  }

  if (!i18n.isStringOrIcuMessage(implementation.meta.description)) {
    throw new Error(
      `${auditName} has no meta.description property, or the property is not a string.`
    );
  } else if (implementation.meta.description === '') {
    throw new Error(
      `${auditName} has an empty meta.description string. Please add a description for the UI.`
    );
  }

  if (!Array.isArray(implementation.meta.requiredArtifacts)) {
    throw new Error(
      `${auditName} has no meta.requiredArtifacts property, or the property is not an array.`
    );
  }
}

/**
 * @param {LH.Config.ResolvedConfig['categories']} categories
 * @param {LH.Config.ResolvedConfig['audits']} audits
 * @param {LH.Config.ResolvedConfig['groups']} groups
 */
function assertValidCategories(categories, audits, groups) {
  if (!categories) {
    return;
  }

  /** @type {Map<string, LH.Config.AuditDefn>} */
  const auditsKeyedById = new Map((audits || []).map(audit => {
    return [audit.implementation.meta.id, audit];
  }));

  Object.keys(categories).forEach(categoryId => {
    categories[categoryId].auditRefs.forEach((auditRef, index) => {
      if (!auditRef.id) {
        throw new Error(`missing an audit id at ${categoryId}[${index}]`);
      }

      const audit = auditsKeyedById.get(auditRef.id);
      if (!audit) {
        throw new Error(`could not find ${auditRef.id} audit for category ${categoryId}`);
      }

      const auditImpl = audit.implementation;
      const isManual = auditImpl.meta.scoreDisplayMode === 'manual';
      if (categoryId === 'accessibility' && !auditRef.group && !isManual) {
        throw new Error(`${auditRef.id} accessibility audit does not have a group`);
      }

      if (auditRef.weight > 0 && isManual) {
        throw new Error(`${auditRef.id} is manual but has a positive weight`);
      }

      if (auditRef.group && (!groups || !groups[auditRef.group])) {
        throw new Error(`${auditRef.id} references unknown group ${auditRef.group}`);
      }
    });
  });
}

/**
 * Validate the settings after they've been built.
 * @param {LH.Config.Settings} settings
 */
function assertValidSettings(settings) {
  if (!settings.formFactor) {
    throw new Error(`\`settings.formFactor\` must be defined as 'mobile' or 'desktop'. See https://github.com/GoogleChrome/lighthouse/blob/main/docs/emulation.md`);
  }

  if (!settings.screenEmulation.disabled) {
    // formFactor doesn't control emulation. So we don't want a mismatch:
    //   Bad mismatch A: user wants mobile emulation but scoring is configured for desktop
    //   Bad mismtach B: user wants everything desktop and set formFactor, but accidentally not screenEmulation
    if (settings.screenEmulation.mobile !== (settings.formFactor === 'mobile')) {
      throw new Error(`Screen emulation mobile setting (${settings.screenEmulation.mobile}) does not match formFactor setting (${settings.formFactor}). See https://github.com/GoogleChrome/lighthouse/blob/main/docs/emulation.md`);
    }
  }

  const skippedAndOnlyAuditId =
    settings.skipAudits?.find(auditId => settings.onlyAudits?.includes(auditId));
  if (skippedAndOnlyAuditId) {
    throw new Error(`${skippedAndOnlyAuditId} appears in both skipAudits and onlyAudits`);
  }
}

/**
 * Asserts that artifacts are unique, valid and are in a dependency order that can be computed.
 *
 * @param {Array<LH.Config.AnyArtifactDefn>} artifactDefns
 */
function assertValidArtifacts(artifactDefns) {
  /** @type {Set<string>} */
  const availableArtifacts = new Set();

  for (const artifact of artifactDefns) {
    assertValidArtifact(artifact);

    if (availableArtifacts.has(artifact.id)) {
      throw new Error(`Config defined multiple artifacts with id '${artifact.id}'`);
    }

    availableArtifacts.add(artifact.id);
    if (!artifact.dependencies) continue;

    for (const [dependencyKey, {id: dependencyId}] of Object.entries(artifact.dependencies)) {
      if (availableArtifacts.has(dependencyId)) continue;
      throwInvalidDependencyOrder(artifact.id, dependencyKey);
    }
  }
}

/**
 * @param {LH.Config.ResolvedConfig} resolvedConfig
 */
function assertValidConfig(resolvedConfig) {
  assertValidArtifacts(resolvedConfig.artifacts || []);

  for (const auditDefn of resolvedConfig.audits || []) {
    assertValidAudit(auditDefn);
  }

  assertValidCategories(resolvedConfig.categories, resolvedConfig.audits, resolvedConfig.groups);
  assertValidSettings(resolvedConfig.settings);
}

/**
 * @param {string} artifactId
 * @param {string} dependencyKey
 * @return {never}
 */
function throwInvalidDependencyOrder(artifactId, dependencyKey) {
  throw new Error(
    [
      `Failed to find dependency "${dependencyKey}" for "${artifactId}" artifact`,
      `Check that...`,
      `  1. A gatherer exposes a matching Symbol that satisfies "${dependencyKey}".`,
      `  2. "${dependencyKey}" is configured to run before "${artifactId}"`,
    ].join('\n')
  );
}

/**
 * @param {string} artifactId
 * @param {string} dependencyKey
 * @return {never}
 */
function throwInvalidArtifactDependency(artifactId, dependencyKey) {
  throw new Error(
    [
      `Dependency "${dependencyKey}" for "${artifactId}" artifact is invalid.`,
      `The dependency must be collected before the dependent.`,
    ].join('\n')
  );
}

export {
  isValidArtifactDependency,
  assertValidPluginName,
  assertValidArtifact,
  assertValidAudit,
  assertValidCategories,
  assertValidSettings,
  assertValidArtifacts,
  assertValidConfig,
  throwInvalidDependencyOrder,
  throwInvalidArtifactDependency,
};
