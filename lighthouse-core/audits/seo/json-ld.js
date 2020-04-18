/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const validateJsonLD = require('../../lib/sd-validation/sd-validation.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on whether JSON-LD structured data snippets are valid. This descriptive title is shown when no invalid JSON-LD snippets were found. */
  title: 'JSON-LD structured data syntax is valid',
  /** Title of a Lighthouse audit that provides detail on whether JSON-LD structured data snippets are valid. This descriptive title is shown when JSON-LD snippets with invalid content were found. */
  failureTitle: 'JSON-LD structured data syntax is invalid',
  /** Description of a Lighthouse audit that tells the user whether JSON-LD snippets on the page are invalid. This is displayed after a user expands the section to see more. No character length limits. */
  /* eslint-disable-next-line max-len */
  description: 'This audit currently validates a subset of JSON-LD rules used in search engines. See also the [Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool/) to validate other types of structured data.',
  /** Explanatory message stating how many JSON-LD structured data snippets are invalid */
  displayValue: `{invalidSnippetCount, plural,
    =1 {# invalid snippet}
    other {# invalid snippets}
    }`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class StructuredDataAutomatic extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'json-ld',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['ScriptElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const jsonLDElements = artifacts.ScriptElements.filter(
      script => script.type === 'application/ld+json' && !!script.content);

    if (jsonLDElements.length === 0) {
      return {
        notApplicable: true,
        score: 1,
      };
    }

    const snippets = await Promise.all(jsonLDElements.map(async (element) => {
      // We don't want to show empty lines around the snippet
      // We can do this cast, because we know element.content to not be null
      const content = /** @type string */ (element.content).trim();

      return {
        devtoolsNodePath: element.devtoolsNodePath,
        content,
        errors: await validateJsonLD(content),
      };
    }));
    // Show invalid snippets at the top
    snippets.sort((a, b) => {
      return b.errors.length - a.errors.length;
    });

    const renderedSnippets = snippets.map(renderValidatedSnippet);
    const details = Audit.makeListDetails(renderedSnippets);

    const invalidSnippets = snippets.filter(vs => vs.errors.length > 0);
    const displayValue = str_(UIStrings.displayValue, {
      invalidSnippetCount: invalidSnippets.length,
    });

    return {
      score: invalidSnippets.length === 0 ? 1 : 0,
      details,
      displayValue,
    };
  }
}

/**
 * @param {{content: string, devtoolsNodePath: string, errors: LH.StructuredData.ValidationError[]}} validatedSnippet
 */
function renderValidatedSnippet(validatedSnippet) {
  const {content, devtoolsNodePath, errors} = validatedSnippet;

  /** @type {LH.StructuredData.JsonLDDocument} */
  let parsedContent = {};
  let topLevelType = '';
  let topLevelName = '';
  try {
    parsedContent = JSON.parse(content);
  } catch (err) {}
  if (parsedContent['@type']) {
    topLevelType = parsedContent['@type'];
  }
  if (typeof parsedContent.name === 'string') {
    topLevelName = parsedContent.name.toString();
  }

  let title = '';
  if (topLevelName && topLevelType) {
    title = `${topLevelType}: ${topLevelName}`;
  } else if (topLevelType) {
    title = `@type ${topLevelType}`;
  } else {
    title = 'Invalid JSON-LD element';
  }
  // No 18n here, because it's tricky to do because of the if statement above. The
  // entity type and error messages are in English anyway.
  title += ` (${errors.length} Error${errors.length !== 1 ? 's' : ''})`;

  /** @type LH.Audit.Details.NodeValue */
  const node = {
    type: 'node',
    path: devtoolsNodePath,
    snippet: `<script type="application/ld+json">`,
  };

  const {lineMessages, generalMessages} = getErrorMessages(errors);

  return Audit.makeSnippetDetails({
    content: parsedContent ? JSON.stringify(parsedContent, null, 2) : content,
    title,
    lineMessages,
    generalMessages,
    node,
  });
}

/**
 * @param {Array<LH.StructuredData.ValidationError>} errors
 */
function getErrorMessages(errors) {
  /** @type {LH.Audit.Details.SnippetValue['lineMessages']} */
  const lineMessages = [];
  /** @type {LH.Audit.Details.SnippetValue['generalMessages']} */
  const generalMessages = [];
  errors.forEach(({
    message, lineNumber, validTypes, validator,
  }) => {
    if (validTypes && validator === 'schema-org') {
      const typeStrings = validTypes.map(type => {
        return `[${type.name}](${type.uri})`;
      });
      message = `Invalid ${typeStrings.join('/')}: ${message}`;
    }

    if (lineNumber) {
      lineMessages.push({lineNumber, message});
    } else {
      generalMessages.push({
        message,
      });
    }
  });

  return {lineMessages, generalMessages};
}

module.exports = StructuredDataAutomatic;
module.exports.UIStrings = UIStrings;
