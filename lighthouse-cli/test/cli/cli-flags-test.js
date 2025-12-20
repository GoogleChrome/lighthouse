/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const assert = require('assert').strict;
const getFlags = require('../../cli-flags.js').getFlags;

describe('CLI bin', function() {
  it('all options should have descriptions', () => {
    getFlags('chrome://version');
    const yargs = require('yargs');

    // @ts-ignore - getGroups is private
    const optionGroups = yargs.getGroups();
    /** @type {string[]} */
    const allOptions = [];
    Object.keys(optionGroups).forEach(key => {
      allOptions.push(...optionGroups[key]);
    });
    // @ts-ignore - getUsageInstance is private
    const optionsWithDescriptions = Object.keys(yargs.getUsageInstance().getDescriptions());

    allOptions.forEach(opt => {
      assert.ok(optionsWithDescriptions.includes(opt), `cli option '${opt}' has no description`);
    });
  });

  it('settings are accepted from a file path', () => {
    const flags = getFlags([
      'http://www.example.com',
      `--cli-flags-path="${__dirname}/../fixtures/cli-flags-path.json"`,
      '--budgets-path=path/to/my/budget-from-command-line.json', // this should override the config value
    ].join(' '));

    expect(flags).toMatchObject({
      budgetsPath: 'path/to/my/budget-from-command-line.json',
      onlyCategories: ['performance', 'seo'],
      chromeFlags: '--window-size 800,600',
      extraHeaders: {'X-Men': 'wolverine'},
      throttlingMethod: 'devtools',
      throttling: {
        requestLatencyMs: 700,
        cpuSlowdownMultiplier: 6,
      },
    });
  });

  it('array values support csv when appropriate', () => {
    const flags = getFlags([
      'http://www.example.com',
      '--only-categories=performance,seo',
      '--skipAudits=unused-javascript,redirects',
      '--skipAudits=bootup-time',
    ].join(' '));
    expect(flags.onlyCategories).toEqual(['performance', 'seo']);
    expect(flags.skipAudits).toEqual(['unused-javascript', 'redirects', 'bootup-time']);
  });

  it('array values do not support csv when appropriate', () => {
    const flags = getFlags([
      'http://www.example.com',
      '--chrome-flags="--window-size 800,600"',
      '--chrome-flags="--enabled-features=NetworkService,VirtualTime"',
      '--blockedUrlPatterns=.*x,y\\.png',
    ].join(' '));
    expect(flags.chromeFlags).toEqual([
      '--window-size 800,600',
      '--enabled-features=NetworkService,VirtualTime',
    ]);
    expect(flags.blockedUrlPatterns).toEqual(['.*x,y\\.png']);
  });
});
