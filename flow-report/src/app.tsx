/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {FunctionComponent} from 'preact';
import {useEffect, useRef, useState} from 'preact/hooks';

import {ReportRendererProvider, useReportRenderer} from './wrappers/report-renderer';
import {Sidebar} from './sidebar/sidebar';
import {Summary} from './summary/summary';
import {classNames, FlowResultContext, useCurrentLhr, useHashParam} from './util';
import {Report} from './wrappers/report';
import {Topbar} from './topbar';
import {Header} from './header';
import {I18nProvider} from './i18n/i18n';

const Content: FunctionComponent = () => {
  const currentLhr = useCurrentLhr();
  const anchor = useHashParam('anchor');
  const ref = useRef<HTMLDivElement>(null);
  const {topbarFeatures} = useReportRenderer();

  useEffect(() => {
    if (ref.current) {
      ref.current.addEventListener('scroll', topbarFeatures._updateStickyHeaderOnScroll);
    }
    return () => {
      if (ref.current) {
        ref.current.removeEventListener('scroll', topbarFeatures._updateStickyHeaderOnScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView({behavior: 'smooth'});
        return;
      }
    }

    // Scroll to top no anchor is found.
    if (ref.current) ref.current.scrollTop = 0;
  }, [anchor, currentLhr]);

  return (
    <div ref={ref} className="Content">
      {
        currentLhr ?
          <>
            <Header currentLhr={currentLhr}/>
            <Report currentLhr={currentLhr}/>
          </> :
          <Summary/>
      }
    </div>
  );
};

export const App: FunctionComponent<{flowResult: LH.FlowResult}> = ({flowResult}) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <FlowResultContext.Provider value={flowResult}>
      <ReportRendererProvider>
        <I18nProvider>
          <div className={classNames('App', {'App--collapsed': collapsed})} data-testid="App">
            <Topbar onMenuClick={() => setCollapsed(c => !c)} />
            <Sidebar/>
            <Content/>
          </div>
        </I18nProvider>
      </ReportRendererProvider>
    </FlowResultContext.Provider>
  );
};
