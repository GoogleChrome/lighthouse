/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import MainDocumentContent from '../../../gather/gatherers/main-document-content.js';
import {createMockContext} from '../mock-driver.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const devtoolsLog = readJson('../../fixtures/artifacts/paul/devtoolslog.json', import.meta);

const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);

describe('MainDocumentContent', () => {
  it('returns response content', async () => {
    const gatherer = new MainDocumentContent();
    const mockContext = createMockContext();
    mockContext.baseArtifacts.URL = URL;
    mockContext.driver.defaultSession.sendCommand
      .mockResponse('Network.getResponseBody', {body: 'RESPONSE'});

    /** @type {LH.Gatherer.Context<'DevtoolsLog'>} */
    const context = {
      ...mockContext.asContext(),
      dependencies: {DevtoolsLog: devtoolsLog},
    };

    const artifact = await gatherer.getArtifact(context);

    expect(artifact).toEqual('RESPONSE');
  });
});
