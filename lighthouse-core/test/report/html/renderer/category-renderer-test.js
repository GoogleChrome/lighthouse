/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest, browser */

const assert = require('assert').strict;
const fs = require('fs');
const jsdom = require('jsdom');
const Util = require('../../../../report/html/renderer/util.js');
const I18n = require('../../../../report/html/renderer/i18n.js');
const DOM = require('../../../../report/html/renderer/dom.js');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer.js');
const CriticalRequestChainRenderer = require(
    '../../../../report/html/renderer/crc-details-renderer.js');
const CategoryRenderer = require('../../../../report/html/renderer/category-renderer.js');
const sampleResultsOrig = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');

describe('CategoryRenderer', () => {
  let renderer;
  let sampleResults;

  beforeAll(() => {
    global.Util = Util;
    global.Util.i18n = new I18n('en', {...Util.UIStrings});
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;

    const {document} = new jsdom.JSDOM(TEMPLATE_FILE).window;
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new CategoryRenderer(dom, detailsRenderer);

    sampleResults = Util.prepareReportResult(sampleResultsOrig);
  });

  afterAll(() => {
    global.Util.i18n = undefined;
    global.Util = undefined;
    global.CriticalRequestChainRenderer = undefined;
  });

  it('renders an audit', () => {
    const auditRef = sampleResults.categories.pwa.auditRefs
      .find(a => a.id === 'works-offline');

    const auditDOM = renderer.renderAudit(auditRef);
    assert.equal(auditDOM.nodeType, 1, 'Audit returns an element');

    const title = auditDOM.querySelector('.lh-audit__title');
    const description = auditDOM.querySelector('.lh-audit__description');

    assert.equal(title.textContent, auditRef.result.title);
    assert.ok(description.querySelector('a'), 'audit help text contains coverted markdown links');
    assert.ok(auditDOM.classList.contains('lh-audit--fail'));
    assert.ok(
      auditDOM.classList.contains(`lh-audit--${auditRef.result.scoreDisplayMode.toLowerCase()}`));
  });

  it('renders an audit explanation when appropriate', () => {
    const audit1 = renderer.renderAudit({
      result: {
        title: 'Audit title',
        explanation: 'A reason',
        description: 'help text',
        scoreDisplayMode: 'binary',
        score: 0,
      },
    });
    assert.ok(audit1.querySelector('.lh-audit-explanation'));

    const audit2 = renderer.renderAudit({
      result: {
        title: 'Audit title',
        description: 'help text',
        scoreDisplayMode: 'binary',
        score: 0,
      },
    });
    assert.ok(!audit2.querySelector('.lh-audit-explanation'));
  });

  it('renders an informative audit', () => {
    const auditDOM = renderer.renderAudit({
      id: 'informative',
      result: {
        title: 'It informs',
        description: 'help text',
        scoreDisplayMode: 'informative',
        score: 0,
      },
    });
    assert.ok(auditDOM.matches('.lh-audit--informative'));
  });

  it('adds a pass/average/fail class for non-informative audits', () => {
    const auditDOM = renderer.renderAudit({
      id: 'not-informative',
      result: {
        title: 'Not informative',
        description: 'help text',
        scoreDisplayMode: 'numeric',
        score: 0,
      },
    });
    assert.ok(auditDOM.matches('.lh-audit--fail'));
  });

  it('does not add a pass/average/fail class for informative audits', () => {
    const auditDOM = renderer.renderAudit({
      id: 'informative',
      result: {
        title: 'It informs',
        description: 'help text',
        scoreDisplayMode: 'informative',
        score: 0,
      },
    });
    assert.equal(auditDOM.classList.length, 2);
    assert.ok(auditDOM.matches('.lh-audit'));
    assert.ok(auditDOM.matches('.lh-audit--informative'));
  });

  it('renders audits with a warning', () => {
    const auditResult = {
      title: 'Audit',
      description: 'Learn more',
      scoreDisplayMode: 'informative',
      warnings: ['It may not have worked!'],
      score: 1,
    };
    const auditDOM = renderer.renderAudit({id: 'foo', result: auditResult});
    const warningEl = auditDOM.querySelector('.lh-warnings');
    assert.ok(warningEl, 'did not render warning message');
    assert.ok(warningEl.textContent.includes(auditResult.warnings[0]), 'warning message provided');
  });

  it('renders audits with multiple warnings', () => {
    const auditResult = {
      title: 'Audit',
      description: 'Learn more',
      scoreDisplayMode: 'informative',
      warnings: ['It may not have worked!', 'You should read this, though'],
      score: 1,
    };
    const auditDOM = renderer.renderAudit({id: 'foo', result: auditResult});
    const warningEl = auditDOM.querySelector('.lh-warnings');
    assert.ok(warningEl, 'did not render warning message');
    assert.ok(warningEl.textContent.includes(auditResult.warnings[0]), '1st warning provided');
    assert.ok(warningEl.textContent.includes(auditResult.warnings[1]), '2nd warning provided');
  });

  it('renders a category', () => {
    const category = sampleResults.categories.pwa;
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

    const categoryEl = categoryDOM.querySelector('.lh-category-header');
    const value = categoryDOM.querySelector('.lh-gauge__percentage');
    const title = categoryEl.querySelector('.lh-gauge__label');

    assert.deepEqual(categoryEl, categoryEl.firstElementChild, 'first child is a score');
    const scoreInDom = Number(value.textContent);
    assert.ok(Number.isInteger(scoreInDom) && scoreInDom > 10, 'category score is rounded');
    assert.equal(title.textContent, category.title, 'title is set');

    const audits = categoryDOM.querySelectorAll('.lh-audit');
    assert.equal(audits.length, category.auditRefs.length, 'renders correct number of audits');

    // No plugin categories in sampleResults.
    assert.equal(
      categoryDOM.querySelector('.lh-gauge__wrapper--plugin'), null, 'renders no plugin badges');
  });

  it('plugin category has plugin badge', () => {
    const category = JSON.parse(
      JSON.stringify(sampleResults.categories.seo));
    category.id = 'lighthouse-plugin-someplugin';
    category.title = 'Some Plugin';
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    assert.ok(categoryDOM.querySelector('.lh-gauge__wrapper--plugin'));
    const label = categoryDOM.querySelector('.lh-gauge__label').textContent;
    assert.equal(category.title, label);
  });

  it('handles markdown in category descriptions a category', () => {
    const category = sampleResults.categories.pwa;
    const prevDesc = category.description;
    category.description += ' [link text](http://example.com).';
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const description = categoryDOM.querySelector('.lh-category-header__description');
    assert.ok(description.querySelector('a'), 'description contains converted markdown links');
    category.description = prevDesc;
  });

  it('renders manual audits if the category contains them', () => {
    const pwaCategory = sampleResults.categories.pwa;
    const categoryDOM = renderer.render(pwaCategory, sampleResults.categoryGroups);
    assert.ok(categoryDOM.querySelector('.lh-clump--manual .lh-audit-group__summary'));
    assert.equal(categoryDOM.querySelectorAll('.lh-audit--manual').length, 3,
        'score shows informative and dash icon');

    assert.ok(pwaCategory.manualDescription);
    const description = categoryDOM
      .querySelector('.lh-clump--manual .lh-audit-group__description').textContent;
    // may need to be adjusted if description includes a link at the beginning
    assert.ok(description.startsWith(pwaCategory.manualDescription.substring(0, 20)),
        'no manual description');
  });

  it('renders not applicable audits if the category contains them', () => {
    const a11yCategory = sampleResults.categories.accessibility;
    const categoryDOM = renderer.render(a11yCategory, sampleResults.categoryGroups);
    assert.ok(categoryDOM.querySelector(
        '.lh-clump--notapplicable .lh-audit-group__summary'));

    const notApplicableCount = a11yCategory.auditRefs.reduce((sum, audit) =>
        sum += audit.result.scoreDisplayMode === 'notApplicable' ? 1 : 0, 0);
    assert.equal(
      categoryDOM.querySelectorAll('.lh-clump--notapplicable .lh-audit').length,
      notApplicableCount,
      'score shows informative and dash icon'
    );

    const bestPracticeCat = sampleResults.categories['best-practices'];
    const categoryDOM2 = renderer.render(bestPracticeCat, sampleResults.categoryGroups);
    assert.ok(!categoryDOM2.querySelector('.lh-clump--notapplicable'));
  });

  describe('category with groups', () => {
    let category;

    beforeEach(() => {
      category = sampleResults.categories.accessibility;
    });

    it('renders the category header', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

      const gauge = categoryDOM.querySelector('.lh-gauge__percentage');
      assert.equal(gauge.textContent.trim(), '65', 'score is 0-100');

      const score = categoryDOM.querySelector('.lh-category-header');
      const value = categoryDOM.querySelector('.lh-gauge__percentage');
      const title = score.querySelector('.lh-gauge__label');
      const description = score.querySelector('.lh-category-header__description');

      assert.deepEqual(score, score.firstElementChild, 'first child is a score');
      const scoreInDom = Number(value.textContent);
      assert.ok(Number.isInteger(scoreInDom) && scoreInDom > 10, 'score is rounded out of 100');
      assert.equal(title.textContent, category.title, 'title is set');
      assert.ok(description.querySelector('a'), 'description contains converted markdown links');
    });

    it('renders the failed audits grouped by group', () => {
      // Fail all the audits.
      const categoryClone = JSON.parse(JSON.stringify(category));
      const auditRefs = categoryClone.auditRefs;
      auditRefs.forEach(ref => {
        ref.result.score = 0;
        ref.result.scoreDisplayMode = 'binary';
      });
      const categoryDOM = renderer.render(categoryClone, sampleResults.categoryGroups);

      // All the group names in the config.
      const groupNames = Array.from(new Set(auditRefs.map(ref => ref.group))).filter(Boolean);
      assert.ok(groupNames.length > 5, `not enough groups found in category for test`);

      // All the group roots in the DOM.
      const failedGroupElems = Array.from(
          categoryDOM.querySelectorAll('.lh-clump--failed > .lh-audit-group'));

      assert.strictEqual(failedGroupElems.length, groupNames.length);

      for (const groupName of groupNames) {
        const groupAuditRefs = auditRefs.filter(ref => ref.group === groupName);
        assert.ok(groupAuditRefs.length > 0, `no auditRefs found with group '${groupName}'`);

        const className = `lh-audit-group--${groupName}`;
        const groupElem = failedGroupElems.find(el => el.classList.contains(className));
        const groupAuditElems = groupElem.querySelectorAll('.lh-audit');

        assert.strictEqual(groupAuditElems.length, groupAuditRefs.length);
      }
    });

    it('renders the passed audits ungrouped', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const passedAudits = category.auditRefs.filter(audit =>
          audit.result.scoreDisplayMode !== 'notApplicable' && audit.result.score === 1);

      const passedAuditGroups = categoryDOM.querySelectorAll('.lh-clump--passed .lh-audit-group');
      const passedAuditsElems = categoryDOM.querySelectorAll('.lh-clump--passed .lh-audit');

      assert.equal(passedAuditGroups.length, 0);
      assert.equal(passedAuditsElems.length, passedAudits.length);
    });

    it('renders all the audits', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const auditsElements = categoryDOM.querySelectorAll('.lh-audit');
      assert.equal(auditsElements.length, category.auditRefs.length);
    });

    it('renders audits without a group before grouped ones', () => {
      const categoryClone = JSON.parse(JSON.stringify(category));

      // Remove groups from some audits.
      const ungroupedAudits = ['color-contrast', 'image-alt', 'link-name'];
      for (const auditRef of categoryClone.auditRefs) {
        if (ungroupedAudits.includes(auditRef.id)) {
          assert.ok(auditRef.group); // Make sure this will change something.
          delete auditRef.group;
        }
      }

      const elem = renderer.render(categoryClone, sampleResults.categoryGroups);

      // Check that the first audits found are the ungrouped ones.
      const auditElems = Array.from(elem.querySelectorAll('.lh-audit'));
      const firstAuditElems = auditElems.slice(0, ungroupedAudits.length);
      for (const auditElem of firstAuditElems) {
        const auditId = auditElem.id;
        assert.ok(ungroupedAudits.includes(auditId), auditId);
      }
    });

    it('gives each group a selectable class', () => {
      const categoryClone = JSON.parse(JSON.stringify(category));
      // Force all results to be Failed for accurate counting of groups.
      categoryClone.auditRefs.forEach(ref => {
        ref.result.score = 0;
        ref.result.scoreDisplayMode = 'binary';
      });
      const categoryGroupIds = new Set(category.auditRefs.filter(a => a.group).map(a => a.group));
      assert.ok(categoryGroupIds.size > 6); // Ensure there's something to test.

      const categoryElem = renderer.render(categoryClone, sampleResults.categoryGroups);

      categoryGroupIds.forEach(groupId => {
        const selector = `.lh-audit-group--${groupId}`;
        assert.equal(categoryElem.querySelectorAll(selector).length, 1,
          `could not find '${selector}'`);
      });
    });
  });

  describe('clumping passed/failed/warning/manual', () => {
    it('separates audits in the DOM', () => {
      const category = sampleResults.categories.pwa;
      const categoryClone = JSON.parse(JSON.stringify(category));
      // Give the first two passing grades warnings
      const passingRefs = categoryClone.auditRefs.filter(ref => ref.result.score === 1);
      passingRefs[0].result.warnings = ['Some warning'];
      passingRefs[1].result.warnings = ['Some warning'];

      const elem = renderer.render(categoryClone, sampleResults.categoryGroups);
      const passedAudits = elem.querySelectorAll('.lh-clump--passed .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-clump--failed .lh-audit');
      const warningAudits = elem.querySelectorAll('.lh-clump--warning .lh-audit');
      const manualAudits = elem.querySelectorAll('.lh-clump--manual .lh-audit');

      assert.equal(passedAudits.length, 2);
      assert.equal(failedAudits.length, 10);
      assert.equal(warningAudits.length, 2);
      assert.equal(manualAudits.length, 3);
    });

    it('doesnt create a passed section if there were 0 passed', () => {
      const origCategory = sampleResults.categories.pwa;
      const category = JSON.parse(JSON.stringify(origCategory));
      category.auditRefs.forEach(audit => audit.result.score = 0);
      const elem = renderer.render(category, sampleResults.categoryGroups);
      const passedAudits = elem.querySelectorAll('.lh-clump--passed .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-clump--failed .lh-audit');

      assert.equal(passedAudits.length, 0);
      assert.equal(failedAudits.length, 14);
    });

    it('expands warning audit group', () => {
      const category = sampleResults.categories.pwa;
      const categoryClone = JSON.parse(JSON.stringify(category));
      categoryClone.auditRefs[0].result.warnings = ['Some warning'];

      const auditDOM = renderer.render(categoryClone, sampleResults.categoryGroups);
      const warningClumpEl = auditDOM.querySelector('.lh-clump--warning');
      const isExpanded = warningClumpEl.hasAttribute('open');
      assert.ok(isExpanded, 'Warning audit group should be expanded by default');
    });

    it('only passing audits with warnings show in warnings section', () => {
      const failingWarning = 'Failed and warned';
      const passingWarning = 'A passing warning';
      const category = {
        id: 'test',
        title: 'Test',
        score: 0,
        auditRefs: [{
          id: 'failing',
          result: {
            id: 'failing',
            title: 'Failing with warning',
            description: '',
            scoreDisplayMode: 'numeric',
            score: 0,
            warnings: [failingWarning],
          },
        }, {
          id: 'passing',
          result: {
            id: 'passing',
            title: 'Passing with warning',
            description: '',
            scoreDisplayMode: 'numeric',
            score: 1,
            warnings: [passingWarning],
          },
        }],
      };
      const categoryDOM = renderer.render(category);

      const shouldBeFailed = categoryDOM.querySelectorAll('.lh-clump--failed .lh-audit');
      assert.strictEqual(shouldBeFailed.length, 1);
      assert.strictEqual(shouldBeFailed[0].id, 'failing');
      assert.ok(shouldBeFailed[0].textContent.includes(failingWarning));

      const shouldBeWarning = categoryDOM.querySelectorAll('.lh-clump--warning .lh-audit');
      assert.strictEqual(shouldBeWarning.length, 1);
      assert.strictEqual(shouldBeWarning[0].id, 'passing');
      assert.ok(shouldBeWarning[0].textContent.includes(passingWarning));
    });
  });

  it('can set a custom templateContext', () => {
    assert.equal(renderer.templateContext, renderer.dom.document());

    const dom = new jsdom.JSDOM(TEMPLATE_FILE);
    const otherDocument = dom.window.document;
    renderer.setTemplateContext(otherDocument);
    assert.equal(renderer.templateContext, otherDocument);
  });
});
