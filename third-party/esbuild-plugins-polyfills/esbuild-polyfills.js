// @ts-nocheck
/* eslint-disable */

import path from 'path';

import escapeStringRegexp from 'escape-string-regexp';
import {getModules as builtinsPolyfills} from 'rollup-plugin-polyfill-node/dist/modules.js';
import polyfillLib from 'rollup-plugin-polyfill-node/dist/polyfills.js';

const NAME = 'node-modules-polyfills';
const NAMESPACE = NAME;

function removeEndingSlash(importee) {
  if (importee && importee.slice(-1) === '/') {
    importee = importee.slice(0, -1);
  }
  return importee;
}

function nodeModulesPolyfillPlugin(
  options = {}
) {
  const {namespace = NAMESPACE, name = NAME} = options;
  if (namespace.endsWith('commonjs')) {
    throw new Error(`namespace ${namespace} must not end with commonjs`);
  }
  // this namespace is needed to make ES modules expose their default export to require: require('assert') will give you import('assert').default
  const commonjsNamespace = namespace + '-commonjs';
  const polyfilledBuiltins = builtinsPolyfills();
  const polyfilledBuiltinsNames = [...polyfilledBuiltins.keys()];

  return {
    name,
    setup: function setup({onLoad, onResolve, initialOptions}) {
      // polyfills contain global keyword, it must be defined
      if (initialOptions?.define && !initialOptions.define?.global) {
        initialOptions.define['global'] = 'globalThis';
      } else if (!initialOptions?.define) {
        initialOptions.define = {global: 'globalThis'};
      }

      // TODO these polyfill module cannot import anything, is that ok?
      async function loader(
        args
      ) {
        try {
          const isCommonjs = args.namespace.endsWith('commonjs');
          
          const key = removeEndingSlash(args.path);
          const contents = polyfilledBuiltins.get(key) || polyfillLib[key + '.js'];
          const resolveDir = path.dirname(key);

          if (isCommonjs) {
            return {
              loader: 'js',
              contents: commonJsTemplate({
                importPath: args.path,
              }),
              resolveDir,
            };
          }
          return {
            loader: 'js',
            contents,
            resolveDir,
          };
        } catch (e) {
          console.error('node-modules-polyfill', e);
          return {
            contents: `export {}`,
            loader: 'js',
          };
        }
      }
      onLoad({filter: /.*/, namespace}, loader);
      onLoad({filter: /.*/, namespace: commonjsNamespace}, loader);
      const filter = new RegExp(
                polyfilledBuiltinsNames.map(escapeStringRegexp).join('|') // TODO builtins could end with slash, keep in mind in regex
      );
      async function resolver(args) {
        const ignoreRequire = args.namespace === commonjsNamespace;

        let key;
        if (args.path.startsWith('\0polyfill-node.')) {
          key = args.path.replace('\0polyfill-node.', '');
        } else {
          if (args.path.startsWith('.')) {
            key = path.join(path.dirname(args.importer), args.path);
          } else {
            key = args.path;
          }
        }

        if (!polyfilledBuiltins.has(key) && !polyfillLib[key + '.js']) {
          return;
        }

        const isCommonjs =
                    !ignoreRequire && args.kind === 'require-call';

        return {
          namespace: isCommonjs ? commonjsNamespace : namespace,
          path: key,
        };
      }
      onResolve({filter}, resolver);
      onResolve({filter: /.*/, namespace}, resolver);
    },
  };
}

function commonJsTemplate({importPath}) {
  return `
const polyfill = require('${importPath}')

if (polyfill && polyfill.default) {
    module.exports = polyfill.default
    for (let k in polyfill) {
        module.exports[k] = polyfill[k]
    }
} else if (polyfill)  {
    module.exports = polyfill
}


`;
}

export {nodeModulesPolyfillPlugin};
