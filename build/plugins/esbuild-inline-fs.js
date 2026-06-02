/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {inlineFs} from './inline-fs.js';

/** @typedef {import('../esbuild-plugins.js').PartialLoader} PartialLoader */

/**
 * @typedef InlineFsPluginOptions
 * @property {boolean} [verbose] If true, turns on verbose logging, e.g. log instances where fs methods could not be inlined.
 * @property {string[]} [ignorePaths] Absoulte paths of files to not process for inlining.
 * @property {Set<string>} [trackedFiles] A set to track all files that are inlined.
 */

/**
 * @param {InlineFsPluginOptions} options
 * @return {PartialLoader}
 */
const inlineFsPlugin = (options) => ({
  name: 'inline-fs',
  async onLoad(inputCode, args) {
    if (options.ignorePaths?.includes(args.path)) {
      return null;
    }

    // TODO(bckenny): add source maps, watch files.
    const {code, warnings} = await inlineFs(inputCode, args.path, options.trackedFiles);
    return {
      code: code ?? inputCode,
      warnings: options.verbose ? warnings : [],
    };
  },
});

export {inlineFsPlugin};
