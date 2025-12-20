/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _ReportGenerator = require('../../lighthouse-core/report/report-generator.js');
import _Logger = require('../../lighthouse-core/report/html/renderer/logger.js');
import _LighthouseReportViewer = require('../app/src/lighthouse-report-viewer.js');
import _DragAndDrop = require('../app/src/drag-and-drop.js');
import _GithubApi = require('../app/src/github-api.js');
import _PSIApi = require('../app/src/psi-api.js');
import _FirebaseAuth = require('../app/src/firebase-auth.js');
import _ViewerUIFeatures = require('../app/src/viewer-ui-features.js');
import 'google.analytics';
import {FirebaseNamespace} from '@firebase/app-types';
import '@firebase/auth-types';


declare global {
  var ReportGenerator: typeof _ReportGenerator;
  var Logger: typeof _Logger;
  var logger: _Logger;
  var LighthouseReportViewer: typeof _LighthouseReportViewer;
  var DragAndDrop: typeof _DragAndDrop;
  var GithubApi: typeof _GithubApi;
  var PSIApi: typeof _PSIApi;
  var FirebaseAuth: typeof _FirebaseAuth;
  var ViewerUIFeatures: typeof _ViewerUIFeatures;

  var idbKeyval: typeof import('idb-keyval');
  var firebase: Required<FirebaseNamespace>;

  interface Window {
    logger: _Logger;
    viewer: _LighthouseReportViewer;
    ga: UniversalAnalytics.ga;

    // Inserted by viewer gulpfile build.
    LH_CURRENT_VERSION: string;
  }
}

// empty export to keep file a module
export {}
