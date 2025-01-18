/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';

import {ReportUtils} from '../../../report/renderer/report-utils.js';
import {Separator} from '../common';
import {CategoryScore} from '../wrappers/category-score';
import {useI18n, useStringFormatter, useLocalizedStrings} from '../i18n/i18n';
import {Markdown} from '../wrappers/markdown';

import type {UIStringsType} from '../i18n/ui-strings';

const MAX_TOOLTIP_AUDITS = 2;

type ScoredAuditRef = LH.ReportResult.AuditRef & {result: {score: number}};

function getGatherModeLabel(gatherMode: LH.Result.GatherMode, strings: UIStringsType) {
  switch (gatherMode) {
    case 'navigation': return strings.navigationReport;
    case 'timespan': return strings.timespanReport;
    case 'snapshot': return strings.snapshotReport;
  }
}

function getCategoryRating(rating: string, strings: UIStringsType) {
  switch (rating) {
    case 'pass': return strings.ratingPass;
    case 'average': return strings.ratingAverage;
    case 'fail': return strings.ratingFail;
    case 'error': return strings.ratingError;
  }
}

function getScoreToBeGained(audit: ScoredAuditRef): number {
  return audit.weight * (1 - audit.result.score);
}

const SummaryTooltipAudit: FunctionComponent<{audit: LH.ReportResult.AuditRef}> = ({audit}) => {
  const rating = ReportUtils.calculateRating(audit.result.score, audit.result.scoreDisplayMode);
  return (
    <div className={`SummaryTooltipAudit SummaryTooltipAudit--${rating}`}>
      <Markdown text={audit.result.title}/>
    </div>
  );
};

const SummaryTooltipAudits: FunctionComponent<{category: LH.ReportResult.Category}> =
({category}) => {
  const strings = useLocalizedStrings();

  function isRelevantAudit(audit: LH.ReportResult.AuditRef): audit is ScoredAuditRef {
    return audit.result.score !== null &&
      // Metrics should not be displayed in this group.
      audit.group !== 'metrics' &&
      // Audits in group "hidden" should not be counted.
      audit.group !== 'hidden' &&
      // We don't want unweighted audits except for performance diagnostics.
      (audit.weight > 0 || audit.group === 'diagnostics') &&
      // Passing audits should never be high impact.
      !ReportUtils.showAsPassed(audit.result);
  }

  const audits = category.auditRefs
    .filter(isRelevantAudit)
    .sort((a, b) => {
      // Remaining score should always be 0 for perf opportunities because weight is 0.
      // In that case, we want to sort by `overallSavingsMs`.
      const remainingScoreA = getScoreToBeGained(a);
      const remainingScoreB = getScoreToBeGained(b);
      if (remainingScoreA !== remainingScoreB) return remainingScoreB - remainingScoreA;
      if (a.result.score !== b.result.score) return a.result.score - b.result.score;

      // TODO: Sort using overall impact from metric savings, not just LCP
      const aLcpSavings = a.result.metricSavings?.LCP || 0;
      const bLcpSavings = b.result.metricSavings?.LCP || 0;
      return bLcpSavings - aLcpSavings;
    })
    .splice(0, MAX_TOOLTIP_AUDITS);
  if (!audits.length) return null;

  return (
    <div className="SummaryTooltipAudits">
      <div className="SummaryTooltipAudits__title">{strings.highestImpact}</div>
      {
        audits.map(audit => <SummaryTooltipAudit key={audit.id} audit={audit}/>)
      }
    </div>
  );
};

const SummaryTooltip: FunctionComponent<{
  category: LH.ReportResult.Category,
  gatherMode: LH.Result.GatherMode,
  url: string,
}> = ({category, gatherMode, url}) => {
  const strings = useLocalizedStrings();
  const str_ = useStringFormatter();
  const {
    numPassed,
    numPassableAudits,
    numInformative,
    totalWeight,
  } = ReportUtils.calculateCategoryFraction(category);

  const i18n = useI18n();
  const displayAsFraction = ReportUtils.shouldDisplayAsFraction(gatherMode);
  const score = displayAsFraction ?
    numPassed / numPassableAudits :
    category.score;
  const rating = score === null ? 'error' : ReportUtils.calculateRating(score);

  return (
    <div className="SummaryTooltip">
      <div className="SummaryTooltip__title">{getGatherModeLabel(gatherMode, strings)}</div>
      <div className="SummaryTooltip__url">{url}</div>
      <Separator/>
      <div className="SummaryTooltip__category">
        <div className="SummaryTooltip__category-title">
          {category.title}
        </div>
        {
          totalWeight !== 0 &&
            <div className={`SummaryTooltip__rating SummaryTooltip__rating--${rating}`}>
              <span>{getCategoryRating(rating, strings)}</span>
              {
                !displayAsFraction && category.score !== null && <>
                  <span> · </span>
                  <span>{i18n.formatter.formatInteger(category.score * 100)}</span>
                </>
              }
            </div>
        }
      </div>
      <div className="SummaryTooltip__fraction">
        <span>{str_(strings.passedAuditCount, {numPassed})}</span>
        <span> / </span>
        <span>{str_(strings.passableAuditCount, {numPassableAudits})}</span>
      </div>
      {numInformative !== 0 &&
        <div className="SummaryTooltip__informative">
          {str_(strings.informativeAuditCount, {numInformative})}
        </div>
      }
      <SummaryTooltipAudits category={category}/>
    </div>
  );
};

const SummaryCategory: FunctionComponent<{
  category: LH.ReportResult.Category|undefined,
  href: string,
  gatherMode: LH.Result.GatherMode,
  finalDisplayedUrl: string,
}> = ({category, href, gatherMode, finalDisplayedUrl}) => {
  return (
    <div className="SummaryCategory">
      {
        category ?
          <div className="SummaryCategory__content">
            <CategoryScore
              category={category}
              href={href}
              gatherMode={gatherMode}
            />
            <SummaryTooltip category={category} gatherMode={gatherMode} url={finalDisplayedUrl}/>
          </div> :
          <div className="SummaryCategory__null" data-testid="SummaryCategory__null"/>
      }
    </div>
  );
};

export {
  SummaryTooltip,
  SummaryCategory,
};
