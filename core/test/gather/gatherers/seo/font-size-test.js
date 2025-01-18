/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import FontSizeGather, {getEffectiveFontRule} from '../../../../gather/gatherers/seo/font-size.js';

let fontSizeGather;

const TEXT_NODE_TYPE = 3;
const smallText = ' body sm𝐀ll text ';
const bigText = 'body 𝐁ig text';
const bodyNode = {
  nodeId: 2, backendNodeId: 102,
  nodeName: 'BODY', parentId: 0, fontSize: '10px', attributes: ['blah', '1'],
};
const nodes = [
  {nodeId: 0, backendNodeId: 100, nodeName: 'HTML'},
  {nodeId: 1, backendNodeId: 101, nodeName: 'HEAD', parentId: 0},
  bodyNode,
  {
    nodeId: 3,
    backendNodeId: 103,
    nodeValue: 'head text',
    nodeType: TEXT_NODE_TYPE,
    parentId: 1,
  },
  {
    nodeId: 4,
    backendNodeId: 104,
    nodeValue: smallText,
    nodeType: TEXT_NODE_TYPE,
    parentId: 2,
  },
  {nodeId: 5, backendNodeId: 105, nodeName: 'H1', parentId: 2},
  {
    nodeId: 6,
    backendNodeId: 106,
    nodeValue: bigText,
    nodeType: TEXT_NODE_TYPE,
    parentId: 5,
  },
  {nodeId: 7, backendNodeId: 107, nodeName: 'SCRIPT', parentId: 2},
  {
    nodeId: 8,
    backendNodeId: 108,
    nodeValue: 'script text',
    nodeType: TEXT_NODE_TYPE,
    parentId: 7,
  },
];
nodes.forEach((node, i) => assert(node.nodeId === i));

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

const nodeNamesNotInLayout = ['HEAD', 'HTML', 'SCRIPT'];
const nodeIndicesInLayout = nodes.map((node, i) => {
  if (nodeNamesNotInLayout.includes(node.nodeName)) return null;

  if (node.nodeType === TEXT_NODE_TYPE) {
    const parentNode = nodes[node.parentId];
    if (parentNode && nodeNamesNotInLayout.includes(parentNode.nodeName)) {
      return null;
    }
  }

  return i;
}).filter(id => id !== null);
const nodesInLayout = nodeIndicesInLayout.map(index => nodes[index]);

const snapshot = {
  documents: [
    {
      nodes: {
        backendNodeId: nodes.map(node => node.backendNodeId),
        parentIndex: nodes.map(node => node.parentId),
        attributes: nodes.map(node =>
          node.attributes ? node.attributes.map(getOrCreateStringIndex) : []),
        nodeName: nodes.map(node => getOrCreateStringIndex(node.nodeName)),
      },
      layout: {
        nodeIndex: nodeIndicesInLayout,
        styles: nodesInLayout.map(node => ([
          getOrCreateStringIndex(`${node.nodeValue === smallText ? 10 : 20}px`),
        ])),
        text: nodesInLayout.map(node => getOrCreateStringIndex(node.nodeValue)),
      },
      textBoxes: {
        layoutIndex: nodeIndicesInLayout.map((_, i) => i).filter(i => {
          const node = nodes[nodeIndicesInLayout[i]];
          if (node.nodeType !== TEXT_NODE_TYPE) return false;

          const parentNode = nodes[node.parentId];
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
    const session = {
      on() {},
      off() {},
      async sendCommand(command, args) {
        if (command === 'CSS.getMatchedStylesForNode') {
          return {
            inlineStyle: null,
            attributesStyle: null,
            matchedCSSRules: [],
            inherited: [],
          };
        } else if (command === 'DOMSnapshot.captureSnapshot') {
          return snapshot;
        } else if (command === 'DOM.pushNodesByBackendIdsToFrontend') {
          return {
            nodeIds: args.backendNodeIds.map(backendNodeId => {
              return nodes.find(node => node.backendNodeId === backendNodeId).nodeId;
            }),
          };
        }
      },
    };
    const driver = {defaultSession: session};

    const artifact = await fontSizeGather.getArtifact({driver});
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
          // nodeId of the failing body TextNode
          nodeId: 2,
          fontSize: 10,
          parentNode: {
            backendNodeId: 102,
            attributes: bodyNode.attributes,
            nodeName: bodyNode.nodeName,
            parentNode: {
              backendNodeId: 100,
              attributes: [],
              nodeName: 'HTML',
            },
          },
          textLength: expectedFailingTextLength,
        },
      ],
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
      const result = getEffectiveFontRule({inlineStyle});
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
      const result = getEffectiveFontRule({attributesStyle});
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
      const result = getEffectiveFontRule({matchedCSSRules});
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
      const result = getEffectiveFontRule({inherited});
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
      let result = getEffectiveFontRule(
        {attributesStyle, inlineStyle, matchedCSSRules, inherited});
      expect(result).toMatchObject({type: 'Inline'});

      result = getEffectiveFontRule({attributesStyle, inherited});
      expect(result).toMatchObject({type: 'Attributes'});

      result = getEffectiveFontRule({attributesStyle, matchedCSSRules, inherited});
      expect(result.parentRule).toMatchObject({origin: 'regular'});

      result = getEffectiveFontRule({inherited});
      expect(result.parentRule).toMatchObject({origin: 'user-agent'});

      result = getEffectiveFontRule({});
      expect(result).toBe(undefined);
    });

    it('should use the most specific selector', () => {
      // Just 1 class
      const fontRuleA = createRule({
        origin: 'regular',
        selectors: ['.main'],
        style: createStyle({id: 1, properties: {'font-size': '1em'}}),
      });

      // Just ID
      const fontRuleB = createRule({
        origin: 'regular',
        selectors: ['#main'],
        style: createStyle({id: 2, properties: {'font-size': '3em'}}),
      });

      // Two matching selectors where 2nd is the global most specific, ID + class
      const fontRuleC = createRule({
        origin: 'regular',
        selectors: ['html body *', '#main.foo'],
        style: createStyle({id: 3, properties: {'font-size': '2em'}}),
      });

      const matchedCSSRules = [
        {rule: fontRuleA, matchingSelectors: [0]},
        {rule: fontRuleB, matchingSelectors: [0]},
        {rule: fontRuleC, matchingSelectors: [0, 1]},
      ];

      const result = getEffectiveFontRule({matchedCSSRules});
      // fontRuleC should have one for ID + class
      expect(result.styleSheetId).toEqual(3);
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

      const result = getEffectiveFontRule({matchedCSSRules});
      expect(result.styleSheetId).toEqual(2);
    });
  });
});
