/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {Audit} from '../audits/audit.js';

/** @type {Record<keyof LH.BaseArtifacts, string>} */
const baseArtifactKeySource = {
  fetchTime: '',
  LighthouseRunWarnings: '',
  BenchmarkIndex: '',
  HostDPR: '',
  settings: '',
  Timing: '',
  URL: '',
  PageLoadError: '',
  HostFormFactor: '',
  HostUserAgent: '',
  HostProduct: '',
  GatherContext: '',
};

const baseArtifactKeys = Object.keys(baseArtifactKeySource);

// Some audits are used by the report for additional information.
// Keep these audits unless they are *directly* skipped with `skipAudits`.
/** @type {string[]} */
const filterResistantAuditIds = [];

// Some artifacts are used by the report for additional information.
// Always run these artifacts even if audits do not request them.
// These are similar to base artifacts but they cannot be run in all 3 modes.
const filterResistantArtifactIds = ['Stacks', 'NetworkUserAgent', 'FullPageScreenshot'];

/**
 * Returns the set of audit IDs used in the list of categories.
 * If `onlyCategories` is not set, this function returns the list of all audit IDs across all
 * categories.
 *
 * @param {LH.Config.ResolvedConfig['categories']} allCategories
 * @param {string[] | undefined} onlyCategories
 * @return {Set<string>}
 */
function getAuditIdsInCategories(allCategories, onlyCategories) {
  if (!allCategories) return new Set();

  onlyCategories = onlyCategories || Object.keys(allCategories);
  const categories = onlyCategories.map(categoryId => allCategories[categoryId]);
  const auditRefs = categories.flatMap(category => category?.auditRefs || []);
  return new Set(auditRefs.map(auditRef => auditRef.id));
}

/**
 * Filters an array of artifacts down to the set that's required by the specified audits.
 *
 * @param {LH.Config.ResolvedConfig['artifacts']} artifacts
 * @param {LH.Config.ResolvedConfig['audits']} audits
 * @return {LH.Config.ResolvedConfig['artifacts']}
 */
function filterArtifactsByAvailableAudits(artifacts, audits) {
  if (!artifacts) return null;
  if (!audits) return artifacts;

  const artifactsById = new Map(artifacts.map(artifact => [artifact.id, artifact]));

  /** @type {Set<string>} */
  const artifactIdsToKeep = new Set([
    ...filterResistantArtifactIds,
    ...audits.flatMap(audit => audit.implementation.meta.requiredArtifacts),
  ]);

  // Keep all artifacts in the dependency tree of required artifacts.
  // Iterate through all kept artifacts, adding their dependencies along the way, until the set does not change.
  let previousSize = 0;
  while (previousSize !== artifactIdsToKeep.size) {
    previousSize = artifactIdsToKeep.size;
    for (const artifactId of artifactIdsToKeep) {
      const artifact = artifactsById.get(artifactId);
      // This shouldn't happen because the config has passed validation by this point.
      if (!artifact) continue;
      // If the artifact doesn't have any dependencies, we can move on.
      if (!artifact.dependencies) continue;
      // Add all of the artifact's dependencies to our set.
      for (const dep of Object.values(artifact.dependencies)) {
        artifactIdsToKeep.add(dep.id);
      }
    }
  }

  return artifacts.filter(artifact => artifactIdsToKeep.has(artifact.id));
}

/**
 * Filters an array of artifacts down to the set that supports the specified gather mode.
 *
 * @param {LH.Config.ResolvedConfig['artifacts']} artifacts
 * @param {LH.Gatherer.GatherMode} mode
 * @return {LH.Config.ResolvedConfig['artifacts']}
 */
function filterArtifactsByGatherMode(artifacts, mode) {
  if (!artifacts) return null;
  return artifacts.filter(artifact => {
    return artifact.gatherer.instance.meta.supportedModes.includes(mode);
  });
}

/**
 * Filters an array of audits down to the set that can be computed using only the specified artifacts.
 *
 * @param {LH.Config.ResolvedConfig['audits']} audits
 * @param {Array<LH.Config.AnyArtifactDefn>} availableArtifacts
 * @return {LH.Config.ResolvedConfig['audits']}
 */
function filterAuditsByAvailableArtifacts(audits, availableArtifacts) {
  if (!audits) return null;

  const availableArtifactIds = new Set(
    availableArtifacts.map(artifact => artifact.id).concat(baseArtifactKeys)
  );
  return audits.filter(audit => {
    const meta = audit.implementation.meta;
    return meta.requiredArtifacts.every(id => availableArtifactIds.has(id));
  });
}

/**
 * Optional `supportedModes` property can explicitly exclude an audit even if all required artifacts are available.
 *
 * @param {LH.Config.ResolvedConfig['audits']} audits
 * @param {LH.Gatherer.GatherMode} mode
 * @return {LH.Config.ResolvedConfig['audits']}
 */
function filterAuditsByGatherMode(audits, mode) {
  if (!audits) return null;

  return audits.filter(audit => {
    const meta = audit.implementation.meta;
    return !meta.supportedModes || meta.supportedModes.includes(mode);
  });
}

/**
 * Optional `supportedModes` property can explicitly exclude a category even if some audits are available.
 *
 * @param {LH.Config.ResolvedConfig['categories']} categories
 * @param {LH.Gatherer.GatherMode} mode
 * @return {LH.Config.ResolvedConfig['categories']}
 */
function filterCategoriesByGatherMode(categories, mode) {
  if (!categories) return null;

  const categoriesToKeep = Object.entries(categories)
    .filter(([_, category]) => {
      return !category.supportedModes || category.supportedModes.includes(mode);
    });
  return Object.fromEntries(categoriesToKeep);
}

/**
 * Filters a categories object and their auditRefs down to the specified category ids.
 *
 * @param {LH.Config.ResolvedConfig['categories']} categories
 * @param {string[] | null | undefined} onlyCategories
 * @return {LH.Config.ResolvedConfig['categories']}
 */
function filterCategoriesByExplicitFilters(categories, onlyCategories) {
  if (!categories || !onlyCategories) return categories;

  const categoriesToKeep = Object.entries(categories)
    .filter(([categoryId]) => onlyCategories.includes(categoryId));
  return Object.fromEntries(categoriesToKeep);
}

/**
 * Logs a warning if any specified onlyCategory is not a known category that can
 * be included.
 *
 * @param {LH.Config.ResolvedConfig['categories']} allCategories
 * @param {string[] | null} onlyCategories
 * @return {void}
 */
function warnOnUnknownOnlyCategories(allCategories, onlyCategories) {
  if (!onlyCategories) return;

  for (const onlyCategoryId of onlyCategories) {
    if (!allCategories?.[onlyCategoryId]) {
      log.warn('config', `unrecognized category in 'onlyCategories': ${onlyCategoryId}`);
    }
  }
}

/**
 * Filters a categories object and their auditRefs down to the set that can be computed using
 * only the specified audits.
 *
 * @param {LH.Config.ResolvedConfig['categories']} categories
 * @param {Array<LH.Config.AuditDefn>} availableAudits
 * @return {LH.Config.ResolvedConfig['categories']}
 */
function filterCategoriesByAvailableAudits(categories, availableAudits) {
  if (!categories) return categories;

  const availableAuditIdToMeta = new Map(
    availableAudits.map(audit => [audit.implementation.meta.id, audit.implementation.meta])
  );

  const categoryEntries = Object.entries(categories)
    .map(([categoryId, category]) => {
      const filteredCategory = {
        ...category,
        auditRefs: category.auditRefs.filter(ref => availableAuditIdToMeta.has(ref.id)),
      };

      const didFilter = filteredCategory.auditRefs.length < category.auditRefs.length;
      const hasOnlyManualAudits = filteredCategory.auditRefs.every(ref => {
        const meta = availableAuditIdToMeta.get(ref.id);
        if (!meta) return false;
        return meta.scoreDisplayMode === Audit.SCORING_MODES.MANUAL;
      });

      // If we filtered out audits and the only ones left are manual, remove them too.
      if (didFilter && hasOnlyManualAudits) filteredCategory.auditRefs = [];

      return [categoryId, filteredCategory];
    })
    .filter(entry => typeof entry[1] === 'object' && entry[1].auditRefs.length);

  return Object.fromEntries(categoryEntries);
}

/**
 * Filters a config's artifacts, audits, and categories down to the set that supports the specified gather mode.
 *
 * @param {LH.Config.ResolvedConfig} resolvedConfig
 * @param {LH.Gatherer.GatherMode} mode
 * @return {LH.Config.ResolvedConfig}
 */
function filterConfigByGatherMode(resolvedConfig, mode) {
  const artifacts = filterArtifactsByGatherMode(resolvedConfig.artifacts, mode);
  const supportedAudits = filterAuditsByGatherMode(resolvedConfig.audits, mode);
  const audits = filterAuditsByAvailableArtifacts(supportedAudits, artifacts || []);
  const supportedCategories = filterCategoriesByGatherMode(resolvedConfig.categories, mode);
  const categories = filterCategoriesByAvailableAudits(supportedCategories, audits || []);

  return {
    ...resolvedConfig,
    artifacts,
    audits,
    categories,
  };
}

/**
 * Filters a config's artifacts, audits, and categories down to the requested set.
 * Skip audits overrides inclusion via `onlyAudits`/`onlyCategories`.
 *
 * @param {LH.Config.ResolvedConfig} resolvedConfig
 * @param {Pick<LH.Config.Settings, 'onlyAudits'|'onlyCategories'|'skipAudits'>} filters
 * @return {LH.Config.ResolvedConfig}
 */
function filterConfigByExplicitFilters(resolvedConfig, filters) {
  const {onlyAudits, onlyCategories, skipAudits} = filters;
  if (onlyAudits && !onlyAudits.length) {
    throw new Error(`onlyAudits cannot be an empty array.`);
  }
  if (onlyCategories && !onlyCategories.length) {
    throw new Error(`onlyCategories cannot be an empty array.`);
  }

  warnOnUnknownOnlyCategories(resolvedConfig.categories, onlyCategories);

  let baseAuditIds = getAuditIdsInCategories(resolvedConfig.categories, undefined);
  if (onlyCategories) {
    baseAuditIds = getAuditIdsInCategories(resolvedConfig.categories, onlyCategories);
  } else if (onlyAudits) {
    baseAuditIds = new Set();
  } else if (!resolvedConfig.categories || !Object.keys(resolvedConfig.categories).length) {
    baseAuditIds = new Set(resolvedConfig.audits?.map(audit => audit.implementation.meta.id));
  }

  const auditIdsToKeep = new Set(
    [
      ...baseAuditIds, // Start with our base audits.
      ...(onlyAudits || []), // Additionally include the opt-in audits from `onlyAudits`.
      ...filterResistantAuditIds, // Always include any filter-resistant audits.
    ].filter(auditId => !skipAudits || !skipAudits.includes(auditId))
  );

  const audits = auditIdsToKeep.size && resolvedConfig.audits ?
    resolvedConfig.audits.filter(audit => auditIdsToKeep.has(audit.implementation.meta.id)) :
    resolvedConfig.audits;

  const availableCategories =
    filterCategoriesByAvailableAudits(resolvedConfig.categories, audits || []);
  const categories = filterCategoriesByExplicitFilters(availableCategories, onlyCategories);
  let artifacts = filterArtifactsByAvailableAudits(resolvedConfig.artifacts, audits);
  if (artifacts && resolvedConfig.settings.disableFullPageScreenshot) {
    artifacts = artifacts.filter(({id}) => id !== 'FullPageScreenshot');
  }

  return {
    ...resolvedConfig,
    artifacts,
    audits,
    categories,
  };
}

export {
  filterConfigByGatherMode,
  filterConfigByExplicitFilters,
  filterArtifactsByGatherMode,
  filterArtifactsByAvailableAudits,
  filterAuditsByAvailableArtifacts,
  filterAuditsByGatherMode,
  filterCategoriesByAvailableAudits,
  filterCategoriesByExplicitFilters,
  filterCategoriesByGatherMode,
};
