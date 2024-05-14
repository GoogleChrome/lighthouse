/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import MainThreadTasks from '../../audits/main-thread-tasks.js';
import {readJson} from '../test-utils.js';

const acceptableTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);

describe('Main thread tasks audit', () => {
  it('should work', async () => {
    const artifacts = {traces: {defaultPass: acceptableTrace}};
    const result = await MainThreadTasks.audit(artifacts, {computedCache: new Map()});
    expect(result.details.items).toHaveLength(39);

    for (const item of result.details.items) {
      expect(Number.isFinite(item.startTime)).toBeTruthy();
      expect(Number.isFinite(item.duration)).toBeTruthy();
    }
  });
});
