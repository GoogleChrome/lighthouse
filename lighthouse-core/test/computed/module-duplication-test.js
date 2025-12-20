/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const fs = require('fs');
const ModuleDuplication = require('../../computed/module-duplication.js');

function load(name) {
  const mapJson = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js`, 'utf-8');
  return {map: JSON.parse(mapJson), content};
}

describe('ModuleDuplication computed artifact', () => {
  it('works (simple)', async () => {
    const context = {computedCache: new Map()};
    const {map, content} = load('foo.min');
    const artifacts = {
      SourceMaps: [
        {scriptUrl: 'https://example.com/foo1.min.js', map},
        {scriptUrl: 'https://example.com/foo2.min.js', map},
      ],
      ScriptElements: [
        {src: 'https://example.com/foo1.min.js', content},
        {src: 'https://example.com/foo2.min.js', content},
      ],
    };
    const results = await ModuleDuplication.request(artifacts, context);
    expect(results).toMatchInlineSnapshot(`
      Map {
        "node_modules/browser-pack/_prelude.js" => Array [
          Object {
            "scriptUrl": "https://example.com/foo1.min.js",
            "size": 480,
          },
          Object {
            "scriptUrl": "https://example.com/foo2.min.js",
            "size": 480,
          },
        ],
        "src/bar.js" => Array [
          Object {
            "scriptUrl": "https://example.com/foo1.min.js",
            "size": 104,
          },
          Object {
            "scriptUrl": "https://example.com/foo2.min.js",
            "size": 104,
          },
        ],
        "src/foo.js" => Array [
          Object {
            "scriptUrl": "https://example.com/foo1.min.js",
            "size": 98,
          },
          Object {
            "scriptUrl": "https://example.com/foo2.min.js",
            "size": 98,
          },
        ],
      }
    `);
  });

  it('works (complex)', async () => {
    const context = {computedCache: new Map()};
    const bundleData1 = load('coursehero-bundle-1');
    const bundleData2 = load('coursehero-bundle-2');
    const artifacts = {
      SourceMaps: [
        {scriptUrl: 'https://example.com/coursehero-bundle-1.js', map: bundleData1.map},
        {scriptUrl: 'https://example.com/coursehero-bundle-2.js', map: bundleData2.map},
      ],
      ScriptElements: [
        {src: 'https://example.com/coursehero-bundle-1.js', content: bundleData1.content},
        {src: 'https://example.com/coursehero-bundle-2.js', content: bundleData2.content},
      ],
    };
    const results = await ModuleDuplication.request(artifacts, context);
    expect(results).toMatchInlineSnapshot(`
      Map {
        "Control/assets/js/vendor/ng/select/select.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 48513,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 48513,
          },
        ],
        "Control/assets/js/vendor/ng/select/angular-sanitize.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 9135,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 9135,
          },
        ],
        "node_modules/@babel/runtime/helpers/classCallCheck.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 358,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 236,
          },
        ],
        "node_modules/@babel/runtime/helpers/createClass.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 799,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 496,
          },
        ],
        "node_modules/@babel/runtime/helpers/assertThisInitialized.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 296,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 294,
          },
        ],
        "node_modules/@babel/runtime/helpers/applyDecoratedDescriptor.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 892,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 446,
          },
        ],
        "node_modules/@babel/runtime/helpers/possibleConstructorReturn.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 230,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 228,
          },
        ],
        "node_modules/@babel/runtime/helpers/getPrototypeOf.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 361,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 338,
          },
        ],
        "node_modules/@babel/runtime/helpers/inherits.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 528,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 528,
          },
        ],
        "node_modules/@babel/runtime/helpers/defineProperty.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 290,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 288,
          },
        ],
        "node_modules/@babel/runtime/helpers/extends.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 490,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 245,
          },
        ],
        "node_modules/@babel/runtime/helpers/typeof.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 992,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 992,
          },
        ],
        "node_modules/@babel/runtime/helpers/setPrototypeOf.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 290,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 260,
          },
        ],
        "js/src/common/base-component.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 459,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 216,
          },
        ],
        "js/src/utils/service/amplitude-service.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 1348,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 1325,
          },
        ],
        "js/src/aged-beef.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 213,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 194,
          },
        ],
        "js/src/utils/service/api-service.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 116,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 54,
          },
        ],
        "js/src/common/decorators/throttle.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 251,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 244,
          },
        ],
        "js/src/utils/service/gsa-inmeta-tags.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 591,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 563,
          },
        ],
        "js/src/utils/service/global-service.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 336,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 167,
          },
        ],
        "js/src/search/results/store/filter-actions.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 956,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 946,
          },
        ],
        "js/src/search/results/store/item/resource-types.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 783,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 775,
          },
        ],
        "js/src/common/input/keycode.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 237,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 223,
          },
        ],
        "js/src/search/results/store/filter-store.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 12717,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 12650,
          },
        ],
        "js/src/search/results/view/filter/autocomplete-list.tsx" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 1143,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 1134,
          },
        ],
        "js/src/search/results/view/filter/autocomplete-filter.tsx" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 3823,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 3812,
          },
        ],
        "js/src/search/results/view/filter/autocomplete-filter-with-icon.tsx" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 2696,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 2693,
          },
        ],
        "js/src/search/results/service/api/filter-api-service.ts" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 554,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 534,
          },
        ],
        "js/src/common/component/school-search.tsx" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 5840,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 5316,
          },
        ],
        "js/src/common/component/search/abstract-taxonomy-search.tsx" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 3103,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 3098,
          },
        ],
        "js/src/common/component/search/course-search.tsx" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 545,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 544,
          },
        ],
        "node_modules/lodash-es/_freeGlobal.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 118,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 93,
          },
        ],
        "node_modules/lodash-es/_root.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 93,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 93,
          },
        ],
        "node_modules/lodash-es/_Symbol.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 10,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 10,
          },
        ],
        "node_modules/lodash-es/_arrayMap.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 99,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 99,
          },
        ],
        "node_modules/lodash-es/isArray.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 16,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 16,
          },
        ],
        "node_modules/lodash-es/_getRawTag.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 206,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 206,
          },
        ],
        "node_modules/lodash-es/_objectToString.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 64,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 64,
          },
        ],
        "node_modules/lodash-es/_baseGetTag.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 143,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 143,
          },
        ],
        "node_modules/lodash-es/isObjectLike.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 54,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 54,
          },
        ],
        "node_modules/lodash-es/isSymbol.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 79,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 79,
          },
        ],
        "node_modules/lodash-es/_baseToString.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 198,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 198,
          },
        ],
        "node_modules/lodash-es/isObject.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 80,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 79,
          },
        ],
        "node_modules/lodash-es/toNumber.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 370,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 354,
          },
        ],
        "node_modules/lodash-es/toFinite.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 118,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 117,
          },
        ],
        "node_modules/lodash-es/toInteger.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 60,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 60,
          },
        ],
        "node_modules/lodash-es/toString.js" => Array [
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-1.js",
            "size": 43,
          },
          Object {
            "scriptUrl": "https://example.com/coursehero-bundle-2.js",
            "size": 43,
          },
        ],
      }
    `);
  });

  it('_normalizeSource', () => {
    const testCases = [
      ['test.js', 'test.js'],
      ['node_modules/othermodule.js', 'node_modules/othermodule.js'],
      ['node_modules/somemodule/node_modules/othermodule.js', 'node_modules/othermodule.js'],
      [
        'node_modules/somemodule/node_modules/somemodule2/node_modules/othermodule.js',
        'node_modules/othermodule.js',
      ],
      ['webpack.js?', 'webpack.js'],
    ];
    for (const [input, expected] of testCases) {
      expect(ModuleDuplication._normalizeSource(input)).toBe(expected);
    }
  });
});
