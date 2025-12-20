/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import Gatherer = require('../lighthouse-core/gather/gatherers/gatherer.js');
import Audit = require('../lighthouse-core/audits/audit.js');

declare global {
  module LH {
    module Config {
      /**
       * The pre-normalization Lighthouse Config format.
       */
      export interface Json {
        extends?: 'lighthouse:default' | string | boolean;
        settings?: SharedFlagsSettings;
        passes?: PassJson[] | null;
        audits?: Config.AuditJson[] | null;
        categories?: Record<string, CategoryJson> | null;
        groups?: Record<string, Config.GroupJson> | null;
        plugins?: Array<string>,
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

      export type GathererJson = {
        path: string;
        options?: {};
      } | {
        implementation: typeof Gatherer;
        options?: {};
      } | {
        instance: InstanceType<typeof Gatherer>;
        options?: {};
      } | Gatherer | typeof Gatherer | string;

      export interface CategoryJson {
        title: string;
        auditRefs: AuditRefJson[];
        description?: string;
        manualDescription?: string;
      }

      export interface GroupJson {
        title: string;
        description?: string;
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
      }

      export interface Pass extends Required<PassJson> {
        gatherers: GathererDefn[];
      }

      export interface GathererDefn {
        implementation?: typeof Gatherer;
        instance: InstanceType<typeof Gatherer>;
        path?: string;
        options: {};
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
export {}
