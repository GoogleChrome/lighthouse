/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import lighthouse, {navigation, snapshot, generateReport} from '../../core/index.js';

// Export main Lighthouse functionality for MCP usage
// Note: timespan and user flow functionality are excluded from MCP bundle
export default lighthouse;
export {
  navigation,
  snapshot,
  generateReport,
};
