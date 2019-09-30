/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

 declare module Smokehouse {
  export interface Difference {
    path: string;
    actual: any;
    expected: any;
  }

  export interface Comparison {
    name: string;
    actual: any;
    expected: any;
    equal: boolean;
    diff?: Difference | null;
  }

  export type ExpectedLHR = Pick<LH.Result, 'audits' | 'finalUrl' | 'requestedUrl' | 'runWarnings' | 'runtimeError'>

  export type ExpectedRunnerResult = {
    lhr: ExpectedLHR,
    artifacts?: Partial<LH.Artifacts>
  }

  export interface TestDfn {
    id: string;
    expectations: string;
    config: string;
    flags?: string;
    batch: string;
  }
}
