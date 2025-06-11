/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = import('../../gather/base-gatherer.js').then(({default: Gatherer}) => {
  return class CustomGatherer extends Gatherer {};
});
