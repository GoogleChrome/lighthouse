/* eslint-disable strict */
/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import Audit = require('../lighthouse-core/audits/audit.js');

interface ClassOf<T> {
  new (): T;
}

declare global {
  module LH {
    module Config {
      /**
       * The pre-normalization Lighthouse Config format.
       */
      export interface Json {
        extends?: 'lighthouse:default' | string;
        settings?: SharedFlagsSettings;
        artifacts?: ArtifactJson[] | null;
        passes?: PassJson[] | null;
        audits?: Config.AuditJson[] | null;
        categories?: Record<string, CategoryJson> | null;
        groups?: Record<string, Config.GroupJson> | null;
        plugins?: Array<string>,
        pluginLocales?: LH.LocaleConfig | null
      }

      /**
       * The normalized and fully resolved config.
       */
      export interface Config {
        settings: Settings;
        passes: Pass[] | null;
        audits: AuditDefn[] | null;
        categories: Record<string, Category> | null;
        groups: Record<string, Group> | null;
      }

      /**
       * The normalized and fully resolved Fraggle Rock config.
       */
      export interface FRConfig {
        settings: Settings;
        artifacts: ArtifactDefn[] | null;
        audits: AuditDefn[] | null;
        categories: Record<string, Category> | null;
        groups: Record<string, Group> | null;
      }

      export interface PassJson {
        passName: string;
        loadFailureMode?: 'fatal'|'warn'|'ignore';
        recordTrace?: boolean;
        useThrottling?: boolean;
        pauseAfterFcpMs?: number;
        pauseAfterLoadMs?: number;
        networkQuietThresholdMs?: number;
        cpuQuietThresholdMs?: number;
        blockedUrlPatterns?: string[];
        blankPage?: string;
        gatherers?: GathererJson[];
      }

      export interface ArtifactJson {
        id: string;
        gatherer: GathererJson;
      }

      export type GathererJson = {
        path: string;
        options?: {};
      } | {
        implementation: ClassOf<Gatherer.GathererInstance>;
        options?: {};
      } | {
        instance: Gatherer.GathererInstance;
        options?: {};
      } | Gatherer.GathererInstance | ClassOf<Gatherer.GathererInstance> | string;


      export interface CategoryJson {
        title: string | IcuMessage;
        auditRefs: AuditRefJson[];
        description?: string | IcuMessage;
        manualDescription?: string | IcuMessage;
      }

      export interface GroupJson {
        title: string | IcuMessage;
        description?: string | IcuMessage;
      }

      export type AuditJson = {
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
      export interface AuditRefJson {
        id: string;
        weight: number;
        group?: string;
      }

      export interface Settings extends Required<SharedFlagsSettings> {
        throttling: Required<ThrottlingSettings>;
        screenEmulation: ScreenEmulationSettings;
      }

      export interface Pass extends Required<PassJson> {
        gatherers: GathererDefn[];
      }

      export interface ArtifactDefn {
        id: string;
        gatherer: FRGathererDefn;
      }

      export interface FRGathererDefn {
        implementation?: ClassOf<Gatherer.FRGathererInstance>;
        instance: Gatherer.FRGathererInstance;
        path?: string;
      }

      export interface GathererDefn {
        implementation?: ClassOf<Gatherer.GathererInstance>;
        instance: Gatherer.GathererInstance;
        path?: string;
      }

      export interface AuditDefn {
        implementation: typeof Audit;
        path?: string;
        options: {};
      }

      // TODO: For now, these are unchanged from JSON and Result versions. Need to harmonize.
      export interface AuditRef extends AuditRefJson {}
      export interface Category extends CategoryJson {
        auditRefs: AuditRef[];
      }
      export interface Group extends GroupJson {}

      export interface Plugin {
        /** Optionally provide more audits to run in addition to those specified by the base config. */
        audits?: Array<{path: string}>;
        /** Provide a category to display the plugin results in the report. */
        category: LH.Config.Category;
        /** Optionally provide more groups in addition to those specified by the base config. */
        groups?: Record<string, LH.Config.GroupJson>;
        /** Optionally provide a locale config for i18n. */
        locales?: LH.LocaleConfig, 
      }

      export type MergeOptionsOfItems = <T extends {path?: string, options: Record<string, any>}>(items: T[]) => T[];

      export type Merge = {
        <T extends Record<string, any>, U extends Record<string, any>>(base: T|null|undefined, extension: U, overwriteArrays?: boolean): T & U;
        <T extends Array<any>, U extends Array<any>>(base: T|null|undefined, extension: T, overwriteArrays?: boolean): T & U;
      }
    }
  }
}

// empty export to keep file a module
export {};
