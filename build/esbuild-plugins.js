/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';

// eslint-disable-next-line no-unused-vars
import esbuild from 'esbuild';
import builtin from 'builtin-modules';

import {inlineFsPlugin} from './plugins/esbuild-inline-fs.js';

/**
 * @typedef PartialLoader
 * @property {string} name
 * @property {(code: string, args: esbuild.OnLoadArgs) => Promise<{code: string, warnings?: esbuild.PartialMessage[]} | null>} onLoad
 */

const partialLoaders = {
  inlineFs: inlineFsPlugin,
  /** @type {PartialLoader} */
  rmGetModuleDirectory: {
    name: 'rm-get-module-directory',
    async onLoad(code) {
      return {code: code.replace(/getModuleDirectory\(import.meta\)/g, '""')};
    },
  },
  /**
   * @param {Record<string, string | ((id: string) => string)>} replacements
   * @return {PartialLoader}
   */
  replaceText(replacements) {
    return {
      name: 'text-replace',
      async onLoad(code, args) {
        for (const [k, v] of Object.entries(replacements)) {
          let replaceWith;
          if (v instanceof Function) {
            replaceWith = v(args.path);
          } else {
            replaceWith = v;
          }

          code = code.replaceAll(k, replaceWith);
        }

        return {code};
      },
    };
  },
};

/**
 * Bundles multiple partial loaders (string => string JS transforms) into a single esbuild Loader plugin.
 * A partial loader that doesn't want to do any transform should return null.
 * @param {PartialLoader[]} partialLoaders
 * @return {esbuild.Plugin}
 */
function bulkLoader(partialLoaders) {
  return {
    name: 'bulk-loader',
    setup(build) {
      build.onLoad({filter: /\.*.js$/}, async (args) => {
        /** @type {esbuild.PartialMessage[]} */
        const warnings = [];
        // TODO: source maps? lol.
        let code = await fs.promises.readFile(args.path, 'utf-8');

        for (const partialLoader of partialLoaders) {
          const partialResult = await partialLoader.onLoad(code, args);
          if (partialResult === null) continue;

          code = partialResult.code;
          if (partialResult.warnings) {
            for (const warning of partialResult.warnings) {
              warning.notes = warning.notes || [];
              warning.notes.unshift({text: `partial loader: ${partialLoader.name}`});
            }
            warnings.push(...partialResult.warnings);
          }
        }

        return {contents: code, warnings, resolveDir: path.dirname(args.path)};
      });
    },
  };
}

/**
 * Given a module path, replace the contents with the provided text.
 *
 * - If the module is a file on disk, the path MUST be absolute.
 * - Bare builtin specifiers (ex: 'fs', 'path') work too.
 * - Other loaders may give a resolved path that doesn't reference a filepath.
 * - In all cases where a module is replaced, no other loaders will process that module.
 *   If this is ever problematic, this plugin should be converted to be a partial loader.
 * - This plugin should always be the first loader plugin.
 *
 * @param {Record<string, string>} replaceMap
 * @param {{disableUnusedError: boolean}} opts
 * @return {esbuild.Plugin}
 */
function replaceModules(replaceMap, opts = {disableUnusedError: false}) {
  // Allow callers to specifier an unresolved path, but normalize things
  // by resolving those paths now.
  // TODO: really this should use import.meta.resolve, but... that's not a thing yet!
  const require = createRequire(import.meta.url);
  for (const [k, v] of Object.entries(replaceMap)) {
    try {
      const resolvedPath = require.resolve(k);
      if (resolvedPath !== k) {
        replaceMap[resolvedPath] = v;
        delete replaceMap[k];
      }
    } catch {}
  }

  return {
    name: 'replace-modules',
    setup(build) {
      // Capture modules of interest and resolve them to their absolute paths.
      // This handles real-files on disk, and builtin specifiers.
      build.onResolve({filter: /.*/}, (args) => {
        let resolvedPath;
        try {
          resolvedPath = require.resolve(args.path, {paths: [args.resolveDir]});
        } catch {
          // We should append .js and .ts and .tsx to try and find the correct file...
          // but we aren't shimming such modules at the moment, so whatever.
          return;
        }

        // `resolvedPath` is now either an absolute path on disk, or a builtin module (like `url`).
        if (!(resolvedPath in replaceMap)) return;

        // Put everything we see here into our namespace.
        return {path: resolvedPath, namespace: 'replace-modules'};
      });

      const modulesNotSeen = new Set(Object.keys(replaceMap));
      build.onLoad({filter: /.*/, namespace: 'replace-modules'}, async (args) => {
        // Anything in our namespace is guaranteed to be something in replaceMap.
        modulesNotSeen.delete(args.path);
        return {contents: replaceMap[args.path], resolveDir: path.dirname(args.path)};
      });

      // Handle the third case - when a module is created by some other plugin, and the user of this
      // plugin wishes to replace it.
      build.onLoad({filter: /.*/}, async (args) => {
        // The `onResolve` hook moved all the real modules (builtins and real files on disk) to the `replace-modules`
        // namespace. What remains here are modules that were injected by other plugins. Example: __zlib-lib/inflate
        if (args.path in replaceMap) {
          modulesNotSeen.delete(args.path);
          return {contents: replaceMap[args.path], resolveDir: path.dirname(args.path)};
        }
        return null;
      });

      if (!opts.disableUnusedError) {
        build.onEnd(() => {
          if (modulesNotSeen.size > 0) {
            throw new Error('Unused module replacements: ' + [...modulesNotSeen]);
          }
        });
      }
    },
  };
}

/**
 * @param {{exclude?: string[]}=} opts
 * @return {esbuild.Plugin}
 */
function ignoreBuiltins(opts = {}) {
  let builtinList = [...builtin];
  if (opts.exclude) {
    builtinList = builtinList.filter(b => !opts?.exclude?.includes(b));
  }
  const builtinRegexp = new RegExp(`^(${builtinList.join('|')})\\/?(.+)?`);
  return {
    name: 'ignore-builtins',
    setup(build) {
      build.onResolve({filter: builtinRegexp}, (args) => {
        if (args.path.match(builtinRegexp)) {
          return {path: args.path, namespace: 'ignore-builtins'};
        }
      });
      build.onLoad({filter: builtinRegexp, namespace: 'ignore-builtins'}, async () => {
        return {contents: ''};
      });
    },
  };
}

/**
 * Currently there is no umd support in esbuild,
 * so we take the output of an iife build and create our own umd bundle.
 * https://github.com/evanw/esbuild/pull/1331
 * @param {string} iifeCode expected to use `globalName: 'umdExports'`
 * @param {string} moduleName
 * @return {string}
 */
function generateUMD(iifeCode, moduleName) {
  const moduleComponents = moduleName.split('.');
  const moduleLastName = moduleComponents[moduleComponents.length - 1];
  if (moduleComponents.length > 2) {
    throw new Error('only one level of modules is supported currently');
  }
  const initParentModules = moduleComponents.length === 2 ?
    `root.${moduleComponents[0]} = root.${moduleComponents[0]} || {}` :
    '';
  const initModule = moduleComponents.length === 2 ?
    `root.${moduleComponents[0]}.${moduleComponents[1]} = factory();` :
    `root.${moduleName} = factory();`;
  // TODO: we need to change `Lighthouse.ReportGenerator.ReportGenerator` to `Lighthouse.ReportGenerator` in CDT.
  const devtoolsHack = moduleName === 'Lighthouse.ReportGenerator' ?
    'root.Lighthouse.ReportGenerator.ReportGenerator = root.Lighthouse.ReportGenerator;' :
    '';

  return `(function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    ${initParentModules}
    ${initModule}
    ${devtoolsHack}
  }
}(typeof self !== "undefined" ? self : this, function() {
  "use strict";
  ${iifeCode.replace('"use strict";\n', '')};
  return umdExports.${moduleLastName} ?? umdExports;
}));
`;
}

/**
 * @param {string} moduleName
 * @return {esbuild.Plugin}
 */
function umd(moduleName) {
  return {
    name: 'umd',
    setup(build) {
      // We _must_ disable the write option so that `result.outputFiles` is set.
      // Node API defaults to false.
      const originalWrite = build.initialOptions.write ?? true;
      build.initialOptions.write = false;

      if (build.initialOptions.globalName) {
        throw new Error('Using the umd plugin requires not setting `globalName`');
      }
      build.initialOptions.globalName = 'umdExports';

      if (build.initialOptions.format) {
        throw new Error('Using the umd plugin requires not setting `format`');
      }
      build.initialOptions.format = 'iife';

      build.onEnd(async (result) => {
        if (result.outputFiles?.length !== 1) {
          throw new Error('unexpected number of output files');
        }

        const umdCode = generateUMD(result.outputFiles[0].text, moduleName);
        // @ts-expect-error build-viewer needs to extract the umd bundle as a string.
        result.outputFiles[0].textUmd = umdCode;
        if (originalWrite) {
          await fs.promises.writeFile(result.outputFiles[0].path, umdCode);
        }
      });
    },
  };
}

export {
  partialLoaders,
  bulkLoader,
  replaceModules,
  ignoreBuiltins,
  umd,
};
