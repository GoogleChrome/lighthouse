/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {defaultSettings} from '../../config/constants.js';
import defaultConfig from '../../config/default-config.js';
import {Audit as BaseAudit} from '../../audits/audit.js';
import BaseGatherer from '../../gather/base-gatherer.js';
import * as validation from '../../config/validation.js';
import LinkElements from '../../gather/gatherers/link-elements.js';

/** @typedef {LH.Gatherer.GathererMeta['supportedModes']} SupportedModes */

let ExampleAudit = class extends BaseAudit {};

beforeEach(() => {
  class ExampleAudit_ extends BaseAudit {
    static meta = {
      id: 'audit',
      title: 'Title',
      failureTitle: 'Title',
      description: 'Audit',
      requiredArtifacts: [],
    };
    static audit = BaseAudit.audit.bind(ExampleAudit_);
  }
  ExampleAudit = ExampleAudit_;
});

describe('Config Validation', () => {
  describe('isValidArtifactDependency', () => {
    /** @type {Array<{dependent: SupportedModes, dependency: SupportedModes, isValid: boolean}>} */
    const combinations = [
      {dependent: ['timespan'], dependency: ['timespan'], isValid: true},
      {dependent: ['timespan'], dependency: ['snapshot'], isValid: false},
      {dependent: ['timespan'], dependency: ['navigation'], isValid: false},
      {dependent: ['snapshot'], dependency: ['timespan'], isValid: false},
      {dependent: ['snapshot'], dependency: ['snapshot'], isValid: true},
      {dependent: ['snapshot'], dependency: ['navigation'], isValid: false},
      {dependent: ['navigation'], dependency: ['timespan'], isValid: true},
      {dependent: ['navigation'], dependency: ['snapshot'], isValid: true},
      {dependent: ['navigation'], dependency: ['navigation'], isValid: true},
    ];

    for (const {dependent, dependency, isValid} of combinations) {
      it(`should identify ${dependent.join(',')} / ${dependency.join(',')} correctly`, () => {
        const dependentDefn = {instance: new BaseGatherer()};
        dependentDefn.instance.meta.supportedModes = dependent;
        const dependencyDefn = {instance: new BaseGatherer()};
        dependencyDefn.instance.meta.supportedModes = dependency;
        expect(validation.isValidArtifactDependency(dependentDefn, dependencyDefn)).toBe(isValid);
      });
    }
  });

  describe('.assertValidPluginName', () => {
    it('should throw if plugin does not start with lighthouse-plugin', () => {
      const invocation = () => validation.assertValidPluginName(defaultConfig, 'example');
      expect(invocation).toThrow(/does not start with.*lighthouse-plugin/);
    });

    it('should throw if category already exists in config', () => {
      const config = {...defaultConfig};
      const category = {title: 'Test Plugin', auditRefs: [{id: 'viewport', weight: 1}]};
      config.categories = {...defaultConfig.categories, 'lighthouse-plugin-test': category};
      const invocation = () => validation.assertValidPluginName(config, 'lighthouse-plugin-test');
      expect(invocation).toThrow(/not allowed because.*already found/);
    });
  });

  describe('.assertValidArtifacts', () => {
    it('should throw if multiple artifacts have the same id', async () => {
      const instance = new BaseGatherer();
      instance.meta.supportedModes = ['navigation'];
      instance.getArtifact = () => {};

      const artifacts = [
        {id: 'Artifact1', gatherer: {instance}},
        {id: 'Artifact1', gatherer: {instance}},
      ];
      const invocation = () => validation.assertValidArtifacts(artifacts);
      expect(invocation).toThrow(/Config defined multiple/);
    });

    it('should throw if dependencies are out of order', async () => {
      const dependentGatherer = new LinkElements();

      /** @type {LH.Config.AnyArtifactDefn[]} */
      const artifacts = [
        {
          id: 'LinkElements',
          gatherer: {instance: dependentGatherer},
          dependencies: {DevtoolsLog: {id: 'DevtoolsLog'}},
        },
        {id: 'DevtoolsLog', gatherer: {instance: new BaseGatherer()}},
      ];
      const invocation = () => validation.assertValidArtifacts(artifacts);
      expect(invocation).toThrow(/Failed to find dependency/);
    });
  });

  describe('.assertValidArtifact', () => {
    it('should throw if gatherer does not have a meta object', () => {
      const gatherer = new BaseGatherer();
      // @ts-expect-error - We are intentionally creating a malformed input.
      gatherer.meta = undefined;

      const gathererDefn = {instance: gatherer};
      const artifactDefn = {id: 'NewArtifact', gatherer: gathererDefn};
      const invocation = () => validation.assertValidArtifact(artifactDefn);
      expect(invocation).toThrow(/did not provide a meta/);
    });

    it('should throw if gatherer does not have a supported modes', () => {
      const gathererDefn = {instance: new BaseGatherer()};
      const artifactDefn = {id: 'NewArtifact', gatherer: gathererDefn};
      const invocation = () => validation.assertValidArtifact(artifactDefn);
      expect(invocation).toThrow(/did not support any gather modes/);
    });

    it('should throw if gatherer does define getArtifact', () => {
      const gatherer = new BaseGatherer();
      gatherer.meta = {supportedModes: ['navigation']};

      const gathererDefn = {instance: gatherer};
      const artifactDefn = {id: 'NewArtifact', gatherer: gathererDefn};
      const invocation = () => validation.assertValidArtifact(artifactDefn);
      expect(invocation).toThrow(/did not define.*getArtifact/);
    });
  });

  describe('.assertValidAudit', () => {
    it('should throw if audit is not a function', () => {
      // @ts-expect-error - We are intentionally creating a malformed input.
      ExampleAudit.audit = undefined;
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no audit.*method/);
    });

    it('should throw if audit is not redefined', () => {
      const audit = {path: 'audit', implementation: BaseAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no audit.*method/);
    });

    it('should throw if audit id is missing', () => {
      // @ts-expect-error - We are intentionally creating a malformed input.
      ExampleAudit.meta.id = undefined;
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no meta.id/);
    });

    it('should throw if title is missing', () => {
      // @ts-expect-error - We are intentionally creating a malformed input.
      ExampleAudit.meta.title = undefined;
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no meta.title/);
    });

    it('should throw if audit description is missing', () => {
      // @ts-expect-error - We are intentionally creating a malformed input.
      ExampleAudit.meta.description = undefined;
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no meta.description/);
    });

    it('should throw if failureTitle is missing', () => {
      ExampleAudit.meta.failureTitle = undefined;
      ExampleAudit.meta.scoreDisplayMode = BaseAudit.SCORING_MODES.BINARY;
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no meta.failureTitle/);
    });

    it('should throw if failureTitle is missing and scoreDisplayMode is not defined', () => {
      ExampleAudit.meta.failureTitle = undefined;
      ExampleAudit.meta.scoreDisplayMode = undefined;
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no meta.failureTitle/);
    });

    it('should throw if description is empty', () => {
      ExampleAudit.meta.description = '';
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/empty meta.description/);
    });

    it('should throw if requiredArtifacts is missing', () => {
      // @ts-expect-error - We are intentionally creating a malformed input.
      ExampleAudit.meta.requiredArtifacts = undefined;
      const audit = {implementation: ExampleAudit, options: {}};
      const invocation = () => validation.assertValidAudit(audit);
      expect(invocation).toThrow(/has no meta.requiredArtifacts/);
    });
  });

  describe('.assertValidCategories', () => {
    it('should throw on missing audits', () => {
      const categories = defaultConfig.categories || null;
      const invocation = () => validation.assertValidCategories(categories, null, null);
      expect(invocation).toThrow(/could not find.*audit/);
    });

    it('should throw on missing auditRef IDs', () => {
      /** @type {LH.Config.AuditRef} */
      // @ts-expect-error - We are intentionally creating a malformed input.
      const auditRef = {name: 'audit', weight: 0};
      const categories = {id: {title: 'Category', auditRefs: [auditRef]}};
      const invocation = () => validation.assertValidCategories(categories, null, null);
      expect(invocation).toThrow(/missing an audit id/);
    });

    it('should throw when an a11y audit is missing a group', () => {
      const auditRef = {id: 'audit', weight: 0};
      const categories = {accessibility: {title: 'Category', auditRefs: [auditRef]}};
      const audits = [{id: 'audit', options: {}, implementation: ExampleAudit}];
      const invocation = () => validation.assertValidCategories(categories, audits, null);
      expect(invocation).toThrow(/accessibility audit does not have a group/);
    });

    it('should throw when a manual audit has weight', () => {
      const ManualAudit = ExampleAudit;
      ManualAudit.meta.scoreDisplayMode = BaseAudit.SCORING_MODES.MANUAL;

      const auditRef = {id: 'audit', weight: 1};
      const categories = {id: {title: 'Category', auditRefs: [auditRef]}};
      const audits = [{id: 'audit', options: {}, implementation: ManualAudit}];
      const invocation = () => validation.assertValidCategories(categories, audits, null);
      expect(invocation).toThrow(/is manual but has a positive weight/);
    });

    it('should throw when referencing made up group', () => {
      const auditRef = {id: 'audit', weight: 0, group: 'missing'};
      const categories = {id: {title: 'Category', auditRefs: [auditRef]}};
      const audits = [{id: 'audit', options: {}, implementation: ExampleAudit}];
      const invocation = () => validation.assertValidCategories(categories, audits, null);
      expect(invocation).toThrow(/references unknown group/);
    });
  });

  describe('.assertValidSettings', () => {
    it('should demand formFactor', () => {
      const settings = {...defaultSettings};
      // @ts-expect-error - We are intentionally creating a malformed input.
      delete settings.formFactor;
      expect(() => validation.assertValidSettings(settings)).toThrow();
    });

    it('should throw if an audit in onlyAudits is also in skipAudits', () => {
      const settings = {...defaultSettings};
      settings.onlyAudits = ['viewport'];
      settings.skipAudits = ['viewport', 'is-on-https'];
      expect(() => validation.assertValidSettings(settings)).toThrow();
    });

    it('should throw on mismatched formFactor to screenEmulation', () => {
      const settings = {...defaultSettings};

      settings.screenEmulation.mobile = true;
      settings.formFactor = 'desktop';
      expect(() => validation.assertValidSettings(settings)).toThrow();

      settings.screenEmulation.mobile = false;
      settings.formFactor = 'mobile';
      expect(() => validation.assertValidSettings(settings)).toThrow();
    });

    it('should not care about mismatched formFactor when screenEmulation is disabled', () => {
      const settings = {...defaultSettings};

      settings.screenEmulation.disabled = true;
      settings.screenEmulation.mobile = true;
      settings.formFactor = 'desktop';
      expect(() => validation.assertValidSettings(settings)).not.toThrow();
    });
  });
});
