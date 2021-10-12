/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useLayoutEffect, useRef} from 'preact/hooks';

import {useReportRenderer} from './report-renderer';

/**
 * The default behavior of anchor links is not compatible with the flow report's hash navigation.
 * This function converts any anchor links under the provided element to a flow report link.
 * e.g. <a href="#link"> -> <a href="#index=0&anchor=link">
 */
export function convertChildAnchors(element: HTMLElement, index: number) {
  const links = element.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
  for (const link of links) {
    if (!link.href) continue;

    // Check if the link destination is in the report.
    const currentUrl = new URL(location.href);
    currentUrl.hash = '';
    currentUrl.search = '';
    const linkUrl = new URL(link.href);
    linkUrl.hash = '';
    linkUrl.search = '';
    if (currentUrl.href !== linkUrl.href || !link.hash) continue;

    const nodeId = link.hash.substr(1);
    link.hash = `#index=${index}&anchor=${nodeId}`;
  }
}

export const Report: FunctionComponent<{currentLhr: LH.FlowResult.LhrRef}> =
({currentLhr}) => {
  const {dom, reportRenderer, topbarFeatures} = useReportRenderer();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      dom.clearComponentCache();
      reportRenderer.renderReport(currentLhr.value, ref.current);
      convertChildAnchors(ref.current, currentLhr.index);
      const topbar = ref.current.querySelector('.lh-topbar') as HTMLElement;
      const flowTopbar = document.querySelector('.Topbar') as HTMLElement;
      topbarFeatures._setupStickyHeaderElements();
      if (topbar && flowTopbar) {
        topbar.remove();
        topbarFeatures.topbarEl = flowTopbar;
      }
    }

    return () => {
      if (ref.current) ref.current.textContent = '';
    };
  }, [reportRenderer, currentLhr]);

  return (
    <div ref={ref} className="lh-root" data-testid="Report"/>
  );
};
