/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

module.exports = {
  collectCoverage: false,
  coverageReporters: ['none'],
  collectCoverageFrom: [
    '**/lighthouse-core/**/*.js',
    '**/lighthouse-cli/**/*.js',
    '**/lighthouse-viewer/**/*.js',
  ],
  coveragePathIgnorePatterns: [
    '/test/',
    '/scripts/',
  ],
  setupFilesAfterEnv: ['./lighthouse-core/test/test-utils.js'],
  testEnvironment: 'node',
  testMatch: [
    '**/lighthouse-core/**/*-test.js',
    '**/lighthouse-cli/**/*-test.js',
    '**/lighthouse-viewer/**/*-test.js',
    '**/lighthouse-viewer/**/*-test-pptr.js',
    '**/clients/test/**/*-test.js',
    '**/docs/**/*.test.js',
  ],
};
