/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {createRequire, builtinModules} from 'module';

import * as acorn from 'acorn';
// eslint-disable-next-line no-unused-vars
import esbuild from 'esbuild';

import {LH_ROOT} from '../shared/root.js';
import {ARD_VERSION} from '../third-party/ard/ard.js';
import {inlineFsPlugin} from './plugins/esbuild-inline-fs.js';
import {nodeModuleShims} from './plugins/esbuild-node-polyfills.js';

const require = createRequire(import.meta.url);

/**
 * @typedef {{
 *   name: string,
 *   url?: string,
 *   version?: string,
 *   license?: string,
 *   licenseText?: string,
 * }} DependencyNotice
 */

/**
 * Metadata for vendored directories under `third-party/` that do not have their own `package.json`.
 * @type {Record<string, {npmPackage: string} | {name: string, url: string, version: string, license: string, licenseFile: string}>}
 */
const VENDORED_THIRD_PARTY_DIRS = {
  'ard': {
    name: 'ard-spec',
    url: 'https://github.com/ards-project/ard-spec',
    version: ARD_VERSION,
    license: 'Apache-2.0',
    licenseFile: path.join(LH_ROOT, 'third-party/ard/LICENSE'),
  },
  // `third-party/axe/valid-langs.js` is extracted from `axe-core`.
  'axe': {
    npmPackage: 'axe-core',
  },
};

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
      return {code: code.replace(/import\.meta\.dirname/g, '""')};
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
 * Converts an absolute path inside LH_ROOT to a POSIX path relative to LH_ROOT.
 * Leaves bare specifiers and paths outside LH_ROOT unchanged.
 * @param {string} p
 * @return {string}
 */
function toProjectRelativePath(p) {
  if (!path.isAbsolute(p)) return p;
  const rel = path.relative(LH_ROOT, p);
  return rel.startsWith('..') ? p : rel.replaceAll('\\', '/');
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
  /** @type {Record<string, string>} */
  const normalizedReplaceMap = {};
  for (const [k, v] of Object.entries(replaceMap)) {
    let resolvedPath = k;
    try {
      resolvedPath = require.resolve(k);
    } catch {}
    normalizedReplaceMap[toProjectRelativePath(resolvedPath)] = v;
  }

  return {
    name: 'replace-modules',
    setup(build) {
      // Capture modules of interest and resolve them to their project-relative paths.
      // This handles real-files on disk, and builtin specifiers.
      build.onResolve({filter: /.*/}, (args) => {
        const relArgPath = toProjectRelativePath(args.path);
        if (relArgPath in normalizedReplaceMap) {
          return {path: relArgPath, namespace: 'replace-modules'};
        }

        if (args.path.startsWith('.')) {
          const absPath = path.resolve(args.resolveDir, args.path);
          const relPath = toProjectRelativePath(absPath);
          if (relPath in normalizedReplaceMap) {
            return {path: relPath, namespace: 'replace-modules'};
          }
          if ((relPath + '.js') in normalizedReplaceMap) {
            return {path: relPath + '.js', namespace: 'replace-modules'};
          }
          return;
        }

        let resolvedPath;
        try {
          resolvedPath = require.resolve(args.path, {paths: [args.resolveDir]});
        } catch {
          // We should append .js and .ts and .tsx to try and find the correct file...
          // but we aren't shimming such modules at the moment, so whatever.
          return;
        }

        const relResolvedPath = toProjectRelativePath(resolvedPath);
        // `relResolvedPath` is now either a project-relative path on disk, or a builtin module (like `url`).
        if (!(relResolvedPath in normalizedReplaceMap)) return;

        // Put everything we see here into our namespace.
        return {path: relResolvedPath, namespace: 'replace-modules'};
      });

      const modulesNotSeen = new Set(Object.keys(normalizedReplaceMap));
      build.onLoad({filter: /.*/, namespace: 'replace-modules'}, async (args) => {
        // Anything in our namespace is guaranteed to be something in normalizedReplaceMap.
        modulesNotSeen.delete(args.path);
        const resolveDir = path.resolve(LH_ROOT, path.dirname(args.path));
        return {contents: normalizedReplaceMap[args.path], resolveDir};
      });

      // Handle the third case - when a module is created by some other plugin, and the user of this
      // plugin wishes to replace it.
      build.onLoad({filter: /.*/}, async (args) => {
        // The `onResolve` hook moved all the real modules (builtins and real files on disk) to the `replace-modules`
        // namespace. What remains here are modules that were injected by other plugins. Example: __zlib-lib/inflate
        const relArgPath = toProjectRelativePath(args.path);
        if (relArgPath in normalizedReplaceMap) {
          modulesNotSeen.delete(relArgPath);
          const resolveDir = path.resolve(LH_ROOT, path.dirname(relArgPath));
          return {contents: normalizedReplaceMap[relArgPath], resolveDir};
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
  let builtinList = builtinModules.filter(m => !m.startsWith('_'));
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
 * Escapes non-ASCII characters (`> 0x7f`) inside JS comments as `\uXXXX`.
 *
 * Esbuild's `charset: 'ascii'` escapes non-ASCII inside string literals, but
 * leaves comments, RegExp literals, and tagged template literals untouched.
 * Escaping comments via an AST parser keeps unminified bundles in 1-byte string
 * buffers (`<= 0xff`) in Blink/V8 without mutating `RegExp.prototype.source` or
 * `String.raw` template literals.
 * @param {string} code
 * @return {string}
 */
function escapeNonAsciiComments(code) {
  if (!/[\u0080-\uffff]/.test(code)) return code;

  /** @type {Array<{start: number, end: number}>} */
  const comments = [];
  acorn.parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    onComment: (_isBlock, text, start, end) => {
      if (/[\u0080-\uffff]/.test(text)) {
        comments.push({start, end});
      }
    },
  });

  if (comments.length === 0) return code;

  let out = '';
  let lastIndex = 0;
  for (const {start, end} of comments) {
    out += code.slice(lastIndex, start);
    out += code.slice(start, end).replace(
      /[\u0080-\uffff]/g,
      c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
    );
    lastIndex = end;
  }
  return out + code.slice(lastIndex);
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

  return escapeNonAsciiComments(`(function(root, factory) {
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
`);
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

/**
 * @param {string} id
 * @param {string} shimDir
 * @return {string}
 */
function generateAuditShim(id, shimDir) {
  const auditPath = path.resolve(LH_ROOT, 'core/audits/audit.js');
  let relativePath = path.relative(shimDir, auditPath);
  if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

  return `
import {Audit} from '${relativePath}';
class ShimAudit extends Audit {
  static get meta() {
    return {
      id: '${id}',
      title: 'Shim Audit',
      description: 'This audit was filtered out and is not available in this bundle.',
      scoreDisplayMode: Audit.SCORING_MODES.NOT_APPLICABLE,
      requiredArtifacts: [],
    };
  }
  static audit() {
    return {score: null, scoreDisplayMode: Audit.SCORING_MODES.NOT_APPLICABLE};
  }
}
export default ShimAudit;
`;
}

/**
 * @param {string} id
 * @param {string} shimDir
 * @return {string}
 */
function generateGathererShim(id, shimDir) {
  const gathererPath = path.resolve(LH_ROOT, 'core/gather/base-gatherer.js');
  let relativePath = path.relative(shimDir, gathererPath);
  if (!relativePath.startsWith('.')) relativePath = './' + relativePath;

  return `
import BaseGatherer from '${relativePath}';
class ShimGatherer extends BaseGatherer {
  meta = {supportedModes: ['navigation', 'timespan', 'snapshot']};
  static getDefaultTraceCategories() { return []; }
  getArtifact() {
    return undefined;
  }
}
export default ShimGatherer;
`;
}

/**
 * @param {{
 *   includedAudits?: string[],
 *   includedGatherers?: string[],
 * }} options
 * @return {esbuild.Plugin}
 */
function lighthouseShimPlugin(options) {
  const {includedAudits = [], includedGatherers = []} = options;

  return {
    name: 'lh-shim',
    setup(build) {
      // Intercept audits
      build.onResolve({filter: /audits\/.*\.js$/}, args => {
        if (args.path.endsWith('/audit.js') || args.path === './audit.js') return;
        const isIncluded = includedAudits.some(p => args.path.includes(p));
        if (isIncluded) return;

        // Resolve to absolute path to ensure we have a consistent base for shimDir
        const absolutePath = path.resolve(args.resolveDir, args.path);
        return {path: toProjectRelativePath(absolutePath), namespace: 'lh-audit-shim'};
      });

      build.onLoad({filter: /.*/, namespace: 'lh-audit-shim'}, args => {
        const id = path.basename(args.path, '.js');
        const shimDir = path.resolve(LH_ROOT, path.dirname(args.path));
        return {contents: generateAuditShim(id, shimDir), loader: 'js', resolveDir: shimDir};
      });

      // Intercept gatherers
      build.onResolve({filter: /gatherers\/.*\.js$/}, args => {
        if (args.path.endsWith('/base-gatherer.js') || args.path === '../base-gatherer.js') return;
        const isIncluded = includedGatherers.some(p => args.path.includes(p));
        if (isIncluded) return;

        const absolutePath = path.resolve(args.resolveDir, args.path);
        return {path: toProjectRelativePath(absolutePath), namespace: 'lh-gatherer-shim'};
      });

      build.onLoad({filter: /.*/, namespace: 'lh-gatherer-shim'}, args => {
        const id = path.basename(args.path, '.js');
        const shimDir = path.resolve(LH_ROOT, path.dirname(args.path));
        return {contents: generateGathererShim(id, shimDir), loader: 'js', resolveDir: shimDir};
      });
    },
  };
}

/**
 * Returns true if `modulePath` is a virtual/shimmed module in an esbuild plugin namespace
 * (e.g. `replace-modules:...`, `lh-audit-shim:...`, `lh-gatherer-shim:...`).
 * @param {string} modulePath
 * @return {boolean}
 */
function isShimmedOrVirtualModule(modulePath) {
  return /^[a-z][a-z0-9-]+:/.test(modulePath);
}

/**
 * @param {unknown} rawUrl
 * @return {string | undefined}
 */
function normalizePackageUrl(rawUrl) {
  const candidate = rawUrl && typeof rawUrl === 'object' && 'url' in rawUrl ?
    rawUrl.url :
    rawUrl;
  if (!candidate || typeof candidate !== 'string') return undefined;

  const url = candidate.replace(/^git\+/, '').replace(/\.git$/, '');
  if (url.startsWith('github:')) {
    return `https://github.com/${url.substring(7)}`;
  }
  if (url.startsWith('gitlab:')) {
    return `https://gitlab.com/${url.substring(7)}`;
  }
  if (url.startsWith('bitbucket:')) {
    return `https://bitbucket.org/${url.substring(10)}`;
  }
  if (url.startsWith('ssh://git@github.com/')) {
    return `https://github.com/${url.substring('ssh://git@github.com/'.length)}`;
  }
  if (url.startsWith('git://github.com/')) {
    return `https://github.com/${url.substring('git://github.com/'.length)}`;
  }
  if (url.startsWith('git@github.com:')) {
    return `https://github.com/${url.substring('git@github.com:'.length)}`;
  }
  if (!url.startsWith('http')) {
    const parts = url.split('/');
    if (parts.length === 2) {
      return `https://github.com/${url}`;
    }
  }
  return url;
}

/**
 * @param {string} packageDir
 * @return {DependencyNotice}
 */
function readPackageNotice(packageDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf-8'));
  const preferredLicenseFiles = [
    'LICENSE',
    'LICENSE.txt',
    'LICENSE.md',
    'license.md',
    'LICENSE.MIT',
    'LICENSE.APACHE',
  ];

  let licenseText;
  for (const fileName of preferredLicenseFiles) {
    const candidate = path.join(packageDir, fileName);
    if (fs.existsSync(candidate)) {
      licenseText = fs.readFileSync(candidate, 'utf-8');
      break;
    }
  }
  if (!licenseText) {
    const fallbackFile = fs.readdirSync(packageDir)
      .find(f => /^licen[sc]e/i.test(f) || /^copying/i.test(f));
    if (fallbackFile) {
      licenseText = fs.readFileSync(path.join(packageDir, fallbackFile), 'utf-8');
    }
  }

  let license;
  if (pkg.license) {
    license = typeof pkg.license === 'object' ? pkg.license?.type : pkg.license;
  } else if (Array.isArray(pkg.licenses)) {
    license = pkg.licenses.map((/** @type {any} */ l) => l.type || l).join(', ');
  }

  return {
    name: pkg.name ?? 'N/A',
    url: normalizePackageUrl(pkg.homepage ?? pkg.repository),
    version: pkg.version,
    license,
    licenseText,
  };
}

/**
 * Collects third-party dependency license notices for an esbuild bundle output,
 * excluding shimmed/virtual modules and tree-shaken inputs.
 * @param {{
 *   metafile: import('esbuild').Metafile,
 *   sources: string[],
 *   inlinedFilesByImporter?: Map<string, Set<string>>,
 *   distDir: string,
 * }} options
 * @return {DependencyNotice[]}
 */
function collectThirdPartyNotices({metafile, sources, inlinedFilesByImporter, distDir}) {
  const jsOutput = Object.entries(metafile.outputs)
    .find(([outPath]) => outPath.endsWith('.js'))?.[1];

  /** @type {Set<string>} */
  const activeOutputInputs = new Set();
  for (const [inputPath, info] of Object.entries(jsOutput?.inputs ?? {})) {
    if (isShimmedOrVirtualModule(inputPath)) continue;
    if (info.bytesInOutput <= 0) continue;
    activeOutputInputs.add(path.resolve(process.cwd(), inputPath));
  }

  /** @type {Set<string>} */
  const paths = new Set(activeOutputInputs);
  for (const source of sources) {
    if (isShimmedOrVirtualModule(source)) continue;
    paths.add(path.resolve(distDir, source));
  }
  if (inlinedFilesByImporter) {
    for (const [importerPath, files] of inlinedFilesByImporter.entries()) {
      if (!activeOutputInputs.has(path.resolve(importerPath))) continue;
      for (const file of files) {
        paths.add(path.resolve(file));
      }
    }
  }

  /** @type {Map<string, DependencyNotice>} */
  const noticesByName = new Map();
  /** @type {Set<string>} */
  const seenPkgDirs = new Set();
  const thirdPartyRoot = path.join(LH_ROOT, 'third-party');

  for (const resolvedPath of paths) {
    let dir = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory() ?
      resolvedPath :
      path.dirname(resolvedPath);
    let pkgJsonPath;
    while (dir.startsWith(LH_ROOT) && dir !== LH_ROOT) {
      const candidate = path.join(dir, 'package.json');
      if (fs.existsSync(candidate)) {
        pkgJsonPath = candidate;
        break;
      }
      dir = path.dirname(dir);
    }

    if (pkgJsonPath) {
      const pkgDir = path.dirname(pkgJsonPath);
      if (!seenPkgDirs.has(pkgDir)) {
        seenPkgDirs.add(pkgDir);
        const notice = readPackageNotice(pkgDir);
        // We only care about third-party packages (or workspace packages that aren't the root).
        if (
          notice.name !== 'N/A' &&
          notice.name !== 'lighthouse' &&
          notice.name !== 'legacy-javascript'
        ) {
          noticesByName.set(notice.name, notice);
        }
      }
      continue;
    }

    if (resolvedPath.startsWith(thirdPartyRoot + path.sep)) {
      const subdir = path.relative(thirdPartyRoot, resolvedPath).split(path.sep)[0];
      const vendored = VENDORED_THIRD_PARTY_DIRS[subdir];
      if (!vendored) {
        throw new Error(
          `Missing third-party license metadata for vendored directory: third-party/${subdir}`
        );
      }
      if ('npmPackage' in vendored) {
        if (!noticesByName.has(vendored.npmPackage)) {
          const npmPkgDir = path.dirname(require.resolve(`${vendored.npmPackage}/package.json`));
          seenPkgDirs.add(npmPkgDir);
          noticesByName.set(vendored.npmPackage, readPackageNotice(npmPkgDir));
        }
      } else if (!noticesByName.has(vendored.name)) {
        noticesByName.set(vendored.name, {
          name: vendored.name,
          url: vendored.url,
          version: vendored.version,
          license: vendored.license,
          licenseText: fs.readFileSync(vendored.licenseFile, 'utf-8'),
        });
      }
    }
  }

  return Array.from(noticesByName.keys())
    .sort()
    .map(name => /** @type {DependencyNotice} */ (noticesByName.get(name)));
}

/**
 * @param {{
 *   removeExtraLicenses?: boolean,
 *   inlinedFilesByImporter?: Map<string, Set<string>>,
 * }} options
 * @return {esbuild.Plugin}
 */
function postprocess(options = {}) {
  return {
    name: 'postprocess',
    setup(build) {
      build.initialOptions.write = false;
      build.onEnd(async (result) => {
        if (result.errors.length) return;

        const codeFile = result.outputFiles?.find(file => file.path.endsWith('.js'));
        const mapFile = result.outputFiles?.find(file => file.path.endsWith('.js.map'));
        if (!codeFile) throw new Error('missing output');

        // Just make sure the shimming worked.
        let code = codeFile.text;
        if (code.includes('inflate_fast')) {
          throw new Error('Expected zlib inflate code to have been removed');
        }

        if (options.removeExtraLicenses) {
          // Get rid of our extra license comments.
          // All comments would have been moved to the end of the file, so removing some will not break
          // source maps.
          // https://stackoverflow.com/a/35923766
          const re = /\/\*\*\s*\n([^*]|(\*(?!\/)))*\*\/\n/g;
          let hasSeenFirst = false;
          /** @param {string} match */
          const replaceFn = (match) => {
            if (match.includes('@license') && match.match(/Lighthouse Authors|Google/)) {
              if (hasSeenFirst) return '';
              hasSeenFirst = true;
            }
            return match;
          };

          code = code.replace(re, replaceFn);
        }

        code = escapeNonAsciiComments(code);
        const twoByteMatch = /[\u0100-\uffff]/.exec(code);
        if (twoByteMatch) {
          const {line, column} = acorn.getLineInfo(code, twoByteMatch.index);
          const hex = twoByteMatch[0].charCodeAt(0).toString(16).padStart(4, '0');
          throw new Error(
            `Unexpected character > 0xff (\\u${hex}) at ${codeFile.path}:${line}:${column}; ` +
            'this widens the V8 script source buffer to 2-byte UTF-16'
          );
        }

        let allDepsList = '';
        let thirdPartyNoticesText = '';

        if (result.metafile && Object.keys(result.metafile.inputs).length > 0) {
          const sourcemap = mapFile ? JSON.parse(mapFile.text) : {sources: []};
          const distDir = path.dirname(codeFile.path);
          const notices = collectThirdPartyNotices({
            metafile: result.metafile,
            sources: sourcemap.sources,
            inlinedFilesByImporter: options.inlinedFilesByImporter,
            distDir,
          });

          if (notices.length > 0) {
            /* eslint-disable max-len */
            allDepsList = 'Bundled Dependencies:\n\n';
            thirdPartyNoticesText = '========================================================================\nThird-Party Software Notices and Licenses\n========================================================================\n\nThe Lighthouse bundle incorporates code from the following third-party\ndependencies under their respective open-source licenses:\n';

            for (const dep of notices) {
              const licenseStr = dep.license ?? 'Unknown';
              const repoUrl = dep.url ?? '';
              const versionStr = dep.version ?? '';
              const licenseFullText = dep.licenseText ?
                dep.licenseText.replaceAll('\r', '') :
                '(License text not found)';

              allDepsList += `- ${dep.name}${versionStr ? `@${versionStr}` : ''}: ${licenseStr}${repoUrl ? ` <${repoUrl}>` : ''}\n`;
              thirdPartyNoticesText += `\n------------------------------------------------------------------------\n${dep.name}${versionStr ? ` (v${versionStr})` : ''}\nLicense: ${licenseStr}\nURL: ${repoUrl || 'Unknown'}\n------------------------------------------------------------------------\n${licenseFullText}\n`;
            }
            /* eslint-enable max-len */
          }
        }

        await fs.promises.mkdir(path.dirname(codeFile.path), {recursive: true});
        await fs.promises.writeFile(codeFile.path, code);
        if (mapFile) await fs.promises.writeFile(mapFile.path, mapFile.text);
        if (allDepsList) await fs.promises.writeFile(codeFile.path + '.LEGAL.txt', allDepsList);
        if (thirdPartyNoticesText) {
          let lhLicenseText = '';
          try {
            lhLicenseText = await fs.promises.readFile(path.join(LH_ROOT, 'LICENSE'), 'utf8');
            lhLicenseText += '\n\n';
          } catch (e) {}
          const noticesPath = path.join(path.dirname(codeFile.path), 'LICENSE');
          await fs.promises.writeFile(noticesPath, lhLicenseText + thirdPartyNoticesText);
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
  escapeNonAsciiComments,
  umd,
  lighthouseShimPlugin,
  collectThirdPartyNotices,
  postprocess,
  nodeModuleShims,
};
