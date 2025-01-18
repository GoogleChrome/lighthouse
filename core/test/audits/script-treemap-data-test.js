/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ScriptTreemapData_ from '../../audits/script-treemap-data.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {
  createScript,
  loadSourceMapAndUsageFixture,
  loadSourceMapFixture,
  makeParamsOptional,
} from '../test-utils.js';

const ScriptTreemapData = {
  audit: makeParamsOptional(ScriptTreemapData_.audit),
  makeScriptNode: makeParamsOptional(ScriptTreemapData_.makeScriptNode),
};

/**
 * @param {string} url
 * @param {number} resourceSize
 * @param {LH.Crdp.Network.ResourceType} resourceType
 */
function generateRecord(url, resourceSize, resourceType) {
  return {url, resourceSize, resourceType};
}

describe('ScriptTreemapData audit', () => {
  describe('squoosh fixture', () => {
    /** @type {LH.Audit.Details.TreemapData} */
    let treemapData;
    before(async () => {
      const context = {computedCache: new Map()};
      const {map, content, usage} = loadSourceMapAndUsageFixture('squoosh');
      expect(map.sourceRoot).not.toBeTruthy();
      const mainUrl = 'https://squoosh.app';
      const scriptUrl = 'https://squoosh.app/main-app.js';
      const networkRecords = [generateRecord(scriptUrl, content.length, 'Script')];

      // Add a script with no source map or usage.
      const noSourceMapScript = createScript({scriptId: '1', url: 'https://sqoosh.app/no-map-or-usage.js', content: '// hi'});
      networkRecords.push(
        generateRecord(noSourceMapScript.url, noSourceMapScript.length || 0, 'Script')
      );

      const artifacts = {
        URL: {requestedUrl: mainUrl, finalDisplayedUrl: mainUrl},
        JsUsage: {[usage.scriptId]: usage},
        devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
        SourceMaps: [{scriptId: 'squoosh', scriptUrl, map}],
        Scripts: [
          {scriptId: 'squoosh', url: scriptUrl, content},
          noSourceMapScript,
        ].map(createScript),
      };
      const results = await ScriptTreemapData.audit(artifacts, context);
      if (!results.details || results.details.type !== 'treemap-data') {
        throw new Error('should not happen.');
      }

      treemapData = results.details;
    });

    it('has nodes', () => {
      expect(treemapData.nodes.find((s) => s.name === 'https://sqoosh.app/no-map-or-usage.js')).
        toMatchInlineSnapshot(`
        Object {
          "name": "https://sqoosh.app/no-map-or-usage.js",
          "resourceBytes": 5,
          "unusedBytes": undefined,
        }
      `);

      const bundleNode = treemapData.nodes.find(s => s.name === 'https://squoosh.app/main-app.js');
      // @ts-expect-error
      const unmapped = bundleNode.children.find(m => m.name === '(unmapped)');
      expect(unmapped).toMatchInlineSnapshot(`
        Object {
          "name": "(unmapped)",
          "resourceBytes": 10061,
          "unusedBytes": 3760,
        }
      `);

      expect(JSON.stringify(treemapData.nodes).length).toMatchInlineSnapshot(`6673`);
      expect(treemapData.nodes).toMatchSnapshot();
    });
  });

  describe('coursehero fixture', () => {
    /** @type {LH.Audit.Details.TreemapData} */
    let treemapData;
    before(async () => {
      const context = {computedCache: new Map()};
      const {map, content} = loadSourceMapFixture('coursehero-bundle-1');
      expect(map.sourceRoot).toBeTruthy();
      const mainUrl = 'https://courshero.com';
      const scriptUrl1 = 'https://courshero.com/script1.js';
      const scriptUrl2 = 'https://courshero.com/script2.js';
      const networkRecords = [
        generateRecord(scriptUrl1, content.length, 'Script'),
        generateRecord(scriptUrl2, content.length, 'Script'),
      ];

      const artifacts = {
        URL: {requestedUrl: mainUrl, finalDisplayedUrl: mainUrl},
        // Audit should still work even without usage data.
        JsUsage: {},
        devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
        SourceMaps: [
          {scriptId: '1', scriptUrl: scriptUrl1, map},
          {scriptId: '2', scriptUrl: scriptUrl2, map},
        ],
        Scripts: [
          {scriptId: '1', url: scriptUrl1, content},
          {scriptId: '2', url: scriptUrl2, content},
        ].map(createScript),
      };
      const results = await ScriptTreemapData.audit(artifacts, context);
      if (!results.details || results.details.type !== 'treemap-data') {
        throw new Error('should not happen.');
      }

      treemapData = results.details;
    });

    it('has nodes', () => {
      expect(JSON.stringify(treemapData.nodes).length).toMatchInlineSnapshot(`70077`);
      expect(treemapData.nodes).toMatchSnapshot();
    });

    it('finds duplicates', () => {
      expect(JSON.stringify(treemapData.nodes).length).toMatchInlineSnapshot(`70077`);
      // @ts-ignore all these children exist.
      const leafNode = treemapData.nodes[0].
        children[0].
        children[0].
        children[0].
        children[0].
        children[0].duplicatedNormalizedModuleName;
      expect(leafNode).toBe('Control/assets/js/vendor/jquery.typeahead.js');
    });
  });

  describe('.makeScriptNode', () => {
    const src = 'main.js';

    it('uses node data when available', () => {
      const node = ScriptTreemapData.makeScriptNode(src, '', {
        'a.js': {resourceBytes: 100},
        'b.js': {resourceBytes: 100, duplicatedNormalizedModuleName: 'blah'},
        'c.js': {resourceBytes: 100, unusedBytes: 50},
      });
      expect(node).toMatchObject(
         {
           name: src,
           resourceBytes: 300,
           unusedBytes: 50,
           children: [
             {
               name: 'a.js',
               resourceBytes: 100,
             },
             {
               duplicatedNormalizedModuleName: 'blah',
               name: 'b.js',
               resourceBytes: 100,
             },
             {
               name: 'c.js',
               resourceBytes: 100,
               unusedBytes: 50,
             },
           ],
         }
      );
    });

    it('creates directory node when multiple leaf nodes', () => {
      const node = ScriptTreemapData.makeScriptNode(src, '', {
        'folder/a.js': {resourceBytes: 100},
        'folder/b.js': {resourceBytes: 100},
      });
      expect(node).toMatchObject(
        {
          name: src,
          children: [
            {
              children: [
                {
                  name: 'a.js',
                  resourceBytes: 100,
                },
                {
                  name: 'b.js',
                  resourceBytes: 100,
                },
              ],
              name: '/folder',
              resourceBytes: 200,
            },
          ],
        }
      );
    });

    it('flattens directory node when single leaf nodes', () => {
      const node = ScriptTreemapData.makeScriptNode(src, '', {
        'root/folder1/a.js': {resourceBytes: 100},
        'root/folder2/b.js': {resourceBytes: 100},
      });
      expect(node).toMatchObject(
        {
          name: src,
          children: [
            {
              children: [
                {
                  children: undefined,
                  name: 'folder1/a.js',
                  resourceBytes: 100,
                },
                {
                  children: undefined,
                  name: 'folder2/b.js',
                  resourceBytes: 100,
                },
              ],
              name: '/root',
              resourceBytes: 200,
            },
          ],
        }
      );
    });

    it('ignores leading slashes', () => {
      const node = ScriptTreemapData.makeScriptNode(src, '', {
        '/a.js': {resourceBytes: 100},
        '/b.js': {resourceBytes: 100},
      });
      expect(node).toMatchObject(
        {
          name: src,
          resourceBytes: 200,
          children: [
            {
              name: 'a.js',
              resourceBytes: 100,
            },
            {
              name: 'b.js',
              resourceBytes: 100,
            },
          ],
        }
      );
    });

    it('ignores repeated slashes', () => {
      const node = ScriptTreemapData.makeScriptNode(src, '', {
        'root//a.js': {resourceBytes: 100},
        'root//b.js': {resourceBytes: 100},
      });
      expect(node).toMatchObject(
        {
          name: src,
          children: [
            {
              name: '/root',
              children: [
                {
                  name: 'a.js',
                  resourceBytes: 100,
                },
                {
                  name: 'b.js',
                  resourceBytes: 100,
                },
              ],
            },
          ],
        }
      );
    });

    it('source root replaces matching prefixes', () => {
      const sourcesData = {
        'some/prefix/main.js': {resourceBytes: 100, unusedBytes: 50},
        'not/some/prefix/a.js': {resourceBytes: 101, unusedBytes: 51},
      };
      let node = ScriptTreemapData.makeScriptNode(src, 'some/prefix', sourcesData);
      expect(node).toMatchObject(
        {
          name: src,
          children: [
            {
              name: 'some/prefix',
              resourceBytes: 201,
              unusedBytes: 101,
              children: [
                {
                  name: 'main.js',
                  resourceBytes: 100,
                  unusedBytes: 50,
                },
                {
                  name: 'not/a.js',
                  resourceBytes: 101,
                  unusedBytes: 51,
                },
              ],
            },
          ],
        }
      );

      expect(node.name).toBe(src);
      expect(node.resourceBytes).toBe(201);
      expect(node.unusedBytes).toBe(101);

      node = /** @type {LH.Treemap.Node} */ (node.children?.[0]);
      expect(node.name).toBe('some/prefix');
      expect(node.resourceBytes).toBe(201);
      expect(node.unusedBytes).toBe(101);
      expect(node.children?.[0].name).toBe('main.js');
      expect(node.children?.[1].name).toBe('not/a.js');
    });

    it('nodes have unusedBytes data', () => {
      const sourcesData = {
        'lib/folder/a.js': {resourceBytes: 100, unusedBytes: 50},
        'lib/folder/b.js': {resourceBytes: 101},
        'lib/c.js': {resourceBytes: 100, unusedBytes: 25},
      };
      const node = ScriptTreemapData.makeScriptNode(src, '', sourcesData);
      expect(node).toMatchObject(
        {
          name: src,
          children: [
            {
              children: [
                {
                  children: [
                    {
                      name: 'a.js',
                      resourceBytes: 100,
                      unusedBytes: 50,
                    },
                    {
                      name: 'b.js',
                      resourceBytes: 101,
                    },
                  ],
                  name: 'folder',
                  resourceBytes: 201,
                  unusedBytes: 50,
                },
                {
                  name: 'c.js',
                  resourceBytes: 100,
                  unusedBytes: 25,
                },
              ],
              name: '/lib',
              resourceBytes: 301,
              unusedBytes: 75,
            },
          ],
        }
      );
    });

    it('nodes have duplicates data', () => {
      const sourcesData = {
        /* eslint-disable max-len */
        'lib/folder/a.js': {resourceBytes: 100, unusedBytes: 50},
        'lib/node_modules/dep/a.js': {resourceBytes: 101, duplicatedNormalizedModuleName: 'dep/a.js'},
        'node_modules/dep/a.js': {resourceBytes: 100, unusedBytes: 25, duplicatedNormalizedModuleName: 'dep/a.js'},
        'lib/node_modules/dep/b.js': {resourceBytes: 101, duplicatedNormalizedModuleName: 'dep/b.js'},
        'node_modules/dep/b.js': {resourceBytes: 100, unusedBytes: 25, duplicatedNormalizedModuleName: 'dep/b.js'},
        /* eslint-enable max-len */
      };
      const node = ScriptTreemapData.makeScriptNode(src, '', sourcesData);
      expect(node).toMatchObject(
         {
           name: src,
           resourceBytes: 502,
           unusedBytes: 100,
           children: [
             {
               children: [
                 {
                   children: undefined,
                   name: 'folder/a.js',
                   resourceBytes: 100,
                   unusedBytes: 50,
                 },
                 {
                   children: [
                     {
                       duplicatedNormalizedModuleName: 'dep/a.js',
                       name: 'a.js',
                       resourceBytes: 101,
                     },
                     {
                       duplicatedNormalizedModuleName: 'dep/b.js',
                       name: 'b.js',
                       resourceBytes: 101,
                     },
                   ],
                   name: 'node_modules/dep',
                   resourceBytes: 202,
                 },
               ],
               name: 'lib',
               resourceBytes: 302,
               unusedBytes: 50,
             },
             {
               children: [
                 {
                   duplicatedNormalizedModuleName: 'dep/a.js',
                   name: 'a.js',
                   resourceBytes: 100,
                   unusedBytes: 25,
                 },
                 {
                   duplicatedNormalizedModuleName: 'dep/b.js',
                   name: 'b.js',
                   resourceBytes: 100,
                   unusedBytes: 25,
                 },
               ],
               name: 'node_modules/dep',
               resourceBytes: 200,
               unusedBytes: 50,
             },
           ],
         }
      );
    });
  });
});
