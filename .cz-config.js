/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  allowBreakingChanges: ['core'],
  allowCustomScopes: true,
  scopes: [],
  types: [
    {value: 'new_audit',  name: 'new_audit: A new audit'},
    {value: 'core',       name: 'core:      Driver, gather, (non-new) audits, LHR JSON, etc'},
    {value: 'tests',      name: 'tests:     Tests, smokehouse, etc'},
    {value: 'i18n',       name: 'i18n:      Internationalization'},
    {value: 'docs',       name: 'docs:      Documentation'},
    {value: 'deps',       name: 'deps:      Dependency bumps only'},
    {value: 'report',     name: 'report:    Report, UI, renderers'},
    {value: 'cli',        name: 'cli:       CLI stuff'},
    {value: 'clients',    name: 'clients:   Extension, DevTools, or LR stuff'},
    {value: 'misc',       name: 'misc:      Something else entirely'}
  ]
};
