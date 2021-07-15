/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const {getElementsInDocument, getNodeDetails} = require('../../lib/page-functions.js');

/* eslint-env browser, node */

/* c8 ignore start */
/**
 * @param {HTMLFormElement} formElement
 * @return {LH.Artifacts.Form}
 */
function createFormElementArtifact(formElement) {
  return {
    attributes: {
      id: formElement.id,
      name: formElement.name,
      autocomplete: formElement.autocomplete,
    },
    node: getNodeDetails(formElement),
    inputs: [],
    labels: [],
  };
}
/* c8 ignore stop */

/**
 * @return {LH.Artifacts['FormElements']}
 */
/* c8 ignore start */
function collectFormElements() {
  const formChildren = getElementsInDocument('textarea, input, label, select');
  /** @type {Map<HTMLFormElement, LH.Artifacts.Form>} */
  const forms = new Map();
  /** @type {LH.Artifacts.Form} */
  const formlessObj = {
    node: null,
    inputs: [],
    labels: [],
  };
  for (const child of formChildren) {
    const isButton = child instanceof HTMLInputElement &&
      (child.type === 'submit' || child.type === 'button');
    if (isButton) continue;

    let formObj = formlessObj;

    const parentFormElement = child.form;
    if (parentFormElement) {
      formObj = forms.get(parentFormElement) || createFormElementArtifact(parentFormElement);
      forms.set(parentFormElement, formObj);
    }

    if (child instanceof HTMLInputElement || child instanceof HTMLTextAreaElement
      || child instanceof HTMLSelectElement) {
      formObj.inputs.push({
        id: child.id,
        name: child.name,
        placeholder: child instanceof HTMLSelectElement ? undefined : child.placeholder,
        autocomplete: {
          property: child.autocomplete,
          // Requires `--enable-features=AutofillShowTypePredictions`.
          attribute: child.getAttribute('autocomplete'),
          prediction: child.getAttribute('autofill-prediction'),
        },
        node: getNodeDetails(child),
      });
    }
    if (child instanceof HTMLLabelElement) {
      formObj.labels.push({
        for: child.htmlFor,
        node: getNodeDetails(child),
      });
    }
  }

  const formElements = [...forms.values()];
  if (formlessObj.inputs.length > 0 || formlessObj.labels.length > 0) {
    formElements.push(formlessObj);
  }
  return formElements;
}
/* c8 ignore stop */

class FormElements extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<LH.Artifacts['FormElements']>}
   */
  async getArtifact(passContext) {
    const driver = passContext.driver;

    const formElements = await driver.executionContext.evaluate(collectFormElements, {
      args: [],
      useIsolation: true,
      deps: [
        createFormElementArtifact,
        getElementsInDocument,
        getNodeDetails,
      ],
    });
    return formElements;
  }
}

module.exports = FormElements;
