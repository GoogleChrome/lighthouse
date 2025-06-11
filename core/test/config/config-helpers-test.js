/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import {createRequire} from 'module';

import jestMock from 'jest-mock';

import {
  deepClone,
  deepCloneConfigJson,
  resolveSettings,
  resolveGathererToDefn,
  resolveAuditsToDefns,
  resolveModulePath,
  mergePlugins,
  mergeConfigFragment,
  mergeConfigFragmentArrayByKey,
} from '../../config/config-helpers.js';
import {Runner} from '../../runner.js';
import BaseGatherer from '../../gather/base-gatherer.js';
import ImageElementsGatherer from '../../gather/gatherers/image-elements.js';
import UserTimingsAudit from '../../audits/user-timings.js';
import {LH_ROOT} from '../../../shared/root.js';
import {getModuleDirectory} from '../../../shared/esm-utils.js';

const require = createRequire(import.meta.url);
const moduleDir = getModuleDirectory(import.meta);

const originalCwd = process.cwd;
after(() => {
  process.cwd = originalCwd;
});

describe('.mergeConfigFragment', () => {
  it('should merge properties in like Object.assign', () => {
    const base = {a: 1, b: 'yes', c: true};
    const extension = {a: 2, c: false, d: 123};
    const merged = mergeConfigFragment(base, extension);
    expect(merged).toBe(base);
    expect(merged).toEqual({a: 2, b: 'yes', c: false, d: 123});
  });

  it('should merge recursively', () => {
    const base = {foo: {bar: 1}};
    const extension = {foo: {baz: 2, bam: 3}};
    const merged = mergeConfigFragment(base, extension);
    expect(merged).toEqual({foo: {bar: 1, baz: 2, bam: 3}});
  });

  it('should not preserve null', () => {
    // It is unclear how important this behavior is, but the `null` issue has had subtle
    // importance in the config for many years at this point.
    const base = {foo: null};
    const extension = {foo: undefined};
    const merged = mergeConfigFragment(base, extension);
    expect(merged).toEqual({foo: undefined});
  });

  it('should concat arrays with deduplication', () => {
    const base = {arr: [{x: 1}, {y: 2}]};
    const extension = {arr: [{z: 3}, {x: 1}]};
    const merged = mergeConfigFragment(base, extension);
    expect(merged).toEqual({arr: [{x: 1}, {y: 2}, {z: 3}]});
  });

  it('should overwrite arrays when `overwriteArrays=true`', () => {
    const base = {arr: [{x: 1}, {y: 2}]};
    const extension = {arr: [{z: 3}, {x: 1}]};
    const merged = mergeConfigFragment(base, extension, true);
    expect(merged).toEqual({arr: [{z: 3}, {x: 1}]});
  });

  it('should special-case the `settings` key to enable `overwriteArrays`', () => {
    const base = {settings: {onlyAudits: ['none']}};
    const extension = {settings: {onlyAudits: ['user-timings']}};
    const merged = mergeConfigFragment(base, extension);
    expect(merged).toEqual({settings: {onlyAudits: ['user-timings']}});
  });

  it('should throw when merging incompatible types', () => {
    expect(() => mergeConfigFragment(123, {})).toThrow();
    expect(() => mergeConfigFragment('foo', {})).toThrow();
    expect(() => mergeConfigFragment(123, [])).toThrow();
    expect(() => mergeConfigFragment('foo', [])).toThrow();
    expect(() => mergeConfigFragment({}, [])).toThrow();
    expect(() => mergeConfigFragment([], {})).toThrow();
  });
});

describe('.mergeConfigFragmentArrayByKey', () => {
  it('should use mergeConfigFragment to merge items', () => {
    const base = [{a: 1, b: 'yes', c: true}];
    const extension = [{a: 2, c: false, d: 123}];
    const merged = mergeConfigFragmentArrayByKey(base, extension, () => 'key');
    expect(merged).toBe(base);
    expect(merged).toEqual([{a: 2, b: 'yes', c: false, d: 123}]);
  });

  it('should merge by the keyFn', () => {
    const base = [{id: 'a', value: 1}, {id: 'b', value: 2}];
    const extension = [{id: 'b', value: 1}, {id: 'a', value: 2}, {id: 'c'}];
    const merged = mergeConfigFragmentArrayByKey(base, extension, item => item.id);
    expect(merged).toEqual([{id: 'a', value: 2}, {id: 'b', value: 1}, {id: 'c'}]);
  });

  it('should merge recursively', () => {
    const base = [{foo: {bar: 1}}];
    const extension = [{foo: {baz: 2, bam: 3}}];
    const merged = mergeConfigFragmentArrayByKey(base, extension, () => 'key');
    expect(merged).toEqual([{foo: {bar: 1, baz: 2, bam: 3}}]);
  });

  it('should handle null items in base', () => {
    const base = [null];
    const extension = [{x: 1}];
    const merged = mergeConfigFragmentArrayByKey(base, extension, () => '');
    expect(merged).toEqual([{x: 1}]);
  });

  it('should handle undefined items in extension', () => {
    const base = [{x: 1}];
    const extension = [undefined];
    const merged = mergeConfigFragmentArrayByKey(base, extension, () => '');
    expect(merged).toEqual([undefined]);
  });
});

describe('.deepClone', () => {
  it('should clone things deeply', () => {
    const input = {a: {b: {c: 1}}};
    const output = deepClone(input);
    expect(output).not.toBe(input);
    expect(output).toEqual(input);
    output.a.b.c = 2;
    expect(input.a.b.c).toEqual(1);
  });
});

describe('.deepCloneConfigJson', () => {
  it('should clone a config deeply', () => {
    const TimingGatherer = new BaseGatherer();
    const input = {
      artifacts: [{id: 'Timing', gatherer: TimingGatherer}],
      audits: [{path: 'user-timings'}],
      categories: {random: {auditRefs: [{id: 'user-timings'}]}},
    };

    const output = deepCloneConfigJson(input);
    expect(output).not.toBe(input);
    expect(output).toEqual(input);
    output.artifacts[0].id = 'NewName';
    output.audits[0].path = 'new-audit';
    output.categories.random.auditRefs[0].id = 'new-audit';
    expect(input.artifacts[0].id).toEqual('Timing');
    expect(input.audits[0].path).toEqual('user-timings');
    expect(input.categories.random.auditRefs[0].id).toEqual('user-timings');
  });

  it('should preserve gatherer implementations in artifacts', () => {
    const TimingGatherer = new BaseGatherer();
    const input = {
      artifacts: [{id: 'Timing', gatherer: TimingGatherer}],
    };

    const output = deepCloneConfigJson(input);
    expect(output.artifacts[0].gatherer).toEqual(TimingGatherer);
  });

  it('should preserve audit implementations', () => {
    const input = {
      audits: [{implementation: UserTimingsAudit}],
    };

    const output = deepCloneConfigJson(input);
    expect(output.audits[0].implementation).toEqual(UserTimingsAudit);
  });
});

describe('.mergePlugins', () => {
  // Include a configPath flag so that config.js looks for the plugins in the fixtures dir.
  const configDir = `${LH_ROOT}/core/test/fixtures/config-plugins/`;

  it('merge plugins from the config', async () => {
    const config = {
      audits: ['installable-manifest', 'metrics'],
      plugins: ['lighthouse-plugin-simple'],
    };

    const mergedConfig = await mergePlugins(config, configDir, {});
    expect(mergedConfig).toMatchObject({
      audits: [
        'installable-manifest',
        'metrics',
        {path: 'redirects'},
        {path: 'user-timings'},
      ],
      categories: {
        'lighthouse-plugin-simple': {title: 'Simple'},
      },
      groups: {
        'lighthouse-plugin-simple-new-group': {title: 'New Group'},
      },
    });
  });

  it('merge plugins from flags', async () => {
    const config = {
      audits: ['installable-manifest', 'metrics'],
      plugins: ['lighthouse-plugin-simple'],
    };
    const flags = {plugins: ['lighthouse-plugin-no-groups']};
    const mergedConfig = await mergePlugins(config, configDir, flags);

    expect(mergedConfig.categories).toHaveProperty('lighthouse-plugin-simple');
    expect(mergedConfig.categories).toHaveProperty('lighthouse-plugin-no-groups');
  });

  it('validate plugin name', async () => {
    const config = {audits: ['installable-manifest', 'metrics']};
    const flags = {plugins: ['not-a-plugin']};
    await expect(mergePlugins(config, configDir, flags)).rejects.toThrow(/does not start/);
  });

  it('validate plugin existence', async () => {
    const config = {audits: ['installable-manifest', 'metrics']};
    const flags = {plugins: ['lighthouse-plugin-missing']};
    await expect(mergePlugins(config, configDir, flags)).rejects
      .toThrow(/Unable to locate plugin/);
  });

  it('validate plugin structure', async () => {
    const config = {audits: ['installable-manifest', 'metrics']};
    const flags = {plugins: ['lighthouse-plugin-no-category']};
    await expect(mergePlugins(config, configDir, flags)).rejects.toThrow(/no valid category/);
  });
});

describe('.resolveSettings', () => {
  it('resolves the locale', () => {
    const settings = resolveSettings({locale: 'zh-CN'});
    expect(settings.locale).toEqual('zh');
  });

  it('fills with defaults', () => {
    const settings = resolveSettings({});
    expect(settings.formFactor).toEqual('mobile');
  });

  it('preserves array settings when merging', () => {
    const settings = resolveSettings({output: ['html']});
    expect(settings.output).toEqual(['html']);
  });

  it('cleans unrecognized properties from overrides', () => {
    const settings = resolveSettings({}, {nonsense: 1, output: 'html'});
    expect(settings.output).toEqual('html');
    expect(settings).not.toHaveProperty('nonsense');
  });

  describe('sets UA string', () => {
    it('to default value if provided value is undefined', () => {
      const settings = resolveSettings({}, {emulatedUserAgent: undefined});
      expect(settings.emulatedUserAgent).toMatch(/^Mozilla\/5.*moto.*Chrome/);
    });

    it('to default value if provided value is true', () => {
      const settings = resolveSettings({}, {emulatedUserAgent: true});
      expect(settings.emulatedUserAgent).toMatch(/^Mozilla\/5.*moto.*Chrome/);
    });

    it('to false if provided value is false', () => {
      const settings = resolveSettings({}, {emulatedUserAgent: false});
      expect(settings.emulatedUserAgent).toEqual(false);
    });

    it('to the provided string value if present', () => {
      const settings = resolveSettings({}, {emulatedUserAgent: 'Random UA'});
      expect(settings.emulatedUserAgent).toEqual('Random UA');
    });
  });

  describe('validation', () => {
    it('formFactor', () => {
      const desktopSettings = {formFactor: 'desktop', screenEmulation: {mobile: false}};
      expect(() => resolveSettings(desktopSettings)).not.toThrow();
      expect(() => resolveSettings({formFactor: 'mobile'})).not.toThrow();
      expect(() => resolveSettings({formFactor: 'tablet'})).toThrow();
      expect(() => resolveSettings({formFactor: 'thing-a-ma-bob'})).toThrow();
    });

    it('screenEmulation', () => {
      expect(() =>
        resolveSettings({
          formFactor: 'mobile',
          screenEmulation: {mobile: false},
        })
      ).toThrow();
      expect(() =>
        resolveSettings({
          formFactor: 'desktop',
          screenEmulation: {mobile: true},
        })
      ).toThrow();
      expect(() =>
        resolveSettings({
          formFactor: 'mobile',
          screenEmulation: {mobile: false, disabled: true},
        })
      ).not.toThrow();
      expect(() =>
        resolveSettings({
          formFactor: 'desktop',
          screenEmulation: {mobile: true, disabled: true},
        })
      ).not.toThrow();
    });
  });
});

describe('.resolveGathererToDefn', () => {
  const coreList = Runner.getGathererList();

  it('should expand core gatherer', async () => {
    const result = await resolveGathererToDefn('image-elements', coreList);
    expect(result).toEqual({
      path: 'image-elements',
      implementation: ImageElementsGatherer,
      instance: expect.any(ImageElementsGatherer),
    });
  });

  it('should expand gatherer path short-hand', async () => {
    const result = await resolveGathererToDefn({path: 'image-elements'}, coreList);
    expect(result).toEqual({
      path: 'image-elements',
      implementation: ImageElementsGatherer,
      instance: expect.any(ImageElementsGatherer),
    });
  });

  it('should find relative to configDir', async () => {
    const configDir = path.resolve(moduleDir, '../../gather/');
    const result = await resolveGathererToDefn('gatherers/image-elements', [], configDir);
    expect(result).toEqual({
      path: 'gatherers/image-elements',
      implementation: ImageElementsGatherer,
      instance: expect.any(ImageElementsGatherer),
    });
  });

  it('should find custom gatherers', async () => {
    const result1 =
      await resolveGathererToDefn('../fixtures/valid-custom-gatherer', [], moduleDir);
    const result2 =
      await resolveGathererToDefn('../fixtures/valid-custom-gatherer.js', [], moduleDir);
    const result3 =
      await resolveGathererToDefn('../fixtures/valid-custom-gatherer.cjs', [], moduleDir);

    expect(result1).toMatchObject({path: '../fixtures/valid-custom-gatherer'});
    expect(result2).toMatchObject({path: '../fixtures/valid-custom-gatherer.js'});
    expect(result3).toMatchObject({path: '../fixtures/valid-custom-gatherer.cjs'});
  });

  it('should expand gatherer impl short-hand', async () => {
    const result = await resolveGathererToDefn({implementation: ImageElementsGatherer}, coreList);
    expect(result).toEqual({
      implementation: ImageElementsGatherer,
      instance: expect.any(ImageElementsGatherer),
    });
  });

  it('should expand gatherer instance short-hand', async () => {
    const result = await resolveGathererToDefn({instance: new ImageElementsGatherer()}, coreList);
    expect(result).toEqual({
      instance: expect.any(ImageElementsGatherer),
    });
  });

  it('should expand gatherer instance directly', async () => {
    const result = await resolveGathererToDefn(new ImageElementsGatherer(), coreList);
    expect(result).toEqual({
      instance: expect.any(ImageElementsGatherer),
    });
  });

  it('throws for invalid gathererDefn', async () => {
    await expect(resolveGathererToDefn({})).rejects.toThrow(/Invalid Gatherer type/);
  });

  it('throws for invalid path type', async () => {
    await expect(resolveGathererToDefn({path: 1234})).rejects.toThrow(/Invalid Gatherer type/);
  });

  it('throws but not for missing gatherer when it has a node dependency error', async () => {
    const resultPromise =
      resolveGathererToDefn('../fixtures/invalid-gatherers/require-error.js', [], moduleDir);
    await expect(resultPromise).rejects.toThrow(/no such file or directory/);
  });
});

describe('.resolveAuditsToDefns', () => {
  it('should expand core audit', async () => {
    const result = await resolveAuditsToDefns(['user-timings']);

    expect(result).toEqual([{path: 'user-timings', options: {}, implementation: UserTimingsAudit}]);
  });

  it('should expand audit path short-hand', async () => {
    const result = await resolveAuditsToDefns([{path: 'user-timings'}]);

    expect(result).toEqual([{path: 'user-timings', options: {}, implementation: UserTimingsAudit}]);
  });

  it('should expand audit impl short-hand', async () => {
    const result = await resolveAuditsToDefns([{implementation: UserTimingsAudit}]);

    expect(result).toEqual([{options: {}, implementation: UserTimingsAudit}]);
  });

  it('should expand audit impl directly', async () => {
    const result = await resolveAuditsToDefns([UserTimingsAudit]);

    expect(result).toEqual([{options: {}, implementation: UserTimingsAudit}]);
  });

  it('should find relative to configDir', async () => {
    const configDir = path.resolve(moduleDir, '../../');
    const result = await resolveAuditsToDefns(['audits/user-timings'], configDir);

    expect(result).toEqual([
      {path: 'audits/user-timings', options: {}, implementation: UserTimingsAudit},
    ]);
  });

  it('should find custom audits', async () => {
    const result = await resolveAuditsToDefns([
      '../fixtures/valid-custom-audit',
      '../fixtures/valid-custom-audit.js',
      '../fixtures/valid-custom-audit.cjs',
    ], moduleDir);
    expect(result).toMatchObject([
      {path: '../fixtures/valid-custom-audit', options: {}},
      {path: '../fixtures/valid-custom-audit.js', options: {}},
      {path: '../fixtures/valid-custom-audit.cjs', options: {}},
    ]);
  });

  it('should handle multiple audit definition styles', async () => {
    const result = await resolveAuditsToDefns(['user-timings', {implementation: UserTimingsAudit}]);

    expect(result).toMatchObject([{path: 'user-timings'}, {implementation: UserTimingsAudit}]);
  });

  it('should merge audit options', async () => {
    const audits = [
      'user-timings',
      {path: 'is-on-https', options: {x: 1, y: 1}},
      {path: 'is-on-https', options: {x: 2}},
    ];
    const merged = await resolveAuditsToDefns(audits);
    expect(merged).toMatchObject([
      {path: 'user-timings', options: {}},
      {path: 'is-on-https', options: {x: 2, y: 1}},
    ]);
  });

  it('throws for invalid auditDefns', async () => {
    await expect(resolveAuditsToDefns([new BaseGatherer()])).rejects.toThrow(/Invalid Audit type/);
  });

  it('throws but not for missing audit when it has a node dependency error', async () => {
    const resultPromise = resolveAuditsToDefns([
      '../fixtures/invalid-audits/require-error.js',
    ], moduleDir);
    await expect(resultPromise).rejects.toThrow(/no such file or directory/);
  });
});

describe('.resolveModulePath', () => {
  const configFixturePath = path.resolve(moduleDir, '../fixtures/config');

  beforeEach(() => {
    process.cwd = jestMock.fn(() => configFixturePath);
  });

  it('lighthouse and plugins are installed in the same path', () => {
    const pluginName = 'chrome-launcher';
    const pathToPlugin = resolveModulePath(pluginName, null, 'plugin');
    expect(pathToPlugin).toEqual(require.resolve(pluginName));
  });

  it('throws for unknown resource', async () => {
    expect(() => {
      resolveModulePath('unknown', null, 'audit');
    }).toThrow(/Unable to locate audit: `unknown`/);
  });

  describe('plugin paths to a file', () => {
    it('relative to the current working directory', () => {
      const pluginName = 'lighthouse-plugin-config-helper';
      const pathToPlugin = resolveModulePath(pluginName, null, 'plugin');
      expect(pathToPlugin).toEqual(require.resolve(path.resolve(configFixturePath, pluginName)));
    });

    it('relative to the config path', () => {
      process.cwd = jestMock.fn(() => path.resolve(configFixturePath, '../'));
      const pluginName = 'lighthouse-plugin-config-helper';
      const pathToPlugin = resolveModulePath(pluginName, configFixturePath, 'plugin');
      expect(pathToPlugin).toEqual(require.resolve(path.resolve(configFixturePath, pluginName)));
    });
  });

  describe('lighthouse and plugins are installed by npm', () => {
    const pluginsDirectory = path.resolve(moduleDir, '../fixtures/config/');

    // working directory/
    //   |-- node_modules/
    //   |-- package.json
    it('in current working directory', () => {
      const pluginName = 'plugin-in-working-directory';
      const pluginDir = `${pluginsDirectory}/node_modules/plugin-in-working-directory`;
      process.cwd = jestMock.fn(() => pluginsDirectory);

      const pathToPlugin = resolveModulePath(pluginName, null, 'plugin');

      expect(pathToPlugin).toEqual(require.resolve(pluginName, {paths: [pluginDir]}));
    });

    // working directory/
    //   |-- config directory/
    //     |-- node_modules/
    //     |-- config.js
    //     |-- package.json
    it('relative to the config path', () => {
      const pluginName = 'plugin-in-config-directory';
      const configDirectory = `${pluginsDirectory}/config`;
      process.cwd = jestMock.fn(() => '/usr/bin/node');

      const pathToPlugin = resolveModulePath(pluginName, configDirectory, 'plugin');

      expect(pathToPlugin).toEqual(require.resolve(pluginName, {paths: [configDirectory]}));
    });
  });
});
