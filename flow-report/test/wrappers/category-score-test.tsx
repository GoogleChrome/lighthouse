/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';
import {render} from '@testing-library/preact';

import {CategoryScore} from '../../src/wrappers/category-score';
import {FlowResultContext} from '../../src/util';
import {I18nProvider} from '../../src/i18n/i18n';
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

describe('CategoryScore', () => {
  it('renders score gauge', () => {
    const category: any = {
      id: 'seo',
      score: 0.95,
      auditRefs: [],
    };
    const root = render(
      <CategoryScore category={category} href="#seo" gatherMode="navigation"/>,
      {wrapper}
    );

    const link = root.getByRole('link') as HTMLAnchorElement;

    expect(link.href).toEqual('file:///Users/example/report.html/#seo');
    expect(root.getByText('95')).toBeTruthy();
    expect(root.baseElement.querySelector('.lh-gauge__label')).toBeFalsy();
  });

  it('renders error gauge', () => {
    const category: any = {
      id: 'seo',
      score: null,
      auditRefs: [],
    };
    const root = render(
      <CategoryScore category={category} href="#seo" gatherMode="navigation"/>,
      {wrapper}
    );

    const link = root.getByRole('link') as HTMLAnchorElement;
    const lhGaugePercentage = root.getByTitle('Error!') as HTMLDivElement;

    expect(link.href).toEqual('file:///Users/example/report.html/#seo');
    expect(lhGaugePercentage).toBeTruthy();
    expect(lhGaugePercentage.textContent).toBe('');
  });

  it('renders category fraction', () => {
    const category: any = {
      id: 'seo',
      auditRefs: [
        {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}},
        {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}},
        {weight: 1, result: {score: 0, scoreDisplayMode: 'binary'}},
        {weight: 1, result: {score: 0, scoreDisplayMode: 'binary'}},
      ],
    };
    const root = render(
      <CategoryScore category={category} href="#seo" gatherMode="timespan"/>,
      {wrapper}
    );

    const link = root.getByRole('link') as HTMLAnchorElement;

    expect(link.href).toEqual('file:///Users/example/report.html/#seo');
    expect(root.getByText('2/4')).toBeTruthy();
    expect(root.baseElement.querySelector('.lh-fraction__label')).toBeFalsy();
  });
});
