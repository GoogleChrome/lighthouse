/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const AxeAudit = require('../../../audits/accessibility/axe-audit.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('Accessibility: axe-audit', () => {
  describe('audit()', () => {
    it('generates audit output using subclass meta', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-aria-fail',
            title: 'You have an aria-* issue',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          violations: [{
            id: 'fake-aria-fail',
            nodes: [{}],
            help: 'http://example.com/',
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.equal(output.score, 0);
    });

    it('returns axe error message to the caller when present', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-incomplete-error',
            title: 'Example title',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          incomplete: [{
            id: 'fake-incomplete-error',
            nodes: [],
            help: 'http://example.com/',
            error: {
              name: 'SupportError',
              message: 'Feature is not supported on your platform',
            },
          }],
        },
      };

      const {errorMessage} = FakeA11yAudit.audit(artifacts);
      assert.equal(errorMessage, 'axe-core Error: Feature is not supported on your platform');
    });

    it('returns axe error message to the caller when errored without a message', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-incomplete-error',
            title: 'Example title',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          incomplete: [{
            id: 'fake-incomplete-error',
            nodes: [],
            help: 'http://example.com/',
            error: {},
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.equal(output.errorMessage, 'axe-core Error: Unknown error');
    });

    it('considers passing axe result as not applicable for informative audit', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-axe-pass',
            title: 'Example title',
            scoreDisplayMode: 'informative',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          passes: [{
            id: 'fake-axe-pass',
            help: 'http://example.com/',
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.ok(output.notApplicable);
    });

    it('considers failing axe result as failure for informative audit', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-axe-failure-case',
            title: 'Example title',
            scoreDisplayMode: 'informative',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          incomplete: [{
            id: 'fake-axe-failure-case',
            nodes: [{html: '<input id="multi-label-form-element" />'}],
            help: 'http://example.com/',
          }],
          // TODO: remove: axe-core v3.3.0 backwards-compatibility test
          violations: [{
            id: 'fake-axe-failure-case',
            nodes: [{html: '<input id="multi-label-form-element" />'}],
            help: 'http://example.com/',
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.ok(!output.notApplicable);
      assert.equal(output.score, 0);
    });

    it('considers error-free incomplete axe result as failure for informative audit', () => {
      class FakeA11yAudit extends AxeAudit {
        static get meta() {
          return {
            id: 'fake-incomplete-fail',
            title: 'Example title',
            scoreDisplayMode: 'informative',
            requiredArtifacts: ['Accessibility'],
          };
        }
      }
      const artifacts = {
        Accessibility: {
          incomplete: [{
            id: 'fake-incomplete-fail',
            help: 'http://example.com/',
          }],
        },
      };

      const output = FakeA11yAudit.audit(artifacts);
      assert.equal(output.score, 0);
    });
  });
});
