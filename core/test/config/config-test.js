/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';

import {Audit as BaseAudit} from '../../audits/audit.js';
import BaseGatherer from '../../gather/base-gatherer.js';
import {initializeConfig, getConfigDisplayString} from '../../config/config.js';
import {LH_ROOT} from '../../../shared/root.js';
import * as format from '../../../shared/localization/format.js';
import defaultConfig from '../../config/default-config.js';
import {nonSimulatedSettingsOverrides} from '../../config/constants.js';

describe('Config', () => {
  /** @type {LH.Gatherer.GatherMode} */
  let gatherMode = 'snapshot';

  beforeEach(() => {
    gatherMode = 'snapshot';
  });

  it('should throw if the resolvedConfig path is not absolute', async () => {
    await expect(initializeConfig(gatherMode, undefined, {configPath: '../relative/path'}))
      .rejects.toThrow(/must be an absolute path/);
  });

  it('should not mutate the original input', async () => {
    const config = {artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]};
    const {resolvedConfig} = await initializeConfig(gatherMode, config);
    expect(config).toEqual({artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]});
    expect(resolvedConfig).not.toBe(config);
    expect(resolvedConfig).not.toEqual(config);
    expect(resolvedConfig.artifacts).toMatchObject([{gatherer: {path: 'accessibility'}}]);
  });

  it('should use default resolvedConfig when none passed in', async () => {
    const {resolvedConfig} = await initializeConfig(gatherMode);
    expect(resolvedConfig.settings).toMatchObject({formFactor: 'mobile'});
    if (!resolvedConfig.audits) throw new Error('Did not define audits');
    expect(resolvedConfig.audits.length).toBeGreaterThan(0);
  });

  it('should resolve settings with defaults', async () => {
    /** @type {LH.Config} */
    const config = {
      extends: 'lighthouse:default',
      settings: {output: 'csv', maxWaitForFcp: 1234},
    };
    const {resolvedConfig} = await initializeConfig(
      gatherMode,
      config,
      {maxWaitForFcp: 12345}
    );

    expect(resolvedConfig.settings).toMatchObject({
      formFactor: 'mobile', // inherit from default
      output: 'csv', // config-specific overrides
      maxWaitForFcp: 12345, // explicit overrides
    });
  });

  it('should override throttlingMethod in timespan mode', async () => {
    const {resolvedConfig} = await initializeConfig(
      'timespan',
      undefined,
      {throttlingMethod: 'simulate'}
    );

    expect(resolvedConfig.settings).toMatchObject({
      throttlingMethod: 'devtools',
    });
  });

  it('should ensure minimum quiet thresholds when throttlingMethod is devtools', async () => {
    gatherMode = 'navigation';
    const config = {
      settings: {
        cpuQuietThresholdMs: 10_000,
      },
      artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}],
    };

    const {resolvedConfig} = await initializeConfig(gatherMode, config, {
      throttlingMethod: 'devtools',
    });

    expect(resolvedConfig.settings).toMatchObject({
      cpuQuietThresholdMs: 10_000,
      pauseAfterFcpMs: nonSimulatedSettingsOverrides.pauseAfterFcpMs,
      pauseAfterLoadMs: nonSimulatedSettingsOverrides.pauseAfterLoadMs,
      networkQuietThresholdMs: nonSimulatedSettingsOverrides.networkQuietThresholdMs,
    });
  });

  it('should resolve artifact definitions', async () => {
    const config = {artifacts: [{id: 'Accessibility', gatherer: 'accessibility'}]};
    const {resolvedConfig} = await initializeConfig(gatherMode, config);

    expect(resolvedConfig).toMatchObject({
      artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
    });
  });

  it('should throw on invalid artifact definitions', async () => {
    const badGatherer = new BaseGatherer();
    badGatherer.getArtifact = jestMock.fn();
    const config = {artifacts: [{id: 'BadGatherer', gatherer: {instance: badGatherer}}]};
    await expect(initializeConfig(gatherMode, config)).rejects.toThrow(/Gatherer for BadGather/);
  });

  it('should filter configuration by gatherMode', async () => {
    const timespanGatherer = new BaseGatherer();
    timespanGatherer.getArtifact = jestMock.fn();
    timespanGatherer.meta = {supportedModes: ['timespan']};

    const config = {
      artifacts: [
        {id: 'Accessibility', gatherer: 'accessibility'},
        {id: 'Timespan', gatherer: {instance: timespanGatherer}},
      ],
    };

    const {resolvedConfig} = await initializeConfig('snapshot', config);
    expect(resolvedConfig).toMatchObject({
      artifacts: [{id: 'Accessibility', gatherer: {path: 'accessibility'}}],
    });
  });

  it('should filter configuration by only/skip filters', async () => {
    const {resolvedConfig} = await initializeConfig('navigation', undefined, {
      onlyAudits: ['color-contrast'],
      onlyCategories: ['seo'],
      skipAudits: ['structured-data', 'robots-txt', 'largest-contentful-paint'],
    });

    const auditIds = (resolvedConfig.audits || []).map(audit => audit.implementation.meta.id);
    expect(auditIds).toContain('color-contrast'); // from onlyAudits
    expect(auditIds).toContain('document-title'); // from onlyCategories
    expect(auditIds).not.toContain('first-contentful-paint'); // from onlyCategories
    expect(auditIds).not.toContain('robots-txt'); // from skipAudits
  });

  it('should support plugins', async () => {
    const {resolvedConfig} = await initializeConfig('navigation', undefined, {
      configPath: `${LH_ROOT}/core/test/fixtures/config-plugins/`,
      plugins: ['lighthouse-plugin-simple'],
    });

    expect(resolvedConfig).toMatchObject({
      categories: {
        'lighthouse-plugin-simple': {title: 'Simple'},
      },
      groups: {
        'lighthouse-plugin-simple-new-group': {title: 'New Group'},
      },
    });
  });

  it('is idempotent when using the resolved config as the config input', async () => {
    const config = {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['seo'],
      },
    };

    const {resolvedConfig} = await initializeConfig('navigation', config);
    expect(Object.keys(resolvedConfig.categories || {})).toEqual(['seo']);
    expect(resolvedConfig.settings.onlyCategories).toEqual(['seo']);

    const {resolvedConfig: resolvedConfig2} = await initializeConfig('navigation', resolvedConfig);
    expect(resolvedConfig2).toEqual(resolvedConfig);
  });

  describe('resolveArtifactDependencies', () => {
    /** @type {LH.Gatherer.GathererInstance} */
    let dependencyGatherer;
    /** @type {LH.Gatherer.GathererInstance<'ImageElements'>} */
    let dependentGatherer;
    /** @type {LH.Config} */
    let config;

    beforeEach(() => {
      const dependencySymbol = Symbol('dependency');
      dependencyGatherer = new BaseGatherer();
      dependencyGatherer.getArtifact = jestMock.fn();
      dependencyGatherer.meta = {symbol: dependencySymbol, supportedModes: ['snapshot']};
      // @ts-expect-error - we satisfy the interface on the next line
      dependentGatherer = new BaseGatherer();
      dependentGatherer.getArtifact = jestMock.fn();
      dependentGatherer.meta = {
        supportedModes: ['snapshot'],
        dependencies: {ImageElements: dependencySymbol},
      };

      config = {
        artifacts: [
          {id: 'Dependency', gatherer: {instance: dependencyGatherer}},
          {id: 'Dependent', gatherer: {instance: dependentGatherer}},
        ],
      };
    });

    it('should resolve artifact dependencies', async () => {
      const {resolvedConfig} = await initializeConfig('snapshot', config);
      expect(resolvedConfig).toMatchObject({
        artifacts: [
          {id: 'Dependency', gatherer: {instance: dependencyGatherer}},
          {
            id: 'Dependent',
            gatherer: {
              instance: dependentGatherer,
            },
            dependencies: {
              ImageElements: {id: 'Dependency'},
            },
          },
        ],
      });
    });

    it('should throw when dependencies are out of order in artifacts', async () => {
      if (!config.artifacts) throw new Error('Failed to run beforeEach');
      config.artifacts = [config.artifacts[1], config.artifacts[0]];
      await expect(initializeConfig('snapshot', config))
        .rejects.toThrow(/Failed to find dependency/);
    });

    it('should throw when timespan needs snapshot', async () => {
      dependentGatherer.meta.supportedModes = ['timespan'];
      dependencyGatherer.meta.supportedModes = ['snapshot'];
      await expect(initializeConfig('navigation', config))
        .rejects.toThrow(/Dependency.*is invalid/);
    });

    it('should throw when timespan needs navigation', async () => {
      dependentGatherer.meta.supportedModes = ['timespan'];
      dependencyGatherer.meta.supportedModes = ['navigation'];
      await expect(initializeConfig('navigation', config))
        .rejects.toThrow(/Dependency.*is invalid/);
    });
  });

  describe('.resolveExtensions', () => {
    /** @type {LH.Config} */
    let extensionConfig;

    beforeEach(() => {
      const gatherer = new BaseGatherer();
      gatherer.getArtifact = jestMock.fn();
      gatherer.meta = {supportedModes: ['navigation']};

      class ExtraAudit extends BaseAudit {
        static get meta() {
          return {
            id: 'extra-audit',
            title: 'Extra',
            failureTitle: 'Extra',
            description: 'Extra',
            requiredArtifacts: /** @type {*} */ (['ExtraArtifact']),
          };
        }

        /** @return {LH.Audit.Product} */
        static audit() {
          throw new Error('Unimplemented');
        }
      }

      extensionConfig = {
        extends: 'lighthouse:default',
        artifacts: [
          {id: 'ExtraArtifact', gatherer: {instance: gatherer}},
        ],
        audits: [
          {implementation: ExtraAudit},
        ],
        categories: {
          performance: {
            title: 'Performance',
            auditRefs: [
              {id: 'extra-audit', weight: 0},
            ],
          },
        },
      };
    });

    it('should do nothing when not extending', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', {
        artifacts: [
          {id: 'Accessibility', gatherer: 'accessibility'},
        ],
      });

      expect(resolvedConfig).toMatchObject({
        audits: null,
        groups: null,
        artifacts: [
          {id: 'Accessibility'},
        ],
      });
    });

    it('should extend the default resolvedConfig with filters', async () => {
      const gatherMode = 'navigation';
      const {resolvedConfig} = await initializeConfig(gatherMode, {
        extends: 'lighthouse:default',
        settings: {onlyCategories: ['accessibility']},
      });
      if (!resolvedConfig.artifacts) throw new Error(`No artifacts created`);
      if (!resolvedConfig.audits) throw new Error(`No audits created`);

      const hasAccessibilityArtifact = resolvedConfig.artifacts.some(a => a.id === 'Accessibility');
      if (!hasAccessibilityArtifact) expect(resolvedConfig.artifacts).toContain('Accessibility');

      const hasAccessibilityAudit = resolvedConfig.audits.
        some(a => a.implementation.meta.id === 'color-contrast');
      if (!hasAccessibilityAudit) expect(resolvedConfig.audits).toContain('color-contrast');

      expect(resolvedConfig.categories).toHaveProperty('accessibility');
      expect(resolvedConfig.categories).not.toHaveProperty('performance');
    });

    it('should merge in artifacts', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', extensionConfig);
      if (!resolvedConfig.artifacts) throw new Error(`No artifacts created`);

      const hasExtraArtifact = resolvedConfig.artifacts.some(a => a.id === 'ExtraArtifact');
      if (!hasExtraArtifact) expect(resolvedConfig.artifacts).toContain('ExtraArtifact');
    });

    it('should sort artifacts by internal priority', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', extensionConfig);
      if (!resolvedConfig.artifacts) throw new Error(`No artifacts created`);

      const last5 = resolvedConfig.artifacts.reverse().slice(0, 5).map(a => a.id);
      expect(last5).toEqual([
        'BFCacheFailures', // Has internal priority of 1
        'FullPageScreenshot', // Has internal priority of 1
        'ExtraArtifact', // Has default priority of 0
        'traces', // Has default priority of 0
        'devtoolsLogs', // Has default priority of 0
      ]);
    });

    it('should merge in audits', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', extensionConfig);
      if (!resolvedConfig.audits) throw new Error(`No audits created`);

      const hasExtraAudit = resolvedConfig.audits.
        some(a => a.implementation.meta.id === 'extra-audit');
      if (!hasExtraAudit) expect(resolvedConfig.audits).toContain('extra-audit');
    });

    it('should merge in categories', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', extensionConfig);
      if (!resolvedConfig.categories) throw new Error(`No categories created`);

      const hasCategory =
        resolvedConfig.categories.performance.auditRefs.some(a => a.id === 'extra-audit');
      if (!hasCategory) {
        expect(resolvedConfig.categories.performance.auditRefs).toContain('extra-audit');
      }
    });

    it('should only accept "lighthouse:default" as the extension method', async () => {
      extensionConfig.extends = 'something:else';
      const resolvedConfigPromise = initializeConfig('navigation', extensionConfig);
      await expect(resolvedConfigPromise).rejects.toThrow(/`lighthouse:default` is the only valid/);
    });
  });

  it('should validate the resolvedConfig with fatal errors', async () => {
    /** @type {LH.Config} */
    const extensionConfig = {
      extends: 'lighthouse:default',
      artifacts: [{id: 'artifact', gatherer: {instance: new BaseGatherer()}}],
    };

    await expect(initializeConfig('navigation', extensionConfig)).rejects
      .toThrow(/did not support any gather modes/);
  });
});

describe('getConfigDisplayString', () => {
  it('doesn\'t include empty audit options in output', async () => {
    const aOpt = 'auditOption';
    const config = {
      extends: 'lighthouse:default',
      passes: [{
        passName: 'defaultPass',
        gatherers: [
          {path: 'scripts'},
        ],
      }],
      audits: [
        // `options` merged into default `metrics` audit.
        {path: 'metrics', options: {aOpt}},
      ],
    };

    const {resolvedConfig} = await initializeConfig('navigation', config);
    const printed = getConfigDisplayString(resolvedConfig);
    const printedConfig = JSON.parse(printed);

    // Check that options weren't completely eliminated.
    const metricsAudit = printedConfig.audits.find(/** @param {any} a */ a => a.path === 'metrics');
    expect(metricsAudit.options.aOpt).toEqual(aOpt);

    for (const audit of printedConfig.audits) {
      if (audit.options) {
        expect(audit.options).not.toEqual({});
      }
    }
  });

  it('returns localized category titles', async () => {
    const {resolvedConfig} = await initializeConfig('navigation');
    const printed = getConfigDisplayString(resolvedConfig);
    const printedConfig = JSON.parse(printed);
    let localizableCount = 0;

    for (const [printedCategoryId, printedCategory] of Object.entries(printedConfig.categories)) {
      if (!defaultConfig.categories) throw new Error('Default config will have categories');
      if (!defaultConfig.settings?.locale) throw new Error('Default config will have a locale');
      const origTitle = defaultConfig.categories[printedCategoryId].title;
      if (format.isIcuMessage(origTitle)) localizableCount++;
      const i18nOrigTitle = format.getFormatted(origTitle, defaultConfig.settings.locale);

      expect(printedCategory.title).toStrictEqual(i18nOrigTitle);
    }

    // Should have localized at least one string.
    expect(localizableCount).toBeGreaterThan(0);
  });

  it('returns a valid config that can make an identical Config', async () => {
    // depends on defaultConfig having a `path` for all gatherers and audits.
    const {resolvedConfig: firstConfig} = await initializeConfig('navigation');
    const firstPrint = getConfigDisplayString(firstConfig);

    const {resolvedConfig: secondConfig} =
      await initializeConfig('navigation', JSON.parse(firstPrint));
    const secondPrint = getConfigDisplayString(secondConfig);

    expect(firstPrint).toEqual(secondPrint);
  });
});
