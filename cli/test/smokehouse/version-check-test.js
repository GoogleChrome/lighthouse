/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {chromiumVersionCheck, compareVersions} from './version-check.js';

describe('version check', () => {
  it('compareVersions', async () => {
    expect(compareVersions([100, 0, 0, 0], [100, 0, 0, 0])).toBe(0);
    expect(compareVersions([101, 0, 0, 0], [100, 0, 0, 0])).toBe(1);
    expect(compareVersions([99, 0, 0, 0], [100, 0, 0, 0])).toBe(-1);

    expect(compareVersions([100, 0, 10, 0], [100, 0, 10, 0])).toBe(0);
    expect(compareVersions([100, 0, 11, 0], [100, 0, 10, 0])).toBe(1);
    expect(compareVersions([100, 0, 9, 0], [100, 0, 10, 0])).toBe(-1);

    expect(compareVersions([100, 0, 0, 0], [100])).toBe(0);
    expect(compareVersions([100, 0, 0, 1], [100])).toBe(1);
    expect(compareVersions([99, 0, 0, 0], [100])).toBe(-1);
  });

  it('chromiumVersionCheck', async () => {
    expect(chromiumVersionCheck({version: '100'})).toBe(true);
    expect(chromiumVersionCheck({version: '100', min: '100'})).toBe(true);
    expect(chromiumVersionCheck({version: '100', max: '100'})).toBe(true);
    expect(chromiumVersionCheck({version: '100', min: '101'})).toBe(false);
    expect(chromiumVersionCheck({version: '100', max: '99'})).toBe(false);

    expect(chromiumVersionCheck({version: '100.0.2331.3'})).toBe(true);
    expect(chromiumVersionCheck({version: '100.0.2331.3', min: '100.0.2331.3'})).toBe(true);
    expect(chromiumVersionCheck({version: '100.0.2331.3', min: '100.0.0.0'})).toBe(true);
    expect(chromiumVersionCheck({version: '100.0.2331.3', max: '100.0.3333.3'})).toBe(true);
    expect(chromiumVersionCheck({version: '100.0.2331.3', min: '100.0.2331.2'})).toBe(true);
    expect(chromiumVersionCheck({version: '100.0.2331.3', max: '99'})).toBe(false);

    expect(chromiumVersionCheck({
      version: '100.0.2331.3', min: '100.0.2331.0', max: '100.0.2331.10'})).toBe(true);
    expect(chromiumVersionCheck({
      version: '100.3.2331.3', min: '100.0.2331.0', max: '100.0.2331.10'})).toBe(false);
  });
});
