/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const AutomaticStructuredDataAudit = require('../../../audits/seo/json-ld.js');

/* eslint-env jest */

describe('SEO: structured data audit', () => {
  it('reports both valid and invalid json-ld snippets', async () => {
    const artifacts = {
      ScriptElements: [
        // Empty snippet is not included in the audit
        {
          type: 'application/ld+json',
          content: null,
          devtoolsNodePath: '3,HTML,0,HEAD,29,SCRIPT',
        },
        {
          'type': 'application/ld+json',
          'content': JSON.stringify({
            '@context': 'http://schema.org',
            '@type': 'Event',
            'name': 'Cat Convention',
          }),
          'devtoolsNodePath': '3,HTML,0,HEAD,30,SCRIPT',
        },
        {
          'type': 'application/ld+json',
          'content': `
            ${JSON.stringify({
    '@context': 'http://schema.org',
    '@type': 'Event',
    'title': 'Cat Convention',
  })} `,
          'devtoolsNodePath': '3,HTML,0,HEAD,31,SCRIPT',
        },
      ],
    };

    const auditResult = await AutomaticStructuredDataAudit.audit(artifacts);

    expect(auditResult).toMatchObject({
      score: 0,
      details: {
        type: 'list',
        // Failed snippet comes first
        items: [{
          'type': 'snippet',
          'title': '@type Event (1 Error)',
          'lineMessages': [
            {
              'lineNumber': 4,
              'message': 'Invalid [Event](https://schema.org/Event): Unexpected property "title"',
            },
          ],
          'generalMessages': [],
          'node': {
            'type': 'node',
            'path': '3,HTML,0,HEAD,31,SCRIPT',
            'snippet': '<script type="application/ld+json">',
          },
        },
        // Valid snipppet comes last
        {
          'type': 'snippet',
          'title': 'Event: Cat Convention (0 Errors)',
          'lineMessages': [],
          'generalMessages': [],
          'node': {
            'type': 'node',
            'path': '3,HTML,0,HEAD,30,SCRIPT',
            'snippet': '<script type="application/ld+json">',
          },
        }],
      },
    });

    expect(auditResult.displayValue).toBeDisplayString('1 invalid snippet');
  });

  it('is not applicable if there are no json ld snippets with content on the page', async () => {
    const artifacts = {
      ScriptElements: [
        // Empty snippet is not included in the audit
        {
          type: 'application/ld+json',
          content: null,
        },
        {
          'type': 'application/javascript',
          'content': 'some content',
        },
      ],
    };

    const auditResult = await AutomaticStructuredDataAudit.audit(artifacts);
    expect(auditResult.notApplicable).toBe(true);
    expect(auditResult.score).toBe(1);
  });

  it('passes if all json ld snippets are valid', async () => {
    const artifacts = {
      ScriptElements: [
        {
          'type': 'application/ld+json',
          'content': JSON.stringify({
            '@context': 'http://schema.org',
            '@type': 'Event',
            'name': 'Cat Convention',
          }),
          'devtoolsNodePath': '3,HTML,0,HEAD,30,SCRIPT',
        },
      ],
    };

    const auditResult = await AutomaticStructuredDataAudit.audit(artifacts);
    expect(auditResult.score).toBe(1);
    expect(auditResult.displayValue).toBeDisplayString('0 invalid snippets');
  });

  // eslint-disable-next-line max-len
  it('does not use [object object] in the title if the top-level name property is an object', async () => {
    const artifacts = {
      ScriptElements: [
        {
          'type': 'application/ld+json',
          'content': JSON.stringify({
            '@context': {
              'schema': 'http://schema.org/',
              'name': {'@id': 'schema:name', '@container': '@language'},
            },
            'name': {
              'en': 'sth',
              'fr': 'qqc',
            },
            '@type': 'schema:Event',
          }),
          'devtoolsNodePath': '3,HTML,0,HEAD,30,SCRIPT',
        },
      ],
    };

    const auditResult = await AutomaticStructuredDataAudit.audit(artifacts);
    expect(auditResult.details.items[0].title).toBe('@type schema:Event (0 Errors)');
  });
});
