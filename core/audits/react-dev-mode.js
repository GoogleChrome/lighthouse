/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { Audit } from './audit.js';
import * as i18n from "../lib/i18n/i18n.js";

const UIStrings = {
  /** Title of a Lighthouse audit that checks if React is running in development mode. This title is shown when the site is correctly using the production build of React. */
  title: "React is not in development mode",
  /** Title of a Lighthouse audit that checks if React is running in development mode. This title is shown when the site is incorrectly using the development build of React, which is slower. */
  failureTitle: "React is running in development mode",
  /** Description of a Lighthouse audit that tells the user why they should use the production build of React. */
  description: 'React development builds are large and unoptimized, which significantly degrades page load performance. To fix this, ensure you are compiling your application in production mode before deploying. [Learn more](https://react.dev/reference/react-dom/client/createRoot)',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class ReactDevMode extends Audit {
  static get meta() {
    return {
      id: "react-dev-mode",
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ["ReactDevModeGatherer"],
    };
  }

  static audit(artifacts) {
    // Artifacts contains the boolean returned from our Gatherer
    const isDevMode = artifacts.ReactDevModeGatherer;

    return {
      score: isDevMode ? 0 : 1, // 0 means fail (it is dev mode), 1 means pass
    };
  }
}

export default ReactDevMode;
export { UIStrings };
