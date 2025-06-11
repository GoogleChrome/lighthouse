/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';
import {useMemo} from 'preact/hooks';

import {FlowSegment, FlowStepThumbnail, Separator} from '../common';
import {getModeDescription, useFlowResult} from '../util';
import {ReportUtils} from '../../../report/renderer/report-utils.js';
import {SummaryCategory} from './category';
import {useStringFormatter, useLocalizedStrings} from '../i18n/i18n';

const DISPLAYED_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const THUMBNAIL_WIDTH = 40;

const SummaryNavigationHeader: FunctionComponent<{lhr: LH.Result}> = ({lhr}) => {
  const strings = useLocalizedStrings();

  return (
    <div className="SummaryNavigationHeader" data-testid="SummaryNavigationHeader">
      <FlowSegment/>
      <div className="SummaryNavigationHeader__url">
        <a rel="noopener" target="_blank" href={lhr.finalDisplayedUrl}>{lhr.finalDisplayedUrl}</a>
      </div>
      <div className="SummaryNavigationHeader__category">
        {strings.categoryPerformance}
      </div>
      <div className="SummaryNavigationHeader__category">
        {strings.categoryAccessibility}
      </div>
      <div className="SummaryNavigationHeader__category">
        {strings.categoryBestPractices}
      </div>
      <div className="SummaryNavigationHeader__category">
        {strings.categorySeo}
      </div>
    </div>
  );
};

/**
 * The div should behave like a JSX <>...</>. This still allows us to identify "rows" with CSS selectors.
 */
const SummaryFlowStep: FunctionComponent<{
  lhr: LH.Result,
  label: string,
  hashIndex: number,
}> = ({lhr, label, hashIndex}) => {
  const reportResult = useMemo(() => ReportUtils.prepareReportResult(lhr), [lhr]);
  const strings = useLocalizedStrings();
  const modeDescription = getModeDescription(lhr.gatherMode, strings);

  return (
    <div className="SummaryFlowStep">
      {
        lhr.gatherMode === 'navigation' || hashIndex === 0 ?
          <SummaryNavigationHeader lhr={lhr}/> :
          <div className="SummaryFlowStep__separator">
            <FlowSegment/>
            <Separator/>
          </div>
      }
      <FlowStepThumbnail lhr={lhr} width={THUMBNAIL_WIDTH}/>
      <FlowSegment mode={lhr.gatherMode}/>
      <div className="SummaryFlowStep__label">
        <div className="SummaryFlowStep__mode">{modeDescription}</div>
        <a className="SummaryFlowStep__link" href={`#index=${hashIndex}`}>{label}</a>
      </div>
      {
        DISPLAYED_CATEGORIES.map(c => (
          <SummaryCategory
            key={c}
            category={reportResult.categories[c]}
            href={`#index=${hashIndex}&anchor=${c}`}
            gatherMode={lhr.gatherMode}
            finalDisplayedUrl={lhr.finalDisplayedUrl}
          />
        ))
      }
    </div>
  );
};

/**
 * For the summary flow, there are many different cells with different contents and different display properties.
 * CSS grid makes it easier to enforce things like content alignment and column width (e.g. all category columns have the same width).
 */
const SummaryFlow: FunctionComponent = () => {
  const flowResult = useFlowResult();
  return (
    <div className="SummaryFlow">
      {
        flowResult.steps.map((step, index) =>
          <SummaryFlowStep
            key={step.lhr.fetchTime}
            lhr={step.lhr}
            label={step.name}
            hashIndex={index}
          />
        )
      }
    </div>
  );
};

const SummaryHeader: FunctionComponent = () => {
  const flowResult = useFlowResult();
  const strings = useLocalizedStrings();
  const str_ = useStringFormatter();

  let numNavigation = 0;
  let numTimespan = 0;
  let numSnapshot = 0;
  for (const step of flowResult.steps) {
    switch (step.lhr.gatherMode) {
      case 'navigation':
        numNavigation++;
        break;
      case 'timespan':
        numTimespan++;
        break;
      case 'snapshot':
        numSnapshot++;
        break;
    }
  }

  const subtitleCounts = [];
  if (numNavigation) subtitleCounts.push(str_(strings.navigationReportCount, {numNavigation}));
  if (numTimespan) subtitleCounts.push(str_(strings.timespanReportCount, {numTimespan}));
  if (numSnapshot) subtitleCounts.push(str_(strings.snapshotReportCount, {numSnapshot}));
  const subtitle = subtitleCounts.join(' · ');

  return (
    <div className="SummaryHeader">
      <div className="SummaryHeader__title">{strings.summary}</div>
      <div className="SummaryHeader__subtitle">{subtitle}</div>
    </div>
  );
};

const SummarySectionHeader: FunctionComponent = ({children}) => {
  return (
    <div className="SummarySectionHeader">
      <div className="SummarySectionHeader__content">{children}</div>
      <Separator/>
    </div>
  );
};

const Summary: FunctionComponent = () => {
  const strings = useLocalizedStrings();

  return (
    <div className="Summary" data-testid="Summary">
      <SummaryHeader/>
      <Separator/>
      <SummarySectionHeader>{strings.allReports}</SummarySectionHeader>
      <SummaryFlow/>
    </div>
  );
};

export {
  SummaryFlowStep,
  SummaryHeader,
  Summary,
};
