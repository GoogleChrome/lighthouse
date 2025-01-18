/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Gatherer} from 'lighthouse';

class MemoryProfile extends Gatherer {
  meta = {
    supportedModes: ['navigation', 'timespan'],
  };

  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    await session.sendCommand('Memory.startSampling');
  }

  async stopInstrumentation(context) {
    const session = context.driver.defaultSession;
    await session.sendCommand('Memory.stopSampling');
  }

  async getArtifact(context) {
    const session = context.driver.defaultSession;
    const {profile} = await session.sendCommand('Memory.getSamplingProfile');

    return profile;
  }
}

export default MemoryProfile;
