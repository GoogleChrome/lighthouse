/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH.Audit {
    export type Details =
      Details.CriticalRequestChain |
      Details.DebugData |
      Details.Filmstrip |
      Details.List |
      Details.Opportunity |
      Details.Screenshot |
      Details.Table;

    // Details namespace.
    export module Details {
      export interface CriticalRequestChain {
        type: 'criticalrequestchain';
        longestChain: {
          duration: number;
          length: number;
          transferSize: number;
        };
        chains: Audit.SimpleCriticalRequestNode;
      }

      export interface Filmstrip {
        type: 'filmstrip';
        scale: number;
        items: {
          /** The relative time from navigationStart to this frame, in milliseconds. */
          timing: number;
          /** The raw timestamp of this frame, in microseconds. */
          timestamp: number;
          /** The data URL encoding of this frame. */
          data: string;
        }[];
      }

      export interface List {
        type: 'list';
        items: SnippetValue[]
      }

      export interface Opportunity {
        type: 'opportunity';
        overallSavingsMs: number;
        overallSavingsBytes?: number;
        headings: OpportunityColumnHeading[];
        items: OpportunityItem[];
        debugData?: DebugData;
      }

      export interface Screenshot {
        type: 'screenshot';
        timing: number;
        timestamp: number;
        data: string;
      }

      export interface Table {
        type: 'table';
        headings: TableColumnHeading[];
        items: TableItem[];
        summary?: {
          wastedMs?: number;
          wastedBytes?: number;
        };
        debugData?: DebugData;
      }

      /**
       * A details type that is not rendered in the final report; usually used
       * for including debug information in the LHR. Can contain anything.
       */
      export interface DebugData {
        type: 'debugdata';
        [p: string]: any;
      }

      /** String enum of possible types of values found within table items. */
      type ItemValueType = 'bytes' | 'code' | 'link' | 'ms' | 'multi' | 'node' | 'source-location' | 'numeric' | 'text' | 'thumbnail' | 'timespanMs' | 'url';

      /** Possible types of values found within table items. */
      type ItemValue = string | number | boolean | DebugData | NodeValue | SourceLocationValue | LinkValue | UrlValue | CodeValue;

      // TODO: drop TableColumnHeading, rename OpportunityColumnHeading to TableColumnHeading and
      // use that for all table-like audit details.

      export interface TableColumnHeading {
        /**
         * The name of the property within items being described.
         * If null, subRows must be defined, and the first sub-row will be empty.
         */
        key: string|null;
        /** Readable text label of the field. */
        text: string;
        /**
         * The data format of the column of values being described. Usually
         * those values will be primitives rendered as this type, but the values
         * could also be objects with their own type to override this field.
         */
        itemType: ItemValueType;
        /**
         * Optional - defines an inner table of values that correspond to this column.
         * Key is required - if other properties are not provided, the value for the heading is used.
         */
        subRows?: {key: string, itemType?: ItemValueType, displayUnit?: string, granularity?: number};

        displayUnit?: string;
        granularity?: number;
      }

      export interface TableItem {
        debugData?: DebugData;
        [p: string]: undefined | ItemValue | ItemValue[];
      }

      export interface OpportunityColumnHeading {
        /**
         * The name of the property within items being described.
         * If null, subRows must be defined, and the first sub-row will be empty.
         */
        key: string|null;
        /** Readable text label of the field. */
        label: string;
        /**
         * The data format of the column of values being described. Usually
         * those values will be primitives rendered as this type, but the values
         * could also be objects with their own type to override this field.
         */
        valueType: ItemValueType;
        /**
         * Optional - defines an inner table of values that correspond to this column.
         * Key is required - if other properties are not provided, the value for the heading is used.
         */
        subRows?: {key: string, valueType?: ItemValueType, displayUnit?: string, granularity?: number};

        // NOTE: not used by opportunity details, but used in the renderer until table/opportunity unification.
        displayUnit?: string;
        granularity?: number;
      }

      /** A more specific table element used for `opportunity` tables. */
      export interface OpportunityItem extends TableItem {
        url: string;
        wastedBytes?: number;
        totalBytes?: number;
        wastedMs?: number;
        debugData?: DebugData;
        [p: string]: undefined | ItemValue | ItemValue[];
      }

      /**
       * A value used within a details object, intended to be displayed as code,
       * regardless of the controlling heading's valueType.
       */
      export interface CodeValue {
        type: 'code';
        value: string;
      }

      /**
       * A value used within a details object, intended to be displayed as a
       * link with text, regardless of the controlling heading's valueType.
       * If URL is the empty string, fallsback to a basic `TextValue`.
       */
      export interface LinkValue {
        type: 'link',
        text: string;
        url: string;
      }

      /**
       * A value used within a details object, intended to be displayed an HTML
       * node, regardless of the controlling heading's valueType.
       */
      export interface NodeValue {
        type: 'node';
        path?: string;
        selector?: string;
        /** An HTML snippet used to identify the node. */
        snippet?: string;
        /** A human-friendly text descriptor that's used to identify the node more quickly. */
        nodeLabel?: string;
      }

      /**
       * A value used within a details object, intended to be displayed as a URL
       * encoded with line and column info (url:line:column).
       */
      export interface SourceLocationValue {
        type: 'source-location';
        /** urls from the network are always valid urls. otherwise, urls come from either a comment or header, and may not be well-formed. */
        url: string;
        /** 'network' when the url is the actual, observed resource url. 'comment' when the url comes from a sourceMapURL comment or X-SourceMap header */
        urlProvider: 'network' | 'comment';
        line: number;
        column: number;
      }

      /**
       * A value used within a details object, intended to be displayed as a
       * linkified URL, regardless of the controlling heading's valueType.
       */
      export interface UrlValue {
        type: 'url';
        value: string;
      }

      /**
       * Snippet of text with line numbers and annotations.
       */
      export interface SnippetValue {
        type: 'snippet',
        title: string,
        /** Node where the content of this snippet came from. */
        node?: NodeValue,
        /**
         * The lines that should be rendered. For long snippets we only include important lines
         * in the audit result.
         */
        lines: {
          content: string
          /** Line number, starting from 1. */
          lineNumber: number;
          truncated?: boolean
        }[],
        /** The total number of lines in the snippet, equal to lines.length for short snippets. */
        lineCount: number,
        /** Messages that provide information about a specific lines. */
        lineMessages: {
          /** Line number, starting from 1. */
          lineNumber: number,
          message: string
        }[];
        /** Messages that provide information about the snippet in general. */
        generalMessages: {
          message: string
        }[];
      }
    }
  }
}

// empty export to keep file a module
export {}
