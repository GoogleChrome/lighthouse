/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ConfigPlugin from '../../config/config-plugin.js';
import * as i18n from '../../lib/i18n/i18n.js';

/**
 * @param {any} val
 * @return {any}
 */
function deepClone(val) {
  return JSON.parse(JSON.stringify(val));
}

const nicePluginName = 'lighthouse-plugin-nice-plugin';
const nicePlugin = {
  audits: [{path: 'not/a/path/audit.js'}],
  groups: {
    'group-a': {
      title: 'Group A',
    },
    'group-b': {
      title: 'Group B',
      description: 'This description is optional',
    },
  },
  category: {
    title: 'Nice Plugin',
    description: 'A nice plugin for nice testing',
    auditRefs: [
      {id: 'nice-audit', weight: 1, group: 'group-a'},
      {id: 'installable-manifest', weight: 220},
    ],
    supportedModes: ['navigation'],
  },
};

describe('ConfigPlugin', () => {
  it('accepts a well formed plugin', () => {
    const pluginJson = ConfigPlugin.parsePlugin(nicePlugin, nicePluginName);
    expect(pluginJson).toMatchSnapshot();
  });

  it('throws on something other than a plugin object', () => {
    assert.throws(() => ConfigPlugin.parsePlugin(5, nicePluginName),
      /^Error: lighthouse-plugin-nice-plugin is not defined as an object/);
  });

  it('throws on an array instead of a plugin object', () => {
    assert.throws(() => ConfigPlugin.parsePlugin([], nicePluginName),
      /^Error: lighthouse-plugin-nice-plugin is not defined as an object/);
  });

  it('throws if there are excess plugin properties', () => {
    const pluginClone = deepClone(nicePlugin);
    pluginClone.extraProperty = 'extra';

    assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
      /^Error: lighthouse-plugin-nice-plugin has unrecognized properties: \[extraProperty\]$/);
  });

  it('accepts a plugin using IcuMessages for strings', () => {
    // Create some local-only UIStrings for the test.
    const UIStrings = {
      title: 'this is a title',
      description: 'this is a description',
    };
    const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

    const localizedPlugin = {
      groups: {
        group: {
          title: str_(UIStrings.title),
          description: str_(UIStrings.description),
        },
      },
      category: {
        title: str_(UIStrings.title),
        description: str_(UIStrings.description),
        manualDescription: str_(UIStrings.description),
        auditRefs: [{id: 'installable-manifest', weight: 220, group: 'group'}],
      },
    };
    const pluginJson = ConfigPlugin.parsePlugin(localizedPlugin, 'lighthouse-plugin-localized');
    expect(pluginJson).toMatchObject({
      groups: {
        'lighthouse-plugin-localized-group': {
          title: expect.toBeDisplayString(UIStrings.title),
          description: expect.toBeDisplayString(UIStrings.description),
        },
      },
      categories: {
        'lighthouse-plugin-localized': {
          title: expect.toBeDisplayString(UIStrings.title),
          description: expect.toBeDisplayString(UIStrings.description),
          manualDescription: expect.toBeDisplayString(UIStrings.description),
        },
      },
    });
  });

  it('deals only with the JSON roundtrip version of the passed-in object', () => {
    const evilAudits = [{path: 'not/a/path/audit.js'}];
    const evilCategory = {
      title: 'Evil Plugin',
      description: 'A plugin that\'s trying to undermine you.',
      manualDescription: 'Still here.',
      auditRefs: [
        {id: 'evil-audit', weight: 0, group: undefined},
      ],
      supportedModes: ['navigation'],
    };

    const evilPlugin = {
      // Getter should be flattened to just value.
      get audits() {
        return evilAudits;
      },
      // Excess property would normally throw, but live function is dropped by stringify/parse.
      evilProperty() {
        throw new Error('get out of here');
      },
      category: evilCategory,
    };

    const pluginJson = ConfigPlugin.parsePlugin(evilPlugin, 'lighthouse-plugin-evil');
    assert.deepStrictEqual(pluginJson, {
      audits: evilAudits,
      categories: {
        'lighthouse-plugin-evil': evilCategory,
      },
      groups: undefined,
    });
    assert.strictEqual(Object.getOwnPropertyDescriptor(pluginJson, 'audits').get, undefined);
  });

  describe('`audits` array', () => {
    it('correctly passes through the contained audits', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.audits.push({path: 'second/audit.js'});
      const pluginJson = ConfigPlugin.parsePlugin(pluginClone, nicePluginName);

      assert.strictEqual(pluginJson.audits[0].path, 'not/a/path/audit.js');
      assert.strictEqual(pluginJson.audits[1].path, 'second/audit.js');
    });

    it('accepts a plugin with no new audits added', () => {
      const pluginClone = deepClone(nicePlugin);
      delete pluginClone.audits;
      const pluginJson = ConfigPlugin.parsePlugin(pluginClone, nicePluginName);

      assert.strictEqual(pluginJson.audits, undefined);
    });

    it('throws if not an array', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.audits = 5;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid audits array/);
    });

    it('throws if it contains non-objects', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.audits[0] = 5;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid audits array/);
    });

    it('throws if it contains objects with excess properties', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.audits[0].extraProperty = 'extra';
      pluginClone.audits[0].otherProperty = 'other';
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin.*audit.*extraProperty.*otherProperty/);
    });

    it('throws if it contains objects with a missing `path`', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.audits[0].path = undefined;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has a missing audit path/);
    });
  });

  describe('`category`', () => {
    it('correctly adds the category under the plugin\'s name', () => {
      const pluginJson = ConfigPlugin.parsePlugin(nicePlugin, nicePluginName);
      assert.ok(pluginJson.categories[nicePluginName]);
    });

    it('throws if category is missing', () => {
      const pluginClone = deepClone(nicePlugin);
      delete pluginClone.category;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has no valid category/);
    });

    it('throws if category contains excess properties', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.category.extraProperty = 'extra';
      pluginClone.category.otherProperty = 'other';
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin.*category.*extraProperty.*otherProperty/);
    });

    it('throws if category has an invalid or missing title', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.category.title = 55;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid category tile/);

      const pluginClone2 = deepClone(nicePlugin);
      delete pluginClone2.category.title;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone2, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid category tile/);
    });

    it('accepts a category with no description', () => {
      const pluginClone = deepClone(nicePlugin);
      delete pluginClone.category.description;
      const pluginJson = ConfigPlugin.parsePlugin(pluginClone, nicePluginName);
      assert.ok(pluginJson);
    });

    it('throws if category has an invalid description', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.category.description = 55;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid category description/);
    });

    it('accepts a category with no manualDescription', () => {
      const pluginClone = deepClone(nicePlugin);
      delete pluginClone.category.description;
      const pluginJson = ConfigPlugin.parsePlugin(pluginClone, nicePluginName);
      assert.ok(pluginJson);
    });

    it('accepts a category with no supportedModes', () => {
      const pluginClone = deepClone(nicePlugin);
      delete pluginClone.category.supportedModes;
      const pluginJson = ConfigPlugin.parsePlugin(pluginClone, nicePluginName);
      assert.ok(pluginJson);
    });

    it('throws if category has an invalid manualDescription', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.category.manualDescription = 55;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid category manualDescription/);
    });

    it('throws if supported modes is not an array', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.category.supportedModes = 55;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin supportedModes must be an array/);
    });

    it('throws if supported modes is not an array of valid gather modes', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.category.supportedModes = ['invalid-mode'];
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin supportedModes must be an array/);
    });

    describe('`category.auditRefs`', () => {
      it('correctly passes through the contained auditRefs', () => {
        const pluginJson = ConfigPlugin.parsePlugin(nicePlugin, nicePluginName);

        const auditRefs = pluginJson.categories[nicePluginName].auditRefs;
        assert.deepStrictEqual(auditRefs[0],
          {id: 'nice-audit', weight: 1, group: 'lighthouse-plugin-nice-plugin-group-a'});
        assert.deepStrictEqual(auditRefs[1],
          {id: 'installable-manifest', weight: 220, group: undefined});
      });

      it('throws if auditRefs is missing', () => {
        const pluginClone = deepClone(nicePlugin);
        delete pluginClone.category.auditRefs;
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin has no valid auditsRefs/);
      });

      it('throws if it contains non-objects', () => {
        const pluginClone = deepClone(nicePlugin);
        pluginClone.category.auditRefs[0] = 5;
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin has no valid auditsRefs/);
      });

      it('throws if it contains objects with excess properties', () => {
        const pluginClone = deepClone(nicePlugin);
        pluginClone.category.auditRefs[0].extraProperty = 'extra';
        pluginClone.category.auditRefs[0].otherProperty = 'other';
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin.*auditRef.*extraProperty.*otherProperty/);
      });

      it('throws if it contains objects with an invalid or missing `id`', () => {
        const pluginClone = deepClone(nicePlugin);
        pluginClone.category.auditRefs[1].id = 55;
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin has an invalid auditRef id/);

        const pluginClone2 = deepClone(nicePlugin);
        delete pluginClone2.category.auditRefs[0].id;
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone2, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin has an invalid auditRef id/);
      });

      it('throws if it contains objects with an invalid or missing `weight`', () => {
        const pluginClone = deepClone(nicePlugin);
        pluginClone.category.auditRefs[0].weight = 'NotAWeight';
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin has an invalid auditRef weight/);

        const pluginClone2 = deepClone(nicePlugin);
        delete pluginClone2.category.auditRefs[1].weight;
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone2, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin has an invalid auditRef weight/);
      });

      it('throws if auditRef has an invalid group id', () => {
        const pluginClone = deepClone(nicePlugin);
        pluginClone.category.auditRefs[0].group = 55;
        assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
          /^Error: lighthouse-plugin-nice-plugin has an invalid auditRef group/);
      });
    });
  });

  describe('`groups`', () => {
    it('accepts a plugin with no groups', () => {
      const pluginClone = deepClone(nicePlugin);
      delete pluginClone.groups;
      const pluginJson = ConfigPlugin.parsePlugin(pluginClone, nicePluginName);
      assert.ok(pluginJson);
    });

    it('throws if groups is not an object', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.groups = [0, 1, 2, 3];
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin groups json is not defined as an object/);
    });

    it('throws if groups contains non-objects', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.groups['group-b'] = [0, 1, 2, 3];
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has a group not defined as an object/);
    });

    it('throws if group title is invalid', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.groups['group-a'].title = 55;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid group title/);
    });

    it('throws if group description is invalid', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.groups['group-a'].description = 55;
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has an invalid group description/);
    });

    it('throws if it contains groups with excess properties', () => {
      const pluginClone = deepClone(nicePlugin);
      pluginClone.groups['group-a'].city = 'Paris';
      assert.throws(() => ConfigPlugin.parsePlugin(pluginClone, nicePluginName),
        /^Error: lighthouse-plugin-nice-plugin has unrecognized group properties:.*city.*/);
    });

    it('correctly passes through the contained groups', () => {
      const pluginJson = ConfigPlugin.parsePlugin(nicePlugin, nicePluginName);
      const groups = pluginJson.groups;
      assert.deepStrictEqual(groups,
        {'lighthouse-plugin-nice-plugin-group-a': {title: 'Group A', description: undefined},
          'lighthouse-plugin-nice-plugin-group-b':
          {title: 'Group B', description: 'This description is optional'}});
    });
  });
});
