/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LargestContentfulPaintElementAudit =
  require('../../audits/largest-contentful-paint-element.js');

/* eslint-env jest */
describe('Performance: largest-contentful-paint-element audit', () => {
  it('correctly surfaces the LCP element', async () => {
    const artifacts = {
      TraceElements: [{
        metricName: 'largest-contentful-paint',
        devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
        selector: 'div.l-header > div.chorus-emc__content',
        nodeLabel: 'My Test Label',
        snippet: '<h1 class="test-class">',
      }],
    };

    const auditResult = await LargestContentfulPaintElementAudit.audit(artifacts);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.displayValue).toBeDisplayString('1 element found');
    expect(auditResult.details.items).toHaveLength(1);
    expect(auditResult.details.items[0].node.path).toEqual('1,HTML,3,BODY,5,DIV,0,HEADER');
    expect(auditResult.details.items[0].node.nodeLabel).toEqual('My Test Label');
    expect(auditResult.details.items[0].node.snippet).toEqual('<h1 class="test-class">');
  });

  it('doesn\'t throw an error when there is nothing to show', async () => {
    const artifacts = {
      TraceElements: [],
    };

    const auditResult = await LargestContentfulPaintElementAudit.audit(artifacts);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.displayValue).toBeDisplayString('0 elements found');
    expect(auditResult.details.items).toHaveLength(0);
  });
});
