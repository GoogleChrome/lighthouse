/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UserFlow as UserFlow_} from '../core/user-flow.js';
import Config from './config.js';
import {Flags} from './externs.js';
import {Artifacts} from './artifacts.js';

declare module UserFlow {
  export interface FlowArtifacts {
    gatherSteps: GatherStep[];
    name?: string;
  }

  export interface Options {
    /** Config to use for each flow step. */
    config?: Config;
    /** Base flags to use for each flow step. Step specific flags will override these flags. */
    flags?: Flags;
    /** Display name for this user flow. */
    name?: string;
  }

  export interface StepFlags extends Flags {
    /** Display name for this flow step. */
    name?: string;
  }

  export interface GatherStep {
    artifacts: Artifacts;
    flags?: StepFlags;
  }
}

type UserFlow = InstanceType<typeof UserFlow_>;

export default UserFlow;
