/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

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
