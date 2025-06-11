/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env browser */

/* globals webtreemap strings */

import {TreemapUtil} from './util.js';
import {DragAndDrop} from '../../../viewer/app/src/drag-and-drop.js';
import {GithubApi} from '../../../viewer/app/src/github-api.js';
import {I18nFormatter} from '../../../report/renderer/i18n-formatter.js';
import {TextEncoding} from '../../../report/renderer/text-encoding.js';
import {Logger} from '../../../report/renderer/logger.js';
import {DOM} from '../../../report/renderer/dom.js';

/** @typedef {LH.Treemap.Node & {dom?: HTMLElement}} NodeWithElement */

const dom = new DOM(document, document.documentElement);

const DUPLICATED_MODULES_IGNORE_THRESHOLD = 1024 * 0.5;

const logEl = document.querySelector('div#lh-log');
if (!logEl) {
  throw new Error('logger element not found');
}
const logger = new Logger(logEl);
// `getGistFileContentAsJson` expects logger to be defined globally.
window.logger = logger;

/** @type {TreemapViewer} */
let treemapViewer;

class TreemapViewer {
  /**
   * @param {LH.Treemap.Options} options
   * @param {HTMLElement} el
   */
  constructor(options, el) {
    this.abortController = new AbortController();

    const scriptTreemapData = options.lhr.audits['script-treemap-data'].details;
    if (!scriptTreemapData || scriptTreemapData.type !== 'treemap-data') {
      throw new Error('missing script-treemap-data');
    }

    // Since ~Apr 2025, script-treemap-data contains transfer size data. If present,
    // the app displays all byte sizes in terms of transfer size. Otherwise, resource
    // size is used.
    this.showTransferSize = scriptTreemapData.nodes.every(node => node.encodedBytes !== undefined);
    /** @type {'encodedBytes'|'resourceBytes'} */
    this.defaultPartitionBy = this.showTransferSize ? 'encodedBytes' : 'resourceBytes';
    // DevTools RPP doesn't have unused bytes in the info it sends.
    this.showUnusedBytes = scriptTreemapData.nodes.some(node => node.unusedBytes !== undefined);

    /** @type {{[group: string]: LH.Treemap.Node[]}} */
    this.depthOneNodesByGroup = {
      scripts: scriptTreemapData.nodes,
    };

    /**
     * Used to associate every node with a particular depth one node,
     * so that all nodes from the same depth one node can be colored
     * the same.
     * @type {WeakMap<LH.Treemap.Node, LH.Treemap.Node>}
     */
    this.nodeToDepthOneNodeMap = new WeakMap();
    for (const depthOneNodes of Object.values(this.depthOneNodesByGroup)) {
      for (const depthOneNode of depthOneNodes) {
        TreemapUtil.walk(depthOneNode, node => this.nodeToDepthOneNodeMap.set(node, depthOneNode));
      }
    }

    /** @type {WeakMap<LH.Treemap.Node, LH.Treemap.NodePath>} */
    this.nodeToPathMap = new WeakMap();

    /**
     * Used to store the size and unused bytes of each node, multiplied by
     * compression ratio depending on the state of `this.showTransferSize`.
     * Used to avoid mutating the input data.
     * @type {WeakMap<LH.Treemap.Node, {size: number, resourceBytes: number, encodedBytes?: number, unusedBytes?: number}>}
     */
    this.nodeToSizesMap = new WeakMap();

    // Priority breakdown:
    // 1) `mainDocumentUrl`: This is what we want post-10.0 for navigation reports.
    // 2) `finalUrl`: This is what we want pre-10.0 for navigation reports.
    // 3) `finalDisplayedUrl`: Timespan and snapshot reports don't have either of the above URLs, so use this one for display / origin check purposes.
    const documentUrlString = options.lhr.mainDocumentUrl ||
      options.lhr.finalUrl ||
      options.lhr.finalDisplayedUrl;

    this.documentUrl = new URL(documentUrlString);
    this.el = el;
    this.getHueForD1NodeName = TreemapUtil.stableHasher(TreemapUtil.COLOR_HUES);

    // These depth one node uses the network URL for the name, but we want
    // to elide common parts of the URL so text fits better in the UI.
    for (const node of this.depthOneNodesByGroup.scripts) {
      try {
        const url = new URL(node.name);
        node.name = TreemapUtil.elideSameOrigin(url, this.documentUrl);
        const isInlineHtmlNode =
          node.children?.every(child => child.name.startsWith('(inline)')) ||
          // Backport for treemap data that does not add the "(inline)" prefix to each inline script.
          // This is pre-10.0 when the `finalUrl` represented the main document url.
          url.href === this.documentUrl.href;
        if (isInlineHtmlNode) {
          node.name += ' (inline)';
        }
      } catch {}
    }

    this.initialViewModeId = options.initialView;

    /* eslint-disable no-unused-expressions */
    /** @type {LH.Treemap.Node} */
    this.currentTreemapRoot;
    /** @type {LH.Treemap.ViewMode} */
    this.currentViewMode;
    /** @type {LH.Treemap.Selector} */
    this.selector;
    /** @type {LH.Treemap.ViewMode[]} */
    this.viewModes;
    /** @type {RenderState=} */
    this.previousRenderState;
    /** @type {WeakMap<HTMLElement, NodeWithElement|NodeWithElement[]>} */
    this.tableRowToNodeMap = new WeakMap();
    /** @type {WebTreeMap} */
    this.treemap;
    /*  eslint-enable no-unused-expressions */

    const urlEl = dom.find('a.lh-header--url');
    urlEl.textContent = this.documentUrl.toString();
    urlEl.href = this.documentUrl.toString();

    this.viewModeSelector = this.createViewModeSelector();
    this.bundleSelector = this.createBundleSelector();
    this.toggleTable(window.innerWidth >= 600);
    this.initListeners();
    this.setSelector({type: 'group', value: 'scripts'});
    const rootBytesEl = dom.find('span.lh-header--url-bytes');
    rootBytesEl.textContent =
      TreemapUtil.i18n.formatBytesWithBestUnit(this.getNodeSizes(this.currentTreemapRoot).size);
    rootBytesEl.title = this.showTransferSize ?
      TreemapUtil.strings.transferBytesLabel :
      TreemapUtil.strings.resourceBytesLabel;
    this.render();
  }

  createViewModeSelector() {
    const viewModeSelectorEl = dom.find('select.view-mode-selector');
    viewModeSelectorEl.textContent = ''; // Clear just in case document was saved with Ctrl+S.

    viewModeSelectorEl.addEventListener('change', () => {
      const index = Number(viewModeSelectorEl.value);
      const viewMode = this.viewModes[index];
      this.setViewMode(viewMode);
      this.render();
    });

    return viewModeSelectorEl;
  }

  updateViewModeSelector() {
    this.viewModeSelector.textContent = '';
    for (const [i, viewMode] of this.viewModes.entries()) {
      const optionEl = dom.createChildOf(this.viewModeSelector, 'option');
      optionEl.value = String(i);
      optionEl.textContent = `${viewMode.label} (${viewMode.subLabel})`;
      optionEl.disabled = !viewMode.enabled;
    }
    this.viewModeSelector.selectedIndex =
      this.viewModes.findIndex(mode => mode.id === this.currentViewMode.id) ?? 0;
  }

  createBundleSelector() {
    const bundleSelectorEl = dom.find('select.bundle-selector');
    bundleSelectorEl.textContent = ''; // Clear just in case document was saved with Ctrl+S.

    /** @type {LH.Treemap.Selector[]} */
    const selectors = [];

    /**
     * @param {LH.Treemap.Selector} selector
     * @param {string} text
     */
    function makeOption(selector, text) {
      const optionEl = dom.createChildOf(bundleSelectorEl, 'option');
      optionEl.value = String(selectors.length);
      selectors.push(selector);
      optionEl.textContent = text;
    }

    for (const [group, depthOneNodes] of Object.entries(this.depthOneNodesByGroup)) {
      const allLabel = {
        scripts: TreemapUtil.strings.allScriptsDropdownLabel,
      }[group] || `All ${group}`;
      makeOption({type: 'group', value: group}, allLabel);
      for (const depthOneNode of depthOneNodes) {
        // Only add bundles.
        if (!depthOneNode.children) continue;

        makeOption({type: 'depthOneNode', value: depthOneNode.name}, depthOneNode.name);
      }
    }

    const currentSelectorIndex = selectors.findIndex(s => {
      return this.selector &&
        s.type === this.selector.type &&
        s.value === this.selector.value;
    });
    bundleSelectorEl.value = String(currentSelectorIndex !== -1 ? currentSelectorIndex : 0);
    bundleSelectorEl.addEventListener('change', () => {
      const index = Number(bundleSelectorEl.value);
      const selector = selectors[index];
      this.setSelector(selector);
      this.render();
    });
  }

  initListeners() {
    const options = {signal: this.abortController.signal};
    const treemapEl = dom.find('.lh-treemap');

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(treemapEl);

    treemapEl.addEventListener('click', (e) => {
      if (!(e.target instanceof HTMLElement)) return;

      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;

      this.updateColors();
    }, options);

    treemapEl.addEventListener('keyup', (e) => {
      if (!(e instanceof KeyboardEvent)) return;

      if (e.key === 'Enter') this.updateColors();

      if (e.key === 'Escape' && this.treemap) {
        this.treemap.zoom([]); // zoom out to root
      }
    }, options);

    treemapEl.addEventListener('mouseover', (e) => {
      if (!(e.target instanceof HTMLElement)) return;

      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;

      nodeEl.classList.add('webtreemap-node--hover');
    }, options);

    treemapEl.addEventListener('mouseout', (e) => {
      if (!(e.target instanceof HTMLElement)) return;

      const nodeEl = e.target.closest('.webtreemap-node');
      if (!nodeEl) return;

      nodeEl.classList.remove('webtreemap-node--hover');
    }, options);

    dom.find('.lh-table').addEventListener('mouseover', e => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const el = target.closest('.lh-table-row');
      if (!(el instanceof HTMLElement)) return;

      const nodes = this.tableRowToNodeMap.get(el);
      if (!nodes) return;

      for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
        if (!node.dom) continue;

        // TODO: make this bi-directional.
        node.dom.classList.add('webtreemap-node--hover');
        el.addEventListener('mouseout', () => {
          for (const hoverEl of treemapEl.querySelectorAll('.webtreemap-node--hover')) {
            hoverEl.classList.remove('webtreemap-node--hover');
          }
        }, {once: true});
      }
    }, options);

    const toggleTableBtn = dom.find('.lh-button--toggle-table');
    toggleTableBtn.addEventListener('click', () => treemapViewer.toggleTable(), options);
  }

  applyActiveViewModeClass() {
    for (const viewMode of this.viewModes) {
      const isMatch = viewMode.id === this.currentViewMode.id;
      this.el.classList.toggle(`lh-treemap--view-mode--${viewMode.id}`, isMatch);
    }
  }

  /**
   * @param {LH.Treemap.Node[]} nodes
   * @return {LH.Treemap.Node}
   */
  wrapNodesInNewRootNode(nodes) {
    const children = [...nodes];
    return {
      name: this.documentUrl.toString(),
      resourceBytes: children.reduce((acc, cur) => cur.resourceBytes + acc, 0),
      encodedBytes: children.reduce((acc, cur) => (cur.encodedBytes ?? 0) + acc, 0),
      unusedBytes: children.reduce((acc, cur) => (cur.unusedBytes || 0) + acc, 0),
      children,
    };
  }

  createViewModes() {
    const rootSize = this.getNodeSizes(this.currentTreemapRoot).size;
    const app = this;

    /**
     * @param {LH.Treemap.Node} root
     * @return {LH.Treemap.ViewMode|undefined}
     */
    function createUnusedBytesViewMode(root) {
      if (!app.showUnusedBytes) return;

      const sizes = app.getNodeSizes(root);
      if (sizes.unusedBytes === undefined) return;

      return {
        id: 'unused-bytes',
        label: TreemapUtil.strings.unusedBytesLabel,
        subLabel: TreemapUtil.i18n.formatBytesWithBestUnit(sizes.unusedBytes),
        enabled: true,
      };
    }

    /**
     * @param {LH.Treemap.Node} root
     * @return {LH.Treemap.ViewMode|undefined}
     */
    const createDuplicateModulesViewMode = (root) => {
      /** @type {Map<string, Array<{node: LH.Treemap.Node, path: LH.Treemap.NodePath}>>} */
      const moduleNameToNodes = new Map();
      for (const d1Node of root.children || []) {
        TreemapUtil.walk(d1Node, (node, path) => {
          if (node.children) return;
          if (!node.duplicatedNormalizedModuleName) return;

          const nodes = moduleNameToNodes.get(node.duplicatedNormalizedModuleName) || [];
          nodes.push({node, path});
          moduleNameToNodes.set(node.duplicatedNormalizedModuleName, nodes);
        });
      }

      const getHueForModuleNodeName = TreemapUtil.stableHasher(TreemapUtil.COLOR_HUES);
      let potentialByteSavings = 0;

      /** @type {LH.Treemap.Highlight[]} */
      const highlights = [];
      for (const [moduleName, nodesWithSameModuleName] of moduleNameToNodes.entries()) {
        if (nodesWithSameModuleName.length === 1) continue;

        const bytes = [];
        for (const {node} of nodesWithSameModuleName) {
          bytes.push(this.getNodeSizes(node).size);
        }

        // Sum all but the largest copy.
        bytes.sort((a, b) => b - a);
        let duplicatedBytes = 0;
        for (let i = 1; i < bytes.length; i++) duplicatedBytes += bytes[i];
        if (duplicatedBytes < DUPLICATED_MODULES_IGNORE_THRESHOLD) continue;

        for (const {path} of nodesWithSameModuleName) {
          highlights.push({
            path: [root.name, ...path],
            color: this.getColorFromHue(getHueForModuleNodeName(moduleName)),
          });
        }
        potentialByteSavings += duplicatedBytes;
      }

      let enabled = true;
      if (highlights.length === 0) enabled = false;

      return {
        id: 'duplicate-modules',
        label: TreemapUtil.strings.duplicateModulesLabel,
        subLabel: enabled ?
          TreemapUtil.i18n.formatBytesWithBestUnit(potentialByteSavings) : 'N/A',
        highlights,
        enabled,
      };
    };

    /** @type {LH.Treemap.ViewMode[]} */
    const viewModes = [];

    viewModes.push({
      id: 'all',
      label: TreemapUtil.strings.allLabel,
      subLabel: TreemapUtil.i18n.formatBytesWithBestUnit(rootSize),
      enabled: true,
    });

    const unusedBytesViewMode = createUnusedBytesViewMode(this.currentTreemapRoot);
    if (unusedBytesViewMode) viewModes.push(unusedBytesViewMode);

    const duplicateModulesViewMode = createDuplicateModulesViewMode(this.currentTreemapRoot);
    if (duplicateModulesViewMode) viewModes.push(duplicateModulesViewMode);

    return viewModes;
  }

  /**
   * @param {LH.Treemap.Selector} selector
   */
  setSelector(selector) {
    this.selector = selector;

    if (selector.type === 'group') {
      this.currentTreemapRoot =
        this.wrapNodesInNewRootNode(this.depthOneNodesByGroup[selector.value]);
    } else if (selector.type === 'depthOneNode') {
      let node;
      outer: for (const depthOneNodes of Object.values(this.depthOneNodesByGroup)) {
        for (const depthOneNode of depthOneNodes) {
          if (depthOneNode.name === selector.value) {
            node = depthOneNode;
            break outer;
          }
        }
      }

      if (!node) {
        throw new Error('unknown depthOneNode: ' + selector.value);
      }

      this.currentTreemapRoot = node;
    } else {
      throw new Error('unknown selector: ' + JSON.stringify(selector));
    }

    this.viewModes = this.createViewModes();
    const currentViewModeIsDisabled = this.currentViewMode &&
      this.viewModes.find(v => v.id === this.currentViewMode.id && !v.enabled);
    if (!this.currentViewMode || currentViewModeIsDisabled) {
      this.currentViewMode =
        this.viewModes.find(v => v.id === this.initialViewModeId && v.enabled) ?? this.viewModes[0];
    }
  }

  /**
   * @param {LH.Treemap.ViewMode} viewMode
   */
  setViewMode(viewMode) {
    this.currentViewMode = viewMode;
  }

  render() {
    const rootChanged =
      !this.previousRenderState || this.previousRenderState.root !== this.currentTreemapRoot;
    const viewChanged =
      !this.previousRenderState || this.previousRenderState.viewMode !== this.currentViewMode;

    if (rootChanged) {
      this.nodeToPathMap = new Map();
      TreemapUtil.walk(this.currentTreemapRoot, (node, path) => this.nodeToPathMap.set(node, path));
      this.updateViewModeSelector();

      // Setup the partitioning.
      const partitionBy = this.currentViewMode.partitionBy ?? this.defaultPartitionBy;
      TreemapUtil.walk(this.currentTreemapRoot, node => {
        // webtreemap will store `dom` on the data to speed up operations.
        // However, when we change the underlying data representation, we need to delete
        // all the cached DOM elements. Otherwise, the rendering will be incorrect when,
        // for example, switching between "All JavaScript" and a specific bundle.
        delete node.dom;

        const sizes = this.getNodeSizes(node);
        let size = 0;
        if (partitionBy === 'encodedBytes' || partitionBy === 'resourceBytes') {
          size = sizes.size;
        } else {
          size = node[partitionBy] ?? 0;
        }

        // @ts-expect-error: webtreemap uses `size` to partition the treemap.
        node.size = size;
      });
      webtreemap.sort(this.currentTreemapRoot);

      this.treemap = new webtreemap.TreeMap(this.currentTreemapRoot, {
        padding: [16, 3, 3, 3],
        spacing: 10,
        caption: node => this.makeCaption(node),
      });
      this.el.textContent = '';
      this.treemap.render(this.el);
      dom.find('.webtreemap-node').classList.add('webtreemap-node--root');

      // For the "All" selector, delete the root node caption since it duplicates the
      // information in the header.
      if (this.selector.type === 'group') {
        dom.find('.webtreemap-caption', this.el).remove();
      }

      // Format the captions.
      // The webtreemap `caption` option can only return strings, but we need to
      // style portions of the caption differently.
      for (const el of dom.findAll('.webtreemap-caption', this.el)) {
        const parts = (el.textContent || '').split(' · ', 2);
        el.textContent = '';
        dom.createChildOf(el, 'span', 'lh-text-bold').textContent = parts[0];
        dom.createChildOf(el, 'span', 'lh-text-dim').textContent = parts[1];
      }
    }

    if (rootChanged || viewChanged) {
      this.createTable();
      this.updateColors();
      this.applyActiveViewModeClass();
    }

    this.previousRenderState = {
      root: this.currentTreemapRoot,
      viewMode: this.currentViewMode,
    };
  }

  createTable() {
    const tableEl = dom.find('.lh-table');
    tableEl.textContent = '';

    /** @type {Array<{node: NodeWithElement, name: string, bundleNode?: LH.Treemap.Node, size: number, unusedBytes?: number}>} */
    const data = [];
    TreemapUtil.walk(this.currentTreemapRoot, (node, path) => {
      if (node.children) return;

      const depthOneNode = this.nodeToDepthOneNodeMap.get(node);
      const bundleNode = depthOneNode?.children ? depthOneNode : undefined;

      let name;
      if (bundleNode) {
        const bundleNodePath = this.nodeToPathMap.get(bundleNode);
        const amountToTrim = bundleNodePath ? bundleNodePath.length : 0; // should never be 0.
        name = path.slice(amountToTrim).join('/');
      } else {
        // Elide the first path component, which is common to all nodes.
        if (path[0] === this.currentTreemapRoot.name) {
          name = path.slice(1).join('/');
        } else {
          name = path.join('/');
        }
      }

      const sizes = this.getNodeSizes(node);
      data.push({
        node,
        name,
        bundleNode,
        size: sizes.size,
        unusedBytes: sizes.unusedBytes,
      });
    });

    /** @param {typeof data[0]} row */
    const makeNameTooltip = (row) => {
      /** @type {typeof data[number]} */
      if (!row.bundleNode) return '';

      return `${row.bundleNode.name} ${row.name}`;
    };

    /** @param {typeof data[0]} row */
    const makeCoverageTooltip = (row) => {
      if (!row.unusedBytes) return '';

      const percent = row.unusedBytes / row.size;
      return `${TreemapUtil.i18n.formatPercent(percent)} bytes unused`;
    };

    let cachedMaxSize = 0;

    const sortByKey = this.currentViewMode.id === 'unused-bytes' ? 'unusedBytes' : 'size';
    data.sort((a, b) => {
      return (b[sortByKey] ?? 0) - (a[sortByKey] ?? 0);
    });

    const headerEl = dom.createChildOf(tableEl, 'div', 'lh-table-header');
    dom.createChildOf(headerEl, 'div').textContent = TreemapUtil.strings.tableColumnName;

    let bytesColumnLabel = this.showTransferSize ?
      TreemapUtil.strings.transferBytesLabel :
      TreemapUtil.strings.resourceBytesLabel;
    if (this.currentViewMode.id === 'unused-bytes') {
      bytesColumnLabel = TreemapUtil.strings.unusedBytesLabel;
    } else if (this.currentViewMode.id === 'duplicate-modules') {
      bytesColumnLabel = TreemapUtil.strings.duplicatedBytesLabel;
    }
    dom.createChildOf(headerEl, 'div').textContent = bytesColumnLabel;

    this.tableRowToNodeMap = new WeakMap();

    if (this.currentViewMode.id === 'duplicate-modules') {
      /** @type {Map<string, Array<typeof data[0]>>} */
      const dataByDupeModule = new Map();
      for (const row of data) {
        const dupeName = row.node.duplicatedNormalizedModuleName;
        if (!dupeName) continue;

        const grouped = dataByDupeModule.get(dupeName) ?? [];
        dataByDupeModule.set(dupeName, grouped);
        grouped.push(row);
      }

      for (const [dupeName, rows] of dataByDupeModule) {
        const duplicateBytes = rows
          .sort((a, b) => b.size - a.size)
          .slice(1)
          .reduce((acc, cur) => acc + cur.size, 0);

        const rowEl = dom.createChildOf(tableEl, 'div', 'lh-table-row');

        const cell1 = dom.createChildOf(rowEl, 'div');
        cell1.textContent = dupeName;

        const cell2 = dom.createChildOf(rowEl, 'div');
        cell2.textContent = TreemapUtil.i18n.formatBytesWithBestUnit(duplicateBytes);
        cell2.title = TreemapUtil.i18n.formatBytes(duplicateBytes);

        for (const row of rows) {
          const rowEl = dom.createChildOf(tableEl, 'div', 'lh-table-row lh-table-subrow');
          this.tableRowToNodeMap.set(rowEl, row.node);

          const cell1 = dom.createChildOf(rowEl, 'div');
          cell1.textContent = row.bundleNode?.name ?? '';

          const cell2 = dom.createChildOf(rowEl, 'div');
          if (row === rows[0]) {
            cell2.textContent = '--';
          } else {
            cell2.textContent = TreemapUtil.i18n.formatBytesWithBestUnit(row.size);
            cell2.title = TreemapUtil.i18n.formatBytes(row.size);
          }
        }

        this.tableRowToNodeMap.set(rowEl, rows.map(row => row.node));

        dom.createChildOf(tableEl, 'div', 'lh-table-separator');
      }

      return;
    }

    for (const row of data) {
      const rowEl = dom.createChildOf(tableEl, 'div', 'lh-table-row');
      this.tableRowToNodeMap.set(rowEl, row.node);

      const cell1 = dom.createChildOf(rowEl, 'div');
      cell1.textContent = row.name;
      cell1.title = makeNameTooltip(row);

      const bytes = this.currentViewMode.id === 'unused-bytes' ?
        row.unusedBytes ?? 0 :
        row.size;
      const cell2 = dom.createChildOf(rowEl, 'div');
      cell2.textContent = TreemapUtil.i18n.formatBytesWithBestUnit(bytes);
      cell2.title = TreemapUtil.i18n.formatBytes(bytes);

      if (this.currentViewMode.id === 'unused-bytes') {
        cachedMaxSize = cachedMaxSize || Math.max(...data.map(node => node.size));

        const el = dom.createChildOf(tableEl, 'div', 'lh-coverage-bar');
        el.title = makeCoverageTooltip(row);
        el.style.setProperty('--max', String(cachedMaxSize));
        el.style.setProperty('--used', String(row.size - bytes));
        el.style.setProperty('--unused', String(row.unusedBytes));

        dom.createChildOf(el, 'div', 'lh-coverage-bar--used');
        dom.createChildOf(el, 'div', 'lh-coverage-bar--unused');
      }

      dom.createChildOf(tableEl, 'div', 'lh-table-separator');
    }
  }

  /**
   * @param {boolean=} show
   */
  toggleTable(show) {
    const mainEl = dom.find('main');
    mainEl.classList.toggle('lh-main--show-table', show);
    const buttonEl = dom.find('.lh-button--toggle-table');
    buttonEl.classList.toggle('lh-button--active', show);
  }

  resize() {
    if (!this.treemap) throw new Error('must call .render() first');

    this.treemap.layout(this.currentTreemapRoot, this.el);
    this.updateColors();
  }

  /**
   * Creates the header text for each node in webtreemap.
   * @param {LH.Treemap.Node} node
   */
  makeCaption(node) {
    const partitionBy = this.currentViewMode.partitionBy || this.defaultPartitionBy;
    const partitionByStr = {
      resourceBytes: TreemapUtil.strings.resourceBytesLabel,
      encodedBytes: TreemapUtil.strings.transferBytesLabel,
      unusedBytes: TreemapUtil.strings.unusedBytesLabel,
    }[partitionBy];

    const bytes = this.getNodeSizes(node)[partitionBy];
    const total = this.getNodeSizes(this.currentTreemapRoot)[partitionBy];

    const parts = [
      TreemapUtil.elide(node.name || '', 60),
    ];

    if (bytes !== undefined && total !== undefined) {
      const percent = total === 0 ? 1 : bytes / total;
      const percentStr = TreemapUtil.i18n.formatPercent(percent);
      let str = `${TreemapUtil.i18n.formatBytesWithBestUnit(bytes)} (${percentStr})`;
      // Only add label for bytes on the root node.
      if (node === this.currentTreemapRoot) {
        str = `${partitionByStr}: ${str}`;
      }
      parts.push(str);
    }

    return parts.join(' · ');
  }

  /**
   * @param {number} hue
   * @param {number|null} depth
   */
  getColorFromHue(hue, depth = null) {
    if (depth === null) {
      return TreemapUtil.hsl(hue, 60, 90);
    }

    return TreemapUtil.hsl(hue, 20 + depth * 5, 90 - depth * 5);
  }

  updateColors() {
    TreemapUtil.walk(this.currentTreemapRoot, (node, path) => {
      if (!node.dom) return;

      // Color a depth one node and all children the same color.
      const depthOneNode = this.nodeToDepthOneNodeMap.get(node);
      const hue = depthOneNode &&
        this.getHueForD1NodeName(depthOneNode ? depthOneNode.name : node.name);

      let backgroundColor;
      if (this.currentViewMode.highlights) {
        // A view can set nodes to highlight. If so, don't color anything else.
        const highlight = this.currentViewMode.highlights
          .find(highlight => TreemapUtil.pathsAreEqual(path, highlight.path));
        if (highlight) {
          const depthOneNodeColor = hue !== undefined ?
            this.getColorFromHue(hue, null) :
            'white';
          backgroundColor = highlight.color || depthOneNodeColor;
        } else {
          backgroundColor = 'white';
        }
        node.dom.style.backgroundColor = backgroundColor;
        return;
      }

      const depthOneNodeColor = hue !== undefined ?
        this.getColorFromHue(hue, path.length) :
        'white';
      node.dom.style.backgroundColor = depthOneNodeColor;

      // Shade the element to communicate coverage.
      if (this.currentViewMode.id === 'unused-bytes') {
        const pctUnused = (node.unusedBytes || 0) / node.resourceBytes * 100;
        node.dom.style.setProperty('--pctUnused', `${pctUnused}%`);
      }
    });
  }

  /**
   * @param {LH.Treemap.Node} node
   */
  getNodeCompressionRatio(node) {
    if (node.encodedBytes) {
      return node.encodedBytes / node.resourceBytes;
    }

    const depthOneNode = this.nodeToDepthOneNodeMap.get(node);
    if (depthOneNode?.encodedBytes) {
      return depthOneNode.encodedBytes / depthOneNode.resourceBytes;
    }

    return 1;
  }

  /**
   * @param {LH.Treemap.Node} node
   * @param {number} compressionRatio
   */
  getNodeDisplaySize(node, compressionRatio) {
    if (!this.showTransferSize) {
      return node.resourceBytes;
    }

    if (node.encodedBytes !== undefined) {
      return node.encodedBytes;
    }

    return node.resourceBytes * compressionRatio;
  }

  /**
   * @param {LH.Treemap.Node} node
   * @param {number} compressionRatio
   */
  getNodeUnusedBytes(node, compressionRatio) {
    if (node.unusedBytes === undefined) {
      return;
    }

    if (!this.showTransferSize) {
      return node.unusedBytes;
    }

    return node.unusedBytes * compressionRatio;
  }

  /**
   * @param {LH.Treemap.Node} node
   */
  getNodeSizes(node) {
    let sizes = this.nodeToSizesMap.get(node);

    if (!sizes) {
      const compressionRatio = this.getNodeCompressionRatio(node);
      sizes = {
        size: this.getNodeDisplaySize(node, compressionRatio) ?? 0,
        resourceBytes: node.resourceBytes,
        encodedBytes: node.encodedBytes,
        unusedBytes: this.getNodeUnusedBytes(node, compressionRatio),
      };
      this.nodeToSizesMap.set(node, sizes);
    }

    return sizes;
  }
}

/**
 * Allows for saving the document and loading with data intact.
 * @param {LH.Treemap.Options} options
 */
function injectOptions(options) {
  let scriptEl = document.querySelector('.lh-injectedoptions');
  if (scriptEl) {
    scriptEl.remove();
  }

  scriptEl = dom.createChildOf(document.head, 'script', 'lh-injectedoptions');
  scriptEl.textContent = `
    window.__treemapOptions = ${JSON.stringify(options)};
  `;
}

class LighthouseTreemap {
  static get APP_URL() {
    return `${location.origin}${location.pathname}`;
  }

  constructor() {
    this._onPaste = this._onPaste.bind(this);
    this._onFileLoad = this._onFileLoad.bind(this);

    this._dragAndDrop = new DragAndDrop(this._onFileLoad);
    this._github = new GithubApi();

    document.addEventListener('paste', this._onPaste);

    // Hidden file input to trigger manual file selector.
    const fileInput = dom.find('input#hidden-file-input', document);
    fileInput.addEventListener('change', e => {
      if (!e.target) {
        return;
      }

      const inputTarget = /** @type {HTMLInputElement} */ (e.target);
      if (inputTarget.files) {
        this._dragAndDrop.readFile(inputTarget.files[0]).then(str => {
          this._onFileLoad(str);
        });
      }
      inputTarget.value = '';
    });

    // A click on the visual placeholder will trigger the hidden file input.
    const placeholderTarget = dom.find('.treemap-placeholder-inner', document);
    placeholderTarget.addEventListener('click', e => {
      const target = /** @type {?Element} */ (e.target);

      if (target && target.localName !== 'input' && target.localName !== 'a') {
        fileInput.click();
      }
    });
  }

  /**
   * @param {LH.Treemap.Options} options
   */
  init(options) {
    dom.find('.treemap-placeholder').classList.add('hidden');
    dom.find('main').classList.remove('hidden');

    const locale = options.lhr.configSettings.locale;
    document.documentElement.lang = locale;

    // `strings` is generated in build/build-treemap.js
    TreemapUtil.applyStrings(strings[options.lhr.configSettings.locale]);
    TreemapUtil.i18n = new I18nFormatter(locale);

    // Fill in all i18n data.
    for (const node of document.querySelectorAll('[data-i18n]')) {
      // These strings are guaranteed to (at least) have a default English string in TreemapUtil.UIStrings,
      // so this cannot be undefined as long as `report-ui-features.data-i18n` test passes.
      const i18nAttr = /** @type {keyof typeof TreemapUtil['UIStrings']} */ (
        node.getAttribute('data-i18n'));
      node.textContent = TreemapUtil.strings[i18nAttr];
    }

    if (treemapViewer) {
      dom.find('.lh-treemap').textContent = '';
      dom.find('.lh-table').textContent = '';
      treemapViewer.abortController.abort();
    }
    treemapViewer = new TreemapViewer(options, dom.find('div.lh-treemap'));

    injectOptions(options);

    // eslint-disable-next-line no-console
    console.log('window.__treemapOptions', window.__treemapOptions);
  }

  /**
   * Coerce json into LH.Treemap.Options
   * Accepts if json is an lhr, or {lhr: ...} or {lighthouseResult: ...}
   * Throws error if json does not match expectations.
   * @param {any} json
   * @return {LH.Treemap.Options}
   */
  coerceToOptions(json) {
    /** @type {LH.Treemap.Options['lhr']|null} */
    let lhr = null;
    if (json && typeof json === 'object') {
      for (const maybeLhr of [json, json.lhr, json.lighthouseResult]) {
        if (maybeLhr?.audits && typeof maybeLhr.audits === 'object') {
          lhr = maybeLhr;
          break;
        }
      }
    }

    if (!lhr) {
      throw new Error('provided json is not a Lighthouse result');
    }

    if (!lhr.audits['script-treemap-data']) {
      throw new Error('provided Lighthouse result is missing audit: `script-treemap-data`');
    }

    let initialView;
    if (json && typeof json === 'object' && typeof json.initialView === 'string') {
      initialView = json.initialView;
    }

    return {lhr, initialView};
  }

  /**
   * Loads report json from gist URL, if valid. Updates page URL with gist id
   * and loads from GitHub.
   * @param {string} urlStr gist URL
   */
  async loadFromGistUrl(urlStr) {
    try {
      const url = new URL(urlStr);

      if (url.origin !== 'https://gist.github.com') {
        logger.error('URL was not a gist');
        return;
      }

      const match = url.pathname.match(/[a-f0-9]{5,}/);
      if (match) {
        const gistId = match[0];
        history.pushState({}, '', `${LighthouseTreemap.APP_URL}?gist=${gistId}`);
        const json = await this._github.getGistFileContentAsJson(gistId);
        const options = this.coerceToOptions(json);
        this.init(options);
      }
    } catch (err) {
      logger.error(err);
    }
  }

  /**
   * @param {string} str
   */
  _onFileLoad(str) {
    let json;
    let options;
    try {
      json = JSON.parse(str);
      options = this.coerceToOptions(json);
    } catch (e) {
      logger.error('Could not parse JSON file.');
    }

    if (options) this.init(options);
  }

  /**
   * Enables pasting a JSON report or gist URL on the page.
   * @param {ClipboardEvent} e
   */
  _onPaste(e) {
    if (!e.clipboardData) return;
    e.preventDefault();

    // Try paste as gist URL.
    try {
      const url = new URL(e.clipboardData.getData('text'));
      this.loadFromGistUrl(url.href);

      if (window.ga) {
        window.ga('send', 'event', 'report', 'paste-link');
      }

      return;
    } catch (err) {
      // noop
    }

    // Try paste as json content.
    try {
      const json = JSON.parse(e.clipboardData.getData('text'));
      const options = this.coerceToOptions(json);
      this.init(options);

      if (window.ga) {
        window.ga('send', 'event', 'report', 'paste');
      }

      return;
    } catch (err) {
      // noop
    }

    logger.error('Pasted content did not have JSON or gist URL');
  }
}

async function main() {
  const app = new LighthouseTreemap();
  const queryParams = new URLSearchParams(window.location.search);
  const gzip = queryParams.get('gzip') === '1';
  const hash = window.__hash ?? location.hash;
  const hashParams = hash ?
    JSON.parse(TextEncoding.fromBase64(hash.substr(1), {gzip})) :
    {};
  /** @type {Record<string, any>} */
  const params = {
    ...Object.fromEntries(queryParams.entries()),
    ...hashParams,
  };

  if (window.__treemapOptions) {
    // Prefer the hardcoded options from a saved HTML file above all.
    app.init(app.coerceToOptions(window.__treemapOptions));
  } else if ('debug' in params) {
    const response = await fetch('debug.json');
    const json = await response.json();
    const options = app.coerceToOptions(json);
    app.init(options);
  } else if (params.lhr) {
    const options = app.coerceToOptions(params);
    app.init(options);
  } else if (params.gist) {
    const json = await app._github.getGistFileContentAsJson(params.gist || '');
    const options = app.coerceToOptions(json);
    app.init(options);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await main();
  } catch (err) {
    logger.error(err);
  }
});
