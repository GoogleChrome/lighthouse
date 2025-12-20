/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const FontSizeGather = require('../../../../gather/gatherers/seo/font-size.js');
let fontSizeGather;

const TEXT_NODE_TYPE = 3;
const smallText = ' body sm𝐀ll text ';
const bigText = 'body 𝐁ig text';
const bodyNode = {nodeId: 3, backendNodeId: 102, nodeName: 'BODY', parentId: 1, fontSize: '10px'};
const nodes = [
  {nodeId: 1, backendNodeId: 100, nodeName: 'HTML'},
  {nodeId: 2, backendNodeId: 101, nodeName: 'HEAD', parentId: 1},
  bodyNode,
  {
    nodeId: 4,
    backendNodeId: 103,
    nodeValue: 'head text',
    nodeType: TEXT_NODE_TYPE,
    parentId: 2,
  },
  {
    nodeId: 5,
    backendNodeId: 104,
    nodeValue: smallText,
    nodeType: TEXT_NODE_TYPE,
    parentId: 3,
  },
  {nodeId: 6, backendNodeId: 105, nodeName: 'H1', parentId: 3},
  {
    nodeId: 7,
    backendNodeId: 106,
    nodeValue: bigText,
    nodeType: TEXT_NODE_TYPE,
    parentId: 6,
  },
  {nodeId: 8, backendNodeId: 107, nodeName: 'SCRIPT', parentId: 3},
  {
    nodeId: 9,
    backendNodeId: 108,
    nodeValue: 'script text',
    nodeType: TEXT_NODE_TYPE,
    parentId: 8,
  },
];

const stringsMap = {};
const strings = [];
const getOrCreateStringIndex = value => {
  if (value in stringsMap) {
    return stringsMap[value];
  }

  const index = strings.length;
  stringsMap[value] = index;
  strings.push(value);
  return index;
};
const snapshot = {
  documents: [
    {
      nodes: {
        backendNodeId: nodes.map(node => node.backendNodeId),
      },
      layout: {
        nodeIndex: nodes.map((_, i) => i),
        styles: nodes.map(node => [
          getOrCreateStringIndex(`${node.nodeValue === smallText ? 10 : 20}px`),
        ]),
        text: nodes.map(node => getOrCreateStringIndex(node.nodeValue)),
      },
      textBoxes: {
        layoutIndex: nodes.map((_, i) => i).filter(i => {
          const node = nodes[i];
          if (node.nodeType !== TEXT_NODE_TYPE) return false;

          const parentNode = nodes.find(n => n.nodeId === node.parentId);
          return parentNode && parentNode.nodeName !== 'SCRIPT';
        }),
      },
    },
  ],
  strings,
};

describe('Font size gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    fontSizeGather = new FontSizeGather();
  });

  it('returns information about font sizes used on page', async () => {
    const driver = {
      on() {},
      off() {},
      async sendCommand(command) {
        if (command === 'CSS.getMatchedStylesForNode') {
          return {
            inlineStyle: null,
            attributesStyle: null,
            matchedCSSRules: [],
            inherited: [],
          };
        } else if (command === 'DOMSnapshot.captureSnapshot') {
          return snapshot;
        }
      },
      async getNodesInDocument() {
        return nodes;
      },
    };

    const artifact = await fontSizeGather.afterPass({driver});
    const expectedFailingTextLength = Array.from(smallText.trim()).length;
    const expectedTotalTextLength =
      Array.from(smallText.trim()).length +
      Array.from(bigText.trim()).length;
    const expectedAnalyzedFailingTextLength = expectedFailingTextLength;

    expect(artifact).toEqual({
      analyzedFailingTextLength: expectedAnalyzedFailingTextLength,
      failingTextLength: expectedFailingTextLength,
      totalTextLength: expectedTotalTextLength,
      analyzedFailingNodesData: [
        {
          fontSize: 10,
          node: bodyNode,
          textLength: expectedFailingTextLength,
        },
      ],
    });
  });

  describe('#computeSelectorSpecificity', () => {
    const compute = FontSizeGather.computeSelectorSpecificity;

    it('should handle basic selectors', () => {
      expect(compute('h1')).toEqual(1);
      expect(compute('h1 > p > span')).toEqual(3);
    });

    it('should handle class selectors', () => {
      expect(compute('h1.foo')).toEqual(11);
      expect(compute('h1 > p.other.yeah > span')).toEqual(23);
    });

    it('should handle ID selectors', () => {
      expect(compute('h1#awesome.foo')).toEqual(111);
      expect(compute('h1 > p.other > span#the-text')).toEqual(113);
    });

    it('should cap the craziness', () => {
      expect(compute('h1.a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p')).toEqual(91);
    });
  });

  describe('#getEffectiveFontRule', () => {
    const createProps = props => Object.entries(props).map(([name, value]) => ({name, value}));
    const createStyle = ({properties, id}) => ({
      styleSheetId: id,
      cssProperties: createProps(properties),
    });
    const createRule = ({style, selectors, origin}) => ({
      style,
      origin,
      selectorList: {selectors: selectors.map(text => ({text}))},
    });

    let inlineStyle;
    let matchedCSSRules;
    let attributesStyle;
    let inherited;

    beforeEach(() => {
      const fontRule = createRule({
        origin: 'regular',
        selectors: ['html body *', '#main'],
        style: createStyle({id: 123, properties: {'font-size': '1em'}}),
      });
      const userAgentRule = createRule({
        origin: 'user-agent',
        selectors: ['body'],
        style: createStyle({properties: {'font-size': 12}}),
      });

      inlineStyle = createStyle({id: 1, properties: {'font-size': '1em'}});
      matchedCSSRules = [{matchingSelectors: [1], rule: fontRule}];
      attributesStyle = {cssProperties: createProps({'font-size': '10px'})};
      inherited = [{matchedCSSRules: [{matchingSelectors: [0], rule: userAgentRule}]}];
    });

    it('should identify inline styles', () => {
      const result = FontSizeGather.getEffectiveFontRule({inlineStyle});
      expect(result).toEqual({
        cssProperties: [
          {
            name: 'font-size',
            value: '1em',
          },
        ],
        styleSheetId: 1,
        type: 'Inline',
      });
    });

    it('should identify attributes styles', () => {
      const result = FontSizeGather.getEffectiveFontRule({attributesStyle});
      expect(result).toEqual({
        cssProperties: [
          {
            name: 'font-size',
            value: '10px',
          },
        ],
        type: 'Attributes',
      });
    });

    it('should identify direct CSS rules', () => {
      const result = FontSizeGather.getEffectiveFontRule({matchedCSSRules});
      expect(result).toEqual({
        cssProperties: [
          {
            name: 'font-size',
            value: '1em',
          },
        ],
        parentRule: {
          origin: 'regular',
          selectors: [
            {
              text: 'html body *',
            },
            {
              text: '#main',
            },
          ],
        },
        styleSheetId: 123,
        type: 'Regular',
      });
    });

    it('should identify inherited CSS rules', () => {
      const result = FontSizeGather.getEffectiveFontRule({inherited});
      expect(result).toEqual({
        cssProperties: [
          {
            name: 'font-size',
            value: 12,
          },
        ],
        parentRule: {
          origin: 'user-agent',
          selectors: [
            {
              text: 'body',
            },
          ],
        },
        styleSheetId: undefined,
        type: 'Regular',
      });
    });

    it('should respect precendence', () => {
      let result = FontSizeGather.getEffectiveFontRule(
        {attributesStyle, inlineStyle, matchedCSSRules, inherited});
      expect(result).toMatchObject({type: 'Inline'});

      result = FontSizeGather.getEffectiveFontRule({attributesStyle, inherited});
      expect(result).toMatchObject({type: 'Attributes'});

      result = FontSizeGather.getEffectiveFontRule({attributesStyle, matchedCSSRules, inherited});
      expect(result.parentRule).toMatchObject({origin: 'regular'});

      result = FontSizeGather.getEffectiveFontRule({inherited});
      expect(result.parentRule).toMatchObject({origin: 'user-agent'});

      result = FontSizeGather.getEffectiveFontRule({});
      expect(result).toBe(undefined);
    });

    it('should use the most specific selector', () => {
      // Just 1 class
      const fontRuleA = createRule({
        origin: 'regular',
        selectors: ['.main'],
        style: createStyle({id: 1, properties: {'font-size': '1em'}}),
      });

      // Two matching selectors where 2nd is the global most specific, ID + class
      const fontRuleB = createRule({
        origin: 'regular',
        selectors: ['html body *', '#main.foo'],
        style: createStyle({id: 2, properties: {'font-size': '2em'}}),
      });

      // Just ID
      const fontRuleC = createRule({
        origin: 'regular',
        selectors: ['#main'],
        style: createStyle({id: 3, properties: {'font-size': '3em'}}),
      });

      const matchedCSSRules = [
        {rule: fontRuleA, matchingSelectors: [0]},
        {rule: fontRuleB, matchingSelectors: [0, 1]},
        {rule: fontRuleC, matchingSelectors: [0]},
      ];

      const result = FontSizeGather.getEffectiveFontRule({matchedCSSRules});
      // fontRuleB should have one for ID + class
      expect(result.styleSheetId).toEqual(2);
    });

    it('should break ties with last one declared', () => {
      const fontRuleA = createRule({
        origin: 'regular',
        selectors: ['.main'],
        style: createStyle({id: 1, properties: {'font-size': '1em'}}),
      });

      const fontRuleB = createRule({
        origin: 'regular',
        selectors: ['.other'],
        style: createStyle({id: 2, properties: {'font-size': '2em'}}),
      });

      const matchedCSSRules = [
        {rule: fontRuleA, matchingSelectors: [0]},
        {rule: fontRuleB, matchingSelectors: [0]},
      ];

      const result = FontSizeGather.getEffectiveFontRule({matchedCSSRules});
      expect(result.styleSheetId).toEqual(2);
    });
  });
});
