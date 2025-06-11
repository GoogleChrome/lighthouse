/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';
import {useLayoutEffect, useMemo, useRef, useState} from 'preact/hooks';

import {Sidebar} from './sidebar/sidebar';
import {Summary} from './summary/summary';
import {classNames, FlowResultContext, OptionsContext, useHashState} from './util';
import {Report} from './wrappers/report';
import {Topbar} from './topbar';
import {Header} from './header';
import {I18nProvider} from './i18n/i18n';
import {Styles} from './wrappers/styles';

function getAnchorElement(hashState: LH.HashState|null) {
  if (!hashState || !hashState.anchor) return null;
  return document.getElementById(hashState.anchor);
}

const Content: FunctionComponent = () => {
  const hashState = useHashState();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = getAnchorElement(hashState);
    if (el) {
      el.scrollIntoView();
    } else if (ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [hashState]);

  return (
    <div ref={ref} className="Content">
      {
        hashState ?
          <>
            <Header hashState={hashState}/>
            <Report hashState={hashState}/>
          </> :
          <Summary/>
      }
    </div>
  );
};

export const App: FunctionComponent<{
  flowResult: LH.FlowResult,
  options?: LH.FlowReportOptions
}> = ({flowResult, options}) => {
  const [collapsed, setCollapsed] = useState(false);
  const optionsValue = useMemo(() => options || {}, [options]);
  return (
    <OptionsContext.Provider value={optionsValue}>
      <FlowResultContext.Provider value={flowResult}>
        <I18nProvider>
          <Styles/>
          <div className={classNames('App', {'App--collapsed': collapsed})} data-testid="App">
            <Topbar onMenuClick={() => setCollapsed(c => !c)} />
            <Sidebar/>
            <Content/>
          </div>
        </I18nProvider>
      </FlowResultContext.Provider>
    </OptionsContext.Provider>
  );
};
