/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import NetworkUserAgent from '../../../gather/gatherers/network-user-agent.js';
import {readJson} from '../../test-utils.js';

const devtoolsLog = readJson('../../fixtures/traces/lcp-m78.devtools.log.json', import.meta);

describe('.getNetworkUserAgent', () => {
  it('should return empty string when no network events available', async () => {
    const result = await NetworkUserAgent.getNetworkUserAgent([]);
    expect(result).toEqual('');
  });

  it('should return the user agent that was used to make requests', async () => {
    const result = await NetworkUserAgent.getNetworkUserAgent(devtoolsLog);
    // eslint-disable-next-line max-len
    expect(result).toEqual('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.97 Safari/537.36');
  });
});
