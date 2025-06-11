/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {render} from '@testing-library/preact';
import {FunctionComponent} from 'preact';

import {I18nProvider} from '../../src/i18n/i18n';
import {SummaryHeader, SummaryFlowStep} from '../../src/summary/summary';
import {FlowResultContext} from '../../src/util';
import {flowResult} from '../sample-flow';

let wrapper: FunctionComponent;

beforeEach(() => {
  wrapper = ({children}) => (
    <FlowResultContext.Provider value={flowResult}>
      <I18nProvider>
        {children}
      </I18nProvider>
    </FlowResultContext.Provider>
  );
});

describe('SummaryHeader', () => {
  it('renders header content', async () => {
    const root = render(<SummaryHeader/>, {wrapper});

    const lhrCounts = root.getByText(/·/);
    expect(root.getByText('Summary')).toBeTruthy();
    expect(lhrCounts.textContent).toEqual(
      '2 navigation reports · 1 timespan report · 1 snapshot report'
    );
  });
});

describe('SummaryFlowStep', () => {
  it('renders navigation step', async () => {
    const root = render(<SummaryFlowStep
      lhr={flowResult.steps[0].lhr}
      label="Navigation (1)"
      hashIndex={0}
    />, {wrapper});

    expect(root.getByTestId('SummaryNavigationHeader')).toBeTruthy();

    expect(root.getByText('Navigation (1)')).toBeTruthy();

    const screenshot =
      root.getByAltText('Screenshot of a page tested by Lighthouse') as HTMLImageElement;
    expect(screenshot.src).toMatch(/data:image\/jpeg;base64/);

    const gauges = root.getAllByTestId('CategoryScore');
    expect(gauges).toHaveLength(4);

    const links = root.getAllByRole('link') as HTMLAnchorElement[];
    expect(links.map(a => a.href)).toEqual([
      'https://www.mikescerealshack.co/',
      'file:///Users/example/report.html/#index=0',
      'file:///Users/example/report.html/#index=0&anchor=performance',
      'file:///Users/example/report.html/#index=0&anchor=accessibility',
      'file:///Users/example/report.html/#index=0&anchor=best-practices',
      'file:///Users/example/report.html/#index=0&anchor=seo',
    ]);
  });

  it('renders timespan step', async () => {
    const root = render(<SummaryFlowStep
      lhr={flowResult.steps[1].lhr}
      label="Timespan (1)"
      hashIndex={1}
    />, {wrapper});

    expect(() => root.getByTestId('SummaryNavigationHeader')).toThrow();

    expect(root.getByText('Timespan (1)')).toBeTruthy();

    expect(() => root.getByAltText('Screenshot of a page tested by Lighthouse')).toThrow();

    // Accessibility and SEO are missing in timespan.
    const nullCategories = root.getAllByTestId('SummaryCategory__null');
    expect(nullCategories).toHaveLength(2);

    const gauges = root.getAllByTestId('CategoryScore');
    expect(gauges).toHaveLength(2);

    const links = root.getAllByRole('link') as HTMLAnchorElement[];
    expect(links.map(a => a.href)).toEqual([
      'file:///Users/example/report.html/#index=1',
      'file:///Users/example/report.html/#index=1&anchor=performance',
      'file:///Users/example/report.html/#index=1&anchor=best-practices',
    ]);
  });

  it('renders snapshot step', async () => {
    const root = render(<SummaryFlowStep
      lhr={flowResult.steps[2].lhr}
      label="Snapshot (1)"
      hashIndex={2}
    />, {wrapper});

    expect(() => root.getByTestId('SummaryNavigationHeader')).toThrow();

    expect(root.getByText('Snapshot (1)')).toBeTruthy();

    const screenshot =
      root.getByAltText('Screenshot of a page tested by Lighthouse') as HTMLImageElement;
    expect(screenshot.src).toMatch(/data:image\/webp;base64/);

    const gauges = root.getAllByTestId('CategoryScore');
    expect(gauges).toHaveLength(4);

    const links = root.getAllByRole('link') as HTMLAnchorElement[];
    expect(links.map(a => a.href)).toEqual([
      'file:///Users/example/report.html/#index=2',
      'file:///Users/example/report.html/#index=2&anchor=performance',
      'file:///Users/example/report.html/#index=2&anchor=accessibility',
      'file:///Users/example/report.html/#index=2&anchor=best-practices',
      'file:///Users/example/report.html/#index=2&anchor=seo',
    ]);
  });
});
