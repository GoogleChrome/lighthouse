/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// https://www.ecma-international.org/ecma-262/9.0/index.html#sec-punctuators
// eslint-disable-next-line max-len
const PUNCTUATOR_REGEX = /(return|{|\(|\[|\.\.\.|;|,|<|>|<=|>=|==|!=|===|!==|\+|-|\*|%|\*\*|\+\+|--|<<|>>|>>>|&|\||\^|!|~|&&|\|\||\?|:|=|\+=|-=|\*=|%=|\*\*=|<<=|>>=|>>>=|&=|\|=|\^=|=>|\/|\/=|\})$/;
const WHITESPACE_REGEX = /( |\n|\t)+$/;

/**
 * Look backwards from `startPosition` in `content` for an ECMAScript punctuator.
 * This is used to differentiate a RegExp from a divide statement.
 * If a punctuator immediately precedes a lone `/`, the `/` must be the start of a RegExp.
 *
 * @param {string} content
 * @param {number} startPosition
 */
function hasPunctuatorBefore(content, startPosition) {
  for (let i = startPosition; i > 0; i--) {
    // Try to grab at least 6 characters so we can check for `return`
    const sliceStart = Math.max(0, i - 6);
    const precedingCharacters = content.slice(sliceStart, i);
    // Skip over any ending whitespace
    if (WHITESPACE_REGEX.test(precedingCharacters)) continue;
    // Check if it's a punctuator
    return PUNCTUATOR_REGEX.test(precedingCharacters);
  }

  // The beginning of the content counts too for our purposes.
  // i.e. a script can't start with a divide symbol
  return true;
}


/**
 *
 * @param {string} content
 * @param {{singlelineComments: boolean, regex: boolean}} features
 */
function computeTokenLength(content, features) {
  let totalTokenLength = 0;
  let isInSinglelineComment = false;
  let isInMultilineComment = false;
  let isInLicenseComment = false;
  let isInString = false;
  let isInRegex = false;
  let isInRegexCharacterClass = false;
  let stringOpenChar = null;

  for (let i = 0; i < content.length; i++) {
    const twoChars = content.substr(i, 2);
    const char = twoChars.charAt(0);

    const isWhitespace = char === ' ' || char === '\n' || char === '\t';
    const isAStringOpenChar = char === `'` || char === '"' || char === '`';

    if (isInSinglelineComment) {
      if (char === '\n') {
        // End the comment when you hit a newline
        isInSinglelineComment = false;
      }
    } else if (isInMultilineComment) {
      // License comments count
      if (isInLicenseComment) totalTokenLength++;

      if (twoChars === '*/') {
        // License comments count, account for the '/' character we're skipping over
        if (isInLicenseComment) totalTokenLength++;
        // End the comment when we hit the closing sequence
        isInMultilineComment = false;
        // Skip over the '/' character since we've already processed it
        i++;
      }
    } else if (isInString) {
      // String characters count
      totalTokenLength++;

      if (char === '\\') {
        // Skip over any escaped characters
        totalTokenLength++;
        i++;
      } else if (char === stringOpenChar) {
        // End the string when we hit the same stringOpenCharacter
        isInString = false;
        // console.log(i, 'exiting string', stringOpenChar)
      }
    } else if (isInRegex) {
      // Regex characters count
      totalTokenLength++;

      if (char === '\\') {
        // Skip over any escaped characters
        totalTokenLength++;
        i++;
      } else if (char === '[') {
        // Register that we're entering a character class so we don't leave the regex prematurely
        isInRegexCharacterClass = true;
      } else if (char === ']' && isInRegexCharacterClass) {
        // Register that we're exiting the character class
        isInRegexCharacterClass = false;
      } else if (char === '/' && !isInRegexCharacterClass) {
        // End the string when we hit the regex close character
        isInRegex = false;
        // console.log(i, 'leaving regex', char)
      }
    } else {
      // We're not in any particular token mode, look for the start of different
      if (twoChars === '/*') {
        // Start the multi-line comment
        isInMultilineComment = true;
        // Check if it's a license comment so we know whether to count it
        isInLicenseComment = content.charAt(i + 2) === '!';
        // += 2 because we are processing 2 characters, not just 1
        if (isInLicenseComment) totalTokenLength += 2;
        // Skip over the '*' character since we've already processed it
        i++;
      } else if (twoChars === '//' && features.singlelineComments) {
        // Start the single-line comment
        isInSinglelineComment = true;
        isInMultilineComment = false;
        isInLicenseComment = false;
        // Skip over the second '/' character since we've already processed it
        i++;
      } else if (char === '/' && features.regex && hasPunctuatorBefore(content, i)) {
        // Start the regex
        isInRegex = true;
        // Regex characters count
        totalTokenLength++;
      } else if (isAStringOpenChar) {
        // Start the string
        isInString = true;
        // Save the open character for later so we know when to close it
        stringOpenChar = char;
        // String characters count
        totalTokenLength++;
      } else if (!isWhitespace) {
        // All non-whitespace characters count
        totalTokenLength++;
      }
    }
  }

  // If the content contained unbalanced comments, it's either invalid or we had a parsing error.
  // Report the token length as the entire string so it will be ignored.
  if (isInMultilineComment || isInString) {
    return content.length;
  }

  return totalTokenLength;
}

/**
 * @param {string} content
 */
function computeJSTokenLength(content) {
  return computeTokenLength(content, {singlelineComments: true, regex: true});
}

/**
 * @param {string} content
 */
function computeCSSTokenLength(content) {
  return computeTokenLength(content, {singlelineComments: false, regex: false});
}

module.exports = {computeJSTokenLength, computeCSSTokenLength};
