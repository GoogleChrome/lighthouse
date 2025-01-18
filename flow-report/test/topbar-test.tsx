/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';
import {FunctionComponent} from 'preact';
import {act, render} from '@testing-library/preact';

import {FlowResultContext, OptionsContext} from '../src/util';
import {I18nProvider} from '../src/i18n/i18n';
import {Topbar, saveHtml} from '../src/topbar';

const mockSaveFile = jestMock.fn();
const defaultSaveFile = saveHtml.saveFile;

const flowResult = {
  name: 'User flow',
  steps: [{lhr: {
    fetchTime: '2021-09-14T22:24:22.462Z',
    configSettings: {locale: 'en-US'},
    i18n: {rendererFormattedStrings: {}},
  }}],
} as any;

let wrapper: FunctionComponent;
let options: LH.FlowReportOptions;

before(() => {
  mockSaveFile.mockReset();
  options = {};
  wrapper = ({children}) => (
    <OptionsContext.Provider value={options}>
      <FlowResultContext.Provider value={flowResult}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </FlowResultContext.Provider>
    </OptionsContext.Provider>
  );
});

after(() => {
  saveHtml.saveFile = defaultSaveFile;
});

it('save button opens save dialog for HTML file', async () => {
  saveHtml.saveFile = mockSaveFile;
  options = {getReportHtml: () => '<html></html>'};
  const root = render(<Topbar onMenuClick={() => {}}/>, {wrapper});

  const saveButton = root.getByText('Save');
  saveButton.click();

  expect(mockSaveFile).toHaveBeenCalledWith(
    expect.any(Blob),
    'User-flow_2021-09-14_22-24-22.html'
  );
});

it('provides save as gist option if defined', async () => {
  const saveAsGist = jestMock.fn();
  options = {saveAsGist};
  const root = render(<Topbar onMenuClick={() => {}}/>, {wrapper});

  const saveButton = root.getByText('Save as Gist');
  saveButton.click();

  expect(saveAsGist).toHaveBeenCalledWith(flowResult);
});

it('toggles help dialog', async () => {
  const root = render(<Topbar onMenuClick={() => {}}/>, {wrapper});

  expect(root.queryByText(/Use Navigation reports to/)).toBeFalsy();
  const helpButton = root.getByText('Understanding Flows');

  await act(() => helpButton.click());
  expect(root.getByText(/Use Navigation reports to/)).toBeTruthy();

  await act(() => helpButton.click());
  expect(root.queryByText(/Use Navigation reports to/)).toBeFalsy();
});
