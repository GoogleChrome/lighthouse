/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';
import {render} from '@testing-library/preact';

import {SummaryTooltip} from '../../src/summary/category';
import {flowResult} from '../sample-flow';
import {I18nProvider} from '../../src/i18n/i18n';
import {FlowResultContext} from '../../src/util';

let wrapper: FunctionComponent;

beforeEach(() => {
  // Include sample flowResult for locale in I18nProvider.
  wrapper = ({children}) => (
    <FlowResultContext.Provider value={flowResult}>
      <I18nProvider>
        {children}
      </I18nProvider>
    </FlowResultContext.Provider>
  );
});

describe('SummaryTooltip', () => {
  it('renders tooltip with rating', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        /* eslint-disable max-len */
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 1'}, weight: 1, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 2'}, weight: 1, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 3'}, weight: 1, group: 'diagnostics'},
        /* eslint-enable max-len */
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="snapshot" url="https://example.com"/>,
      {wrapper}
    );

    expect(root.getByText('Average')).toBeTruthy();
    expect(() => root.getByText(/^[0-9]+$/)).toThrow();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('3 passable audits')).toBeTruthy();
    expect(root.getByText('https://example.com')).toBeTruthy();
  });

  it('renders tooltip without rating', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        /* eslint-disable max-len */
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 1'}, weight: 0, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 2'}, weight: 0, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 3'}, weight: 0, group: 'diagnostics'},
        /* eslint-enable max-len */
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="snapshot" url="https://example.com"/>,
      {wrapper}
    );

    expect(() => root.getByText(/^(Average|Good|Poor)$/)).toThrow();
    expect(() => root.getByText(/^[0-9]+$/)).toThrow();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('3 passable audits')).toBeTruthy();
    expect(root.getByText('https://example.com')).toBeTruthy();
  });

  it('renders scored category tooltip with score', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        /* eslint-disable max-len */
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 1'}, weight: 1, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 2'}, weight: 1, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 3'}, weight: 1, group: 'diagnostics'},
        /* eslint-enable max-len */
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="navigation" url="https://example.com"/>,
      {wrapper}
    );

    expect(root.getByText('Good')).toBeTruthy();
    expect(root.getByText('100')).toBeTruthy();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('3 passable audits')).toBeTruthy();
    expect(root.getByText('https://example.com')).toBeTruthy();
  });

  it('renders informative audit count if any', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        /* eslint-disable max-len */
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 1'}, weight: 1, group: 'diagnostics'},
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 2'}, weight: 1, group: 'diagnostics'},
        {result: {score: null, scoreDisplayMode: 'informative', title: 'Audit 3'}, weight: 1, group: 'diagnostics'},
        /* eslint-enable max-len */
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="navigation" url="https://example.com"/>,
      {wrapper}
    );

    expect(root.getByText('Good')).toBeTruthy();
    expect(root.getByText('100')).toBeTruthy();
    expect(root.getByText('2 audits passed')).toBeTruthy();
    expect(root.getByText('2 passable audits')).toBeTruthy();
    expect(root.getByText('1 informative audit')).toBeTruthy();
    expect(root.getByText('https://example.com')).toBeTruthy();
  });

  it('renders highest impact audits', async () => {
    const category: any = {
      id: 'seo',
      score: 1,
      auditRefs: [
        /* eslint-disable max-len */
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 1'}, weight: 1, group: 'group'},
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 2'}, weight: 2, group: 'group'},
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 3'}, weight: 3, group: 'group'},
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 4'}, weight: 0, group: 'group'},
        /* eslint-enable max-len */
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="navigation" url="https://example.com"/>,
      {wrapper}
    );

    const audits = root.getAllByText(/^Audit [0-9]$/);

    expect(root.getByText('Highest impact')).toBeTruthy();
    expect(audits.map(a => a.textContent)).toEqual([
      'Audit 3',
      'Audit 2',
    ]);
  });

  it('renders highest impact audits in performance', async () => {
    const category: any = {
      id: 'performance',
      score: 0.75,
      auditRefs: [
        /* eslint-disable max-len */
        {result: {score: 0.75, scoreDisplayMode: 'numeric', title: 'Metric 1'}, weight: 1, group: 'metrics'},
        {result: {score: 0, scoreDisplayMode: 'numeric', title: 'Audit 1', metricSavings: {LCP: 500}}, weight: 0, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'numeric', title: 'Audit 2', metricSavings: {LCP: 1000}}, weight: 0, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'numeric', title: 'Audit 3', metricSavings: {LCP: 100, FCP: 10_000}}, weight: 0, group: 'diagnostics'},
        {result: {score: 0.5, scoreDisplayMode: 'numeric', title: 'Audit 4', metricSavings: {LCP: 10_000}}, weight: 0, group: 'diagnostics'},
        /* eslint-enable max-len */
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="navigation" url="https://example.com"/>,
      {wrapper}
    );

    const audits = root.getAllByText(/^(Audit|Metric) [0-9]$/);

    expect(root.getByText('Highest impact')).toBeTruthy();
    expect(audits.map(a => a.textContent)).toEqual([
      'Audit 2',
      'Audit 1',
    ]);
  });

  it('hides highest impact if nothing to show', async () => {
    const category: any = {
      id: 'performance',
      score: 1,
      auditRefs: [
        /* eslint-disable max-len */
        {result: {score: 1, scoreDisplayMode: 'binary', title: 'Audit 1'}, weight: 1, group: 'diagnostics'},
        {result: {score: 0, scoreDisplayMode: 'binary', title: 'Audit 2'}, weight: 1, group: 'hidden'},
        {result: {score: null, scoreDisplayMode: 'informative', title: 'Audit 3'}, weight: 1, group: 'diagnostics'},
        /* eslint-enable max-len */
      ],
    };

    const root = render(
      <SummaryTooltip category={category} gatherMode="navigation" url="https://example.com"/>,
      {wrapper}
    );

    expect(() => root.getByText('Highest impact')).toThrow();
    expect(() => root.getByText(/^Audit [0-9]$/)).toThrow();
  });
});
