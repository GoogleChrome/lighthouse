/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to make sure all input elements
 *  have an autocomplete attribute set.
 * See https://docs.google.com/document/d/1yiulNnV8uEy1jPaAEmWeHxHcQOzxpqvAV4hOFpXLJ1M/edit?usp=sharing
 */


import log from 'lighthouse-logger';

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that lets the user know if there are any missing or invalid autocomplete attributes on page inputs. This descriptive title is shown to users when all input attributes have a valid autocomplete attribute. */
  title: '`<input>` elements correctly use `autocomplete`',
  /** Title of a Lighthouse audit that lets the user know if there are any missing or invalid autocomplete attributes on page inputs. This descriptive title is shown to users when one or more inputs do not have autocomplete set or has an invalid autocomplete set. */
  failureTitle: '`<input>` elements do not have correct `autocomplete` attributes',
  /** Description of a Lighthouse audit that lets the user know if there are any missing or invalid autocomplete attributes on page inputs. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: '`autocomplete` helps users submit forms quicker. To reduce user ' +
   'effort, consider enabling by setting the `autocomplete` ' +
   'attribute to a valid value.' +
  ' [Learn more about `autocomplete` in forms](https://developers.google.com/web/fundamentals/design-and-ux/input/forms#use_metadata_to_enable_auto-complete)',
  /** Label for a column in a data table; entries will be the autocomplete token suggestions based on heuristics. */
  columnSuggestions: 'Suggested Token',
  /** Label for a column in a data table; entries will be the incorrect optional autocomplete tokens or prompting user to review them. */
  columnCurrent: 'Current Value',
  /**
   * @description Warning that autocomplete token is invalid.
   * @example {invalid-token name} token
   * @example {<autocomplete="invalid-token name">} snippet
   */
  warningInvalid: '`autocomplete` token(s): "{token}" is invalid in {snippet}',
  /**
   * @description Warning that autocomplete token order is invalid.
   * @example {mobile section-red cc-name} tokens
   * @example {<autocomplete="mobile section-red cc-name">} snippet
   */
  warningOrder: 'Review order of tokens: "{tokens}" in {snippet}',
  /** Entry for under the Autocomplete Suggested Token Column that tells users to review the ordering of their tokens if they are valid. */
  reviewOrder: 'Review order of tokens',
  /** Entry for under the Autocomplete Suggested Token Column that appears when we have no autocomplete suggestion. */
  manualReview: 'Requires manual review',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {string[]} This array contains all acceptable autocomplete attributes from the WHATWG standard. More found at https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill */
const validAutocompleteTokens = ['name', 'honorific-prefix', 'given-name',
  'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'username', 'new-password',
  'current-password', 'one-time-code', 'organization-title', 'organization', 'street-address',
  'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3',
  'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name',
  'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp',
  'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency',
  'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year',
  'sex', 'url', 'photo', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'on',
  'tel-local', 'tel-local-prefix', 'tel-local-suffix', 'tel-extension', 'email', 'impp', 'off',
  'additional-name-initial', 'home', 'work', 'mobile', 'fax', 'pager', 'shipping', 'billing'];

/** @type {string[]} This array contains all autofull suggestions that have no prediction tied to it. Autofill predictions found at https://source.chromium.org/chromium/chromium/src/+/main:components/autofill/core/browser/field_types.h;l=26 */
const noPrediction = ['NO_SERVER_DATA', 'UNKNOWN_TYPE', 'EMPTY_TYPE', 'HTML_TYPE_UNSPECIFIED',
  'HTML_TYPE_UNRECOGNIZED'];

/** This mapping contains all autofill predictions to corresponding autocomplete attributes. Autofill predictions are found at https://source.chromium.org/chromium/chromium/src/+/main:components/autofill/core/browser/field_types.h;l=34*/
const predictionTypesToTokens = {
  'NO_SERVER_DATA': str_(UIStrings.manualReview),
  'UNKNOWN_TYPE': str_(UIStrings.manualReview),
  'EMPTY_TYPE': str_(UIStrings.manualReview),
  'NAME_FIRST': 'given-name',
  'NAME_MIDDLE': 'additional-name',
  'NAME_LAST': 'family-name',
  'NAME_FULL': 'name',
  'NAME_MIDDLE_INITIAL': 'additional-name-initial',
  'NAME_SUFFIX': 'honorific-suffix',
  'NAME_BILLING_FIRST': 'billing given-name',
  'NAME_BILLING_MIDDLE': 'billing additional-name',
  'NAME_BILLING_LAST': 'billing family-name',
  'NAME_BILLING_MIDDLE_INITIAL': 'billing additional-name-initial',
  'NAME_BILLING_FULL': 'billing name',
  'NAME_BILLING_SUFFIX': 'billing honorific-suffix',
  'EMAIL_ADDRESS': 'email',
  'MERCHANT_EMAIL_SIGNUP': 'email',
  'PHONE_HOME_NUMBER': 'tel-local',
  'PHONE_HOME_CITY_CODE': 'tel-area-code',
  'PHONE_HOME_COUNTRY_CODE': 'tel-country-code',
  'PHONE_HOME_CITY_AND_NUMBER': 'tel-national',
  'PHONE_HOME_WHOLE_NUMBER': 'tel',
  'PHONE_HOME_EXTENSION': 'tel-extension',
  'PHONE_BILLING_NUMBER': 'billing tel-local',
  'PHONE_BILLING_CITY_CODE': 'billing tel-area-code',
  'PHONE_BILLING_COUNTRY_CODE': 'tel-country-code',
  'PHONE_BILLING_CITY_AND_NUMBER': 'tel-national',
  'PHONE_BILLING_WHOLE_NUMBER': 'tel',
  'ADDRESS_HOME_STREET_ADDRESS': 'street-address',
  'ADDRESS_HOME_LINE1': 'address-line1',
  'ADDRESS_HOME_LINE2': 'address-line2',
  'ADDRESS_HOME_LINE3': 'address-line3',
  'ADDRESS_HOME_STATE': 'address-level1',
  'ADDRESS_HOME_CITY': 'address-level2',
  'ADDRESS_HOME_DEPENDENT_LOCALITY': 'address-level3',
  'ADDRESS_HOME_ZIP': 'postal-code',
  'ADDRESS_HOME_COUNTRY': 'country-name',
  'ADDRESS_BILLING_DEPENDENT_LOCALITY': 'billing address-level3',
  'ADDRESS_BILLING_STREET_ADDRESS': 'billing street-address',
  'ADDRESS_BILLING_LINE1': 'billing address-line1',
  'ADDRESS_BILLING_LINE2': 'billing address-line2',
  'ADDRESS_BILLING_LINE3': 'billing address-line3',
  'ADDRESS_BILLING_APT_NUM': 'billing address-level3',
  'ADDRESS_BILLING_CITY': 'billing address-level2',
  'ADDRESS_BILLING_STATE': 'billing address-level1',
  'ADDRESS_BILLING_ZIP': 'billing postal-code',
  'ADDRESS_BILLING_COUNTRY': 'billing country-name',
  'CREDIT_CARD_NAME_FULL': 'cc-name',
  'CREDIT_CARD_NAME_FIRST': 'cc-given-name',
  'CREDIT_CARD_NAME_LAST': 'cc-family-name',
  'CREDIT_CARD_NUMBER': 'cc-number',
  'CREDIT_CARD_EXP_MONTH': 'cc-exp-month',
  'CREDIT_CARD_EXP_2_DIGIT_YEAR': 'cc-exp-year',
  'CREDIT_CARD_EXP_4_DIGIT_YEAR': 'cc-exp-year',
  'CREDIT_CARD_EXP_DATE_2_DIGIT_YEAR': 'cc-exp',
  'CREDIT_CARD_EXP_DATE_4_DIGIT_YEAR': 'cc-exp',
  'CREDIT_CARD_TYPE': 'cc-type',
  'CREDIT_CARD_VERIFICATION_CODE': 'cc-csc',
  'COMPANY_NAME': 'organization',
  'PASSWORD': 'current-password',
  'ACCOUNT_CREATION_PASSWORD': 'new-password',
  'HTML_TYPE_UNSPECIFIED': str_(UIStrings.manualReview),
  'HTML_TYPE_NAME': 'name',
  'HTML_TYPE_HONORIFIC_PREFIX': 'honorific-prefix',
  'HTML_TYPE_GIVEN_NAME': 'given-name',
  'HTML_TYPE_ADDITIONAL_NAME': 'additional-name',
  'HTML_TYPE_FAMILY_NAME': 'family-name',
  'HTML_TYPE_ORGANIZATION': 'organization',
  'HTML_TYPE_STREET_ADDRESS': 'street-address',
  'HTML_TYPE_ADDRESS_LINE1': 'address-line1',
  'HTML_TYPE_ADDRESS_LINE2': 'address-line2',
  'HTML_TYPE_ADDRESS_LINE3': 'address-line3',
  'HTML_TYPE_ADDRESS_LEVEL1': 'address-level1',
  'HTML_TYPE_ADDRESS_LEVEL2': 'address-level2',
  'HTML_TYPE_ADDRESS_LEVEL3': 'address-level3',
  'HTML_TYPE_COUNTRY_CODE': 'tel-country-code',
  'HTML_TYPE_COUNTRY_NAME': 'country-name',
  'HTML_TYPE_POSTAL_CODE': 'postal-code',
  'HTML_TYPE_FULL_ADDRESS': 'street-address',
  'HTML_TYPE_CREDIT_CARD_NAME_FULL': 'cc-name',
  'HTML_TYPE_CREDIT_CARD_NAME_FIRST': 'cc-given-name',
  'HTML_TYPE_CREDIT_CARD_NAME_LAST': 'cc-family-name',
  'HTML_TYPE_CREDIT_CARD_NUMBER': 'cc-number',
  'HTML_TYPE_CREDIT_CARD_EXP': 'cc-exp',
  'HTML_TYPE_CREDIT_CARD_EXP_MONTH': 'cc-exp-month',
  'HTML_TYPE_CREDIT_CARD_EXP_YEAR': 'cc-exp-year',
  'HTML_TYPE_CREDIT_CARD_VERIFICATION_CODE': 'cc-csc',
  'HTML_TYPE_CREDIT_CARD_TYPE': 'cc-csc',
  'HTML_TYPE_TEL': 'tel',
  'HTML_TYPE_TEL_COUNTRY_CODE': 'tel-country-code',
  'HTML_TYPE_TEL_NATIONAL': 'tel-national',
  'HTML_TYPE_TEL_AREA_CODE': 'tel-area-code',
  'HTML_TYPE_TEL_LOCAL': 'tel-local',
  'HTML_TYPE_TEL_LOCAL_PREFIX': 'tel-local-prefix',
  'HTML_TYPE_TEL_LOCAL_SUFFIX': 'tel-local-suffix',
  'HTML_TYPE_TEL_EXTENSION': 'tel-extension',
  'HTML_TYPE_EMAIL': 'email',
  'HTML_TYPE_ADDITIONAL_NAME_INITIAL': 'additional-name-initial',
  'HTML_TYPE_CREDIT_CARD_EXP_DATE_2_DIGIT_YEAR': 'cc-exp-year',
  'HTML_TYPE_CREDIT_CARD_EXP_DATE_4_DIGIT_YEAR': 'cc-exp-year',
  'HTML_TYPE_CREDIT_CARD_EXP_2_DIGIT_YEAR': 'cc-exp-year',
  'HTML_TYPE_CREDIT_CARD_EXP_4_DIGIT_YEAR': 'cc-exp-year',
  'HTML_TYPE_UPI_VPA': str_(UIStrings.manualReview),
  'HTML_TYPE_ONE_TIME_CODE': 'one-time-code',
  'HTML_TYPE_UNRECOGNIZED': str_(UIStrings.manualReview),
  'HTML_TYPE_TRANSACTION_AMOUNT': 'transaction-amount',
  'HTML_TYPE_TRANSACTION_CURRENCY': 'transaction-currency',
};

/**
 * The autocomplete attribute can have multiple tokens in it. All tokens should be valid and in the correct order.
 * For example, cc-namez is an invalid token. tel mobile shipping section-foo are valid tokens, but out of order. The spec defines correct ordering, but in short, correct order is:
 *
 * [section-*] [shipping|billing] [home|work|mobile|fax|pager] <autofill field name>
 *
 * If either of these invalid situations, the autocomplete property will be an empty string. */
class AutocompleteAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'autocomplete',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Inputs'],
    };
  }

  /**
   * @param {LH.Artifacts.InputElement} input
   * @return {{hasValidTokens: boolean, isValidOrder?: boolean}}
   */
  static checkAttributeValidity(input) {
    if (!input.autocomplete.attribute) return {hasValidTokens: false};
    const tokenArray = input.autocomplete.attribute.split(' ');
    for (const token of tokenArray) {
      // A `section-` prefix indicates a unique autofill scope.
      // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#:~:text=section-
      if (token.slice(0, 8) === 'section-') continue;
      if (validAutocompleteTokens.includes(token)) continue;
      return {hasValidTokens: false};
    }
    // If all autocomplete tokens are valid but there is still no property attribute, then that means the tokens are out of order.
    // https://cloudfour.com/thinks/autofill-what-web-devs-should-know-but-dont/#all-the-tokens
    if (!input.autocomplete.property) return {hasValidTokens: true, isValidOrder: false};
    return {hasValidTokens: true, isValidOrder: true};
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const failingFormsData = [];
    const warnings = [];
    let foundPrediction = false;
    for (const input of artifacts.Inputs.inputs) {
      const validity = this.checkAttributeValidity(input);
      if (validity.hasValidTokens && validity.isValidOrder) continue;
      if (!input.autocomplete.prediction) continue;
      if (noPrediction.includes(input.autocomplete.prediction) &&
        !input.autocomplete.attribute) continue;

      foundPrediction = true;

      // @ts-ignore
      let suggestion = predictionTypesToTokens[input.autocomplete.prediction];
      // This is here to satisfy typescript because the possible null value of autocomplete.attribute is not compatible with Audit details.
      if (!input.autocomplete.attribute) input.autocomplete.attribute = '';
      // Warning is created because while there is an autocomplete attribute, the autocomplete property does not exsist, thus the attribute's value is invalid.
      if (input.autocomplete.attribute) {
        warnings.push(str_(UIStrings.warningInvalid, {token: input.autocomplete.attribute,
          snippet: input.node.snippet}));
      }
      if (validity.isValidOrder === false) {
        warnings.push(str_(UIStrings.warningOrder, {tokens: input.autocomplete.attribute,
          snippet: input.node.snippet}));
        suggestion = UIStrings.reviewOrder;
      }
      // If the autofill prediction is not in our autofill suggestion mapping, then we warn
      if (!(input.autocomplete.prediction in predictionTypesToTokens) &&
          validity.isValidOrder) {
        log.warn(`Autocomplete prediction (${input.autocomplete.prediction})
            not found in our mapping`);
        continue;
      }
      failingFormsData.push({
        node: Audit.makeNodeItem(input.node),
        suggestion: suggestion,
        current: input.autocomplete.attribute,
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: str_(i18n.UIStrings.columnFailingElem)},
      {key: 'current', valueType: 'text', label: str_(UIStrings.columnCurrent)},
      {key: 'suggestion', valueType: 'text', label: str_(UIStrings.columnSuggestions)},
    ];
    const details = Audit.makeTableDetails(headings, failingFormsData);
    let displayValue;
    if (failingFormsData.length > 0) {
      displayValue = str_(i18n.UIStrings.displayValueElementsFound,
        {nodeCount: failingFormsData.length});
    }
    return {
      score: (failingFormsData.length > 0) ? 0 : 1,
      notApplicable: !foundPrediction,
      displayValue,
      details,
      warnings,
    };
  }
}

export default AutocompleteAudit;
export {UIStrings};
