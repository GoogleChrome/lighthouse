/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {ReportUtils} from '../../renderer/report-utils.js';
import {I18nFormatter} from '../../renderer/i18n-formatter.js';
import {readJson} from '../../../core/test/test-utils.js';
import {Globals} from '../../renderer/report-globals.js';

const sampleResult = readJson('../../../core/test/results/sample_v2.json', import.meta);

describe('util helpers', () => {
  beforeEach(() => {
    Globals.apply({
      providedStrings: {},
      i18n: new I18nFormatter('en'),
      reportJson: null,
    });
  });

  afterEach(() => {
    Globals.i18n = undefined;
  });

  it('calculates a score ratings', () => {
    assert.equal(ReportUtils.calculateRating(0.0), 'fail');
    assert.equal(ReportUtils.calculateRating(0.10), 'fail');
    assert.equal(ReportUtils.calculateRating(0.45), 'fail');
    assert.equal(ReportUtils.calculateRating(0.5), 'average');
    assert.equal(ReportUtils.calculateRating(0.75), 'average');
    assert.equal(ReportUtils.calculateRating(0.80), 'average');
    assert.equal(ReportUtils.calculateRating(0.90), 'pass');
    assert.equal(ReportUtils.calculateRating(1.00), 'pass');
  });

  it('builds device emulation string', () => {
    const get = settings => ReportUtils.getEmulationDescriptions(settings).deviceEmulation;
    /* eslint-disable max-len */
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: false, mobile: true}}), 'Emulated Moto G Power');
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: true, mobile: true}}), 'No emulation');
    assert.equal(get({formFactor: 'mobile', screenEmulation: {disabled: true, mobile: true}, channel: 'devtools'}), 'Emulated Moto G Power');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: false, mobile: false}}), 'Emulated Desktop');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: true, mobile: false}}), 'No emulation');
    assert.equal(get({formFactor: 'desktop', screenEmulation: {disabled: true, mobile: true}, channel: 'devtools'}), 'Emulated Desktop');
    /* eslint-enable max-len */
  });

  it('builds throttling strings when provided', () => {
    const descriptions = ReportUtils.getEmulationDescriptions({
      throttlingMethod: 'provided',
      screenEmulation: {disabled: true},
    });
    assert.equal(descriptions.cpuThrottling, 'Provided by environment');
    assert.equal(descriptions.networkThrottling, 'Provided by environment');
    assert.equal(descriptions.screenEmulation, undefined);
  });

  it('builds throttling strings when devtools', () => {
    const descriptions = ReportUtils.getEmulationDescriptions({
      throttlingMethod: 'devtools',
      throttling: {
        cpuSlowdownMultiplier: 4.5,
        requestLatencyMs: 565,
        downloadThroughputKbps: 1400.00000000001,
        uploadThroughputKbps: 600,
      },
      screenEmulation: {disabled: true},
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '565\xa0ms HTTP RTT, 1,400\xa0kb/s down, 600\xa0kb/s up (DevTools)');
    assert.equal(descriptions.cpuThrottling, '4.5x slowdown (DevTools)');
  });

  it('builds throttling strings when simulate', () => {
    const descriptions = ReportUtils.getEmulationDescriptions({
      throttlingMethod: 'simulate',
      throttling: {
        cpuSlowdownMultiplier: 2,
        rttMs: 150,
        throughputKbps: 1600,
      },
      screenEmulation: {width: 100, height: 100, deviceScaleFactor: 2},
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '150\xa0ms TCP RTT, 1,600\xa0kb/s throughput (Simulated)');
    assert.equal(descriptions.cpuThrottling, '2x slowdown (Simulated)');
    assert.equal(descriptions.screenEmulation, '100x100, DPR 2');
  });

  describe('#prepareReportResult', () => {
    it('appends stack pack descriptions to auditRefs', () => {
      const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));
      const iconDataURL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
      clonedSampleResult.stackPacks = [{
        id: 'snackpack',
        title: 'SnackPack',
        iconDataURL,
        descriptions: {
          'unused-css-rules': 'Consider using snacks in packs.',
        },
      }];
      const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);

      const perfAuditRefs = preparedResult.categories.performance.auditRefs;
      const unusedCssRef = perfAuditRefs.find(ref => ref.id === 'unused-css-rules');
      assert.deepStrictEqual(unusedCssRef.stackPacks, [{
        title: 'SnackPack',
        iconDataURL,
        description: 'Consider using snacks in packs.',
      }]);

      // No stack pack on audit wth no stack pack.
      const interactiveRef = perfAuditRefs.find(ref => ref.id === 'interactive');
      assert.strictEqual(interactiveRef.stackPacks, undefined);
    });

    it('identifies entities on items of tables with urls', () => {
      const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

      const auditsWithTableDetails = Object.values(clonedSampleResult.audits)
        .filter(audit => audit.details?.type === 'table');
      assert.notEqual(auditsWithTableDetails.length, 0);

      // collect audit names that might have urls
      const auditsThatDontHaveUrls = ['bf-cache', 'font-size']; // no urls in data-set
      const auditsWithUrls = auditsWithTableDetails.filter(audit => {
        if (auditsThatDontHaveUrls.includes(audit.id)) return false;
        const urlFields = ['url', 'source-location'];
        return audit.details.headings.some(heading =>
          urlFields.includes(heading.valueType) ||
          urlFields.includes(heading.subItemsHeading?.valueType)
        );
      }).map(audit => audit.id);
      assert.notEqual(auditsWithUrls.length, 0);

      const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);

      // ensure each audit that had urls detected to have marked entities.
      for (const id of auditsWithUrls) {
        const foundEntities = preparedResult.audits[id].details.items.some(item => item.entity);
        assert.equal(foundEntities, true);
      }
    });

    it('identifies relevant metrics via metric savings', () => {
      const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

      const auditsWithMetricSavings = Object.values(clonedSampleResult.audits)
        .filter(audit => audit.metricSavings)
        .map(audit => audit.id);
      assert.notEqual(auditsWithMetricSavings.length, 0);

      const preparedResult = ReportUtils.prepareReportResult(clonedSampleResult);

      // ensure each audit that had urls detected to have marked entities.
      for (const auditRef of preparedResult.categories['performance'].auditRefs) {
        const metricSavingsKeys = Object.keys(auditRef.result.metricSavings || {})
          // INP is not on navigation reports, so its expected to be missing
          .filter(key => key !== 'INP');
        const relevantMetricKeys = auditRef.relevantMetrics?.map(a => a.acronym) || [];
        assert.deepStrictEqual(metricSavingsKeys.sort(), relevantMetricKeys.sort());
      }
    });
  });

  describe('#shouldDisplayAsFraction', () => {
    it('returns true for timespan and snapshot', () => {
      expect(ReportUtils.shouldDisplayAsFraction('navigation')).toEqual(false);
      expect(ReportUtils.shouldDisplayAsFraction('timespan')).toEqual(true);
      expect(ReportUtils.shouldDisplayAsFraction('snapshot')).toEqual(true);
      expect(ReportUtils.shouldDisplayAsFraction(undefined)).toEqual(false);
    });
  });

  describe('#calculateCategoryFraction', () => {
    it('returns passed audits and total audits', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 3, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 2, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 0, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'binary'}, group: 'metrics'},
        ],
      };
      const fraction = ReportUtils.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 4,
        numPassed: 3,
        numInformative: 0,
        totalWeight: 6,
      });
    });

    it('ignores manual audits, N/A audits, and hidden audits', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'hidden'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'manual'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'notApplicable'}, group: 'metrics'},
        ],
      };
      const fraction = ReportUtils.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 1,
        numPassed: 1,
        numInformative: 0,
        totalWeight: 1,
      });
    });

    it('tracks informative audits separately', () => {
      const category = {
        id: 'performance',
        auditRefs: [
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 1, result: {score: 1, scoreDisplayMode: 'binary'}, group: 'metrics'},
          {weight: 0, result: {score: 1, scoreDisplayMode: 'informative'}, group: 'metrics'},
          {weight: 1, result: {score: 0, scoreDisplayMode: 'informative'}, group: 'metrics'},
        ],
      };
      const fraction = ReportUtils.calculateCategoryFraction(category);
      expect(fraction).toEqual({
        numPassableAudits: 2,
        numPassed: 2,
        numInformative: 2,
        totalWeight: 2,
      });
    });
  });
});
