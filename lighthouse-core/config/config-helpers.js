/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const isDeepEqual = require('lodash.isequal');
const constants = require('./constants.js');
const Budget = require('./budget.js');
const Audit = require('../audits/audit.js');
const Runner = require('../runner.js');
const i18n = require('../lib/i18n/i18n.js');

/** @typedef {typeof import('../gather/gatherers/gatherer.js')} GathererConstructor */
/** @typedef {InstanceType<GathererConstructor>} Gatherer */

/**
 * If any items with identical `path` properties are found in the input array,
 * merge their `options` properties into the first instance and then discard any
 * other instances.
 * Until support of jsdoc templates with constraints, type in config.d.ts.
 * See https://github.com/Microsoft/TypeScript/issues/24283
 * @type {LH.Config.MergeOptionsOfItems}
 */
const mergeOptionsOfItems = function(items) {
  /** @type {Array<{id: string, path?: string, options?: Object<string, any>}>} */
  const mergedItems = [];

  for (const item of items) {
    const existingItem = item.path && mergedItems.find(candidate => candidate.path === item.path);
    if (!existingItem) {
      mergedItems.push(item);
      continue;
    }

    existingItem.options = Object.assign({}, existingItem.options, item.options);
  }

  return mergedItems;
};

/**
 * Recursively merges config fragment objects in a somewhat Lighthouse-specific way.
 *
 *    - `null` is treated similarly to `undefined` for whether a value should be overridden.
 *    - `overwriteArrays` controls array extension behavior:
 *        - true: Arrays are overwritten without any merging or concatenation.
 *        - false: Arrays are concatenated and de-duped by isDeepEqual.
 *    - Objects are recursively merged.
 *    - If the `settings` key is encountered while traversing an object, its arrays are *always*
 *      overridden, not concatenated. (`overwriteArrays` is flipped to `true`)
 *
 * More widely typed than exposed merge() function, below.
 * @param {Object<string, any>|Array<any>|undefined|null} base
 * @param {Object<string, any>|Array<any>} extension
 * @param {boolean=} overwriteArrays
 */
function _mergeConfigFragment(base, extension, overwriteArrays = false) {
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
      base[key] = _mergeConfigFragment(base[key], extension[key], localOverwriteArrays);
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
const mergeConfigFragment = _mergeConfigFragment;

/**
 * Validate the settings after they've been built
 * @param {LH.Config.Settings} settings
 */
function assertValidSettings(settings) {
  if (!settings.formFactor) {
    throw new Error(`\`settings.formFactor\` must be defined as 'mobile' or 'desktop'. See https://github.com/GoogleChrome/lighthouse/blob/master/docs/emulation.md`);
  }

  if (!settings.screenEmulation.disabled) {
    // formFactor doesn't control emulation. So we don't want a mismatch:
    //   Bad mismatch A: user wants mobile emulation but scoring is configured for desktop
    //   Bad mismtach B: user wants everything desktop and set formFactor, but accidentally not screenEmulation
    if (settings.screenEmulation.mobile !== (settings.formFactor === 'mobile')) {
      throw new Error(`Screen emulation mobile setting (${settings.screenEmulation.mobile}) does not match formFactor setting (${settings.formFactor}). See https://github.com/GoogleChrome/lighthouse/blob/master/docs/emulation.md`);
    }
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
    (implementation && implementation.meta && implementation.meta.id) ||
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
  if (
    !i18n.isStringOrIcuMessage(implementation.meta.failureTitle) &&
    implementation.meta.scoreDisplayMode === Audit.SCORING_MODES.BINARY
  ) {
    throw new Error(`${auditName} has no failureTitle and should.`);
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
 * Expands a gatherer from user-specified to an internal gatherer definition format.
 *
 * Input Examples:
 *  - 'my-gatherer'
 *  - class MyGatherer extends Gatherer { }
 *  - {instance: myGathererInstance}
 *
 * @param {LH.Config.GathererJson} gatherer
 * @return {{instance?: Gatherer, implementation?: GathererConstructor, path?: string}} passes
 */
function expandGathererShorthand(gatherer) {
  if (typeof gatherer === 'string') {
    // just 'path/to/gatherer'
    return {path: gatherer};
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
    return {implementation: gatherer};
  } else if (gatherer && typeof gatherer.beforePass === 'function') {
    // just GathererInstance
    return {instance: gatherer};
  } else {
    throw new Error('Invalid Gatherer type ' + JSON.stringify(gatherer));
  }
}

/**
 * Expands the audits from user-specified JSON to an internal audit definition format.
 * @param {LH.Config.AuditJson} audit
 * @return {{id?: string, path: string, options?: {}} | {id?: string, implementation: typeof Audit, path?: string, options?: {}}}
 */
function expandAuditShorthand(audit) {
  if (typeof audit === 'string') {
    // just 'path/to/audit'
    return {path: audit, options: {}};
  } else if ('implementation' in audit && typeof audit.implementation.audit === 'function') {
    // {implementation: AuditClass, ...}
    return audit;
  } else if ('path' in audit && typeof audit.path === 'string') {
    // {path: 'path/to/audit', ...}
    return audit;
  } else if ('audit' in audit && typeof audit.audit === 'function') {
    // just AuditClass
    return {implementation: audit, options: {}};
  } else {
    throw new Error('Invalid Audit type ' + JSON.stringify(audit));
  }
}

/** @type {Map<string, any>} */
const bundledModules = new Map(/* BUILD_REPLACE_BUNDLED_MODULES */);

/**
 * Wraps `require` with an entrypoint for bundled dynamic modules.
 * See build-bundle.js
 * @param {string} requirePath
 */
function requireWrapper(requirePath) {
  return bundledModules.get(requirePath) || require(requirePath);
}

/**
 * @param {string} gathererPath
 * @param {Array<string>} coreGathererList
 * @param {string=} configDir
 * @return {LH.Config.GathererDefn}
 */
function requireGatherer(gathererPath, coreGathererList, configDir) {
  const coreGatherer = coreGathererList.find(a => a === `${gathererPath}.js`);

  let requirePath = `../gather/gatherers/${gathererPath}`;
  if (!coreGatherer) {
    // Otherwise, attempt to find it elsewhere. This throws if not found.
    requirePath = resolveModulePath(gathererPath, configDir, 'gatherer');
  }

  const GathererClass = /** @type {GathererConstructor} */ (requireWrapper(requirePath));

  return {
    instance: new GathererClass(),
    implementation: GathererClass,
    path: gathererPath,
  };
}

/**
 * @param {string} auditPath
 * @param {Array<string>} coreAuditList
 * @param {string=} configDir
 * @return {LH.Config.AuditDefn['implementation']}
 */
function requireAudit(auditPath, coreAuditList, configDir) {
  // See if the audit is a Lighthouse core audit.
  const auditPathJs = `${auditPath}.js`;
  const coreAudit = coreAuditList.find(a => a === auditPathJs);
  let requirePath = `../audits/${auditPath}`;
  if (!coreAudit) {
    // TODO: refactor and delete `global.isDevtools`.
    if (global.isDevtools || global.isLightrider) {
      // This is for pubads bundling.
      requirePath = auditPath;
    } else {
      // Otherwise, attempt to find it elsewhere. This throws if not found.
      const absolutePath = resolveModulePath(auditPath, configDir, 'audit');
      // Use a relative path so bundler can easily expose it.
      requirePath = path.relative(__dirname, absolutePath);
    }
  }

  return requireWrapper(requirePath);
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
      // @ts-expect-error tsc can't yet express that key is only a single type in each iteration, not a union of types.
      settings[key] = flags[key];
    }
  }

  return settings;
}

/**
 * @param {LH.SharedFlagsSettings} settingsJson
 * @param {LH.Flags|undefined} overrides
 * @return {LH.Config.Settings}
 */
function resolveSettings(settingsJson = {}, overrides = undefined) {
  // If a locale is requested in flags or settings, use it. A typical CLI run will not have one,
  // however `lookupLocale` will always determine which of our supported locales to use (falling
  // back if necessary).
  const locale = i18n.lookupLocale((overrides && overrides.locale) || settingsJson.locale);

  // Fill in missing settings with defaults
  const {defaultSettings} = constants;
  const settingWithDefaults = mergeConfigFragment(deepClone(defaultSettings), settingsJson, true);

  // Override any applicable settings with CLI flags
  const settingsWithFlags = mergeConfigFragment(
    settingWithDefaults,
    cleanFlagsForSettings(overrides),
    true
  );

  if (settingsWithFlags.budgets) {
    settingsWithFlags.budgets = Budget.initializeBudget(settingsWithFlags.budgets);
  }
  // Locale is special and comes only from flags/settings/lookupLocale.
  settingsWithFlags.locale = locale;

  // Default constants uses the mobile UA. Explicitly stating to true asks LH to use the associated UA.
  // It's a little awkward, but the alternatives are not allowing `true` or a dedicated `disableUAEmulation` setting.
  if (settingsWithFlags.emulatedUserAgent === true) {
    settingsWithFlags.emulatedUserAgent = constants.userAgents[settingsWithFlags.formFactor];
  }

  assertValidSettings(settingsWithFlags);
  return settingsWithFlags;
}

/**
 * Turns a GathererJson into a GathererDefn which involves a few main steps:
 *    - Expanding the JSON shorthand the full definition format.
 *    - `require`ing in the implementation.
 *    - Creating a gatherer instance from the implementation.
 * @param {LH.Config.GathererJson} gathererJson
 * @param {Array<string>} coreGathererList
 * @param {string=} configDir
 * @return {LH.Config.GathererDefn}
 */
function resolveGathererToDefn(gathererJson, coreGathererList, configDir) {
  const gathererDefn = expandGathererShorthand(gathererJson);
  if (gathererDefn.instance) {
    return {
      instance: gathererDefn.instance,
      implementation: gathererDefn.implementation,
      path: gathererDefn.path,
    };
  } else if (gathererDefn.implementation) {
    const GathererClass = gathererDefn.implementation;
    return {
      instance: new GathererClass(),
      implementation: gathererDefn.implementation,
      path: gathererDefn.path,
    };
  } else if (gathererDefn.path) {
    const path = gathererDefn.path;
    return requireGatherer(path, coreGathererList, configDir);
  } else {
    throw new Error('Invalid expanded Gatherer: ' + JSON.stringify(gathererDefn));
  }
}

/**
 * Take an array of audits and audit paths and require any paths (possibly
 * relative to the optional `configDir`) using `resolveModule`,
 * leaving only an array of AuditDefns.
 * @param {LH.Config.Json['audits']} audits
 * @param {string=} configDir
 * @return {Array<LH.Config.AuditDefn>|null}
 */
function resolveAuditsToDefns(audits, configDir) {
  if (!audits) {
    return null;
  }

  const coreList = Runner.getAuditList();
  const auditDefns = audits.map(auditJson => {
    const auditDefn = expandAuditShorthand(auditJson);
    let implementation;
    if ('implementation' in auditDefn) {
      implementation = auditDefn.implementation;
    } else {
      implementation = requireAudit(auditDefn.path, coreList, configDir);
    }

    return {
      implementation,
      path: auditDefn.path,
      options: auditDefn.options || {},
    };
  });

  const mergedAuditDefns = mergeOptionsOfItems(auditDefns);
  mergedAuditDefns.forEach(audit => assertValidAudit(audit));
  return mergedAuditDefns;
}

/**
 * Resolves the location of the specified module and returns an absolute
 * string path to the file. Used for loading custom audits and gatherers.
 * Throws an error if no module is found.
 * @param {string} moduleIdentifier
 * @param {string=} configDir The absolute path to the directory of the config file, if there is one.
 * @param {string=} category Optional plugin category (e.g. 'audit') for better error messages.
 * @return {string}
 * @throws {Error}
 */
function resolveModulePath(moduleIdentifier, configDir, category) {
  // module in a node_modules/ that is...
  // |                                | Lighthouse globally installed | Lighthouse locally installed |
  // |--------------------------------|-------------------------------|------------------------------|
  // | global                         |   1.                          |   1.                         |
  // | in current working directory   |   2.                          |   1.                         |
  // | relative to config.js file     |   5.                          |   -                          |

  // module given by a path that is...
  // |                                           | Lighthouse globally/locally installed |
  // |-------------------------------------------|---------------------------------------|
  // | absolute                                  |   1.                                  |
  // | relative to the current working directory |   3.                                  |
  // | relative to the config.js file            |   4.                                  |

  // 1.
  // First try straight `require()`. Unlikely to be specified relative to this
  // file, but adds support for Lighthouse modules from npm since
  // `require()` walks up parent directories looking inside any node_modules/
  // present. Also handles absolute paths.
  try {
    return require.resolve(moduleIdentifier);
  } catch (e) {}

  // 2.
  // Lighthouse globally installed, node_modules/ in current working directory.
  // ex: lighthouse https://test.com
  //
  // working directory/
  //   |-- node_modules/
  //   |-- package.json
  try {
    return require.resolve(moduleIdentifier, {paths: [process.cwd()]});
  } catch (e) {}

  // 3.
  // See if the module resolves relative to the current working directory.
  // Most useful to handle the case of invoking Lighthouse as a module, since
  // then the config is an object and so has no path.
  const cwdPath = path.resolve(process.cwd(), moduleIdentifier);
  try {
    return require.resolve(cwdPath);
  } catch (e) {}

  const errorString = 'Unable to locate ' + (category ? `${category}: ` : '') +
    `\`${moduleIdentifier}\`.
     Tried to require() from these locations:
       ${__dirname}
       ${cwdPath}`;

  if (!configDir) {
    throw new Error(errorString);
  }

  // 4.
  // Try looking up relative to the config file path. Just like the
  // relative path passed to `require()` is found relative to the file it's
  // in, this allows module paths to be specified relative to the config file.
  const relativePath = path.resolve(configDir, moduleIdentifier);
  try {
    return require.resolve(relativePath);
  } catch (requireError) {}

  // 5.
  // Lighthouse globally installed, node_modules/ in config directory.
  // ex: lighthouse https://test.com --config-path=./config/config.js
  //
  // working directory/
  //   |-- config/
  //     |-- node_modules/
  //     |-- config.js
  //     |-- package.json
  try {
    return require.resolve(moduleIdentifier, {paths: [configDir]});
  } catch (requireError) {}

  throw new Error(errorString + `
       ${relativePath}`);
}

/**
 * Many objects in the config can be an object whose properties are not serializable.
 * We use a shallow clone for these objects instead.
 * Any value that isn't an object will not be cloned.
 *
 * @template T
 * @param {T} item
 * @return {T}
 */
function shallowClone(item) {
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

  // Copy arrays that could contain non-serializable properties to allow for programmatic
  // injection of audit and gatherer implementations.
  if (Array.isArray(cloned.passes) && Array.isArray(json.passes)) {
    for (let i = 0; i < cloned.passes.length; i++) {
      const pass = cloned.passes[i];
      pass.gatherers = (json.passes[i].gatherers || []).map(gatherer => shallowClone(gatherer));
    }
  }

  if (Array.isArray(json.audits)) {
    cloned.audits = json.audits.map(audit => shallowClone(audit));
  }

  if (Array.isArray(json.artifacts)) {
    cloned.artifacts = json.artifacts.map(artifact => ({
      ...artifact,
      gatherer: shallowClone(artifact.gatherer),
    }));
  }

  return cloned;
}

module.exports = {
  deepClone,
  deepCloneConfigJson,
  mergeOptionsOfItems,
  mergeConfigFragment,
  requireWrapper,
  resolveSettings,
  resolveGathererToDefn,
  resolveAuditsToDefns,
  resolveModulePath,
};
