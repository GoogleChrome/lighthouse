/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {act, render} from '@testing-library/preact';

import {App} from '../src/app';
import {flowResult} from './sample-flow';

it('renders a standalone report with summary', async () => {
  const root = render(<App flowResult={flowResult}/>);

  expect(root.getByTestId('Summary')).toBeTruthy();
});

it('renders the navigation step', async () => {
  global.location.hash = '#index=0';
  const root = render(<App flowResult={flowResult}/>);

  expect(root.getByTestId('Report')).toBeTruthy();
});

it('renders the timespan step', async () => {
  global.location.hash = '#index=1';
  const root = render(<App flowResult={flowResult}/>);

  expect(root.getByTestId('Report')).toBeTruthy();
});

it('renders the snapshot step', async () => {
  global.location.hash = '#index=2';
  const root = render(<App flowResult={flowResult}/>);

  expect(root.getByTestId('Report')).toBeTruthy();
});

it('toggles collapsed mode when hamburger button clicked', async () => {
  const root = render(<App flowResult={flowResult}/>);

  const app = root.getByTestId('App');
  const hamburgerButton = root.getByLabelText('Button that opens and closes the sidebar');

  expect(app.classList).not.toContain('App--collapsed');

  await act(() => {
    hamburgerButton.click();
  });

  expect(app.classList).toContain('App--collapsed');
});
