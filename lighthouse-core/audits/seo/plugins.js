/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const URL = require('../../lib/url-shim.js');

const JAVA_APPLET_TYPE = 'application/x-java-applet';
const JAVA_BEAN_TYPE = 'application/x-java-bean';
const TYPE_BLOCKLIST = new Set([
  'application/x-shockwave-flash',
  // See https://docs.oracle.com/cd/E19683-01/816-0378/using_tags/index.html
  JAVA_APPLET_TYPE,
  JAVA_BEAN_TYPE,
  // See https://msdn.microsoft.com/es-es/library/cc265156(v=vs.95).aspx
  'application/x-silverlight',
  'application/x-silverlight-2',
]);
const FILE_EXTENSION_BLOCKLIST = new Set([
  'swf',
  'flv',
  'class',
  'xap',
]);
const SOURCE_PARAMS = new Set([
  'code',
  'movie',
  'source',
  'src',
]);
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the browser plugins used by the page. This descriptive title is shown when there is no plugin content on the page that would restrict search indexing. */
  title: 'Document avoids plugins',
  /** Descriptive title of a Lighthouse audit that provides detail on the browser plugins used by the page. This title is shown when there is plugin content on the page. */
  failureTitle: 'Document uses plugins',
  /** Description of a Lighthouse audit that tells the user *why* they need to avoid using browser plugins in their content. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Search engines can\'t index plugin content, and ' +
    'many devices restrict plugins or don\'t support them. ' +
    '[Learn more](https://web.dev/plugins).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * Verifies if given MIME type matches any known plugin MIME type
 * @param {string} type
 * @return {boolean}
 */
function isPluginType(type) {
  type = type.trim().toLowerCase();

  return TYPE_BLOCKLIST.has(type) ||
    type.startsWith(JAVA_APPLET_TYPE) || // e.g. "application/x-java-applet;jpi-version=1.4"
    type.startsWith(JAVA_BEAN_TYPE);
}

/**
 * Verifies if given url points to a file that has a known plugin extension
 * @param {string} url
 * @return {boolean}
 */
function isPluginURL(url) {
  try {
    // in order to support relative URLs we need to provied a base URL
    const filePath = new URL(url, 'http://example.com').pathname;
    const parts = filePath.split('.');

    if (parts.length < 2) {
      return false;
    }
    const part = /** @type {string} */(parts.pop());
    return FILE_EXTENSION_BLOCKLIST.has(part.trim().toLowerCase());
  } catch (e) {
    return false;
  }
}

class Plugins extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'plugins',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['EmbeddedContent'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const plugins = artifacts.EmbeddedContent
      .filter(item => {
        if (item.tagName === 'APPLET') {
          return true;
        }

        if (
          (item.tagName === 'EMBED' || item.tagName === 'OBJECT') &&
          item.type &&
          isPluginType(item.type)
        ) {
          return true;
        }

        const embedSrc = item.src || item.code;
        if (item.tagName === 'EMBED' && embedSrc && isPluginURL(embedSrc)) {
          return true;
        }

        if (item.tagName === 'OBJECT' && item.data && isPluginURL(item.data)) {
          return true;
        }

        const failingParams = item.params.filter(param =>
          SOURCE_PARAMS.has(param.name.trim().toLowerCase()) && isPluginURL(param.value)
        );

        return failingParams.length > 0;
      })
      .map(plugin => {
        const tagName = plugin.tagName.toLowerCase();
        /** @type {Array<keyof LH.Artifacts.EmbeddedContentInfo>} */
        const attributeKeys = ['src', 'data', 'code', 'type'];
        const attributes = attributeKeys
          .reduce((result, attr) => {
            if (plugin[attr] !== null) {
              result += ` ${attr}="${plugin[attr]}"`;
            }
            return result;
          }, '');
        const params = plugin.params
          .filter(param => SOURCE_PARAMS.has(param.name.trim().toLowerCase()))
          .map(param => `<param ${param.name}="${param.value}" />`)
          .join('');

        return {
          source: {
            type: /** @type {'node'} */ ('node'),
            snippet: `<${tagName}${attributes}>${params}</${tagName}>`,
          },
        };
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', itemType: 'code', text: 'Element source'},
    ];

    const details = Audit.makeTableDetails(headings, plugins);

    return {
      score: Number(plugins.length === 0),
      details,
    };
  }
}

module.exports = Plugins;
module.exports.UIStrings = UIStrings;
