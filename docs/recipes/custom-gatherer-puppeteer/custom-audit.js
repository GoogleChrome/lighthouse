/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('lighthouse').Audit;

class CustomAudit extends Audit {
  static get meta() {
    return {
      id: 'custom-audit',
      title: 'First text input field accepts `123` as input',
      failureTitle: 'First text input field doesn\'t accept `123` as input',
      description: 'Example custom audit which relies on a fancy gatherer.',

      // The name of the custom gatherer class that provides input to this audit.
      requiredArtifacts: ['CustomGatherer'],
    };
  }

  static audit(artifacts) {
    const value = artifacts.CustomGatherer.value;
    const success = value === '123';

    return {
      // Cast true/false to 1/0
      score: Number(success),
    };
  }
}

module.exports = CustomAudit;
