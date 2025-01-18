/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {IcuMessage} from './i18n.js';
import Treemap from './treemap.js';

/** Common properties for all details types. */
interface BaseDetails {
  /** Additional information, usually used for including debug or meta information in the LHR */
  debugData?: Details.DebugData;
}

type Details =
  Details.CriticalRequestChain |
  Details.DebugData |
  Details.TreemapData |
  Details.Filmstrip |
  Details.List |
  Details.Opportunity |
  Details.Screenshot |
  Details.Table;

// Details namespace.
declare module Details {
  interface CriticalRequestChain extends BaseDetails {
    type: 'criticalrequestchain';
    longestChain: {
      duration: number;
      length: number;
      transferSize: number;
    };
    chains: SimpleCriticalRequestNode;
  }

  type SimpleCriticalRequestNode = {
    [id: string]: {
      request: {
        url: string;
        startTime: number;
        endTime: number;
        responseReceivedTime: number;
        transferSize: number;
      };
      children?: SimpleCriticalRequestNode;
    }
  }

  interface Filmstrip extends BaseDetails {
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

  interface List extends BaseDetails {
    type: 'list';
    // NOTE: any `Details` type *should* be usable in `items`, but check
    // styles/report-ui-features are good before adding.
    items: Array<Table | DebugData>;
  }

  interface Opportunity extends BaseDetails {
    type: 'opportunity';
    headings: TableColumnHeading[];
    items: OpportunityItem[];
    /**
     * Columns to sort the items by, during grouping.
     * If omitted, entity groups will be sorted by the audit ordering vs. the new totals.
     */
    sortedBy?: Array<string>;
    /** Will be true if the table is already grouped by entities. */
    isEntityGrouped?: boolean;
    /** Column keys to skip summing. If omitted, all column types supported are summed. */
    skipSumming?: Array<string>;
    /**
     * @deprecated
     * Historically this represents the time saved on the entire page load. It's mostly used as an
     * alias for `metricSavings.LCP` now. We recommend using `metricSavings` directly for more
     * metric-specific savings estimates.
     */
    overallSavingsMs?: number;
    /** Total byte savings covered by this audit. */
    overallSavingsBytes?: number;
  }

  interface Screenshot extends BaseDetails {
    type: 'screenshot';
    timing: number;
    timestamp: number;
    data: string;
  }

  interface Rect {
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  }

  interface Table extends BaseDetails {
    type: 'table';
    headings: TableColumnHeading[];
    items: TableItem[];
    summary?: {
      wastedMs?: number;
      wastedBytes?: number;
    };
    /**
     * Columns to sort the items by, during grouping.
     * If omitted, entity groups will be sorted by the audit ordering vs. the new totals.
     */
    sortedBy?: Array<string>;
    /** Will be true if the table is already grouped by entities. */
    isEntityGrouped?: boolean;
    /** Column keys to skip summing. If omitted, all column types supported are summed. */
    skipSumming?: Array<string>;
  }

  /** A table item for rows that are nested within a top-level TableItem (row). */
  interface TableSubItems {
    type: 'subitems';
    items: TableItem[];
  }

  /**
   * A details type that is not rendered in the final report; usually used
   * for including debug information in the LHR. Can contain anything.
   */
  interface DebugData {
    type: 'debugdata';
    [p: string]: any;
  }

  interface TreemapData extends BaseDetails {
    type: 'treemap-data';
    nodes: Treemap.Node[];
  }

  /** String enum of possible types of values found within table items. */
  type ItemValueType = 'bytes' | 'code' | 'link' | 'ms' | 'multi' | 'node' | 'source-location' | 'numeric' | 'text' | 'thumbnail' | 'timespanMs' | 'url';

  /** Possible types of values found within table items. */
  type ItemValue = string | number | boolean | DebugData | NodeValue | SourceLocationValue | LinkValue | UrlValue | CodeValue | NumericValue | IcuMessage | TableSubItems;

  interface TableColumnHeading {
    /**
     * The name of the property within items being described.
     * If null, subItemsHeading must be defined, and the first table row in this column for
     * every item will be empty.
     * See legacy-javascript for an example.
     */
    key: string|null;
    /** Readable text label of the field. */
    label: IcuMessage | string;
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
    subItemsHeading?: {key: string, valueType?: ItemValueType, displayUnit?: string, granularity?: number};

    displayUnit?: string;
    granularity?: number;
  }

  interface TableItem {
    debugData?: DebugData;
    subItems?: TableSubItems;
    [p: string]: undefined | ItemValue;
  }

  /** A more specific table element used for `opportunity` tables. */
  interface OpportunityItem extends TableItem {
    url: string;
    wastedBytes?: number;
    totalBytes?: number;
    wastedMs?: number;
    debugData?: DebugData;
    [p: string]: undefined | ItemValue;
  }

  /**
   * A value used within a details object, intended to be displayed as code,
   * regardless of the controlling heading's valueType.
   */
  interface CodeValue {
    type: 'code';
    value: IcuMessage | string;
  }

  /**
   * A value used within a details object, intended to be displayed as a
   * link with text, regardless of the controlling heading's valueType.
   * If URL is the empty string, fallsback to a basic `TextValue`.
   */
  interface LinkValue {
    type: 'link',
    text: string;
    url: string;
  }

  /**
   * A value used within a details object, intended to be displayed an HTML
   * node, regardless of the controlling heading's valueType.
   */
  interface NodeValue {
    type: 'node';
    /** Unique identifier. */
    lhId?: string;
    path?: string;
    selector?: string;
    boundingRect?: Rect;
    /** An HTML snippet used to identify the node. */
    snippet?: string;
    /** A human-friendly text descriptor that's used to identify the node more quickly. */
    nodeLabel?: string;
  }

  /**
   * A value used within a details object, intended to be displayed as a URL
   * encoded with line and column info (url:line:column).
   */
  interface SourceLocationValue {
    type: 'source-location';
    /** A "url" representing the source file. May not be a valid URL, see `urlProvider`. */
    url: string;
    /**
     * - `network` when the url is the actual, observed resource url. This is always a valid URL.
     * - `comment` when the url comes from a sourceURL comment. This could be anything, really.
     */
    urlProvider: 'network' | 'comment';
    /** Zero-indexed. */
    line: number;
    /** Zero-indexed. */
    column: number;
    /** The original file location from the source map. */
    original?: {
      /** The relevant file from the map's `sources` array. */
      file: string;
      line: number;
      column: number;
    };
  }

  /**
   * A value used within a details object, intended to be displayed as a
   * linkified URL, regardless of the controlling heading's valueType.
   */
  interface UrlValue {
    type: 'url';
    value: string;
  }

  /**
   * Snippet of text with line numbers and annotations.
   */
  interface SnippetValue {
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

  /**
   * A value used within a details object, intended to be displayed as a ms timing
   * or a numeric value based on the metric name.
   */
  interface NumericValue {
    type: 'numeric',
    value: number,
    granularity?: number,
  }

}

export default Details;
