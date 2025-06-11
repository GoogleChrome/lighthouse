/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionComponent} from 'preact';
import {render} from '@testing-library/preact';

import {Header} from '../src/header';
import {FlowResultContext} from '../src/util';
import {flowResult} from './sample-flow';
import {I18nProvider} from '../src/i18n/i18n';

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

it('renders all sections for a middle step', () => {
  const hashState = {index: 1} as any;
  const root = render(<Header hashState={hashState}/>, {wrapper});

  expect(root.baseElement.querySelector('.Header__prev-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__prev-title')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-title')).toBeTruthy();
});

it('renders only next section for first step', () => {
  const hashState = {index: 0} as any;
  const root = render(<Header hashState={hashState}/>, {wrapper});

  expect(root.baseElement.querySelector('.Header__prev-thumbnail')).toBeFalsy();
  expect(root.baseElement.querySelector('.Header__prev-title')).toBeFalsy();
  expect(root.baseElement.querySelector('.Header__next-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-title')).toBeTruthy();
});

it('renders only previous section for last step', () => {
  const hashState = {index: 3} as any;
  const root = render(<Header hashState={hashState}/>, {wrapper});

  expect(root.baseElement.querySelector('.Header__prev-thumbnail')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__prev-title')).toBeTruthy();
  expect(root.baseElement.querySelector('.Header__next-thumbnail')).toBeFalsy();
  expect(root.baseElement.querySelector('.Header__next-title')).toBeFalsy();
});
