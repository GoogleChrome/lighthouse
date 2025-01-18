/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Result as AuditResult} from './audit-result.js';
import {Locale} from './settings.js';

declare module Treemap {
  interface Options {
    lhr: {
      mainDocumentUrl?: string;
      finalUrl?: string;
      finalDisplayedUrl: string;
      audits: {
        'script-treemap-data': AuditResult;
      };
      configSettings: {
        locale: Locale;
      }
    }
  }

  type NodePath = string[];

  interface Selector {
    type: 'depthOneNode' | 'group';
    value: string;
  }

  interface Highlight {
    path: NodePath;
    /** If not set, will use the color based on the d1Node. */
    color?: string;
  }

  interface ViewMode {
    id: 'all' | 'unused-bytes' | 'duplicate-modules';
    label: string;
    subLabel: string;
    enabled: boolean;
    partitionBy?: 'resourceBytes' | 'unusedBytes';
    highlights?: Highlight[];
  }

  interface Node {
    /** Could be a url, a path component from a source map, or an arbitrary string. */
    name: string;
    resourceBytes: number;
    unusedBytes?: number;
    /** If present, this module is a duplicate. String is normalized source path. See ModuleDuplication.normalizeSource */
    duplicatedNormalizedModuleName?: string;
    children?: Node[];
  }
}

export default Treemap;
