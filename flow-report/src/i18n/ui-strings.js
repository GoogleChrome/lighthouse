/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {typeof UIStrings} UIStringsType */

/* eslint-disable max-len */

export const UIStrings = {
  /** Description of a report that evaluates a web page as it loads, but before the user interacts with it. */
  navigationDescription: 'Page load',
  /** Description of a report that evaluates a web page over a period of time where a user could have interacted with the page. */
  timespanDescription: 'User interactions',
  /** Description of a report that evaluates the state of a web page at a single point in time. */
  snapshotDescription: 'Captured state of page',
  /** Long-form description of a report that evaluates a web page as it loads, but before the user interacts with it. */
  navigationLongDescription: 'Navigation reports analyze a single page load, exactly like the original Lighthouse reports.',
  /** Long-form description of a report that evaluates a web page over a period of time where a user could have interacted with the page. */
  timespanLongDescription: 'Timespan reports analyze an arbitrary period of time, typically containing user interactions.',
  /** Long-form description of a report that evaluates the state of a web page at a single point in time. */
  snapshotLongDescription: 'Snapshot reports analyze the page in a particular state, typically after user interactions.',
  /** Label for a report that evaluates a page navigation. */
  navigationReport: 'Navigation report',
  /** Label for a report that evaluates a period of time where a user could have interacted with the page. */
  timespanReport: 'Timespan report',
  /** Label for a report that evaluates the state of a web page at a single point in time. */
  snapshotReport: 'Snapshot report',
  /** Title of a home page that summarizes and links to the other pages. */
  summary: 'Summary',
  /** Title of a report section lists and links to multiple sub-reports. */
  allReports: 'All Reports',
  /** Default title of a Lighthouse report over a user flow. "User Flow" refers to a series of user interactions on a page that a site developer wants to test. "Lighthouse" is a product name https://developers.google.com/web/tools/lighthouse. */
  title: 'Lighthouse User Flow Report',
  /** Label for a list of Lighthouse categories. */
  categories: 'Categories',
  /** Title of the Performance category of audits. Equivalent to 'Web performance', this term is inclusive of all web page speed and loading optimization topics. Also used as a label of a score gauge; try to limit to 20 characters. */
  categoryPerformance: 'Performance',
  /** Title of the Accessibility category of audits. This section contains audits focused on making web content accessible to all users. Also used as a label of a score gauge; try to limit to 20 characters. */
  categoryAccessibility: 'Accessibility',
  /** Title of the Best Practices category of audits. This is displayed at the top of a list of audits focused on topics related to following web development best practices and accepted guidelines. Also used as a label of a score gauge; try to limit to 20 characters. */
  categoryBestPractices: 'Best Practices',
  /** Title of the Search Engine Optimization (SEO) category of audits. This is displayed at the top of a list of audits focused on topics related to optimizing a website for indexing by search engines. Also used as a label of a score gauge; try to limit to 20 characters. */
  categorySeo: 'SEO',
  /** Label for a report evaluating a web page. Label indicates that the report refers to the desktop version of the site. */
  desktop: 'Desktop',
  /** Label for a report evaluating a web page. Label indicates that the report refers to the mobile version of the site. */
  mobile: 'Mobile',
  /** Rating indicating that a report category is good/passing. */
  ratingPass: 'Good',
  /** Rating indicating that a report category is average or needs improvement. */
  ratingAverage: 'Average',
  /** Rating indicating that a report category is poor/failing. */
  ratingFail: 'Poor',
  /** Rating indicating that a report category rating could not be calculated because of an error. */
  ratingError: 'Error',
  /**
   * @description Label indicating the number of Lighthouse reports that evaluate a web page as it loads.
   * @example {2} numNavigation
   */
  navigationReportCount: `{numNavigation, plural,
    =1 {{numNavigation} navigation report}
    other {{numNavigation} navigation reports}
  }`,
  /**
   * @description Label indicating the number of Lighthouse reports that evaluate a web page over a period of time.
   * @example {2} numTimespan
   */
  timespanReportCount: `{numTimespan, plural,
    =1 {{numTimespan} timespan report}
    other {{numTimespan} timespan reports}
  }`,
  /**
   * @description Label indicating the number of Lighthouse reports that evaluate a web page at a single point in time.
   * @example {2} numSnapshot
   */
  snapshotReportCount: `{numSnapshot, plural,
    =1 {{numSnapshot} snapshot report}
    other {{numSnapshot} snapshot reports}
  }`,
  /** Label for a button that saves a Lighthouse report to disk. */
  save: 'Save',
  /** Label for a button that toggles the help modal with explanations on how to interpret the Lighthouse flow report. */
  helpLabel: 'Understanding Flows',
  /** Title for a dialog that contains explanations on how to interpret the Lighthouse flow report. */
  helpDialogTitle: 'Understanding the Lighthouse Flow Report',
  /** Label for a list of example use cases for a mode in lighthouse that evaluates a web page as it loads, but before the user interacts with it. */
  helpUseCaseInstructionNavigation: 'Use Navigation reports to...',
  /** Label for a list of example use cases for a mode in lighthouse that evaluates a web page over a period of time where a user could have interacted with the page. */
  helpUseCaseInstructionTimespan: 'Use Timespan reports to...',
  /** Label for a list of example use cases for a mode in lighthouse that evaluates the state of a web page at a single point in time. */
  helpUseCaseInstructionSnapshot: 'Use Snapshot reports to...',
  /** Example use case for how Lighthouse can be applied in practice. Appears in a list with other examples. */
  helpUseCaseNavigation1: 'Obtain a Lighthouse Performance score.',
  /** Example use case for how Lighthouse can be applied in practice. Appears in a list with other examples. */
  helpUseCaseNavigation2: 'Measure page load Performance metrics such as Largest Contentful Paint and Speed Index.',
  /** Example use case for how Lighthouse can be applied in practice. Appears in a list with other examples. */
  helpUseCaseNavigation3: 'Assess Progressive Web App capabilities.',
  /** Example use case for how Lighthouse can be applied in practice. Appears in a list with other examples. */
  helpUseCaseTimespan1: 'Measure layout shifts and JavaScript execution time on a series of interactions.',
  /** Example use case for how Lighthouse can be applied in practice. Appears in a list with other examples. */
  helpUseCaseTimespan2: 'Discover performance opportunities to improve the experience for long-lived pages and single-page applications.',
  /** Example use case for how Lighthouse can be applied in practice. Appears in a list with other examples. */
  helpUseCaseSnapshot1: 'Find accessibility issues in single page applications or complex forms.',
  /** Example use case for how Lighthouse can be applied in practice. Appears in a list with other examples. */
  helpUseCaseSnapshot2: 'Evaluate best practices of menus and UI elements hidden behind interaction.',
  /**
   * @description Label indicating the number of Lighthouse audits that passed.
   * @example {2} numPassed
   */
  passedAuditCount: `{numPassed, plural,
    =1 {{numPassed} audit passed}
    other {{numPassed} audits passed}
  }`,
  /**
   * @description Label indicating the number of Lighthouse audits that are possible to pass for a page.
   * @example {2} numPassableAudits
   */
  passableAuditCount: `{numPassableAudits, plural,
    =1 {{numPassableAudits} passable audit}
    other {{numPassableAudits} passable audits}
  }`,
  /**
   * @description Label indicating the number of Lighthouse audits that are informative.
   * @example {2} numInformative
   */
  informativeAuditCount: `{numInformative, plural,
    =1 {{numInformative} informative audit}
    other {{numInformative} informative audits}
  }`,
  /** Label for a list of Lighthouse audits that are the most impactful. */
  highestImpact: 'Highest impact',
};
