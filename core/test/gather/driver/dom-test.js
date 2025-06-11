/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createMockSession} from '../mock-driver.js';
import * as dom from '../../../gather/driver/dom.js';

let sessionMock = createMockSession();

beforeEach(() => {
  sessionMock = createMockSession();
});

describe('.resolveNodeIdToObjectId', () => {
  it('resolves to the object id', async () => {
    sessionMock.sendCommand.mockResponse('DOM.resolveNode', {object: {objectId: 'one'}});
    const objectId = await dom.resolveNodeIdToObjectId(sessionMock.asSession(), 1);
    expect(objectId).toEqual('one');
  });

  it('handle missing nodes', async () => {
    sessionMock.sendCommand.mockRejectedValue(new Error('No node 1 found'));
    const objectId = await dom.resolveNodeIdToObjectId(sessionMock.asSession(), 1);
    expect(objectId).toEqual(undefined);
  });

  it('handle nodes in other documents', async () => {
    sessionMock.sendCommand.mockRejectedValue(new Error('Node 1 does not belong to the document'));
    const objectId = await dom.resolveNodeIdToObjectId(sessionMock.asSession(), 1);
    expect(objectId).toEqual(undefined);
  });

  it('raise other exceptions', async () => {
    const error = new Error('PROTOCOL_TIMEOUT');
    sessionMock.sendCommand.mockRejectedValue(error);
    await expect(dom.resolveNodeIdToObjectId(sessionMock.asSession(), 1)).rejects.toEqual(error);
  });
});

describe('.resolveDevtoolsNodePathToObjectId', () => {
  it('resolves to the object id', async () => {
    sessionMock.sendCommand
      .mockResponse('DOM.pushNodeByPathToFrontend', {nodeId: 1})
      .mockResponse('DOM.resolveNode', {object: {objectId: 'one'}});
    const objectId = await dom.resolveDevtoolsNodePathToObjectId(sessionMock.asSession(), 'div');
    expect(objectId).toEqual('one');
  });

  it('handle missing nodes', async () => {
    sessionMock.sendCommand.mockRejectedValue(new Error('No node 1 found'));
    const objectId = await dom.resolveDevtoolsNodePathToObjectId(sessionMock.asSession(), 'div');
    expect(objectId).toEqual(undefined);
  });

  it('handle nodes in other documents', async () => {
    sessionMock.sendCommand.mockRejectedValue(new Error('Node 1 does not belong to the document'));
    const objectId = await dom.resolveDevtoolsNodePathToObjectId(sessionMock.asSession(), 'div');
    expect(objectId).toEqual(undefined);
  });

  it('raise other exceptions', async () => {
    const error = new Error('PROTOCOL_TIMEOUT');
    sessionMock.sendCommand.mockRejectedValue(error);
    await expect(
      dom.resolveDevtoolsNodePathToObjectId(sessionMock.asSession(), 'div')
    ).rejects.toEqual(error);
  });
});
