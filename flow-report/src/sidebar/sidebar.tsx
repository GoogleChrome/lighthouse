/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';

import {ReportUtils} from '../../../report/renderer/report-utils.js';
import {Separator} from '../common';
import {useI18n, useLocalizedStrings} from '../i18n/i18n';
import {CpuIcon, EnvIcon, NetworkIcon, SummaryIcon} from '../icons';
import {classNames, useHashState, useFlowResult} from '../util';
import {SidebarFlow} from './flow';

const SidebarSummary: FunctionComponent = () => {
  const hashState = useHashState();
  const strings = useLocalizedStrings();

  return (
    <a
      href="#"
      className={classNames('SidebarSummary', {'Sidebar--current': hashState === null})}
      data-testid="SidebarSummary"
    >
      <div className="SidebarSummary__icon">
        <SummaryIcon/>
      </div>
      <div className="SidebarSummary__label">{strings.summary}</div>
    </a>
  );
};

const SidebarRuntimeSettings: FunctionComponent<{settings: LH.ConfigSettings}> =
({settings}) => {
  const strings = useLocalizedStrings();
  const env = ReportUtils.getEmulationDescriptions(settings);
  const deviceEmulationString = env.screenEmulation ?
    `${env.deviceEmulation} - ${env.screenEmulation}` :
    env.deviceEmulation;

  return (
    <div className="SidebarRuntimeSettings">
      <div className="SidebarRuntimeSettings__item" title={strings.runtimeSettingsDevice}>
        <div className="SidebarRuntimeSettings__item--icon">
          <EnvIcon/>
        </div>
        {
          deviceEmulationString
        }
      </div>
      <div
        className="SidebarRuntimeSettings__item"
        title={strings.runtimeSettingsNetworkThrottling}
      >
        <div className="SidebarRuntimeSettings__item--icon">
          <NetworkIcon/>
        </div>
        {
          env.summary
        }
      </div>
      <div className="SidebarRuntimeSettings__item" title={strings.runtimeSettingsCPUThrottling}>
        <div className="SidebarRuntimeSettings__item--icon">
          <CpuIcon/>
        </div>
        {
          `${settings.throttling.cpuSlowdownMultiplier}x slowdown`
        }
      </div>
    </div>
  );
};

const SidebarHeader: FunctionComponent<{title: string, date: string}> = ({title, date}) => {
  const i18n = useI18n();
  return (
    <div className="SidebarHeader">
      <div className="SidebarHeader__title">{title}</div>
      <div className="SidebarHeader__date">{i18n.formatter.formatDateTime(date)}</div>
    </div>
  );
};

const Sidebar: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const firstLhr = flowResult.steps[0].lhr;
  return (
    <div className="Sidebar">
      <SidebarHeader title={flowResult.name} date={firstLhr.fetchTime}/>
      <Separator/>
      <SidebarSummary/>
      <Separator/>
      <SidebarFlow/>
      <Separator/>
      <SidebarRuntimeSettings settings={firstLhr.configSettings}/>
    </div>
  );
};

export {
  SidebarSummary,
  SidebarRuntimeSettings,
  SidebarHeader,
  Sidebar,
};
