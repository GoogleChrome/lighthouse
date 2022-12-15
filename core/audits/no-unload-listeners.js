/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {Audit} from './audit.js';
import {JSBundles} from '../computed/js-bundles.js';
import * as i18n from './../lib/i18n/i18n.js';

const UIStrings = {
  /** Descriptive title of a Lighthouse audit that checks if a web page has 'unload' event listeners and finds none. */
  title: 'Avoids `unload` event listeners',
  /** Descriptive title of a Lighthouse audit that checks if a web page has 'unload' event listeners and finds that it is using them. */
  failureTitle: 'Registers an `unload` listener',
  /** Description of a Lighthouse audit that tells the user why pages should not use the 'unload' event. This is displayed after a user expands the section to see more. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'The `unload` event does not fire reliably and listening for it can prevent browser optimizations like the Back-Forward Cache. Use `pagehide` or `visibilitychange` events instead. [Learn more about unload event listeners](https://web.dev/bfcache/#never-use-the-unload-event)',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class NoUnloadListeners extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'no-unload-listeners',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['GlobalListeners', 'SourceMaps', 'Scripts'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const unloadListeners = artifacts.GlobalListeners.filter(l => l.type === 'unload');
    if (!unloadListeners.length) {
      return {
        score: 1,
      };
    }

    const bundles = await JSBundles.request(artifacts, context);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'source', valueType: 'source-location', label: str_(i18n.UIStrings.columnSource)},
    ];

    /** @type {Array<{source: LH.Audit.Details.ItemValue}>} */
    const tableItems = unloadListeners.map(listener => {
      const {lineNumber, columnNumber} = listener;
      const script = artifacts.Scripts.find(s => s.scriptId === listener.scriptId);

      // If we can't find a url, still show something so the user can manually
      // look for where an `unload` handler is being created.
      if (!script) {
        return {
          source: {
            type: 'url',
            value: `(unknown):${lineNumber}:${columnNumber}`,
          },
        };
      }

      const bundle = bundles.find(bundle => bundle.script.scriptId === script.scriptId);
      return {
        source: Audit.makeSourceLocationFromScript(script, lineNumber, columnNumber, bundle),
      };
    });

    return {
      score: 0,
      details: Audit.makeTableDetails(headings, tableItems),
    };
  }
}

export default NoUnloadListeners;
export {UIStrings};
