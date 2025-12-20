/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable max-len */

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for byte efficiency tests
 */
const expectations = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/a11y/a11y_tester.html',
      finalUrl: 'http://localhost:10200/a11y/a11y_tester.html',
      audits: {
        'aria-allowed-attr': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-allowed-attr',
                  'snippet': '<div id="aria-allowed-attr" role="alert" aria-checked="true">\n      </div>',
                  'explanation': 'Fix any of the following:\n  ARIA attribute is not allowed: aria-checked="true"',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'aria-hidden-body': {
          score: 1,
          details: {
            'type': 'table',
            'headings': [],
            'items': [],
          },
        },
        'aria-hidden-focus': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-hidden-focus',
                  'snippet': '<div id="aria-hidden-focus" aria-hidden="true">\n        <button>Focusable Button</button>\n      </div>',
                  'explanation': 'Fix all of the following:\n  Focusable content should be disabled or be removed from the DOM',
                  'nodeLabel': 'Focusable Button',
                },
              },
            ],
          },
        },
        'aria-input-field-name': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-input-field-name',
                  'snippet': '<div id="aria-input-field-name" role="textbox">text-in-a-box</div>',
                  'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute or the title attribute is empty',
                  'nodeLabel': 'text-in-a-box',
                },
              },
            ],
          },
        },
        'aria-required-children': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-required-children',
                  'snippet': '<div id="aria-required-children" role="radiogroup">\n        <div></div>\n      </div>',
                  'explanation': 'Fix any of the following:\n  Required ARIA child role not present: radio',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'aria-required-parent': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-required-parent',
                  'snippet': '<div id="aria-required-parent" role="option">\n        </div>',
                  'explanation': 'Fix any of the following:\n  Required ARIA parent role not present: listbox',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'aria-roles': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': 'div[role="foo"]',
                  'snippet': '<div role="foo"></div>',
                  'explanation': 'Fix all of the following:\n  Role must be one of the valid ARIA roles: foo',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'aria-toggle-field-name': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-required-attr',
                  'path': '2,HTML,1,BODY,9,SECTION,0,DIV',
                  'snippet': '<div id="aria-required-attr" role="checkbox">\n      </div>',
                  'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute or the title attribute is empty\n  Element does not have text that is visible to screen readers',
                  'nodeLabel': 'div',
                },
              },
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-valid-attr',
                  'path': '2,HTML,1,BODY,17,SECTION,0,DIV',
                  'snippet': '<div id="aria-valid-attr" role="checkbox" aria-chked="true">\n      </div>',
                  'nodeLabel': 'div',
                },
              },
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-valid-attr-value',
                  'path': '2,HTML,1,BODY,19,SECTION,0,DIV',
                  'snippet': '<div id="aria-valid-attr-value" role="checkbox" aria-checked="0">\n      </div>',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'aria-valid-attr-value': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-valid-attr-value',
                  'snippet': '<div id="aria-valid-attr-value" role="checkbox" aria-checked="0">\n      </div>',
                  'explanation': 'Fix all of the following:\n  Invalid ARIA attribute value: aria-checked="0"',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'aria-valid-attr': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#aria-valid-attr',
                  'snippet': '<div id="aria-valid-attr" role="checkbox" aria-chked="true">\n      </div>',
                  'explanation': 'Fix any of the following:\n  Invalid ARIA attribute name: aria-chked',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'button-name': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#button-name',
                  'snippet': '<button id="button-name"></button>',
                  'explanation': 'Fix any of the following:\n  Element does not have inner text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element\'s default semantics were not overridden with role="presentation"\n  Element\'s default semantics were not overridden with role="none"\n  Element has no title attribute or the title attribute is empty',
                  'nodeLabel': 'button',
                },
              },
            ],
          },
        },
        'bypass': {
          score: 1,
          details: {
            type: 'table',
            headings: [],
            items: [],
          },
        },
        'color-contrast': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#color-contrast',
                  'snippet': '<div id="color-contrast" style="background-color: red; color: pink;">\n          Hello\n      </div>',
                  // Default font size is different depending on the platform (e.g. 28.5 on travis, 30.0 on Mac), and the px-converted units may have variable precision, so use \d+.\d+.
                  'explanation': /^Fix any of the following:\n {2}Element has insufficient color contrast of 2\.59 \(foreground color: #ffc0cb, background color: #ff0000, font size: \d+.\d+pt \(\d+.\d+px\), font weight: normal\). Expected contrast ratio of 3:1$/,
                  'nodeLabel': 'Hello',
                },
              },
            ],
          },
        },
        'definition-list': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#definition-list',
                  'snippet': '<dl id="definition-list">\n        <p></p>\n      </dl>',
                  'explanation': 'Fix all of the following:\n  List element has direct children that are not allowed inside <dt> or <dd> elements',
                  'nodeLabel': 'dl',
                },
              },
            ],
          },
        },
        'dlitem': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': 'dd',
                  'snippet': '<dd></dd>',
                  'explanation': 'Fix any of the following:\n  Description list item does not have a <dl> parent element',
                  'nodeLabel': 'dd',
                },
              },
            ],
          },
        },
        'document-title': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': 'html',
                  'snippet': '<html>',
                  'explanation': 'Fix any of the following:\n  Document does not have a non-empty <title> element',
                  'nodeLabel': 'html',
                },
              },
            ],

          },
        },
        'duplicate-id-active': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': 'textarea[aria-label="text1"]',
                  'path': '2,HTML,1,BODY,29,SECTION,0,TEXTAREA',
                  'snippet': '<textarea id="duplicate-id-active" aria-label="text1"></textarea>',
                  'explanation': 'Fix any of the following:\n  Document has active elements with the same id attribute: duplicate-id-active',
                  'nodeLabel': 'text1',
                },
              },
            ],
          },
        },
        'duplicate-id-aria': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '.duplicate-id-aria',
                  'path': '2,HTML,1,BODY,31,SECTION,0,DIV',
                  'snippet': '<div id="duplicate-id-aria" class="duplicate-id-aria">\n      <div id="duplicate-id-aria"></div>\n      <div aria-labelledby="duplicate-id-aria"></div>\n    </div>',
                  'explanation': 'Fix any of the following:\n  Document has multiple elements referenced with ARIA with the same id attribute: duplicate-id-aria',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'form-field-multiple-labels': {
          score: null,
          scoreDisplayMode: 'informative',
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#form-field-multiple-labels',
                  'path': '2,HTML,1,BODY,33,SECTION,2,INPUT',
                  'snippet': '<input type="checkbox" id="form-field-multiple-labels">',
                  'explanation': 'Fix all of the following:\n  Multiple label elements is not widely supported in assistive technologies. Ensure the first label contains all necessary information.',
                  'nodeLabel': 'input',
                },
              },
            ],
          },
        },
        'frame-title': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#frame-title',
                  'snippet': '<iframe id="frame-title"></iframe>',
                  'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute or the title attribute is empty\n  Element\'s default semantics were not overridden with role="presentation"\n  Element\'s default semantics were not overridden with role="none"',
                  'nodeLabel': 'iframe',
                },
              },
            ],
          },
        },
        'heading-order': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': 'h3',
                  'path': '2,HTML,1,BODY,37,SECTION,1,H3',
                  'snippet': '<h3>sub-sub-header</h3>',
                  'explanation': 'Fix any of the following:\n  Heading order invalid',
                  'nodeLabel': 'sub-sub-header',
                },
              },
            ],
          },
        },
        'html-has-lang': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': 'html',
                  'snippet': '<html>',
                  'explanation': 'Fix any of the following:\n  The <html> element does not have a lang attribute',
                  'nodeLabel': 'html',
                },
              },
            ],
          },
        },
        'image-alt': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#image-alt',
                  'snippet': '<img id="image-alt" src="./bogus.jpg">',
                  'explanation': 'Fix any of the following:\n  Element does not have an alt attribute\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute or the title attribute is empty\n  Element\'s default semantics were not overridden with role="presentation"\n  Element\'s default semantics were not overridden with role="none"',
                  'nodeLabel': 'img',
                },
              },
            ],
          },
        },
        'input-image-alt': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#input-image-alt',
                  'snippet': '<input type="image" id="input-image-alt">',
                  'explanation': 'Fix any of the following:\n  Element has no alt attribute or the alt attribute is empty\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute or the title attribute is empty',
                  'nodeLabel': 'input',
                },
              },
            ],
          },
        },
        'label': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#label',
                  'snippet': '<input id="label" type="text">',
                  'explanation': 'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Form element does not have an implicit (wrapped) <label>\n  Form element does not have an explicit <label>\n  Element has no title attribute or the title attribute is empty',
                  'nodeLabel': 'input',
                },
              },
            ],
          },
        },
        'layout-table': {
          score: 1,
          details: {
            'type': 'table',
            'headings': [],
            'items': [],
          },
        },
        'link-name': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#link-name',
                  'snippet': '<a id="link-name" href="google.com"></a>',
                  'explanation': 'Fix all of the following:\n  Element is in tab order and does not have accessible text\n\nFix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element\'s default semantics were not overridden with role="presentation"\n  Element\'s default semantics were not overridden with role="none"',
                  'nodeLabel': 'a',
                },
              },
            ],
          },
        },
        'list': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#list',
                  'snippet': '<ul id="list">\n        <p></p>\n      </ul>',
                  'explanation': 'Fix all of the following:\n  List element has direct children that are not allowed inside <li> elements',
                  'nodeLabel': 'ul',
                },
              },
            ],
          },
        },
        'listitem': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#listitem',
                  'snippet': '<li id="listitem"></li>',
                  'explanation': 'Fix any of the following:\n  List item does not have a <ul>, <ol> parent element',
                  'nodeLabel': 'li',
                },
              },
            ],
          },
        },
        'meta-viewport': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': 'meta[name="viewport"]',
                  'snippet': '<meta name="viewport" content="user-scalable=no, maximum-scale=1.0">',
                  'explanation': 'Fix any of the following:\n  user-scalable=no on <meta> tag disables zooming on mobile devices',
                  'nodeLabel': 'meta',
                },
              },
            ],
          },
        },
        'object-alt': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#object-alt',
                  'snippet': '<object id="object-alt"></object>',
                  'explanation': 'Fix any of the following:\n  Element does not have text that is visible to screen readers\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute or the title attribute is empty\n  Element\'s default semantics were not overridden with role="presentation"\n  Element\'s default semantics were not overridden with role="none"',
                  'nodeLabel': 'object',
                },
              },
            ],
          },
        },
        'tabindex': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#tabindex',
                  'snippet': '<div id="tabindex" tabindex="10">\n      </div>',
                  'explanation': 'Fix any of the following:\n  Element has a tabindex greater than 0',
                  'nodeLabel': 'div',
                },
              },
            ],
          },
        },
        'td-headers-attr': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#td-headers-attr',
                  'snippet': '<table id="td-headers-attr">\n\t\t\t  <tbody><tr><th>FOO</th></tr>\n\t\t\t  <tr><td headers="bogus-td-headers-attr">foo</td></tr>\n\t\t\t</tbody></table>',
                  'explanation': 'Fix all of the following:\n  The headers attribute is not exclusively used to refer to other cells in the table',
                  'nodeLabel': 'FOO\nfoo',
                },
              },
            ],
          },
        },
        'valid-lang': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#valid-lang',
                  'snippet': '<p id="valid-lang" lang="foo">foo</p>',
                  'explanation': 'Fix all of the following:\n  Value of lang attribute not included in the list of valid languages',
                  'nodeLabel': 'foo',
                },
              },
            ],
          },
        },
        'accesskeys': {
          score: 0,
          details: {
            items: [
              {
                node: {
                  'type': 'node',
                  'selector': '#accesskeys1',
                  'snippet': '<button id="accesskeys1" accesskey="s">Foo</button>',
                  'explanation': 'Fix all of the following:\n  Document has multiple elements with the same accesskey',
                  'nodeLabel': 'Foo',
                },
              },
            ],
          },
        },
      },
    },
  },
];

module.exports = expectations;
