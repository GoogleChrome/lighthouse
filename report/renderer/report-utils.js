/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Util} from '../../shared/util.js';
import {Globals} from './report-globals.js';
import {upgradeLhrForCompatibility} from '../../core/lib/lighthouse-compatibility.js';

const RATINGS = Util.RATINGS;

class ReportUtils {
  /**
   * Returns a new LHR that's reshaped for slightly better ergonomics within the report rendereer.
   * Also, sets up the localized UI strings used within renderer and makes changes to old LHRs to be
   * compatible with current renderer.
   * The LHR passed in is not mutated.
   * TODO(team): we all agree the LHR shape change is technical debt we should fix
   * @param {LH.Result} lhr
   * @return {LH.ReportResult}
   */
  static prepareReportResult(lhr) {
    // If any mutations happen to the report within the renderers, we want the original object untouched
    const clone = /** @type {LH.ReportResult} */ (JSON.parse(JSON.stringify(lhr)));
    upgradeLhrForCompatibility(clone);

    for (const audit of Object.values(clone.audits)) {
      // Attach table/opportunity items with entity information.
      if (audit.details) {
        if (audit.details.type === 'opportunity' || audit.details.type === 'table') {
          if (!audit.details.isEntityGrouped && clone.entities) {
            ReportUtils.classifyEntities(clone.entities, audit.details);
          }
        }
      }
    }

    // For convenience, smoosh all AuditResults into their auditRef (which has just weight & group)
    if (typeof clone.categories !== 'object') throw new Error('No categories provided.');

    /** @type {Map<string, LH.ReportResult.AuditRef>} */
    const acronymToMetricMap = new Map();

    for (const category of Object.values(clone.categories)) {
      // Make basic lookup table for relevantAudits
      category.auditRefs.forEach(metricRef => {
        if (!metricRef.acronym) return;
        acronymToMetricMap.set(metricRef.acronym, metricRef);
      });

      category.auditRefs.forEach(auditRef => {
        const result = clone.audits[auditRef.id];
        auditRef.result = result;

        // Attach any relevantMetric auditRefs
        const relevantAcronyms = Object.keys(auditRef.result.metricSavings || {});
        if (relevantAcronyms.length) {
          auditRef.relevantMetrics = [];
          for (const acronym of relevantAcronyms) {
            const metric = acronymToMetricMap.get(acronym);
            if (!metric) continue;

            auditRef.relevantMetrics.push(metric);
          }
        }

        // attach the stackpacks to the auditRef object
        if (clone.stackPacks) {
          clone.stackPacks.forEach(pack => {
            if (pack.descriptions[auditRef.id]) {
              auditRef.stackPacks = auditRef.stackPacks || [];
              auditRef.stackPacks.push({
                title: pack.title,
                iconDataURL: pack.iconDataURL,
                description: pack.descriptions[auditRef.id],
              });
            }
          });
        }
      });
    }

    return clone;
  }

  /**
   * Given an audit's details, identify and return a URL locator function that
   * can be called later with an `item` to extract the URL of it.
   * @param {LH.FormattedIcu<LH.Audit.Details.TableColumnHeading[]>} headings
   * @return {((item: LH.FormattedIcu<LH.Audit.Details.TableItem>) => string|undefined)=}
   */
  static getUrlLocatorFn(headings) {
    // The most common type, valueType=url.
    const urlKey = headings.find(heading => heading.valueType === 'url')?.key;
    if (urlKey && typeof urlKey === 'string') {
      // Return a function that extracts item.url.
      return (item) => {
        const url = item[urlKey];
        if (typeof url === 'string') return url;
      };
    }

    // The second common type, valueType=source-location.
    const srcLocationKey = headings.find(heading => heading.valueType === 'source-location')?.key;
    if (srcLocationKey) {
      // Return a function that extracts item.source.url.
      return (item) => {
        const sourceLocation = item[srcLocationKey];
        if (typeof sourceLocation === 'object' && sourceLocation.type === 'source-location') {
          return sourceLocation.url;
        }
      };
    }

    // More specific tests go here, as we need to identify URLs in more audits.
  }

  /**
   * Mark TableItems/OpportunityItems with entity names.
   * @param {LH.Result.Entities} entities
   * @param {LH.FormattedIcu<LH.Audit.Details.Opportunity|LH.Audit.Details.Table>} details
   */
  static classifyEntities(entities, details) {
    // If details.items are already marked with entity attribute during an audit, nothing to do here.
    const {items, headings} = details;
    if (!items.length || items.some(item => item.entity)) return;

    // Identify a URL-locator function that we could call against each item to get its URL.
    const urlLocatorFn = ReportUtils.getUrlLocatorFn(headings);
    if (!urlLocatorFn) return;

    for (const item of items) {
      const url = urlLocatorFn(item);
      if (!url) continue;

      let origin = '';
      try {
        // Non-URLs can appear in valueType: url columns, like 'Unattributable'
        origin = Util.parseURL(url).origin;
      } catch {}
      if (!origin) continue;

      const entity = entities.find(e => e.origins.includes(origin));
      if (entity) item.entity = entity.name;
    }
  }

  /**
   * Returns a comparator created from the supplied list of keys
   * @param {Array<string>} sortedBy
   * @return {((a: LH.Audit.Details.TableItem, b: LH.Audit.Details.TableItem) => number)}
   */
  static getTableItemSortComparator(sortedBy) {
    return (a, b) => {
      for (const key of sortedBy) {
        const aVal = a[key];
        const bVal = b[key];
        if (typeof aVal !== typeof bVal || !['number', 'string'].includes(typeof aVal)) {
          console.warn(`Warning: Attempting to sort unsupported value type: ${key}.`);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number' && aVal !== bVal) {
          return bVal - aVal;
        }
        if (typeof aVal === 'string' && typeof bVal === 'string' && aVal !== bVal) {
          return aVal.localeCompare(bVal);
        }
      }
      return 0;
    };
  }

  /**
   * @param {LH.Result['configSettings']} settings
   * @return {!{deviceEmulation: string, screenEmulation?: string, networkThrottling: string, cpuThrottling: string, summary: string}}
   */
  static getEmulationDescriptions(settings) {
    let cpuThrottling;
    let networkThrottling;
    let summary;

    const throttling = settings.throttling;
    const i18n = Globals.i18n;
    const strings = Globals.strings;

    switch (settings.throttlingMethod) {
      case 'provided':
        summary = networkThrottling = cpuThrottling = strings.throttlingProvided;
        break;
      case 'devtools': {
        const {cpuSlowdownMultiplier, requestLatencyMs} = throttling;
        // eslint-disable-next-line max-len
        cpuThrottling = `${i18n.formatNumber(cpuSlowdownMultiplier)}x slowdown (DevTools)`;
        networkThrottling = `${i18n.formatMilliseconds(requestLatencyMs)} HTTP RTT, ` +
          `${i18n.formatKbps(throttling.downloadThroughputKbps)} down, ` +
          `${i18n.formatKbps(throttling.uploadThroughputKbps)} up (DevTools)`;

        const isSlow4G = () => {
          return requestLatencyMs === 150 * 3.75 &&
            throttling.downloadThroughputKbps === 1.6 * 1024 * 0.9 &&
            throttling.uploadThroughputKbps === 750 * 0.9;
        };
        summary = isSlow4G() ? strings.runtimeSlow4g : strings.runtimeCustom;
        break;
      }
      case 'simulate': {
        const {cpuSlowdownMultiplier, rttMs, throughputKbps} = throttling;
        // eslint-disable-next-line max-len
        cpuThrottling = `${i18n.formatNumber(cpuSlowdownMultiplier)}x slowdown (Simulated)`;
        networkThrottling = `${i18n.formatMilliseconds(rttMs)} TCP RTT, ` +
          `${i18n.formatKbps(throughputKbps)} throughput (Simulated)`;

        const isSlow4G = () => {
          return rttMs === 150 && throughputKbps === 1.6 * 1024;
        };
        summary = isSlow4G() ?
          strings.runtimeSlow4g : strings.runtimeCustom;
        break;
      }
      default:
        summary = cpuThrottling = networkThrottling = strings.runtimeUnknown;
    }

    // devtools-entry.js always sets `screenEmulation.disabled` when using mobile emulation,
    // because we handle the emulation outside of Lighthouse. Since the screen truly is emulated
    // as a mobile device, ignore `.disabled` in devtools and just check the form factor
    const isScreenEmulationDisabled = settings.channel === 'devtools' ?
      false :
      settings.screenEmulation.disabled;
    const isScreenEmulationMobile = settings.channel === 'devtools' ?
      settings.formFactor === 'mobile' :
      settings.screenEmulation.mobile;

    let deviceEmulation = strings.runtimeMobileEmulation;
    if (isScreenEmulationDisabled) {
      deviceEmulation = strings.runtimeNoEmulation;
    } else if (!isScreenEmulationMobile) {
      deviceEmulation = strings.runtimeDesktopEmulation;
    }

    const screenEmulation = isScreenEmulationDisabled ?
      undefined :
      // eslint-disable-next-line max-len
      `${settings.screenEmulation.width}x${settings.screenEmulation.height}, DPR ${settings.screenEmulation.deviceScaleFactor}`;

    return {
      deviceEmulation,
      screenEmulation,
      cpuThrottling,
      networkThrottling,
      summary,
    };
  }

  /**
   * Used to determine if the "passed" for the purposes of showing up in the "failed" or "passed"
   * sections of the report.
   *
   * @param {{score: (number|null), scoreDisplayMode: string}} audit
   * @return {boolean}
   */
  static showAsPassed(audit) {
    switch (audit.scoreDisplayMode) {
      case 'manual':
      case 'notApplicable':
        return true;
      case 'error':
      case 'informative':
        return false;
      case 'numeric':
      case 'binary':
      default:
        return Number(audit.score) >= RATINGS.PASS.minScore;
    }
  }

  /**
   * Convert a score to a rating label.
   * TODO: Return `'error'` for `score === null && !scoreDisplayMode`.
   *
   * @param {number|null} score
   * @param {string=} scoreDisplayMode
   * @return {string}
   */
  static calculateRating(score, scoreDisplayMode) {
    // Handle edge cases first, manual and not applicable receive 'pass', errored audits receive 'error'
    if (scoreDisplayMode === 'manual' || scoreDisplayMode === 'notApplicable') {
      return RATINGS.PASS.label;
    } else if (scoreDisplayMode === 'error') {
      return RATINGS.ERROR.label;
    } else if (score === null) {
      return RATINGS.FAIL.label;
    }

    // At this point, we're rating a standard binary/numeric audit
    let rating = RATINGS.FAIL.label;
    if (score >= RATINGS.PASS.minScore) {
      rating = RATINGS.PASS.label;
    } else if (score >= RATINGS.AVERAGE.minScore) {
      rating = RATINGS.AVERAGE.label;
    }
    return rating;
  }

  /**
   * @param {LH.ReportResult.Category} category
   */
  static calculateCategoryFraction(category) {
    let numPassableAudits = 0;
    let numPassed = 0;
    let numInformative = 0;
    let totalWeight = 0;
    for (const auditRef of category.auditRefs) {
      const auditPassed = ReportUtils.showAsPassed(auditRef.result);

      // Don't count the audit if it's manual, N/A, or isn't displayed.
      if (auditRef.group === 'hidden' ||
          auditRef.result.scoreDisplayMode === 'manual' ||
          auditRef.result.scoreDisplayMode === 'notApplicable') {
        continue;
      } else if (auditRef.result.scoreDisplayMode === 'informative') {
        if (!auditPassed) {
          ++numInformative;
        }
        continue;
      }

      ++numPassableAudits;
      totalWeight += auditRef.weight;
      if (auditPassed) numPassed++;
    }
    return {numPassed, numPassableAudits, numInformative, totalWeight};
  }

  /**
   * @param {string} categoryId
   */
  static isPluginCategory(categoryId) {
    return categoryId.startsWith('lighthouse-plugin-');
  }

  /**
   * @param {LH.Result.GatherMode} gatherMode
   */
  static shouldDisplayAsFraction(gatherMode) {
    return gatherMode === 'timespan' || gatherMode === 'snapshot';
  }
}

/**
 * Report-renderer-specific strings.
 */
const UIStrings = {
  /** Disclaimer shown to users below the metric values (First Contentful Paint, Time to Interactive, etc) to warn them that the numbers they see will likely change slightly the next time they run Lighthouse. */
  varianceDisclaimer: 'Values are estimated and may vary. The [performance score is calculated](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/) directly from these metrics.',
  /** Text link pointing to an interactive calculator that explains Lighthouse scoring. The link text should be fairly short. */
  calculatorLink: 'See calculator.',
  /** Label preceding a radio control for filtering the list of audits. The radio choices are various performance metrics (FCP, LCP, TBT), and if chosen, the audits in the report are hidden if they are not relevant to the selected metric. */
  showRelevantAudits: 'Show audits relevant to:',
  /** Column heading label for the listing of opportunity audits. Each audit title represents an opportunity. There are only 2 columns, so no strict character limit.  */
  opportunityResourceColumnLabel: 'Opportunity',
  /** Column heading label for the estimated page load savings of opportunity audits. Estimated Savings is the total amount of time (in seconds) that Lighthouse computed could be reduced from the total page load time, if the suggested action is taken. There are only 2 columns, so no strict character limit. */
  opportunitySavingsColumnLabel: 'Estimated Savings',

  /** An error string displayed next to a particular audit when it has errored, but not provided any specific error message. */
  errorMissingAuditInfo: 'Report error: no audit information',
  /** A label, shown next to an audit title or metric title, indicating that there was an error computing it. The user can hover on the label to reveal a tooltip with the extended error message. Translation should be short (< 20 characters). */
  errorLabel: 'Error!',
  /** This label is shown above a bulleted list of warnings. It is shown directly below an audit that produced warnings. Warnings describe situations the user should be aware of, as Lighthouse was unable to complete all the work required on this audit. For example, The 'Unable to decode image (biglogo.jpg)' warning may show up below an image encoding audit. */
  warningHeader: 'Warnings: ',
  /** Section heading shown above a list of passed audits that contain warnings. Audits under this section do not negatively impact the score, but Lighthouse has generated some potentially actionable suggestions that should be reviewed. This section is expanded by default and displays after the failing audits. */
  warningAuditsGroupTitle: 'Passed audits but with warnings',
  /** Section heading shown above a list of audits that are passing. 'Passed' here refers to a passing grade. This section is collapsed by default, as the user should be focusing on the failed audits instead. Users can click this heading to reveal the list. */
  passedAuditsGroupTitle: 'Passed audits',
  /** Section heading shown above a list of audits that do not apply to the page. For example, if an audit is 'Are images optimized?', but the page has no images on it, the audit will be marked as not applicable. This is neither passing or failing. This section is collapsed by default, as the user should be focusing on the failed audits instead. Users can click this heading to reveal the list. */
  notApplicableAuditsGroupTitle: 'Not applicable',
  /** Section heading shown above a list of audits that were not computed by Lighthouse. They serve as a list of suggestions for the user to go and manually check. For example, Lighthouse can't automate testing cross-browser compatibility, so that is listed within this section, so the user is reminded to test it themselves. This section is collapsed by default, as the user should be focusing on the failed audits instead. Users can click this heading to reveal the list. */
  manualAuditsGroupTitle: 'Additional items to manually check',

  /** Label shown preceding any important warnings that may have invalidated the entire report. For example, if the user has Chrome extensions installed, they may add enough performance overhead that Lighthouse's performance metrics are unreliable. If shown, this will be displayed at the top of the report UI. */
  toplevelWarningsMessage: 'There were issues affecting this run of Lighthouse:',

  /** String of text shown in a graphical representation of the flow of network requests for the web page. This label represents the initial network request that fetches an HTML page. This navigation may be redirected (eg. Initial navigation to http://example.com redirects to https://www.example.com). */
  crcInitialNavigation: 'Initial Navigation',
  /** Label of value shown in the summary of critical request chains. Refers to the total amount of time (milliseconds) of the longest critical path chain/sequence of network requests. Example value: 2310 ms */
  crcLongestDurationLabel: 'Maximum critical path latency:',

  /** Label for button that shows all lines of the snippet when clicked */
  snippetExpandButtonLabel: 'Expand snippet',
  /** Label for button that only shows a few lines of the snippet when clicked */
  snippetCollapseButtonLabel: 'Collapse snippet',

  /** Explanation shown to users below performance results to inform them that the test was done with a 4G network connection and to warn them that the numbers they see will likely change slightly the next time they run Lighthouse. 'Lighthouse' becomes link text to additional documentation. */
  lsPerformanceCategoryDescription: '[Lighthouse](https://developers.google.com/web/tools/lighthouse/) analysis of the current page on an emulated mobile network. Values are estimated and may vary.',
  /** Title of the lab data section of the Performance category. Within this section are various speed metrics which quantify the pageload performance into values presented in seconds and milliseconds. "Lab" is an abbreviated form of "laboratory", and refers to the fact that the data is from a controlled test of a website, not measurements from real users visiting that site.  */
  labDataTitle: 'Lab Data',

  /** This label is for a checkbox above a table of items loaded by a web page. The checkbox is used to show or hide third-party (or "3rd-party") resources in the table, where "third-party resources" refers to items loaded by a web page from URLs that aren't controlled by the owner of the web page. */
  thirdPartyResourcesLabel: 'Show 3rd-party resources',
  /** This label is for a button that opens a new tab to a webapp called "Treemap", which is a nested visual representation of a heierarchy of data related to the reports (script bytes and coverage, resource breakdown, etc.) */
  viewTreemapLabel: 'View Treemap',
  /** This label is for a button that will show the user a trace of the page. */
  viewTraceLabel: 'View Trace',

  /** Option in a dropdown menu that opens a small, summary report in a print dialog.  */
  dropdownPrintSummary: 'Print Summary',
  /** Option in a dropdown menu that opens a full Lighthouse report in a print dialog.  */
  dropdownPrintExpanded: 'Print Expanded',
  /** Option in a dropdown menu that copies the Lighthouse JSON object to the system clipboard. */
  dropdownCopyJSON: 'Copy JSON',
  /** Option in a dropdown menu that saves the Lighthouse report HTML locally to the system as a '.html' file. */
  dropdownSaveHTML: 'Save as HTML',
  /** Option in a dropdown menu that saves the Lighthouse JSON object to the local system as a '.json' file. */
  dropdownSaveJSON: 'Save as JSON',
  /** Option in a dropdown menu that opens the current report in the Lighthouse Viewer Application. */
  dropdownViewer: 'Open in Viewer',
  /** Option in a dropdown menu that saves the current report as a new GitHub Gist. */
  dropdownSaveGist: 'Save as Gist',
  /** Option in a dropdown menu that toggles the themeing of the report between Light(default) and Dark themes. */
  dropdownDarkTheme: 'Toggle Dark Theme',
  /** Option in a dropdown menu that toggles the type of performance insights displayed. */
  dropdownInsightsToggle: 'Toggle experimental insights',
  /** Option in a dropdown menu that opens the trace of the page without throttling. "Unthrottled" can be replaced with "Original". */
  dropdownViewUnthrottledTrace: 'View Unthrottled Trace',

  /** Label for a row in a table that describes the kind of device that was emulated for the Lighthouse run.  Example values for row elements: 'No Emulation', 'Emulated Desktop', etc. */
  runtimeSettingsDevice: 'Device',
  /** Label for a row in a table that describes the network throttling conditions that were used during a Lighthouse run, if any. */
  runtimeSettingsNetworkThrottling: 'Network throttling',
  /** Label for a row in a table that describes the CPU throttling conditions that were used during a Lighthouse run, if any.*/
  runtimeSettingsCPUThrottling: 'CPU throttling',
  /** Label for a row in a table that shows the User Agent that was used to send out all network requests during the Lighthouse run. */
  runtimeSettingsUANetwork: 'User agent (network)',
  /** Label for a row in a table that shows the estimated CPU power of the machine running Lighthouse. Example row values: 532, 1492, 783. */
  runtimeSettingsBenchmark: 'Unthrottled CPU/Memory Power',
  /** Label for a row in a table that shows the version of the Axe library used. Example row values: 2.1.0, 3.2.3 */
  runtimeSettingsAxeVersion: 'Axe version',
  /** Label for a row in a table that shows the screen resolution and DPR that was emulated for the Lighthouse run. Example values: '800x600, DPR: 3' */
  runtimeSettingsScreenEmulation: 'Screen emulation',

  /** Label for button to create an issue against the Lighthouse GitHub project. */
  footerIssue: 'File an issue',

  /** Descriptive explanation for emulation setting when no device emulation is set. */
  runtimeNoEmulation: 'No emulation',
  /** Descriptive explanation for emulation setting when emulating a Moto G Power mobile device. */
  runtimeMobileEmulation: 'Emulated Moto G Power',
  /** Descriptive explanation for emulation setting when emulating a generic desktop form factor, as opposed to a mobile-device like form factor. */
  runtimeDesktopEmulation: 'Emulated Desktop',
  /** Descriptive explanation for a runtime setting that is set to an unknown value. */
  runtimeUnknown: 'Unknown',
  /** Descriptive label that this analysis run was from a single sample of a page session (not a summary of hundreds of loads) */
  runtimeSingleLoad: 'Single page session',
  /** Descriptive label that this analysis only considers the initial load of the page, and no interaction beyond when the page had "fully loaded" */
  runtimeAnalysisWindow: 'Initial page load',
  /** Descriptive label that this analysis considers some arbitrary period of time containing user interactions */
  runtimeAnalysisWindowTimespan: 'User interactions timespan',
  /** Descriptive label that this analysis considers a snapshot of the page at a single point in time */
  runtimeAnalysisWindowSnapshot: 'Point-in-time snapshot',
  /** Descriptive explanation that this analysis run was from a single sample of a page session, whereas field data often summarizes hundreds+ of page loads */
  runtimeSingleLoadTooltip: 'This data is taken from a single page session, as opposed to field data summarizing many sessions.', // eslint-disable-line max-len

  /** Descriptive explanation for environment throttling that was provided by the runtime environment instead of provided by Lighthouse throttling. */
  throttlingProvided: 'Provided by environment',
  /** Label for an interactive control that will reveal or hide a group of content. This control toggles between the text 'Show' and 'Hide'. */
  show: 'Show',
  /** Label for an interactive control that will reveal or hide a group of content. This control toggles between the text 'Show' and 'Hide'. */
  hide: 'Hide',
  /** Label for an interactive control that will reveal or hide a group of content. This control toggles between the text 'Expand view' and 'Collapse view'. */
  expandView: 'Expand view',
  /** Label for an interactive control that will reveal or hide a group of content. This control toggles between the text 'Expand view' and 'Collapse view'. */
  collapseView: 'Collapse view',
  /** Label indicating that Lighthouse throttled the page to emulate a slow 4G network connection. */
  runtimeSlow4g: 'Slow 4G throttling',
  /** Label indicating that Lighthouse throttled the page using custom throttling settings. */
  runtimeCustom: 'Custom throttling',

  /** This label is for a decorative chip that is included in a table row. The label indicates that the entity/company name in the row belongs to the first-party (or "1st-party"). First-party label is used to identify resources that are directly controlled by the owner of the web page. */
  firstPartyChipLabel: '1st party',
  /** Descriptive explanation in a tooltip form for a link to be opened in a new tab of the browser. */
  openInANewTabTooltip: 'Open in a new tab',
  /** Generic category name for all resources that could not be attributed to a 1st or 3rd party entity. */
  unattributable: 'Unattributable',
};

export {
  ReportUtils,
  UIStrings,
};
