/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import {createRequire} from 'module';
import url from 'url';

import {isEqual} from 'lodash-es';

import * as constants from './constants.js';
import ConfigPlugin from './config-plugin.js';
import {Runner} from '../runner.js';
import * as i18n from '../lib/i18n/i18n.js';
import * as validation from './validation.js';
import {getModuleDirectory} from '../../shared/esm-utils.js';

const require = createRequire(import.meta.url);

/** @typedef {typeof import('../gather/base-gatherer.js').default} GathererConstructor */
/** @typedef {typeof import('../audits/audit.js')['Audit']} Audit */
/** @typedef {InstanceType<GathererConstructor>} Gatherer */

function isBundledEnvironment() {
  // If we're in DevTools or LightRider, we are definitely bundled.
  // TODO: refactor and delete `global.isDevtools`.
  if (global.isDevtools || global.isLightrider) return true;

  try {
    // Not foolproof, but `lighthouse-logger` is a dependency of lighthouse that should always be resolvable.
    // `require.resolve` will only throw in atypical/bundled environments.
    require.resolve('lighthouse-logger');
    return false;
  } catch (err) {
    return true;
  }
}

/**
 * If any items with identical `path` properties are found in the input array,
 * merge their `options` properties into the first instance and then discard any
 * other instances.
 * @template {{path?: string, options: Record<string, unknown>}} T
 * @param {T[]} items
 * @return T[]
 */
const mergeOptionsOfItems = function(items) {
  /** @type {T[]} */
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
 *        - false: Arrays are concatenated and de-duped by isEqual.
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
      if (!merged.some(candidate => isEqual(candidate, item))) merged.push(item);
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
 * Merge an array of items by a caller-defined key. `mergeConfigFragment` is used to merge any items
 * with a matching key.
 *
 * @template {Record<string, any>} T
 * @param {Array<T>|null|undefined} baseArray
 * @param {Array<T>|null|undefined} extensionArray
 * @param {(item: T) => string} keyFn
 * @return {Array<T>}
 */
function mergeConfigFragmentArrayByKey(baseArray, extensionArray, keyFn) {
  /** @type {Map<string, {index: number, item: T}>} */
  const itemsByKey = new Map();
  const mergedArray = baseArray || [];
  for (let i = 0; i < mergedArray.length; i++) {
    const item = mergedArray[i];
    itemsByKey.set(keyFn(item), {index: i, item});
  }

  for (const item of extensionArray || []) {
    const baseItemEntry = itemsByKey.get(keyFn(item));
    if (baseItemEntry) {
      const baseItem = baseItemEntry.item;
      const merged = typeof item === 'object' && typeof baseItem === 'object' ?
        mergeConfigFragment(baseItem, item, true) :
        item;
      mergedArray[baseItemEntry.index] = merged;
    } else {
      mergedArray.push(item);
    }
  }

  return mergedArray;
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
 * @return {{instance?: Gatherer, implementation?: GathererConstructor, path?: string}}
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
  } else if (gatherer && typeof gatherer.getArtifact === 'function') {
    // just GathererInstance
    return {instance: gatherer};
  } else {
    throw new Error('Invalid Gatherer type ' + JSON.stringify(gatherer));
  }
}

/**
 * Expands the audits from user-specified JSON to an internal audit definition format.
 * @param {LH.Config.AuditJson} audit
 * @return {{id?: string, path: string, options?: {}} | {id?: string, implementation: Audit, path?: string, options?: {}}}
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

/** @type {Map<string, Promise<any>>} */
const bundledModules = new Map(/* BUILD_REPLACE_BUNDLED_MODULES */);

/**
 * Wraps `import`/`require` with an entrypoint for bundled dynamic modules.
 * See build-bundle.js
 * @param {string} requirePath
 */
async function requireWrapper(requirePath) {
  // For windows.
  if (path.isAbsolute(requirePath)) {
    requirePath = url.pathToFileURL(requirePath).href;
  }

  /** @type {any} */
  let module;
  if (bundledModules.has(requirePath)) {
    module = await bundledModules.get(requirePath);
  } else if (requirePath.match(/\.(js|mjs|cjs)$/)) {
    module = await import(requirePath);
  } else {
    requirePath += '.js';
    module = await import(requirePath);
  }

  if (module.default) return module.default;

  // Find a valid named export.
  const methods = new Set(['meta']);
  const possibleNamedExports = Object.keys(module).filter(key => {
    if (!(module[key] && module[key] instanceof Object)) return false;
    return Object.getOwnPropertyNames(module[key]).some(method => methods.has(method));
  });
  if (possibleNamedExports.length === 1) return possibleNamedExports[0];
  if (possibleNamedExports.length > 1) {
    throw new Error(`module '${requirePath}' has too many possible exports`);
  }

  throw new Error(`module '${requirePath}' missing default export`);
}

/**
 * @param {string} gathererPath
 * @param {Array<string>} coreGathererList
 * @param {string=} configDir
 * @return {Promise<LH.Config.AnyGathererDefn>}
 */
async function requireGatherer(gathererPath, coreGathererList, configDir) {
  const coreGatherer = coreGathererList.find(a => a === `${gathererPath}.js`);

  let requirePath = `../gather/gatherers/${gathererPath}`;
  if (!coreGatherer) {
    // Otherwise, attempt to find it elsewhere. This throws if not found.
    requirePath = resolveModulePath(gathererPath, configDir, 'gatherer');
  }

  const GathererClass = /** @type {GathererConstructor} */ (await requireWrapper(requirePath));

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
 * @return {Promise<LH.Config.AuditDefn['implementation']>}
 */
function requireAudit(auditPath, coreAuditList, configDir) {
  // See if the audit is a Lighthouse core audit.
  const auditPathJs = `${auditPath}.js`;
  const coreAudit = coreAuditList.find(a => a === auditPathJs);
  let requirePath = `../audits/${auditPath}`;
  if (!coreAudit) {
    if (isBundledEnvironment()) {
      // This is for plugin bundling.
      requirePath = auditPath;
    } else {
      // Otherwise, attempt to find it elsewhere. This throws if not found.
      const absolutePath = resolveModulePath(auditPath, configDir, 'audit');
      if (isBundledEnvironment()) {
        // Use a relative path so bundler can easily expose it.
        requirePath = path.relative(getModuleDirectory(import.meta), absolutePath);
      } else {
        requirePath = absolutePath;
      }
    }
  }

  return requireWrapper(requirePath);
}

/**
 * Creates a settings object from potential flags object by dropping all the properties
 * that don't exist on Config.Settings.
 * @param {Partial<LH.Flags>=} flags
 * @return {LH.Util.RecursivePartial<LH.Config.Settings>}
*/
function cleanFlagsForSettings(flags = {}) {
  /** @type {LH.Util.RecursivePartial<LH.Config.Settings>} */
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
  // TODO: could do more work to sniff out the user's locale
  const locale = i18n.lookupLocale(overrides?.locale || settingsJson.locale);

  // Fill in missing settings with defaults
  const {defaultSettings} = constants;
  const settingWithDefaults = mergeConfigFragment(deepClone(defaultSettings), settingsJson, true);

  // Override any applicable settings with CLI flags
  const settingsWithFlags = mergeConfigFragment(
    settingWithDefaults,
    cleanFlagsForSettings(overrides),
    true
  );

  // Locale is special and comes only from flags/settings/lookupLocale.
  settingsWithFlags.locale = locale;

  // Default constants uses the mobile UA. Explicitly stating to true asks LH to use the associated UA.
  // It's a little awkward, but the alternatives are not allowing `true` or a dedicated `disableUAEmulation` setting.
  if (settingsWithFlags.emulatedUserAgent === true) {
    settingsWithFlags.emulatedUserAgent = constants.userAgents[settingsWithFlags.formFactor];
  }

  validation.assertValidSettings(settingsWithFlags);
  return settingsWithFlags;
}

/**
 * @param {LH.Config} config
 * @param {string | undefined} configDir
 * @param {{plugins?: string[]} | undefined} flags
 * @return {Promise<LH.Config>}
 */
async function mergePlugins(config, configDir, flags) {
  const configPlugins = config.plugins || [];
  const flagPlugins = flags?.plugins || [];
  const pluginNames = new Set([...configPlugins, ...flagPlugins]);

  for (const pluginName of pluginNames) {
    validation.assertValidPluginName(config, pluginName);

    // In bundled contexts, `resolveModulePath` will fail, so use the raw pluginName directly.
    const pluginPath = isBundledEnvironment() ?
        pluginName :
        resolveModulePath(pluginName, configDir, 'plugin');
    const rawPluginJson = await requireWrapper(pluginPath);
    const pluginJson = ConfigPlugin.parsePlugin(rawPluginJson, pluginName);

    config = mergeConfigFragment(config, pluginJson);
  }

  return config;
}


/**
 * Turns a GathererJson into a GathererDefn which involves a few main steps:
 *    - Expanding the JSON shorthand the full definition format.
 *    - `require`ing in the implementation.
 *    - Creating a gatherer instance from the implementation.
 * @param {LH.Config.GathererJson} gathererJson
 * @param {Array<string>} coreGathererList
 * @param {string=} configDir
 * @return {Promise<LH.Config.AnyGathererDefn>}
 */
async function resolveGathererToDefn(gathererJson, coreGathererList, configDir) {
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
 * @param {LH.Config['audits']} audits
 * @param {string=} configDir
 * @return {Promise<Array<LH.Config.AuditDefn>|null>}
 */
async function resolveAuditsToDefns(audits, configDir) {
  if (!audits) {
    return null;
  }

  const coreList = Runner.getAuditList();
  const auditDefnsPromises = audits.map(async (auditJson) => {
    const auditDefn = expandAuditShorthand(auditJson);
    let implementation;
    if ('implementation' in auditDefn) {
      implementation = auditDefn.implementation;
    } else {
      implementation = await requireAudit(auditDefn.path, coreList, configDir);
    }

    return {
      implementation,
      path: auditDefn.path,
      options: auditDefn.options || {},
    };
  });
  const auditDefns = await Promise.all(auditDefnsPromises);

  const mergedAuditDefns = mergeOptionsOfItems(auditDefns);
  mergedAuditDefns.forEach(audit => validation.assertValidAudit(audit));
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
     Tried to resolve the module from these locations:
       ${getModuleDirectory(import.meta)}
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
 * Deep clone a config, copying over any "live" gatherer or audit that
 * wouldn't make the JSON round trip.
 * @param {LH.Config} json
 * @return {LH.Config}
 */
function deepCloneConfigJson(json) {
  const cloned = deepClone(json);

  // Copy arrays that could contain non-serializable properties to allow for programmatic
  // injection of audit and gatherer implementations.
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

export {
  deepClone,
  deepCloneConfigJson,
  mergeConfigFragment,
  mergeConfigFragmentArrayByKey,
  mergeOptionsOfItems,
  mergePlugins,
  resolveAuditsToDefns,
  resolveGathererToDefn,
  resolveModulePath,
  resolveSettings,
};
