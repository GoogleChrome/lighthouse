/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env browser */

/** @typedef {import('../../../report/renderer/i18n-formatter').I18nFormatter} I18nFormatter */

const UIStrings = {
  /** Label for a button that alternates between showing or hiding a table. */
  toggleTableButtonLabel: 'Toggle Table',
  /** Text for an option in a dropdown menu. When selected, the app shows information for all scripts that were found in a web page. */
  allScriptsDropdownLabel: 'All Scripts',
  /** Label for a table column where the values are URLs, JS module names, or arbitrary identifiers. For simplicity, just 'name' is used. */
  tableColumnName: 'Name',
  /** Label for column giving the size of a file in bytes. */
  resourceBytesLabel: 'Resource Bytes',
  /** Label for a value associated with how many bytes of a script are not executed. */
  unusedBytesLabel: 'Unused Bytes',
  /** Label for a column where the values represent how much of a file is used bytes vs unused bytes (coverage). */
  coverageColumnName: 'Coverage',
  /** Label for a button that shows everything (or rather, does not highlight any specific mode such as: unused bytes, duplicate bytes, etc). */
  allLabel: 'All',
  /** Label for a button that highlights information about duplicate modules (aka: files, javascript resources that were included twice by a web page). */
  duplicateModulesLabel: 'Duplicate Modules',
};

class TreemapUtil {
  /** @type {I18nFormatter} */
  // @ts-expect-error: Is set in main.
  static i18n = null;
  static UIStrings = UIStrings;
  static strings = {...UIStrings};

  /**
   * @param {Record<string, string>} providedStrings
   */
  static applyStrings(providedStrings) {
    this.strings = {
      // Set missing renderer strings to default (english) values.
      ...UIStrings,
      ...providedStrings,
    };
  }

  /**
   * @param {LH.Treemap.Node} node
   * @param {(node: import('./main.js').NodeWithElement, path: string[]) => void} fn
   * @param {string[]=} path
   */
  static walk(node, fn, path) {
    if (!path) path = [];
    path.push(node.name);

    fn(node, path);
    if (!node.children) return;

    for (const child of node.children) {
      TreemapUtil.walk(child, fn, [...path]);
    }
  }

  /**
   * @param {string[]} path1
   * @param {string[]} path2
   */
  static pathsAreEqual(path1, path2) {
    if (path1.length !== path2.length) return false;
    for (let i = 0; i < path1.length; i++) {
      if (path1[i] !== path2[i]) return false;
    }
    return true;
  }

  /**
   * @param {string[]} maybeSubpath
   * @param {string[]} path
   */
  static pathIsSubpath(maybeSubpath, path) {
    if (maybeSubpath.length > path.length) return false;
    for (let i = 0; i < maybeSubpath.length; i++) {
      if (maybeSubpath[i] !== path[i]) return false;
    }
    return true;
  }

  /**
   * @param {string} string
   * @param {number} length
   */
  static elide(string, length) {
    if (string.length <= length) return string;
    return string.slice(0, length - 1) + '…';
  }

  /**
   * @param {URL} url
   * @param {URL} fromRelativeUrl
   */
  static elideSameOrigin(url, fromRelativeUrl) {
    if (url.origin !== fromRelativeUrl.origin) return url.toString();
    return url.toString().replace(fromRelativeUrl.origin, '');
  }

  /**
   * Given a list of items, return a function (a hasher) that will map keys to an item.
   * When a key is seen for the first time, the item returned is cached and will always
   * be returned for the same key.
   * The hash function is stable and deterministic, so the same key->item mapping will be
   * produced given the same call order.
   * @template T
   * @param {T[]} originalItems
   * @return {(key: string) => T}
   */
  static stableHasher(originalItems) {
    let items = [...originalItems];

    /** @type {Map<string, T>} */
    const assignedItems = new Map();
    return key => {
      // Key has already been assigned an item.
      const alreadyAssignedItem = assignedItems.get(key);
      if (alreadyAssignedItem !== undefined) return alreadyAssignedItem;

      // Ran out of items.
      if (items.length === 0) {
        items = [...originalItems];
      }

      // Select a random item using a stable hash.
      const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const [assignedItem] = items.splice(hash % items.length, 1);
      assignedItems.set(key, assignedItem);

      return assignedItem;
    };
  }

  /**
   * @param {number} h
   * @param {number} s
   * @param {number} l
   */
  static hsl(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
}

// From DevTools:
// https://cs.chromium.org/chromium/src/third_party/devtools-frontend/src/front_end/quick_open/CommandMenu.js?l=255&rcl=ad5c586c30a6bc55962b7a96b0533911c86bd4fc
// https://gist.github.com/connorjclark/f114ef39fd98f8a1b89dab2bd873d2c2
TreemapUtil.COLOR_HUES = [
  4.1,
  339.6,
  291.2,
  261.6,
  230.8,
  198.7,
  186.8,
  174.4,
  122.4,
  87.8,
  65.5,
  45,
  35.8,
  15.9,
  199.5,
];

export {
  TreemapUtil,
  UIStrings,
};
