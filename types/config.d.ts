/* eslint-disable strict */
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../core/audits/audit.js';
import {SharedFlagsSettings, ConfigSettings} from './lhr/settings.js';
import Gatherer from './gatherer.js';
import {IcuMessage} from './lhr/i18n.js';
import Result from './lhr/lhr.js';

interface ClassOf<T> {
  new (): T;
}

/**
 * The Lighthouse Config format.
 */
interface Config {
  extends?: 'lighthouse:default' | string;
  settings?: SharedFlagsSettings;
  artifacts?: Config.ArtifactJson[] | null;
  audits?: Config.AuditJson[] | null;
  categories?: Record<string, Config.CategoryJson> | null;
  groups?: Record<string, Config.GroupJson> | null;
  plugins?: Array<string>;
}

declare module Config {
  /**
   * The normalized and fully resolved config.
   */
  interface ResolvedConfig {
    settings: Settings;
    artifacts: AnyArtifactDefn[] | null;
    audits: AuditDefn[] | null;
    categories: Record<string, Category> | null;
    groups: Record<string, Group> | null;
  }

  interface ArtifactJson {
    id: string;
    gatherer: GathererJson;
  }

  type GathererJson = {
    path: string;
  } | {
    implementation: ClassOf<Gatherer.GathererInstance>;
  } | {
    instance: Gatherer.GathererInstance;
  } | Gatherer.GathererInstance | ClassOf<Gatherer.GathererInstance> | string;

  interface CategoryJson {
    title: string | IcuMessage;
    auditRefs: AuditRefJson[];
    description?: string | IcuMessage;
    manualDescription?: string | IcuMessage;
    supportedModes?:  Gatherer.GatherMode[];
  }

  interface GroupJson {
    title: string | IcuMessage;
    description?: string | IcuMessage;
  }

  type AuditJson = {
    path: string,
    options?: {};
  } | {
    implementation: typeof Audit;
    options?: {};
  } | typeof Audit | string;

  /**
   * Reference to an audit member of a category and how its score should be
   * weighted and how its results grouped with other members.
   */
  interface AuditRefJson {
    id: string;
    weight: number;
    group?: string;
    acronym?: string;
  }

  type Settings = ConfigSettings;

  interface ArtifactDefn<TDependencies extends Gatherer.DependencyKey = Gatherer.DependencyKey> {
    id: string;
    gatherer: GathererDefn<TDependencies>;
    dependencies?: TDependencies extends Gatherer.DefaultDependenciesKey ?
      undefined :
      Record<Exclude<TDependencies, Gatherer.DefaultDependenciesKey>, {id: string}>;
  }

  type ArtifactDefnExpander<TDependencies extends Gatherer.DependencyKey> =
    // Lack of brackets intentional here to convert to the union of all individual dependencies.
    TDependencies extends Gatherer.DefaultDependenciesKey ?
      ArtifactDefn<Gatherer.DefaultDependenciesKey> :
      ArtifactDefn<TDependencies>
  type AnyArtifactDefn = ArtifactDefnExpander<Gatherer.DefaultDependenciesKey>|ArtifactDefnExpander<Gatherer.DependencyKey>

  interface GathererDefn<TDependencies extends Gatherer.DependencyKey = Gatherer.DependencyKey> {
    implementation?: ClassOf<Gatherer.GathererInstance<TDependencies>>;
    instance: Gatherer.GathererInstance<TDependencies>;
    path?: string;
  }

  type GathererDefnExpander<TDependencies extends Gatherer.DependencyKey> =
    // Lack of brackets intentional here to convert to the union of all individual dependencies.
    TDependencies extends Gatherer.DefaultDependenciesKey ?
      GathererDefn<Gatherer.DefaultDependenciesKey> :
      GathererDefn<TDependencies>
  type AnyGathererDefn = GathererDefnExpander<Gatherer.DefaultDependenciesKey>|GathererDefnExpander<Gatherer.DependencyKey>

  interface AuditDefn {
    implementation: typeof Audit;
    path?: string;
    options: {};
  }

  // TODO: For now, these are unchanged from JSON and Result versions. Need to harmonize.
  interface AuditRef extends AuditRefJson {}
  interface Category extends CategoryJson {
    auditRefs: AuditRef[];
  }
  interface Group extends GroupJson {}

  interface Plugin {
    /** Optionally provide more audits to run in addition to those specified by the base config. */
    audits?: Array<{path: string}>;
    /** Provide a category to display the plugin results in the report. */
    category: Config.Category;
    /** Optionally provide more groups in addition to those specified by the base config. */
    groups?: Record<string, Config.GroupJson>;
  }

  type Merge = {
    <T extends Record<string, any>, U extends Record<string, any>>(base: T|null|undefined, extension: U, overwriteArrays?: boolean): T & U;
    <T extends Array<any>, U extends Array<any>>(base: T|null|undefined, extension: T, overwriteArrays?: boolean): T & U;
  }
}

export default Config;
