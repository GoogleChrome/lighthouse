/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {createContext, FunctionComponent} from 'preact';
import {useContext, useMemo} from 'preact/hooks';

import {CategoryRenderer} from '../../../report/renderer/category-renderer';
import {DetailsRenderer} from '../../../report/renderer/details-renderer';
import {DOM} from '../../../report/renderer/dom';
import {ReportRenderer} from '../../../report/renderer/report-renderer';
import {ReportUIFeatures} from '../../../report/renderer/report-ui-features';
import {TopbarFeatures} from '../../../report/renderer/topbar-features';

interface ReportRendererGlobals {
   dom: DOM,
   detailsRenderer: DetailsRenderer,
   categoryRenderer: CategoryRenderer,
   reportRenderer: ReportRenderer,
   reportUIFeatures: ReportUIFeatures,
   topbarFeatures: TopbarFeatures,
}

export const ReportRendererContext = createContext<ReportRendererGlobals|undefined>(undefined);

export function useReportRenderer() {
  const globals = useContext(ReportRendererContext);
  if (!globals) throw Error('Globals not defined');
  return globals;
}

export const ReportRendererProvider: FunctionComponent = ({children}) => {
  const globals = useMemo(() => {
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    const categoryRenderer = new CategoryRenderer(dom, detailsRenderer);
    const reportRenderer = new ReportRenderer(dom);
    const reportUIFeatures = new ReportUIFeatures(dom);
    const topbarFeatures = new TopbarFeatures(reportUIFeatures, dom);
    return {
      dom,
      detailsRenderer,
      categoryRenderer,
      reportRenderer,
      reportUIFeatures,
      topbarFeatures,
    };
  }, []);
  return (
    <ReportRendererContext.Provider value={globals}>{children}</ReportRendererContext.Provider>
  );
};
