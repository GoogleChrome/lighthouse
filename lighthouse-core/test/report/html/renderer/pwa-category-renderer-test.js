/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
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
const CategoryRenderer = require('../../../../report/html/renderer/category-renderer.js');
const sampleResultsOrig = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');

describe('PwaCategoryRenderer', () => {
  let category;
  let pwaRenderer;
  let sampleResults;

  beforeAll(() => {
    global.Util = Util;
    global.Util.i18n = new I18n('en', {...Util.UIStrings});
    global.CategoryRenderer = CategoryRenderer;

    const PwaCategoryRenderer =
        require('../../../../report/html/renderer/pwa-category-renderer.js');

    const {document} = new jsdom.JSDOM(TEMPLATE_FILE).window;
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    pwaRenderer = new PwaCategoryRenderer(dom, detailsRenderer);

    sampleResults = Util.prepareReportResult(sampleResultsOrig);
  });

  beforeEach(() => {
    // Clone category to allow modifications.
    const pwaCategory = sampleResults.categories.pwa;
    category = JSON.parse(JSON.stringify(pwaCategory));
  });

  afterAll(() => {
    global.Util.i18n = undefined;
    global.Util = undefined;
    global.CategoryRenderer = undefined;
  });

  it('renders the regular audits', () => {
    const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);
    const allAuditElements = Array.from(categoryElem.querySelectorAll('.lh-audit'));
    const manualElements = Array.from(categoryElem.querySelectorAll('.lh-clump--manual .lh-audit'));
    const regularAuditElements = allAuditElements.filter(el => !manualElements.includes(el));

    const nonManualAudits = category.auditRefs
      .filter(audit => audit.result.scoreDisplayMode !== 'manual');

    assert.strictEqual(regularAuditElements.length, nonManualAudits.length);
  });

  it('renders the manual audits', () => {
    const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);
    const manualElements = categoryElem.querySelectorAll('.lh-clump--manual .lh-audit');

    const manualAudits = category.auditRefs
      .filter(audit => audit.result.scoreDisplayMode === 'manual');

    assert.strictEqual(manualElements.length, manualAudits.length);
  });

  it('manual audits are the only clump', () => {
    const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);
    const clumpElems = categoryElem.querySelectorAll('.lh-clump');
    assert.strictEqual(clumpElems.length, 1);
    assert.ok(clumpElems[0].classList.contains('lh-clump--manual'));
  });

  it('renders the audit groups', () => {
    const categoryGroupIds = new Set(category.auditRefs.filter(a => a.group).map(a => a.group));
    assert.strictEqual(categoryGroupIds.size, 3); // Ensure there's something to test.

    const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);

    categoryGroupIds.forEach(groupId => {
      const selector = `.lh-audit-group--${groupId}`;
      // Expected that only the non-manual audits will be grouped.
      assert.strictEqual(categoryElem.querySelectorAll(selector).length, 1,
        `trouble with selector '${selector}'`);
    });
  });

  describe('badging groups', () => {
    let auditRefs;
    let groupIds;

    beforeEach(() => {
      auditRefs = category.auditRefs
        .filter(audit => audit.result.scoreDisplayMode !== 'manual');

      // Expect results to all be scorable.
      for (const auditRef of auditRefs) {
        assert.strictEqual(auditRef.result.scoreDisplayMode, 'binary');
      }

      groupIds = [...new Set(auditRefs.map(ref => ref.group))];
    });

    it('only gives a group a badge when all the group\'s audits are passing', () => {
      for (const auditRef of auditRefs) {
        auditRef.result.score = 0;
      }

      const targetGroupId = groupIds[2];
      assert.ok(targetGroupId);
      const targetGroupTitle = sampleResults.categoryGroups[targetGroupId].title;
      const targetAuditRefs = auditRefs.filter(ref => ref.group === targetGroupId);

      // Try every permutation of audit scoring.
      const totalPermutations = Math.pow(2, targetAuditRefs.length);
      for (let i = 0; i < totalPermutations; i++) {
        for (let j = 0; j < targetAuditRefs.length; j++) {
          // Set as passing if jth bit in i is set.
          targetAuditRefs[j].result.score = i >> j & 1;
        }

        const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);
        const badgedElems = categoryElem.querySelectorAll(`.lh-badged`);
        const badgedScoreGauge =
          categoryElem.querySelector('.lh-gauge--pwa__wrapper[class*="lh-badged--"]');

        const tooltip = categoryElem.querySelector('.lh-gauge--pwa__wrapper').title;
        const targetGroupTip = tooltip.split(', ').find(tip => tip.startsWith(targetGroupTitle));
        assert.ok(targetGroupTip);

        // Only expect a badge (and badged gauge) on last permutation (all bits are set).
        if (i !== totalPermutations - 1) {
          assert.strictEqual(badgedElems.length, 0);
          assert.strictEqual(badgedScoreGauge, null);

          // Tooltip ends with passing/total.
          const passingCount = categoryElem.querySelectorAll(
              `.lh-audit-group--${targetGroupId} .lh-audit--pass`).length;
          assert.ok(targetGroupTip.endsWith(`${passingCount}/${targetAuditRefs.length}`));
        } else {
          assert.strictEqual(badgedElems.length, 1);
          assert.ok(badgedScoreGauge.classList.contains(`lh-badged--${targetGroupId}`));

          // Tooltip ends with total/total.
          assert.ok(targetGroupTip.endsWith(`${targetAuditRefs.length}/${targetAuditRefs.length}`));
        }
      }
    });

    it('renders all badges when all audits are passing', () => {
      for (const auditRef of auditRefs) {
        auditRef.result.score = 1;
      }

      const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);
      assert.strictEqual(categoryElem.querySelectorAll('.lh-badged').length, groupIds.length);

      // Score gauge.
      const gaugeElem = categoryElem.querySelector('.lh-gauge--pwa__wrapper');
      assert.ok(gaugeElem.classList.contains('lh-badged--all'));

      // All tooltips should have x/x audits passed.
      const tips = gaugeElem.title.split(', ');
      assert.strictEqual(tips.length, groupIds.length);
      for (const tip of tips) {
        assert.ok(/(\d+)\/\1$/.test(tip));
      }
    });

    it('renders no badges when no audit groups are passing', () => {
      for (const auditRef of auditRefs) {
        auditRef.result.score = 0;
      }

      const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);
      assert.strictEqual(categoryElem.querySelectorAll('.lh-badged').length, 0);

      // Score gauge.
      const gaugeElem = categoryElem.querySelector('.lh-gauge--pwa__wrapper');
      assert.ok(!gaugeElem.matches('.lh-gauge--pwa__wrapper[class*="lh-badged-"]'));

      // All tooltips should have 0/x audits passed.
      const tips = gaugeElem.title.split(', ');
      assert.strictEqual(tips.length, groupIds.length);
      for (const tip of tips) {
        assert.ok(/0\/\d+$/.test(tip));
      }
    });

    it('renders all but one badge when all groups but one are passing', () => {
      for (const auditRef of auditRefs) {
        auditRef.result.score = 1;
      }
      auditRefs[0].result.score = 0;
      const failingGroupId = auditRefs[0].group;

      const categoryElem = pwaRenderer.render(category, sampleResults.categoryGroups);
      const gaugeElem = categoryElem.querySelector('.lh-gauge--pwa__wrapper');

      const tips = gaugeElem.title.split(', ');
      assert.strictEqual(tips.length, groupIds.length);

      for (const groupId of groupIds) {
        const expectedCount = groupId === failingGroupId ? 0 : 1;

        // Individual group badges.
        const groupElems = categoryElem.querySelectorAll(`.lh-audit-group--${groupId}.lh-badged`);
        assert.strictEqual(groupElems.length, expectedCount);

        // Score gauge.
        if (groupId !== failingGroupId) {
          assert.ok(gaugeElem.classList.contains(`lh-badged--${groupId}`));
        }

        // Map back from groupId to groupTitle (used in tooltip).
        const groupTitle = sampleResults.categoryGroups[groupId].title;
        const groupTip = tips.find(tip => tip.startsWith(groupTitle));
        assert.ok(groupTip);

        // All tooltips should be x/x except for failingGroup, which should be (x-1)/x.
        if (groupId !== failingGroupId) {
          assert.ok(/(\d+)\/\1$/.test(groupTip));
        } else {
          const [, passingCount, totalCount] = /(\d+)\/(\d+)$/.exec(groupTip);
          assert.strictEqual(Number(passingCount) + 1, Number(totalCount));
        }
      }
    });
  });

  describe('#renderScoreGauge', () => {
    it('renders an error score gauge in case of category error', () => {
      category.score = null;
      const badgeGauge = pwaRenderer.renderScoreGauge(category, sampleResults.categoryGroups);

      // Not a PWA gauge.
      assert.strictEqual(badgeGauge.querySelector('.lh-gauge--pwa__wrapper'), null);

      const percentageElem = badgeGauge.querySelector('.lh-gauge__percentage');
      assert.strictEqual(percentageElem.textContent, '?');
      assert.strictEqual(percentageElem.title, Util.UIStrings.errorLabel);
    });

    it('renders score gauges with unique ids for items in <defs>', () => {
      const gauge1 = pwaRenderer.renderScoreGauge(category, sampleResults.categoryGroups);
      const gauge1Ids = [...gauge1.querySelectorAll('defs [id]')].map(el => el.id);
      assert.ok(gauge1Ids.length > 3);

      const gauge2 = pwaRenderer.renderScoreGauge(category, sampleResults.categoryGroups);
      const gauge2Ids = [...gauge2.querySelectorAll('defs [id]')].map(el => el.id);
      assert.ok(gauge2Ids.length === gauge1Ids.length);

      /** Returns whether id is used by at least one <use> or fill under `rootEl`. */
      function idInUseElOrFillAttr(rootEl, id) {
        const isUse = rootEl.querySelector(`use[href="#${id}"]`);
        const isFill = rootEl.querySelector(`[fill="url(#${id})"]`);

        return !!(isUse || isFill);
      }

      // Check that each gauge1 ID is actually used in gauge1 and isn't used in gauge2.
      for (const gauge1Id of gauge1Ids) {
        assert.equal(idInUseElOrFillAttr(gauge1, gauge1Id), true);
        assert.ok(!gauge2Ids.includes(gauge1Id));
        assert.equal(idInUseElOrFillAttr(gauge2, gauge1Id), false);
      }

      // And that the reverse is true for gauge2 IDs.
      for (const gauge2Id of gauge2Ids) {
        assert.equal(idInUseElOrFillAttr(gauge1, gauge2Id), false);
        assert.equal(idInUseElOrFillAttr(gauge2, gauge2Id), true);
        assert.ok(!gauge1Ids.includes(gauge2Id));
      }
    });
  });
});
