/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const defaultConfigPath = './default-config.js';
const defaultConfig = require('./default-config.js');
const constants = require('./constants.js');
const i18n = require('./../lib/i18n/i18n.js');

const isDeepEqual = require('lodash.isequal');
const log = require('lighthouse-logger');
const path = require('path');
const Runner = require('../runner.js');
const ConfigPlugin = require('./config-plugin.js');
const Budget = require('./budget.js');
const {requireAudits, mergeOptionsOfItems, resolveModule} = require('./config-helpers.js');

/** @typedef {typeof import('../gather/gatherers/gatherer.js')} GathererConstructor */
/** @typedef {InstanceType<GathererConstructor>} Gatherer */

/**
 * Define with object literal so that tsc will require it to stay updated.
 * @type {Record<keyof LH.BaseArtifacts, ''>}
 */
const BASE_ARTIFACT_BLANKS = {
  fetchTime: '',
  LighthouseRunWarnings: '',
  TestedAsMobileDevice: '',
  HostFormFactor: '',
  HostUserAgent: '',
  NetworkUserAgent: '',
  BenchmarkIndex: '',
  WebAppManifest: '',
  InstallabilityErrors: '',
  Stacks: '',
  traces: '',
  devtoolsLogs: '',
  settings: '',
  URL: '',
  Timing: '',
  PageLoadError: '',
};
const BASE_ARTIFACT_NAMES = Object.keys(BASE_ARTIFACT_BLANKS);

/**
 * @param {Config['passes']} passes
 * @param {Config['audits']} audits
 */
function assertValidPasses(passes, audits) {
  if (!Array.isArray(passes)) {
    return;
  }

  const requestedGatherers = Config.getGatherersRequestedByAudits(audits);
  // Base artifacts are provided by GatherRunner, so start foundGatherers with them.
  const foundGatherers = new Set(BASE_ARTIFACT_NAMES);

  // Log if we are running gathers that are not needed by the audits listed in the config
  passes.forEach((pass, passIndex) => {
    if (passIndex === 0 && pass.loadFailureMode !== 'fatal') {
      log.warn(`"${pass.passName}" is the first pass but was marked as non-fatal. ` +
        `The first pass will always be treated as loadFailureMode=fatal.`);
      pass.loadFailureMode = 'fatal';
    }

    pass.gatherers.forEach(gathererDefn => {
      const gatherer = gathererDefn.instance;
      foundGatherers.add(gatherer.name);
      const isGatherRequiredByAudits = requestedGatherers.has(gatherer.name);
      if (!isGatherRequiredByAudits) {
        const msg = `${gatherer.name} gatherer requested, however no audit requires it.`;
        log.warn('config', msg);
      }
    });
  });

  // All required gatherers must be found in the config. Throw otherwise.
  for (const auditDefn of audits || []) {
    const auditMeta = auditDefn.implementation.meta;
    for (const requiredArtifact of auditMeta.requiredArtifacts) {
      if (!foundGatherers.has(requiredArtifact)) {
        throw new Error(`${requiredArtifact} gatherer, required by audit ${auditMeta.id}, ` +
            'was not found in config.');
      }
    }
  }

  // Passes must have unique `passName`s. Throw otherwise.
  const usedNames = new Set();
  passes.forEach(pass => {
    const passName = pass.passName;
    if (usedNames.has(passName)) {
      throw new Error(`Passes must have unique names (repeated passName: ${passName}.`);
    }
    usedNames.add(passName);
  });
}

/**
 * @param {Config['categories']} categories
 * @param {Config['audits']} audits
 * @param {Config['groups']} groups
 */
function assertValidCategories(categories, audits, groups) {
  if (!categories) {
    return;
  }

  const auditsKeyedById = new Map((audits || []).map(audit =>
    /** @type {[string, LH.Config.AuditDefn]} */
    ([audit.implementation.meta.id, audit])
  ));

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
 * @param {Gatherer} gathererInstance
 * @param {string=} gathererName
 */
function assertValidGatherer(gathererInstance, gathererName) {
  gathererName = gathererName || gathererInstance.name || 'gatherer';

  if (typeof gathererInstance.beforePass !== 'function') {
    throw new Error(`${gathererName} has no beforePass() method.`);
  }

  if (typeof gathererInstance.pass !== 'function') {
    throw new Error(`${gathererName} has no pass() method.`);
  }

  if (typeof gathererInstance.afterPass !== 'function') {
    throw new Error(`${gathererName} has no afterPass() method.`);
  }
}

/**
 * Throws if pluginName is invalid or (somehow) collides with a category in the
 * configJSON being added to.
 * @param {LH.Config.Json} configJSON
 * @param {string} pluginName
 */
function assertValidPluginName(configJSON, pluginName) {
  if (!pluginName.startsWith('lighthouse-plugin-')) {
    throw new Error(`plugin name '${pluginName}' does not start with 'lighthouse-plugin-'`);
  }

  if (configJSON.categories && configJSON.categories[pluginName]) {
    throw new Error(`plugin name '${pluginName}' not allowed because it is the id of a category already found in config`); // eslint-disable-line max-len
  }
}

/**
 * Creates a settings object from potential flags object by dropping all the properties
 * that don't exist on Config.Settings.
 * @param {Partial<LH.Flags>=} flags
 * @return {RecursivePartial<LH.Config.Settings>}
*/
function cleanFlagsForSettings(flags = {}) {
  /** @type {RecursivePartial<LH.Config.Settings>} */
  const settings = {};

  for (const key of Object.keys(flags)) {
    if (key in constants.defaultSettings) {
      // @ts-ignore tsc can't yet express that key is only a single type in each iteration, not a union of types.
      settings[key] = flags[key];
    }
  }

  return settings;
}

/**
 * More widely typed than exposed merge() function, below.
 * @param {Object<string, any>|Array<any>|undefined|null} base
 * @param {Object<string, any>|Array<any>} extension
 * @param {boolean=} overwriteArrays
 */
function _merge(base, extension, overwriteArrays = false) {
  // If the default value doesn't exist or is explicitly null, defer to the extending value
  if (typeof base === 'undefined' || base === null) {
    return extension;
  } else if (typeof extension === 'undefined') {
    return base;
  } else if (Array.isArray(extension)) {
    if (overwriteArrays) return extension;
    if (!Array.isArray(base)) throw new TypeError(`Expected array but got ${typeof base}`);
    const merged = base.slice();
    extension.forEach(item => {
      if (!merged.some(candidate => isDeepEqual(candidate, item))) merged.push(item);
    });

    return merged;
  } else if (typeof extension === 'object') {
    if (typeof base !== 'object') throw new TypeError(`Expected object but got ${typeof base}`);
    if (Array.isArray(base)) throw new TypeError('Expected object but got Array');
    Object.keys(extension).forEach(key => {
      const localOverwriteArrays = overwriteArrays ||
        (key === 'settings' && typeof base[key] === 'object');
      base[key] = _merge(base[key], extension[key], localOverwriteArrays);
    });
    return base;
  }

  return extension;
}

/**
 * Until support of jsdoc templates with constraints, type in config.d.ts.
 * See https://github.com/Microsoft/TypeScript/issues/24283
 * @type {LH.Config.Merge}
 */
const merge = _merge;

/**
 * @template T
 * @param {Array<T>} array
 * @return {Array<T>}
 */
function cloneArrayWithPluginSafety(array) {
  return array.map(item => {
    if (typeof item === 'object') {
      // Return copy of instance and prototype chain (in case item is instantiated class).
      return Object.assign(
        Object.create(
          Object.getPrototypeOf(item)
        ),
        item
      );
    }

    return item;
  });
}

/**
 * // TODO(bckenny): could adopt "jsonified" type to ensure T will survive JSON
 * round trip: https://github.com/Microsoft/TypeScript/issues/21838
 * @template T
 * @param {T} json
 * @return {T}
 */
function deepClone(json) {
  return JSON.parse(JSON.stringify(json));
}

/**
 * Deep clone a ConfigJson, copying over any "live" gatherer or audit that
 * wouldn't make the JSON round trip.
 * @param {LH.Config.Json} json
 * @return {LH.Config.Json}
 */
function deepCloneConfigJson(json) {
  const cloned = deepClone(json);

  // Copy arrays that could contain plugins to allow for programmatic
  // injection of plugins.
  if (Array.isArray(cloned.passes) && Array.isArray(json.passes)) {
    for (let i = 0; i < cloned.passes.length; i++) {
      const pass = cloned.passes[i];
      pass.gatherers = cloneArrayWithPluginSafety(json.passes[i].gatherers || []);
    }
  }

  if (Array.isArray(json.audits)) {
    cloned.audits = cloneArrayWithPluginSafety(json.audits);
  }

  return cloned;
}

class Config {
  /**
   * @constructor
   * @implements {LH.Config.Json}
   * @param {LH.Config.Json=} configJSON
   * @param {LH.Flags=} flags
   */
  constructor(configJSON, flags) {
    const status = {msg: 'Create config', id: 'lh:init:config'};
    log.time(status, 'verbose');
    let configPath = flags && flags.configPath;

    if (!configJSON) {
      configJSON = defaultConfig;
      configPath = path.resolve(__dirname, defaultConfigPath);
    }

    if (configPath && !path.isAbsolute(configPath)) {
      throw new Error('configPath must be an absolute path.');
    }

    // We don't want to mutate the original config object
    configJSON = deepCloneConfigJson(configJSON);

    // Extend the default config if specified
    if (configJSON.extends) {
      configJSON = Config.extendConfigJSON(deepCloneConfigJson(defaultConfig), configJSON);
    }

    // The directory of the config path, if one was provided.
    const configDir = configPath ? path.dirname(configPath) : undefined;

    // Validate and merge in plugins (if any).
    configJSON = Config.mergePlugins(configJSON, flags, configDir);

    const settings = Config.initSettings(configJSON.settings, flags);

    // Augment passes with necessary defaults and require gatherers.
    const passesWithDefaults = Config.augmentPassesWithDefaults(configJSON.passes);
    Config.adjustDefaultPassForThrottling(settings, passesWithDefaults);
    const passes = Config.requireGatherers(passesWithDefaults, configDir);

    /** @type {LH.Config.Settings} */
    this.settings = settings;
    /** @type {?Array<LH.Config.Pass>} */
    this.passes = passes;
    /** @type {?Array<LH.Config.AuditDefn>} */
    this.audits = Config.requireAudits(configJSON.audits, configDir);
    /** @type {?Record<string, LH.Config.Category>} */
    this.categories = configJSON.categories || null;
    /** @type {?Record<string, LH.Config.Group>} */
    this.groups = configJSON.groups || null;

    Config.filterConfigIfNeeded(this);

    assertValidPasses(this.passes, this.audits);
    assertValidCategories(this.categories, this.audits, this.groups);

    // TODO(bckenny): until tsc adds @implements support, assert that Config is a ConfigJson.
    /** @type {LH.Config.Json} */
    const configJson = this; // eslint-disable-line no-unused-vars
    log.timeEnd(status);
  }

  /**
   * Provides a cleaned-up, stringified version of this config. Gatherer and
   * Audit `implementation` and `instance` do not survive this process.
   * @return {string}
   */
  getPrintString() {
    const jsonConfig = deepClone(this);

    if (jsonConfig.passes) {
      for (const pass of jsonConfig.passes) {
        for (const gathererDefn of pass.gatherers) {
          gathererDefn.implementation = undefined;
          // @ts-ignore Breaking the Config.GathererDefn type.
          gathererDefn.instance = undefined;
          if (Object.keys(gathererDefn.options).length === 0) {
            // @ts-ignore Breaking the Config.GathererDefn type.
            gathererDefn.options = undefined;
          }
        }
      }
    }

    if (jsonConfig.audits) {
      for (const auditDefn of jsonConfig.audits) {
        // @ts-ignore Breaking the Config.AuditDefn type.
        auditDefn.implementation = undefined;
        if (Object.keys(auditDefn.options).length === 0) {
          // @ts-ignore Breaking the Config.AuditDefn type.
          auditDefn.options = undefined;
        }
      }
    }

    // Printed config is more useful with localized strings.
    i18n.replaceIcuMessageInstanceIds(jsonConfig, jsonConfig.settings.locale);

    return JSON.stringify(jsonConfig, null, 2);
  }

  /**
   * @param {LH.Config.Json} baseJSON The JSON of the configuration to extend
   * @param {LH.Config.Json} extendJSON The JSON of the extensions
   * @return {LH.Config.Json}
   */
  static extendConfigJSON(baseJSON, extendJSON) {
    if (extendJSON.passes && baseJSON.passes) {
      for (const pass of extendJSON.passes) {
        // use the default pass name if one is not specified
        const passName = pass.passName || constants.defaultPassConfig.passName;
        const basePass = baseJSON.passes.find(candidate => candidate.passName === passName);

        if (!basePass) {
          baseJSON.passes.push(pass);
        } else {
          merge(basePass, pass);
        }
      }

      delete extendJSON.passes;
    }

    return merge(baseJSON, extendJSON);
  }

  /**
   * @param {LH.Config.Json} configJSON
   * @param {LH.Flags=} flags
   * @param {string=} configDir
   * @return {LH.Config.Json}
   */
  static mergePlugins(configJSON, flags, configDir) {
    const configPlugins = configJSON.plugins || [];
    const flagPlugins = (flags && flags.plugins) || [];
    const pluginNames = new Set([...configPlugins, ...flagPlugins]);

    for (const pluginName of pluginNames) {
      assertValidPluginName(configJSON, pluginName);

      // TODO: refactor and delete `global.isDevtools`.
      const pluginPath = global.isDevtools ?
        pluginName :
        resolveModule(pluginName, configDir, 'plugin');
      const rawPluginJson = require(pluginPath);
      const pluginJson = ConfigPlugin.parsePlugin(rawPluginJson, pluginName);

      configJSON = Config.extendConfigJSON(configJSON, pluginJson);
    }

    return configJSON;
  }

  /**
   * @param {LH.Config.Json['passes']} passes
   * @return {?Array<Required<LH.Config.PassJson>>}
   */
  static augmentPassesWithDefaults(passes) {
    if (!passes) {
      return null;
    }

    const {defaultPassConfig} = constants;
    return passes.map(pass => merge(deepClone(defaultPassConfig), pass));
  }

  /**
   * @param {LH.SharedFlagsSettings=} settingsJson
   * @param {LH.Flags=} flags
   * @return {LH.Config.Settings}
   */
  static initSettings(settingsJson = {}, flags) {
    // If a locale is requested in flags or settings, use it. A typical CLI run will not have one,
    // however `lookupLocale` will always determine which of our supported locales to use (falling
    // back if necessary).
    const locale = i18n.lookupLocale((flags && flags.locale) || settingsJson.locale);

    // Fill in missing settings with defaults
    const {defaultSettings} = constants;
    const settingWithDefaults = merge(deepClone(defaultSettings), settingsJson, true);

    // Override any applicable settings with CLI flags
    const settingsWithFlags = merge(settingWithDefaults || {}, cleanFlagsForSettings(flags), true);

    if (settingsWithFlags.budgets) {
      settingsWithFlags.budgets = Budget.initializeBudget(settingsWithFlags.budgets);
    }
    // Locale is special and comes only from flags/settings/lookupLocale.
    settingsWithFlags.locale = locale;

    return settingsWithFlags;
  }

  /**
   * Expands the gatherers from user-specified to an internal gatherer definition format.
   *
   * Input Examples:
   *  - 'my-gatherer'
   *  - class MyGatherer extends Gatherer { }
   *  - {instance: myGathererInstance}
   *
   * @param {Array<LH.Config.GathererJson>} gatherers
   * @return {Array<{instance?: Gatherer, implementation?: GathererConstructor, path?: string, options?: {}}>} passes
   */
  static expandGathererShorthand(gatherers) {
    const expanded = gatherers.map(gatherer => {
      if (typeof gatherer === 'string') {
        // just 'path/to/gatherer'
        return {path: gatherer, options: {}};
      } else if ('implementation' in gatherer || 'instance' in gatherer) {
        // {implementation: GathererConstructor, ...} or {instance: GathererInstance, ...}
        return gatherer;
      } else if ('path' in gatherer) {
        // {path: 'path/to/gatherer', ...}
        if (typeof gatherer.path !== 'string') {
          throw new Error('Invalid Gatherer type ' + JSON.stringify(gatherer));
        }
        return gatherer;
      } else if (typeof gatherer === 'function') {
        // just GathererConstructor
        return {implementation: gatherer, options: {}};
      } else if (gatherer && typeof gatherer.beforePass === 'function') {
        // just GathererInstance
        return {instance: gatherer, options: {}};
      } else {
        throw new Error('Invalid Gatherer type ' + JSON.stringify(gatherer));
      }
    });

    return expanded;
  }

  /**
   * Observed throttling methods (devtools/provided) require at least 5s of quiet for the metrics to
   * be computed. This method adjusts the quiet thresholds to the required minimums if necessary.
   * @param {LH.Config.Settings} settings
   * @param {?Array<Required<LH.Config.PassJson>>} passes
   */
  static adjustDefaultPassForThrottling(settings, passes) {
    if (!passes ||
        (settings.throttlingMethod !== 'devtools' && settings.throttlingMethod !== 'provided')) {
      return;
    }

    const defaultPass = passes.find(pass => pass.passName === 'defaultPass');
    if (!defaultPass) return;
    const overrides = constants.nonSimulatedPassConfigOverrides;
    defaultPass.pauseAfterFcpMs =
      Math.max(overrides.pauseAfterFcpMs, defaultPass.pauseAfterFcpMs);
    defaultPass.pauseAfterLoadMs =
      Math.max(overrides.pauseAfterLoadMs, defaultPass.pauseAfterLoadMs);
    defaultPass.cpuQuietThresholdMs =
      Math.max(overrides.cpuQuietThresholdMs, defaultPass.cpuQuietThresholdMs);
    defaultPass.networkQuietThresholdMs =
      Math.max(overrides.networkQuietThresholdMs, defaultPass.networkQuietThresholdMs);
  }

  /**
   * Filter out any unrequested items from the config, based on requested categories or audits.
   * @param {Config} config
   */
  static filterConfigIfNeeded(config) {
    const settings = config.settings;
    if (!settings.onlyCategories && !settings.onlyAudits && !settings.skipAudits) {
      return;
    }

    // 1. Filter to just the chosen categories/audits
    const {categories, requestedAuditNames} = Config.filterCategoriesAndAudits(config.categories,
      settings);

    // 2. Resolve which audits will need to run
    const audits = config.audits && config.audits.filter(auditDefn =>
        requestedAuditNames.has(auditDefn.implementation.meta.id));

    // 3. Resolve which gatherers will need to run
    const requestedGathererIds = Config.getGatherersRequestedByAudits(audits);

    // 4. Filter to only the neccessary passes
    const passes = Config.generatePassesNeededByGatherers(config.passes, requestedGathererIds);

    config.categories = categories;
    config.audits = audits;
    config.passes = passes;
  }

  /**
   * Filter out any unrequested categories or audits from the categories object.
   * @param {Config['categories']} oldCategories
   * @param {LH.Config.Settings} settings
   * @return {{categories: Config['categories'], requestedAuditNames: Set<string>}}
   */
  static filterCategoriesAndAudits(oldCategories, settings) {
    if (!oldCategories) {
      return {categories: null, requestedAuditNames: new Set()};
    }

    if (settings.onlyAudits && settings.skipAudits) {
      throw new Error('Cannot set both skipAudits and onlyAudits');
    }

    /** @type {NonNullable<Config['categories']>} */
    const categories = {};
    const filterByIncludedCategory = !!settings.onlyCategories;
    const filterByIncludedAudit = !!settings.onlyAudits;
    const categoryIds = settings.onlyCategories || [];
    const auditIds = settings.onlyAudits || [];
    const skipAuditIds = settings.skipAudits || [];

    // warn if the category is not found
    categoryIds.forEach(categoryId => {
      if (!oldCategories[categoryId]) {
        log.warn('config', `unrecognized category in 'onlyCategories': ${categoryId}`);
      }
    });

    // warn if the audit is not found in a category or there are overlaps
    const auditsToValidate = new Set(auditIds.concat(skipAuditIds));
    for (const auditId of auditsToValidate) {
      const foundCategory = Object.keys(oldCategories).find(categoryId => {
        const auditRefs = oldCategories[categoryId].auditRefs;
        return !!auditRefs.find(candidate => candidate.id === auditId);
      });

      if (!foundCategory) {
        const parentKeyName = skipAuditIds.includes(auditId) ? 'skipAudits' : 'onlyAudits';
        log.warn('config', `unrecognized audit in '${parentKeyName}': ${auditId}`);
      } else if (auditIds.includes(auditId) && categoryIds.includes(foundCategory)) {
        log.warn('config', `${auditId} in 'onlyAudits' is already included by ` +
            `${foundCategory} in 'onlyCategories'`);
      }
    }

    const includedAudits = new Set(auditIds);
    skipAuditIds.forEach(id => includedAudits.delete(id));

    Object.keys(oldCategories).forEach(categoryId => {
      const category = deepClone(oldCategories[categoryId]);

      if (filterByIncludedCategory && filterByIncludedAudit) {
        // If we're filtering to the category and audit whitelist, include the union of the two
        if (!categoryIds.includes(categoryId)) {
          category.auditRefs = category.auditRefs.filter(audit => auditIds.includes(audit.id));
        }
      } else if (filterByIncludedCategory) {
        // If we're filtering to just the category whitelist and the category is not included, skip it
        if (!categoryIds.includes(categoryId)) {
          return;
        }
      } else if (filterByIncludedAudit) {
        category.auditRefs = category.auditRefs.filter(audit => auditIds.includes(audit.id));
      }

      // always filter to the audit blacklist
      category.auditRefs = category.auditRefs.filter(audit => !skipAuditIds.includes(audit.id));

      if (category.auditRefs.length) {
        categories[categoryId] = category;
        category.auditRefs.forEach(audit => includedAudits.add(audit.id));
      }
    });

    return {categories, requestedAuditNames: includedAudits};
  }

  /**
   * @param {LH.Config.Json} config
   * @return {Array<{id: string, title: string}>}
   */
  static getCategories(config) {
    const categories = config.categories;
    if (!categories) {
      return [];
    }

    return Object.keys(categories).map(id => {
      const title = categories[id].title;
      return {id, title};
    });
  }

  /**
   * From some requested audits, return names of all required and optional artifacts
   * @param {Config['audits']} audits
   * @return {Set<string>}
   */
  static getGatherersRequestedByAudits(audits) {
    // It's possible we weren't given any audits (but existing audit results), in which case
    // there is no need to do any work here.
    if (!audits) {
      return new Set();
    }

    const gatherers = new Set();
    for (const auditDefn of audits) {
      const {requiredArtifacts, __internalOptionalArtifacts} = auditDefn.implementation.meta;
      requiredArtifacts.forEach(artifact => gatherers.add(artifact));
      if (__internalOptionalArtifacts) {
        __internalOptionalArtifacts.forEach(artifact => gatherers.add(artifact));
      }
    }
    return gatherers;
  }

  /**
   * Filters to only requested passes and gatherers, returning a new passes array.
   * @param {Config['passes']} passes
   * @param {Set<string>} requestedGatherers
   * @return {Config['passes']}
   */
  static generatePassesNeededByGatherers(passes, requestedGatherers) {
    if (!passes) {
      return null;
    }

    const auditsNeedTrace = requestedGatherers.has('traces');
    const filteredPasses = passes.map(pass => {
      // remove any unncessary gatherers from within the passes
      pass.gatherers = pass.gatherers.filter(gathererDefn => {
        const gatherer = gathererDefn.instance;
        return requestedGatherers.has(gatherer.name);
      });

      // disable the trace if no audit requires a trace
      if (pass.recordTrace && !auditsNeedTrace) {
        const passName = pass.passName || 'unknown pass';
        log.warn('config', `Trace not requested by an audit, dropping trace in ${passName}`);
        pass.recordTrace = false;
      }

      return pass;
    }).filter(pass => {
      // remove any passes lacking concrete gatherers, unless they are dependent on the trace
      if (pass.recordTrace) return true;
      // Always keep defaultPass
      if (pass.passName === 'defaultPass') return true;
      return pass.gatherers.length > 0;
    });
    return filteredPasses;
  }

  /**
   * Take an array of audits and audit paths and require any paths (possibly
   * relative to the optional `configDir`) using `resolveModule`,
   * leaving only an array of AuditDefns.
   * @param {LH.Config.Json['audits']} audits
   * @param {string=} configDir
   * @return {Config['audits']}
   */
  static requireAudits(audits, configDir) {
    const status = {msg: 'Requiring audits', id: 'lh:config:requireAudits'};
    log.time(status, 'verbose');
    const auditDefns = requireAudits(audits, configDir);
    log.timeEnd(status);
    return auditDefns;
  }

  /**
   * @param {string} path
   * @param {{}=} options
   * @param {Array<string>} coreAuditList
   * @param {string=} configDir
   * @return {LH.Config.GathererDefn}
   */
  static requireGathererFromPath(path, options, coreAuditList, configDir) {
    const coreGatherer = coreAuditList.find(a => a === `${path}.js`);

    let requirePath = `../gather/gatherers/${path}`;
    if (!coreGatherer) {
      // Otherwise, attempt to find it elsewhere. This throws if not found.
      requirePath = resolveModule(path, configDir, 'gatherer');
    }

    const GathererClass = /** @type {GathererConstructor} */ (require(requirePath));

    return {
      instance: new GathererClass(),
      implementation: GathererClass,
      path,
      options: options || {},
    };
  }

  /**
   * Takes an array of passes with every property now initialized except the
   * gatherers and requires them, (relative to the optional `configDir` if
   * provided) using `resolveModule`, returning an array of full Passes.
   * @param {?Array<Required<LH.Config.PassJson>>} passes
   * @param {string=} configDir
   * @return {Config['passes']}
   */
  static requireGatherers(passes, configDir) {
    if (!passes) {
      return null;
    }
    const status = {msg: 'Requiring gatherers', id: 'lh:config:requireGatherers'};
    log.time(status, 'verbose');

    const coreList = Runner.getGathererList();
    const fullPasses = passes.map(pass => {
      const gathererDefns = Config.expandGathererShorthand(pass.gatherers).map(gathererDefn => {
        if (gathererDefn.instance) {
          return {
            instance: gathererDefn.instance,
            implementation: gathererDefn.implementation,
            path: gathererDefn.path,
            options: gathererDefn.options || {},
          };
        } else if (gathererDefn.implementation) {
          const GathererClass = gathererDefn.implementation;
          return {
            instance: new GathererClass(),
            implementation: gathererDefn.implementation,
            path: gathererDefn.path,
            options: gathererDefn.options || {},
          };
        } else if (gathererDefn.path) {
          const path = gathererDefn.path;
          const options = gathererDefn.options;
          return Config.requireGathererFromPath(path, options, coreList, configDir);
        } else {
          throw new Error('Invalid expanded Gatherer: ' + JSON.stringify(gathererDefn));
        }
      });

      const mergedDefns = mergeOptionsOfItems(gathererDefns);
      mergedDefns.forEach(gatherer => assertValidGatherer(gatherer.instance, gatherer.path));

      return Object.assign(pass, {gatherers: mergedDefns});
    });
    log.timeEnd(status);
    return fullPasses;
  }
}

module.exports = Config;
