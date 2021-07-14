/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


declare global {
  module LH.Renderer {
    class ReportRenderer {
      constructor(lhr: LH.Result, options?: ReportRendererOptions);

      getContainerEl(): HTMLElement;
      getTopBarEl(): HTMLElement;


      // No need for PSI mode. it'll just getContainerEl and get solo-cat mode and pull the scoregauge out, and remove the footer.
      getFinalScreenshot(): void | string;

      // Convenience for folks:
      // category handles a bunch of plugin, n/a, and error cases. groupDefs needed only for PWA
      renderGaugeForCategory(category: LH.ReportCategory, groupDefinitions?: Object<string, LH.Result.ReportGroup>): HTMLElement;
      renderGaugeForScore(num0to1: number): HTMLElement // maybe?
    }
  }

  interface ReportRendererOptions {
    /** DOM element that will the overlay DOM should be a child of.
     * Must z-index overlay everything it should.
     * Defaults to the containerEl, but will be set in PSI to avoid being under the sticky header. */
    overlayParentEl?: HTMLElement

    /** Callback running after a DOM element (like .lh-node or .lh-source-location) has been created */
    onDetailsItemRendered?: (type: string, el: HTMLElement, value: any) => void;

    /** Don't automatically apply dark-mode to dark based on (prefers-color-scheme: dark). (DevTools and PSINext don't want this.)
     * Also, the fireworks easter-egg will want to flip to dark, so this setting will also disable chance of fireworks. */
    disableAutoDarkModeAndFireworks?: boolean;

    /** If defined, the 'Save as Gist' item in the topbar dropdown will be shown and when clicked, will run this function. */
    onSaveGist?: (lhr: LH.Result) => string

    /** If defined, when the 'Save/Copy as HTML' items are clicked, this fn will be used instead of `documentElement.outerHTML`. */
    getStandaloneReportHTML?: () => string
  }

}


// empty export to keep file a module
export {}
