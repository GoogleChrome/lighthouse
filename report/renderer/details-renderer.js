/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./dom.js').DOM} DOM */

// Convenience types for localized AuditDetails.
/** @typedef {LH.FormattedIcu<LH.Audit.Details>} AuditDetails */
/** @typedef {LH.FormattedIcu<LH.Audit.Details.Opportunity>} OpportunityTable */
/** @typedef {LH.FormattedIcu<LH.Audit.Details.Table>} Table */
/** @typedef {LH.FormattedIcu<LH.Audit.Details.TableItem>} TableItem */
/** @typedef {LH.FormattedIcu<LH.Audit.Details.ItemValue>} TableItemValue */
/** @typedef {LH.FormattedIcu<LH.Audit.Details.TableColumnHeading>} TableColumnHeading */
/** @typedef {LH.FormattedIcu<LH.Audit.Details.Table | LH.Audit.Details.Opportunity>} TableLike */

import {Util} from '../../shared/util.js';
import {CriticalRequestChainRenderer} from './crc-details-renderer.js';
import {ElementScreenshotRenderer} from './element-screenshot-renderer.js';
import {Globals} from './report-globals.js';
import {ReportUtils} from './report-utils.js';

const URL_PREFIXES = ['http://', 'https://', 'data:'];
const SUMMABLE_VALUETYPES = ['bytes', 'numeric', 'ms', 'timespanMs'];

export class DetailsRenderer {
  /**
   * @param {DOM} dom
   * @param {{fullPageScreenshot?: LH.Result.FullPageScreenshot, entities?: LH.Result.Entities}} [options]
   */
  constructor(dom, options = {}) {
    this._dom = dom;
    this._fullPageScreenshot = options.fullPageScreenshot;
    this._entities = options.entities;
  }

  /**
   * @param {AuditDetails} details
   * @return {Element|null}
   */
  render(details) {
    switch (details.type) {
      case 'filmstrip':
        return this._renderFilmstrip(details);
      case 'list':
        return this._renderList(details);
      case 'table':
      case 'opportunity':
        return this._renderTable(details);
      case 'criticalrequestchain':
        return CriticalRequestChainRenderer.render(this._dom, details, this);

      // Internal-only details, not for rendering.
      case 'screenshot':
      case 'debugdata':
      case 'treemap-data':
        return null;

      default: {
        // @ts-expect-error - all detail types need to be handled above so tsc thinks this is unreachable.
        // Call _renderUnknown() to be forward compatible with new, unexpected detail types.
        return this._renderUnknown(details.type, details);
      }
    }
  }

  /**
   * @param {{value: number, granularity?: number}} details
   * @return {Element}
   */
  _renderBytes(details) {
    // TODO: handle displayUnit once we have something other than 'KiB'
    const value = Globals.i18n.formatBytesToKiB(details.value, details.granularity || 0.1);
    const textEl = this._renderText(value);
    textEl.title = Globals.i18n.formatBytes(details.value);
    return textEl;
  }

  /**
   * @param {{value: number, granularity?: number, displayUnit?: string}} details
   * @return {Element}
   */
  _renderMilliseconds(details) {
    let value;
    if (details.displayUnit === 'duration') {
      value = Globals.i18n.formatDuration(details.value);
    } else {
      value = Globals.i18n.formatMilliseconds(details.value, details.granularity || 10);
    }

    return this._renderText(value);
  }

  /**
   * @param {string} text
   * @return {HTMLElement}
   */
  renderTextURL(text) {
    const url = text;

    let displayedPath;
    let displayedHost;
    let title;
    try {
      const parsed = Util.parseURL(url);
      displayedPath = parsed.file === '/' ? parsed.origin : parsed.file;
      displayedHost = parsed.file === '/' || parsed.hostname === '' ? '' : `(${parsed.hostname})`;
      title = url;
    } catch (e) {
      displayedPath = url;
    }

    const element = this._dom.createElement('div', 'lh-text__url');
    element.append(this._renderLink({text: displayedPath, url}));

    if (displayedHost) {
      const hostElem = this._renderText(displayedHost);
      hostElem.classList.add('lh-text__url-host');
      element.append(hostElem);
    }

    if (title) {
      element.title = url;
      // set the url on the element's dataset which we use to check 3rd party origins
      element.dataset.url = url;
    }
    return element;
  }

  /**
   * @param {{text: string, url: string}} details
   * @return {HTMLElement}
   */
  _renderLink(details) {
    const a = this._dom.createElement('a');
    this._dom.safelySetHref(a, details.url);

    if (!a.href) {
      // Fall back to just the link text if invalid or protocol not allowed.
      const element = this._renderText(details.text);
      element.classList.add('lh-link');
      return element;
    }

    a.rel = 'noopener';
    a.target = '_blank';
    a.textContent = details.text;
    a.classList.add('lh-link');
    return a;
  }

  /**
   * @param {string} text
   * @return {HTMLDivElement}
   */
  _renderText(text) {
    const element = this._dom.createElement('div', 'lh-text');
    element.textContent = text;
    return element;
  }

  /**
   * @param {{value: number, granularity?: number}} details
   * @return {Element}
   */
  _renderNumeric(details) {
    const value = Globals.i18n.formatNumber(details.value, details.granularity || 0.1);
    const element = this._dom.createElement('div', 'lh-numeric');
    element.textContent = value;
    return element;
  }

  /**
   * Create small thumbnail with scaled down image asset.
   * @param {string} details
   * @return {Element}
   */
  _renderThumbnail(details) {
    const element = this._dom.createElement('img', 'lh-thumbnail');
    const strValue = details;
    element.src = strValue;
    element.title = strValue;
    element.alt = '';
    return element;
  }

  /**
   * @param {string} type
   * @param {*} value
   */
  _renderUnknown(type, value) {
    // eslint-disable-next-line no-console
    console.error(`Unknown details type: ${type}`, value);
    const element = this._dom.createElement('details', 'lh-unknown');
    this._dom.createChildOf(element, 'summary').textContent =
      `We don't know how to render audit details of type \`${type}\`. ` +
      'The Lighthouse version that collected this data is likely newer than the Lighthouse ' +
      'version of the report renderer. Expand for the raw JSON.';
    this._dom.createChildOf(element, 'pre').textContent = JSON.stringify(value, null, 2);
    return element;
  }

  /**
   * Render a details item value for embedding in a table. Renders the value
   * based on the heading's valueType, unless the value itself has a `type`
   * property to override it.
   * @param {TableItemValue} value
   * @param {LH.Audit.Details.TableColumnHeading} heading
   * @return {Element|null}
   */
  _renderTableValue(value, heading) {
    if (value === undefined || value === null) {
      return null;
    }

    // First deal with the possible object forms of value.
    if (typeof value === 'object') {
      // The value's type overrides the heading's for this column.
      switch (value.type) {
        case 'code': {
          return this._renderCode(value.value);
        }
        case 'link': {
          return this._renderLink(value);
        }
        case 'node': {
          return this.renderNode(value);
        }
        case 'numeric': {
          return this._renderNumeric(value);
        }
        case 'source-location': {
          return this.renderSourceLocation(value);
        }
        case 'url': {
          return this.renderTextURL(value.value);
        }
        default: {
          return this._renderUnknown(value.type, value);
        }
      }
    }

    // Next, deal with primitives.
    switch (heading.valueType) {
      case 'bytes': {
        const numValue = Number(value);
        return this._renderBytes({value: numValue, granularity: heading.granularity});
      }
      case 'code': {
        const strValue = String(value);
        return this._renderCode(strValue);
      }
      case 'ms': {
        const msValue = {
          value: Number(value),
          granularity: heading.granularity,
          displayUnit: heading.displayUnit,
        };
        return this._renderMilliseconds(msValue);
      }
      case 'numeric': {
        const numValue = Number(value);
        return this._renderNumeric({value: numValue, granularity: heading.granularity});
      }
      case 'text': {
        const strValue = String(value);
        return this._renderText(strValue);
      }
      case 'thumbnail': {
        const strValue = String(value);
        return this._renderThumbnail(strValue);
      }
      case 'timespanMs': {
        const numValue = Number(value);
        return this._renderMilliseconds({value: numValue});
      }
      case 'url': {
        const strValue = String(value);
        if (URL_PREFIXES.some(prefix => strValue.startsWith(prefix))) {
          return this.renderTextURL(strValue);
        } else {
          // Fall back to <pre> rendering if not actually a URL.
          return this._renderCode(strValue);
        }
      }
      default: {
        return this._renderUnknown(heading.valueType, value);
      }
    }
  }

  /**
   * Returns a new heading where the values are defined first by `heading.subItemsHeading`,
   * and secondly by `heading`. If there is no subItemsHeading, returns null, which will
   * be rendered as an empty column.
   * @param {LH.Audit.Details.TableColumnHeading} heading
   * @return {LH.Audit.Details.TableColumnHeading | null}
   */
  _getDerivedSubItemsHeading(heading) {
    if (!heading.subItemsHeading) return null;
    return {
      key: heading.subItemsHeading.key || '',
      valueType: heading.subItemsHeading.valueType || heading.valueType,
      granularity: heading.subItemsHeading.granularity || heading.granularity,
      displayUnit: heading.subItemsHeading.displayUnit || heading.displayUnit,
      label: '',
    };
  }

  /**
   * @param {TableItem} item
   * @param {(LH.Audit.Details.TableColumnHeading | null)[]} headings
   */
  _renderTableRow(item, headings) {
    const rowElem = this._dom.createElement('tr');

    for (const heading of headings) {
      // Empty cell if no heading or heading key for this column.
      if (!heading || !heading.key) {
        this._dom.createChildOf(rowElem, 'td', 'lh-table-column--empty');
        continue;
      }

      const value = item[heading.key];
      let valueElement;
      if (value !== undefined && value !== null) {
        valueElement = this._renderTableValue(value, heading);
      }

      if (valueElement) {
        const classes = `lh-table-column--${heading.valueType}`;
        this._dom.createChildOf(rowElem, 'td', classes).append(valueElement);
      } else {
        // Empty cell is rendered for a column if:
        // - the pair is null
        // - the heading key is null
        // - the value is undefined/null
        this._dom.createChildOf(rowElem, 'td', 'lh-table-column--empty');
      }
    }

    return rowElem;
  }

  /**
   * Renders one or more rows from a details table item. A single table item can
   * expand into multiple rows, if there is a subItemsHeading.
   * @param {TableItem} item
   * @param {LH.Audit.Details.TableColumnHeading[]} headings
   */
  _renderTableRowsFromItem(item, headings) {
    const fragment = this._dom.createFragment();
    fragment.append(this._renderTableRow(item, headings));

    if (!item.subItems) return fragment;

    const subItemsHeadings = headings.map(this._getDerivedSubItemsHeading);
    if (!subItemsHeadings.some(Boolean)) return fragment;

    for (const subItem of item.subItems.items) {
      const rowEl = this._renderTableRow(subItem, subItemsHeadings);
      rowEl.classList.add('lh-sub-item-row');
      fragment.append(rowEl);
    }

    return fragment;
  }

  /**
   * Adorn a table row element with entity chips based on [data-entity] attribute.
   * @param {HTMLTableRowElement} rowEl
   */
  _adornEntityGroupRow(rowEl) {
    const entityName = rowEl.dataset.entity;
    if (!entityName) return;
    const matchedEntity = this._entities?.find(e => e.name === entityName);
    if (!matchedEntity) return;

    const firstTdEl = this._dom.find('td', rowEl);

    if (matchedEntity.category) {
      const categoryChipEl = this._dom.createElement('span');
      categoryChipEl.classList.add('lh-audit__adorn');
      categoryChipEl.textContent = matchedEntity.category;
      firstTdEl.append(' ', categoryChipEl);
    }

    if (matchedEntity.isFirstParty) {
      const firstPartyChipEl = this._dom.createElement('span');
      firstPartyChipEl.classList.add('lh-audit__adorn', 'lh-audit__adorn1p');
      firstPartyChipEl.textContent = Globals.strings.firstPartyChipLabel;
      firstTdEl.append(' ', firstPartyChipEl);
    }

    if (matchedEntity.homepage) {
      const entityLinkEl = this._dom.createElement('a');
      entityLinkEl.href = matchedEntity.homepage;
      entityLinkEl.target = '_blank';
      entityLinkEl.title = Globals.strings.openInANewTabTooltip;
      entityLinkEl.classList.add('lh-report-icon--external');
      firstTdEl.append(' ', entityLinkEl);
    }
  }

  /**
   * Renders an entity-grouped row.
   * @param {TableItem} item
   * @param {LH.Audit.Details.TableColumnHeading[]} headings
   */
  _renderEntityGroupRow(item, headings) {
    const entityColumnHeading = {...headings[0]};
    // In subitem-situations (unused-javascript), ensure Entity name is not rendered as code, etc.
    entityColumnHeading.valueType = 'text';
    const groupedRowHeadings = [entityColumnHeading, ...headings.slice(1)];
    const fragment = this._dom.createFragment();
    fragment.append(this._renderTableRow(item, groupedRowHeadings));
    this._dom.find('tr', fragment).classList.add('lh-row--group');
    return fragment;
  }

  /**
   * Returns an array of entity-grouped TableItems to use as the top-level rows in
   * an grouped table. Each table item returned represents a unique entity, with every
   * applicable key that can be grouped as a property. Optionally, supported columns are
   * summed by entity, and sorted by specified keys.
   * @param {TableLike} details
   * @return {TableItem[]}
   */
  _getEntityGroupItems(details) {
    const {items, headings, sortedBy} = details;
    // Exclude entity-grouped audits and results without entity classification.
    // Eg. Third-party Summary comes entity-grouped.
    if (!items.length || details.isEntityGrouped || !items.some(item => item.entity)) {
      return [];
    }

    const skippedColumns = new Set(details.skipSumming || []);
    /** @type {string[]} */
    const summableColumns = [];
    for (const heading of headings) {
      if (!heading.key || skippedColumns.has(heading.key)) continue;
      if (SUMMABLE_VALUETYPES.includes(heading.valueType)) {
        summableColumns.push(heading.key);
      }
    }

    // Grab the first column's key to group by entity
    const firstColumnKey = headings[0].key;
    if (!firstColumnKey) return [];

    /** @type {Map<string | undefined, TableItem>} */
    const byEntity = new Map();
    for (const item of items) {
      const entityName = typeof item.entity === 'string' ? item.entity : undefined;
      const groupedItem = byEntity.get(entityName) || {
        [firstColumnKey]: entityName || Globals.strings.unattributable,
        entity: entityName,
      };
      for (const key of summableColumns) {
        groupedItem[key] = Number(groupedItem[key] || 0) + Number(item[key] || 0);
      }
      byEntity.set(entityName, groupedItem);
    }

    const result = [...byEntity.values()];
    if (sortedBy) {
      result.sort(ReportUtils.getTableItemSortComparator(sortedBy));
    }
    return result;
  }

  /**
   * @param {TableLike} details
   * @return {Element}
   */
  _renderTable(details) {
    if (!details.items.length) return this._dom.createElement('span');

    const tableElem = this._dom.createElement('table', 'lh-table');
    const theadElem = this._dom.createChildOf(tableElem, 'thead');
    const theadTrElem = this._dom.createChildOf(theadElem, 'tr');

    for (const heading of details.headings) {
      const valueType = heading.valueType || 'text';
      const classes = `lh-table-column--${valueType}`;
      const labelEl = this._dom.createElement('div', 'lh-text');
      labelEl.textContent = heading.label;
      this._dom.createChildOf(theadTrElem, 'th', classes).append(labelEl);
    }

    const entityItems = this._getEntityGroupItems(details);
    const tbodyElem = this._dom.createChildOf(tableElem, 'tbody');
    if (entityItems.length) {
      for (const entityItem of entityItems) {
        const entityName = typeof entityItem.entity === 'string' ? entityItem.entity : undefined;
        const entityGroupFragment = this._renderEntityGroupRow(entityItem, details.headings);
        // Render all the items that match the heading row
        for (const item of details.items.filter((item) => item.entity === entityName)) {
          entityGroupFragment.append(this._renderTableRowsFromItem(item, details.headings));
        }
        const rowEls = this._dom.findAll('tr', entityGroupFragment);
        if (entityName && rowEls.length) {
          rowEls.forEach(row => row.dataset.entity = entityName);
          this._adornEntityGroupRow(rowEls[0]);
        }
        tbodyElem.append(entityGroupFragment);
      }
    } else {
      let even = true;
      for (const item of details.items) {
        const rowsFragment = this._renderTableRowsFromItem(item, details.headings);
        const rowEls = this._dom.findAll('tr', rowsFragment);
        const firstRowEl = rowEls[0];
        if (typeof item.entity === 'string') {
          firstRowEl.dataset.entity = item.entity;
        }
        if (details.isEntityGrouped && item.entity) {
          // If the audit is already grouped, consider first row as a heading row.
          firstRowEl.classList.add('lh-row--group');
          this._adornEntityGroupRow(firstRowEl);
        } else {
          for (const rowEl of rowEls) {
            // For zebra styling (same shade for a row and its sub-rows).
            rowEl.classList.add(even ? 'lh-row--even' : 'lh-row--odd');
          }
        }
        even = !even;
        tbodyElem.append(rowsFragment);
      }
    }

    return tableElem;
  }

  /**
   * @param {LH.FormattedIcu<LH.Audit.Details.List>} details
   * @return {Element}
   */
  _renderList(details) {
    const listContainer = this._dom.createElement('div', 'lh-list');

    details.items.forEach(item => {
      const listItem = this.render(item);
      if (!listItem) return;
      listContainer.append(listItem);
    });

    return listContainer;
  }

  /**
   * @param {LH.Audit.Details.NodeValue} item
   * @return {Element}
   */
  renderNode(item) {
    const element = this._dom.createElement('span', 'lh-node');
    if (item.nodeLabel) {
      const nodeLabelEl = this._dom.createElement('div');
      nodeLabelEl.textContent = item.nodeLabel;
      element.append(nodeLabelEl);
    }
    if (item.snippet) {
      const snippetEl = this._dom.createElement('div');
      snippetEl.classList.add('lh-node__snippet');
      snippetEl.textContent = item.snippet;
      element.append(snippetEl);
    }
    if (item.selector) {
      element.title = item.selector;
    }
    if (item.path) element.setAttribute('data-path', item.path);
    if (item.selector) element.setAttribute('data-selector', item.selector);
    if (item.snippet) element.setAttribute('data-snippet', item.snippet);

    if (!this._fullPageScreenshot) return element;

    const rect = item.lhId && this._fullPageScreenshot.nodes[item.lhId];
    if (!rect || rect.width === 0 || rect.height === 0) return element;

    const maxThumbnailSize = {width: 147, height: 100};
    const elementScreenshot = ElementScreenshotRenderer.render(
      this._dom,
      this._fullPageScreenshot.screenshot,
      rect,
      maxThumbnailSize
    );
    if (elementScreenshot) element.prepend(elementScreenshot);

    return element;
  }

  /**
   * @param {LH.Audit.Details.SourceLocationValue} item
   * @return {Element|null}
   * @protected
   */
  renderSourceLocation(item) {
    if (!item.url) {
      return null;
    }

    // Lines are shown as one-indexed.
    const generatedLocation = `${item.url}:${item.line + 1}:${item.column}`;
    let sourceMappedOriginalLocation;
    if (item.original) {
      const file = item.original.file || '<unmapped>';
      sourceMappedOriginalLocation = `${file}:${item.original.line + 1}:${item.original.column}`;
    }

    // We render slightly differently based on presence of source map and provenance of URL.
    let element;
    if (item.urlProvider === 'network' && sourceMappedOriginalLocation) {
      element = this._renderLink({
        url: item.url,
        text: sourceMappedOriginalLocation,
      });
      element.title = `maps to generated location ${generatedLocation}`;
    } else if (item.urlProvider === 'network' && !sourceMappedOriginalLocation) {
      element = this.renderTextURL(item.url);
      this._dom.find('.lh-link', element).textContent += `:${item.line + 1}:${item.column}`;
    } else if (item.urlProvider === 'comment' && sourceMappedOriginalLocation) {
      element = this._renderText(`${sourceMappedOriginalLocation} (from source map)`);
      element.title = `${generatedLocation} (from sourceURL)`;
    } else if (item.urlProvider === 'comment' && !sourceMappedOriginalLocation) {
      element = this._renderText(`${generatedLocation} (from sourceURL)`);
    } else {
      return null;
    }

    element.classList.add('lh-source-location');
    element.setAttribute('data-source-url', item.url);
    // DevTools expects zero-indexed lines.
    element.setAttribute('data-source-line', String(item.line));
    element.setAttribute('data-source-column', String(item.column));

    return element;
  }

  /**
   * @param {LH.Audit.Details.Filmstrip} details
   * @return {Element}
   */
  _renderFilmstrip(details) {
    const filmstripEl = this._dom.createElement('div', 'lh-filmstrip');

    for (const thumbnail of details.items) {
      const frameEl = this._dom.createChildOf(filmstripEl, 'div', 'lh-filmstrip__frame');
      const imgEl = this._dom.createChildOf(frameEl, 'img', 'lh-filmstrip__thumbnail');
      imgEl.src = thumbnail.data;
      imgEl.alt = `Screenshot`;
    }
    return filmstripEl;
  }

  /**
   * @param {string} text
   * @return {Element}
   */
  _renderCode(text) {
    const pre = this._dom.createElement('pre', 'lh-code');
    pre.textContent = text;
    return pre;
  }
}
