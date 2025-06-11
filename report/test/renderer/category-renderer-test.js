/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import jsdom from 'jsdom';

import {ReportUtils} from '../../renderer/report-utils.js';
import {I18nFormatter} from '../../renderer/i18n-formatter.js';
import {DOM} from '../../renderer/dom.js';
import {DetailsRenderer} from '../../renderer/details-renderer.js';
import {CategoryRenderer} from '../../renderer/category-renderer.js';
import {readJson} from '../../../core/test/test-utils.js';
import {Globals} from '../../renderer/report-globals.js';

const sampleResultsOrig = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('CategoryRenderer', () => {
  let renderer;
  let sampleResults;

  before(() => {
    Globals.apply({
      providedStrings: {},
      i18n: new I18nFormatter('en'),
      reportJson: null,
    });

    const window = new jsdom.JSDOM().window;
    const document = window.document;
    global.HTMLElement = window.HTMLElement;

    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new CategoryRenderer(dom, detailsRenderer);

    sampleResults = ReportUtils.prepareReportResult(sampleResultsOrig);
  });

  after(() => {
    Globals.i18n = undefined;
  });

  it('renders an audit', () => {
    const auditRef = sampleResults.categories.performance.auditRefs
      .find(a => a.id === 'largest-contentful-paint');

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
    const category = sampleResults.categories.seo;
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
    const category = sampleResults.categories.seo;
    const prevDesc = category.description;
    category.description += ' [link text](http://example.com).';
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const description = categoryDOM.querySelector('.lh-category-header__description');
    assert.ok(description.querySelector('a'), 'description contains converted markdown links');
    category.description = prevDesc;
  });

  it('renders manual audits if the category contains them', () => {
    const category = sampleResults.categories.seo;
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    assert.ok(categoryDOM.querySelector('.lh-clump--manual .lh-audit-group__summary'));
    assert.equal(categoryDOM.querySelectorAll('.lh-audit--manual').length, 1,
        'score shows informative and dash icon');

    assert.ok(category.manualDescription);
    const description = categoryDOM.querySelector('.lh-clump--manual').closest('.lh-audit-group')
      .querySelector('.lh-audit-group__description').textContent;
    // may need to be adjusted if description includes a link at the beginning
    assert.ok(description.startsWith(category.manualDescription.substring(0, 20)),
        'no manual description');
  });

  describe('categories with not applicable audits', () => {
    let a11yCategory;

    beforeEach(()=> {
      a11yCategory = JSON.parse(JSON.stringify(sampleResults.categories.accessibility));
    });

    it('renders not applicable audits if the category contains them', () => {
      const categoryDOM = renderer.render(a11yCategory, sampleResults.categoryGroups);
      assert.ok(categoryDOM.querySelector(
        '.lh-clump--notapplicable .lh-audit-group__summary'));

      const notApplicableAudits = a11yCategory.auditRefs.filter(audit => {
        return audit.result.scoreDisplayMode === 'notApplicable' && audit.group !== 'hidden';
      });
      assert.equal(
        categoryDOM.querySelectorAll('.lh-clump--notapplicable .lh-audit').length,
        notApplicableAudits.length
      );
    });

    it('does not render a not applicable section if the category does not contain them', () => {
      const category = sampleResults.categories['best-practices'];
      const bestPracticeCat = {
        ...category,
        auditRefs: category.auditRefs
          .filter(ref => ref.result.scoreDisplayMode !== 'notApplicable'),
      };
      const categoryDOM2 = renderer.render(bestPracticeCat, sampleResults.categoryGroups);
      assert.ok(!categoryDOM2.querySelector('.lh-clump--notapplicable'));
    });

    it('renders a dash score if the category contains 0 applicable audits', () => {
      for (const auditRef of a11yCategory.auditRefs) {
        auditRef.result.scoreDisplayMode = 'notApplicable';
      }

      const categoryDOM = renderer.render(a11yCategory, sampleResults.categoryGroups);
      const percentageEl = categoryDOM.querySelectorAll('[title="Not applicable"]');

      assert.equal(percentageEl[0].textContent, '-', 'score shows a dash');
    });

    it('renders a non-dash score if the category contains at least 1 applicable audit', () => {
      for (const auditRef of a11yCategory.auditRefs) {
        auditRef.result.scoreDisplayMode = 'notApplicable';
      }
      a11yCategory.auditRefs[0].result.scoreDisplayMode = 'numeric';

      const categoryDOM = renderer.render(a11yCategory, sampleResults.categoryGroups);
      const percentageEl = categoryDOM.querySelectorAll('.lh-gauge__percentage');

      const scoreText = percentageEl[0].textContent;
      assert(!scoreText.includes('.'), 'score is integer');
      assert(Number(scoreText) >= 0 && Number(scoreText) <= 100, 'score is 0-100');
    });
  });

  describe('category with groups', () => {
    let category;

    beforeEach(() => {
      category = sampleResults.categories.accessibility;
    });

    it('renders the category header', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

      const gauge = categoryDOM.querySelector('.lh-gauge__percentage');
      const scoreText = gauge.textContent.trim();
      assert(!scoreText.includes('.'), 'score is integer');
      assert(Number(scoreText) >= 0 && Number(scoreText) <= 100, 'score is 0-100');

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

    it('renders the category header with fraction', () => {
      const categoryDOM = renderer.render(
        category,
        sampleResults.categoryGroups,
        {gatherMode: 'snapshot'}
      );

      const gauge = categoryDOM.querySelector('.lh-fraction__content');
      assert.equal(gauge.textContent.trim(), '16/21', 'fraction is included');

      const score = categoryDOM.querySelector('.lh-category-header');
      const title = score.querySelector('.lh-fraction__label');
      const description = score.querySelector('.lh-category-header__description');

      assert.deepEqual(score, score.firstElementChild, 'first child is a score');
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
      const groupNames = Array.from(
        new Set(auditRefs.map(ref => ref.group))).filter(n => Boolean(n) && n !== 'hidden');
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
          audit.result.scoreDisplayMode !== 'notApplicable' &&
          audit.group !== 'hidden' &&
          audit.result.score === 1);

      const passedAuditGroups = categoryDOM.querySelectorAll('.lh-clump--passed .lh-audit-group');
      const passedAuditsElems = categoryDOM.querySelectorAll('.lh-clump--passed .lh-audit');

      assert.equal(passedAuditGroups.length, 0);
      assert.equal(passedAuditsElems.length, passedAudits.length);
    });

    it('renders all the audits', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const auditsElements = categoryDOM.querySelectorAll('.lh-audit');
      const visibleAudits = category.auditRefs.filter(a => a.group !== 'hidden');
      assert.equal(auditsElements.length, visibleAudits.length);
    });

    it('renders audits without a group before grouped ones', () => {
      const categoryClone = JSON.parse(JSON.stringify(category));

      // Remove groups from some audits.
      const ungroupedAudits = ['image-alt', 'link-name'];
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
        if (groupId !== 'hidden') {
          assert.equal(categoryElem.querySelectorAll(selector).length, 1,
            `could not find '${selector}'`);
        }
      });
    });
  });

  describe('clumping passed/failed/warning/manual', () => {
    it('separates audits in the DOM', () => {
      const category = sampleResults.categories.seo;
      const categoryClone = JSON.parse(JSON.stringify(category));
      // Give the first two passing grades warnings
      const passingRefs = categoryClone.auditRefs.filter(ref => ref.result.score === 1);
      passingRefs[0].result.warnings = ['Some warning'];
      passingRefs[1].result.warnings = ['Some warning'];
      // Make one audit n/a
      const audit = categoryClone.auditRefs.find(ref => ref.id === 'is-crawlable');
      audit.result.scoreDisplayMode = 'notApplicable';
      audit.result.score = null;

      const elem = renderer.render(categoryClone, sampleResults.categoryGroups);
      const passedAudits = elem.querySelectorAll('.lh-clump--passed .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-clump--failed .lh-audit');
      const warningAudits = elem.querySelectorAll('.lh-clump--warning .lh-audit');
      const manualAudits = elem.querySelectorAll('.lh-clump--manual .lh-audit');
      const naAudits = elem.querySelectorAll('.lh-clump--notapplicable .lh-audit');

      assert.equal(passedAudits.length, 4);
      assert.equal(failedAudits.length, 3);
      assert.equal(warningAudits.length, 1);
      assert.equal(manualAudits.length, 1);
      assert.equal(naAudits.length, 2);

      const allAudits = elem.querySelectorAll('.lh-audit');
      // No unaccounted audits
      assert.equal(allAudits.length - passedAudits.length - failedAudits.length -
        warningAudits.length - manualAudits.length - naAudits.length, 0);
    });

    it('doesnt create a passed section if there were 0 passed', () => {
      const origCategory = sampleResults.categories.seo;
      const category = JSON.parse(JSON.stringify(origCategory));
      category.auditRefs.forEach(audit => audit.result.score = 0);
      const elem = renderer.render(category, sampleResults.categoryGroups);
      const passedAudits = elem.querySelectorAll('.lh-clump--passed .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-clump--failed .lh-audit');

      assert.equal(passedAudits.length, 0);
      assert.equal(failedAudits.length, 9);
    });

    it('expands warning audit group', () => {
      const category = sampleResults.categories.seo;
      const categoryClone = JSON.parse(JSON.stringify(category));
      const failingAudit = categoryClone.auditRefs.find(ref => ref.id === 'is-crawlable');
      failingAudit.result.warnings = ['Some warning'];

      const auditDOM = renderer.render(categoryClone, sampleResults.categoryGroups);
      const warningClumpEl = auditDOM.querySelector('.lh-clump--warning');
      const isExpanded = warningClumpEl.hasAttribute('open');
      assert.ok(isExpanded, 'Warning audit group should be expanded by default');
    });

    it('expands the manual audit group if there are 0 failing audits', () => {
      const category = sampleResults.categories.accessibility;
      const categoryClone = JSON.parse(JSON.stringify(category));
      categoryClone.auditRefs.filter(audit => audit.result.scoreDisplayMode === 'binary')
        .forEach(audit => audit.result.score = 1);

      const auditDOM = renderer.render(categoryClone, sampleResults.categoryGroups);
      const manualClumpEl = auditDOM.querySelector('.lh-clump--manual');
      const isExpanded = manualClumpEl.hasAttribute('open');
      assert.ok(isExpanded, 'Manual audit group should be expanded if there are 0 failing audits');
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

  describe('renderCategoryScore', () => {
    it('removes label if omitLabel is true', () => {
      const options = {omitLabel: true};
      const categoryScore = renderer.renderCategoryScore(
        sampleResults.categories.performance,
        {},
        options
      );
      const label = categoryScore.querySelector('.lh-gauge__label,.lh-fraction__label');
      assert.ok(!label);
    });

    it('uses custom callback if present', () => {
      const options = {
        onPageAnchorRendered: link => {
          link.href = '#index=0&anchor=performance';
        },
      };
      const categoryScore = renderer.renderCategoryScore(
        sampleResults.categories.performance,
        {},
        options
      );
      const link = categoryScore.querySelector('a');
      assert.equal(link.hash, '#index=0&anchor=performance');
    });
  });

  it('renders audits by weight', () => {
    const defaultAuditRef = {
      title: '',
      description: '',
      scoreDisplayMode: 'numeric',
      score: 0,
      warnings: [],
    };
    const category = {
      id: 'test',
      title: 'Test',
      score: 0,
      auditRefs: [{
        id: 'audit-1',
        weight: 0,
        result: {
          id: 'audit-1',
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-2',
        weight: 1,
        result: {
          id: 'audit-2',
          ...defaultAuditRef,
        },
      }, {
        id: 'audit-3',
        weight: 0.5,
        result: {
          id: 'audit-3',
          ...defaultAuditRef,
        },
      }],
    };
    const categoryDOM = renderer.render(category);

    const auditEls = [...categoryDOM.querySelectorAll('.lh-audit')];
    expect(auditEls.map(el => el.id)).toEqual(['audit-2', 'audit-3', 'audit-1']);
  });
});
