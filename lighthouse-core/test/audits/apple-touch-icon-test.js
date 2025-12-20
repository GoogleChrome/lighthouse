/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const AppleTouchIcon = require('../../audits/apple-touch-icon.js');

/* eslint-env jest */

describe('PWA: apple-touch-icon audit', () => {
  it(`fails when apple-touch-icon is not present`, () => {
    const artifacts = {
      LinkElements: [
        {rel: 'iOS-touch-thing', href: 'https://example.com/else.png'},
        {rel: 'something else', href: 'https://example.com/else.png'},
      ],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(0);
  });

  it(`fails when apple-touch-icon does not have an href`, () => {
    const artifacts = {
      LinkElements: [{rel: 'apple-touch-icon'}],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(0);
  });

  it(`passes but warns when apple-touch-icon-precomposed only`, () => {
    const artifacts = {
      LinkElements: [{rel: 'apple-touch-icon-precomposed', href: 'https://example.com/touch-icon.png'}],
    };

    const {score, warnings} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
    expect(warnings[0]).toBeDisplayString('`apple-touch-icon-precomposed` is ' +
      'out of date; `apple-touch-icon` is preferred.');
  });

  it(`passes with no warning when precomposed with normal`, () => {
    const artifacts = {
      LinkElements: [
        {rel: 'apple-touch-icon', href: 'https://example.com/touch-icon.png'},
        {rel: 'apple-touch-icon-precomposed', href: 'https://example.com/touch-icon.png'},
      ],
    };

    const {score, warnings} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
    expect(warnings).toEqual([]);
  });

  it(`passes when apple-touch-icon is on page`, () => {
    const artifacts = {
      LinkElements: [{rel: 'apple-touch-icon', href: 'https://example.com/touch-icon.png'}],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
  });

  it(`passes with multiple apple-touch-icons on page`, () => {
    const artifacts = {
      LinkElements: [
        {rel: 'apple-touch-icon', sizes: '152x152', href: 'https://example.com/touch-icon.png'},
        {rel: 'apple-touch-icon', sizes: '180x180', href: 'https://example.com/touch-icon.png'},
      ],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
  });

  it(`passes when lots of LinkElements`, () => {
    const artifacts = {
      LinkElements: [
        {rel: 'iOS-touch-thing', href: 'https://example.com/else.png'},
        {rel: 'apple-touch-icon', href: 'https://example.com/touch-icon.png'},
        {rel: 'something else', href: 'https://example.com/else.png'},
      ],
    };

    const {score} = AppleTouchIcon.audit(artifacts);

    expect(score).toBe(1);
  });
});
