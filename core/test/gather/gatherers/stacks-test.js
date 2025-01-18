/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import StacksGatherer from '../../../gather/gatherers/stacks.js';
import {fnAny} from '../../test-utils.js';

describe('StacksGatherer', () => {
  /** @type {{executionContext: {evaluate: Mock<any, any>}}} */
  let driver;

  beforeEach(() => {
    driver = {executionContext: {evaluate: fnAny()}};
  });

  it('returns the detected stacks', async () => {
    driver.executionContext.evaluate.mockResolvedValue([
      {id: 'jquery', name: 'jQuery', version: '2.1.0', npm: 'jquery'},
      {id: 'angular', name: 'Angular', version: '', npm: ''},
      {id: 'magento', name: 'Magento', version: 2},
    ]);

    /** @type {*} */
    const executionContext = driver.executionContext;
    expect(await StacksGatherer.collectStacks(executionContext)).toEqual([
      {detector: 'js', id: 'jquery', name: 'jQuery', npm: 'jquery', version: '2.1.0'},
      {detector: 'js', id: 'angular', name: 'Angular', npm: undefined, version: undefined},
      {detector: 'js', id: 'magento', name: 'Magento', npm: undefined, version: '2'},
    ]);
  });
});
