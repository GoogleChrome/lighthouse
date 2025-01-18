/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as i18n from '../lib/i18n/i18n.js';

/**
 * @param {unknown} arr
 * @return {arr is Array<Record<string, unknown>>}
 */
function isArrayOfUnknownObjects(arr) {
  return Array.isArray(arr) && arr.every(isObjectOfUnknownProperties);
}

/**
 * @param {unknown} val
 * @return {val is Record<string, unknown>}
 */
function isObjectOfUnknownProperties(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * @param {unknown} str
 * @return {str is LH.Gatherer.GatherMode}
 */
function objectIsGatherMode(str) {
  if (typeof str !== 'string') return false;
  return str === 'navigation' || str === 'timespan' || str === 'snapshot';
}

/**
 * @param {unknown} arr
 * @return {arr is Array<LH.Gatherer.GatherMode>}
 */
function isArrayOfGatherModes(arr) {
  if (!Array.isArray(arr)) return false;
  return arr.every(objectIsGatherMode);
}

/**
 * Asserts that obj has no own properties, throwing a nice error message if it does.
 * Plugin and object name are included for nicer logging.
 * @param {Record<string, unknown>} obj
 * @param {string} pluginName
 * @param {string=} objectName
 */
function assertNoExcessProperties(obj, pluginName, objectName = '') {
  if (objectName) {
    objectName += ' ';
  }

  const invalidKeys = Object.keys(obj);
  if (invalidKeys.length > 0) {
    const keys = invalidKeys.join(', ');
    throw new Error(`${pluginName} has unrecognized ${objectName}properties: [${keys}]`);
  }
}

/**
 * A set of methods for extracting and validating a Lighthouse plugin config.
 */
class ConfigPlugin {
  /**
   * Extract and validate the list of AuditDefns added by the plugin (or undefined
   * if no additional audits are being added by the plugin).
   * @param {unknown} auditsJson
   * @param {string} pluginName
   * @return {Array<{path: string}>|undefined}
   */
  static _parseAuditsList(auditsJson, pluginName) {
    // Plugin audits aren't required (relying on LH default audits) so fall back to [].
    if (auditsJson === undefined) {
      return undefined;
    } else if (!isArrayOfUnknownObjects(auditsJson)) {
      throw new Error(`${pluginName} has an invalid audits array.`);
    }

    return auditsJson.map(auditDefnJson => {
      const {path, ...invalidRest} = auditDefnJson;
      assertNoExcessProperties(invalidRest, pluginName, 'audit');

      if (typeof path !== 'string') {
        throw new Error(`${pluginName} has a missing audit path.`);
      }
      return {
        path,
      };
    });
  }

  /**
   * Extract and validate the list of category AuditRefs added by the plugin.
   * @param {unknown} auditRefsJson
   * @param {string} pluginName
   * @return {Array<LH.Config.AuditRefJson>}
   */
  static _parseAuditRefsList(auditRefsJson, pluginName) {
    if (!isArrayOfUnknownObjects(auditRefsJson)) {
      throw new Error(`${pluginName} has no valid auditsRefs.`);
    }

    return auditRefsJson.map(auditRefJson => {
      const {id, weight, group, ...invalidRest} = auditRefJson;
      assertNoExcessProperties(invalidRest, pluginName, 'auditRef');

      if (typeof id !== 'string') {
        throw new Error(`${pluginName} has an invalid auditRef id.`);
      }
      if (typeof weight !== 'number') {
        throw new Error(`${pluginName} has an invalid auditRef weight.`);
      }
      if (typeof group !== 'string' && typeof group !== 'undefined') {
        throw new Error(`${pluginName} has an invalid auditRef group.`);
      }

      const prependedGroup = group ? `${pluginName}-${group}` : group;
      return {
        id,
        weight,
        group: prependedGroup,
      };
    });
  }

  /**
   * Extract and validate the category added by the plugin.
   * @param {unknown} categoryJson
   * @param {string} pluginName
   * @return {LH.Config.CategoryJson}
   */
  static _parseCategory(categoryJson, pluginName) {
    if (!isObjectOfUnknownProperties(categoryJson)) {
      throw new Error(`${pluginName} has no valid category.`);
    }

    const {
      title,
      description,
      manualDescription,
      auditRefs: auditRefsJson,
      supportedModes,
      ...invalidRest
    } = categoryJson;

    assertNoExcessProperties(invalidRest, pluginName, 'category');

    if (!i18n.isStringOrIcuMessage(title)) {
      throw new Error(`${pluginName} has an invalid category tile.`);
    }
    if (!i18n.isStringOrIcuMessage(description) && description !== undefined) {
      throw new Error(`${pluginName} has an invalid category description.`);
    }
    if (!i18n.isStringOrIcuMessage(manualDescription) && manualDescription !== undefined) {
      throw new Error(`${pluginName} has an invalid category manualDescription.`);
    }
    if (!isArrayOfGatherModes(supportedModes) && supportedModes !== undefined) {
      throw new Error(
        `${pluginName} supportedModes must be an array, ` +
        `valid array values are "navigation", "timespan", and "snapshot".`
      );
    }
    const auditRefs = ConfigPlugin._parseAuditRefsList(auditRefsJson, pluginName);

    return {
      title,
      auditRefs,
      description: description,
      manualDescription: manualDescription,
      supportedModes,
    };
  }


  /**
   * Extract and validate groups JSON added by the plugin.
   * @param {unknown} groupsJson
   * @param {string} pluginName
   * @return {Record<string, LH.Config.GroupJson>|undefined}
   */
  static _parseGroups(groupsJson, pluginName) {
    if (groupsJson === undefined) {
      return undefined;
    }

    if (!isObjectOfUnknownProperties(groupsJson)) {
      throw new Error(`${pluginName} groups json is not defined as an object.`);
    }

    const groups = Object.entries(groupsJson);

    /** @type {Record<string, LH.Config.GroupJson>} */
    const parsedGroupsJson = {};
    groups.forEach(([groupId, groupJson]) => {
      if (!isObjectOfUnknownProperties(groupJson)) {
        throw new Error(`${pluginName} has a group not defined as an object.`);
      }
      const {title, description, ...invalidRest} = groupJson;
      assertNoExcessProperties(invalidRest, pluginName, 'group');

      if (!i18n.isStringOrIcuMessage(title)) {
        throw new Error(`${pluginName} has an invalid group title.`);
      }
      if (!i18n.isStringOrIcuMessage(description) && description !== undefined) {
        throw new Error(`${pluginName} has an invalid group description.`);
      }
      parsedGroupsJson[`${pluginName}-${groupId}`] = {
        title,
        description,
      };
    });
    return parsedGroupsJson;
  }

  /**
   * Extracts and validates a config from the provided plugin input, throwing
   * if it deviates from the expected object shape.
   * @param {unknown} pluginJson
   * @param {string} pluginName
   * @return {LH.Config}
   */
  static parsePlugin(pluginJson, pluginName) {
    // Clone to prevent modifications of original and to deactivate any live properties.
    pluginJson = JSON.parse(JSON.stringify(pluginJson));
    if (!isObjectOfUnknownProperties(pluginJson)) {
      throw new Error(`${pluginName} is not defined as an object.`);
    }

    const {
      audits: pluginAuditsJson,
      category: pluginCategoryJson,
      groups: pluginGroupsJson,
      ...invalidRest
    } = pluginJson;

    assertNoExcessProperties(invalidRest, pluginName);

    return {
      audits: ConfigPlugin._parseAuditsList(pluginAuditsJson, pluginName),
      categories: {
        [pluginName]: ConfigPlugin._parseCategory(pluginCategoryJson, pluginName),
      },
      groups: ConfigPlugin._parseGroups(pluginGroupsJson, pluginName),
    };
  }
}

export default ConfigPlugin;
