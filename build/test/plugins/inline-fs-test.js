/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';

import {inlineFs} from '../../plugins/inline-fs.js';
import {LH_ROOT} from '../../../shared/root.js';

const require = createRequire(import.meta.url);

const filepath = `${LH_ROOT}/core/index.js`;

// Lots of path separator issues on Windows, because LH_ROOT has \\ slashes but
// most tests here don't JSON.stringify the strings they interpolate into code.
// Deferring for now.
const describeSkipOnWindows = process.platform === 'win32' ? describe.skip : describe;

describeSkipOnWindows('inline-fs', () => {
  const tmpPath = `${LH_ROOT}/.tmp/inline-fs/test.txt`;
  const tmpDir = path.dirname(tmpPath);

  beforeEach(() => {
    fs.mkdirSync(tmpDir, {recursive: true});
  });

  afterEach(() => {
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  describe('supported syntax', () => {
    it('returns null for content with no fs calls', async () => {
      const content = 'const val = 1;';
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [],
      });
    });

    it('returns null for non-call references to fs methods', async () => {
      const content = 'const val = fs.readFileSync ? 1 : 2;';
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [],
      });
    });

    it('evaluates an fs.readFileSync call and inlines the contents', async () => {
      fs.writeFileSync(tmpPath, 'some text content');

      const content = `const myTextContent = fs.readFileSync('${tmpPath}', 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "some text content";`,
        warnings: [],
      });
    });

    it('gives a warning and skips invalid syntax in fs call', async () => {
      // Use `\\` as syntax that will never be valid.
      // eslint-disable-next-line max-len
      const content = `const firstThing = 5;\nconst myContent = fs.readFileSync(\\filePathVar, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [{
          text: 'Expecting Unicode escape sequence \\uXXXX (2:35)',
          location: {
            file: filepath,
            line: 2,
            column: 35,
          },
        }],
      });
    });

    it('gives a warning and skips unrecognized identifiers', async () => {
      const content = `const myContent = fs.readFileSync(filePathVar, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [{
          text: `unsupported identifier 'filePathVar'`,
          location: {
            file: filepath,
            line: 1,
            column: 34,
          },
        }],
      });
    });

    it('gives a warning and skips unsupported expressions inside arguments', async () => {
      const content = `const myContent = fs.readFileSync(function() {return 'path/'}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [{
          text: `unsupported node: FunctionExpression`,
          location: {
            file: filepath,
            line: 1,
            column: 34,
          },
        }],
      });
    });

    it('warns and skips unsupported constructs but inlines subsequent fs methods', async () => {
      fs.writeFileSync(tmpPath, 'secondary text content');

      // eslint-disable-next-line max-len
      const content = `const myContent = fs.readFileSync(filePathVar, 'utf8');\nconst replacedContent = fs.readFileSync('${tmpPath}', 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        // eslint-disable-next-line max-len
        code: `const myContent = fs.readFileSync(filePathVar, 'utf8');\nconst replacedContent = "secondary text content";`,
        warnings: [{
          text: `unsupported identifier 'filePathVar'`,
          location: {
            file: filepath,
            line: 1,
            column: 34,
          },
        }],
      });
    });

    it('substitutes `__dirname`', async () => {
      fs.writeFileSync(tmpPath, 'dirname text content');

      const dirnamePath = `__dirname + '/../.tmp/inline-fs/test.txt'`;
      const content = `const myTextContent = fs.readFileSync(${dirnamePath}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "dirname text content";`,
        warnings: [],
      });
    });

    it('runs `require.resolve`', async () => {
      // eslint-disable-next-line max-len
      const content = `const myTextContent = fs.readFileSync(require.resolve('axe-core/README.md'), 'utf8');`;
      const result = await inlineFs(content, filepath);

      const axeReadme = fs.readFileSync(require.resolve('axe-core/README.md'), 'utf8');
      expect(axeReadme.length).toBeGreaterThan(500);
      expect(result).toEqual({
        code: `const myTextContent = ${JSON.stringify(axeReadme)};`,
        warnings: [],
      });
    });

    it('concats strings', async () => {
      fs.writeFileSync(tmpPath, 'concat text content');

      const concatPath = `__dirname + '/../' + '.tmp/inline-fs/test.txt'`;
      const content = `const myTextContent = fs.readFileSync(${concatPath}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "concat text content";`,
        warnings: [],
      });
    });

    it('evaluates template literals', async () => {
      fs.writeFileSync(tmpPath, 'template literal text content');

      const templatePath = '`${__dirname}/../.tmp/${"inline-fs"}/test.txt`';
      const content = `const myTextContent = fs.readFileSync(${templatePath}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "template literal text content";`,
        warnings: [],
      });
    });

    it('evaluates expressions in template literals', async () => {
      fs.writeFileSync(tmpPath, 'more template literal text content');

      const templatePath = `\`\${__dirname}/\${path.relative(__dirname, '${tmpPath}')}\``;
      const content = `const myTextContent = fs.readFileSync(${templatePath}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "more template literal text content";`,
        warnings: [],
      });
    });

    it('evaluates expressions in `require.resolve` calls', async () => {
      // eslint-disable-next-line max-len
      const content = `const myTextContent = fs.readFileSync(require.resolve('axe-core' + \`/READ${'ME'}.md\`), 'utf8');`;
      const result = await inlineFs(content, filepath);

      const axeReadme = fs.readFileSync(require.resolve('axe-core/README.md'), 'utf8');
      expect(axeReadme.length).toBeGreaterThan(500);
      expect(result).toEqual({
        code: `const myTextContent = ${JSON.stringify(axeReadme)};`,
        warnings: [],
      });
    });

    it('evaluates path methods', async () => {
      fs.writeFileSync(tmpPath, 'path method text content');

      const pathExpr = `path.dirname('${tmpPath}') + '/' + path.basename('${tmpPath}')`;
      const content = `const myTextContent = fs.readFileSync(${pathExpr}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "path method text content";`,
        warnings: [],
      });
    });

    it('substitutes `__filename`', async () => {
      fs.writeFileSync(tmpPath, 'filename text content');

      const constructedPath = `path.dirname(__filename) + '/../.tmp/inline-fs/test.txt'`;
      const content = `const myTextContent = fs.readFileSync(${constructedPath}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myTextContent = "filename text content";`,
        warnings: [],
      });
    });

    it('warns and skips on unsupported path methods', async () => {
      // eslint-disable-next-line max-len
      const content = `const myTextContent = fs.readFileSync(path.isAbsolute('${tmpPath}'), 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: null,
        warnings: [{
          text: `'path.isAbsolute' is not supported with 'fs' function calls`,
          location: {
            file: filepath,
            line: 1,
            column: 38,
          },
        }],
      });
    });

    it('substitutes Lighthouse-specific LH_ROOT', async () => {
      fs.writeFileSync(tmpPath, 'lh_root text content');

      const constructedPath = '`${LH_ROOT}/.tmp/inline-fs/test.txt`';
      const content = `const myRootRelativeContent = fs.readFileSync(${constructedPath}, 'utf8');`;
      const result = await inlineFs(content, filepath);
      expect(result).toEqual({
        code: `const myRootRelativeContent = "lh_root text content";`,
        warnings: [],
      });
    });

    describe('fs.readFileSync', () => {
      it('inlines content with quotes', async () => {
        fs.writeFileSync(tmpPath, `"quoted", and an unbalanced quote: "`);
        const content = `const myTextContent = fs.readFileSync('${tmpPath}', 'utf8');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: `const myTextContent = "\\"quoted\\", and an unbalanced quote: \\"";`,
          warnings: [],
        });
      });

      it('throws fatal error if file is missing', async () => {
        const content = `const myTextContent = fs.readFileSync('i-never-exist.lol', 'utf8');`;
        await expect(inlineFs(content, filepath)).rejects.toThrow('ENOENT');
      });

      it('inlines multiple fs.readFileSync calls', async () => {
        fs.writeFileSync(tmpPath, 'some text content');
        // eslint-disable-next-line max-len
        const content = `fs.readFileSync('${tmpPath}', 'utf8')fs.readFileSync(require.resolve('${tmpPath}'), 'utf8')`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: `"some text content""some text content"`,
          warnings: [],
        });
      });

      it('warns and skips on nested fs.readFileSync calls', async () => {
        fs.writeFileSync(tmpPath, filepath);
        // eslint-disable-next-line max-len
        const content = `const myTextContent = fs.readFileSync(fs.readFileSync('${tmpPath}', 'utf8'), 'utf8');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: `const myTextContent = fs.readFileSync("${filepath}", 'utf8');`,
          warnings: [{
            // eslint-disable-next-line max-len
            text: 'only `require.resolve()` and `path` methods are supported as arguments to `fs` function calls',
            location: {
              file: filepath,
              line: 1,
              column: 38,
            },
          }],
        });
      });

      it('executes nested path methods to determine the file to read', async () => {
        const fileContents = 'some tricky-to-get text content';
        fs.writeFileSync(tmpPath, fileContents);

        // eslint-disable-next-line max-len
        const content = `const myTextContent = fs.readFileSync(path.join(path.dirname('${tmpPath}'), path.basename('${tmpPath}')), 'utf8');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: `const myTextContent = "${fileContents}";`,
          warnings: [],
        });
      });

      it('inlines content from fs.readFileSync with variants of utf8 options', async () => {
        fs.writeFileSync(tmpPath, 'some text content');

        const utf8Variants = [
          `'utf8'`,
          `'utf-8'`,
          `{encoding: 'utf8'}`,
          `{encoding: 'utf-8'}`,
          `{encoding: 'utf8', nonsense: 'flag'}`,
        ];

        for (const opts of utf8Variants) {
          const content = `const myTextContent = fs.readFileSync('${tmpPath}', ${opts});`;
          const result = await inlineFs(content, filepath);
          expect(result).toEqual({
            code: `const myTextContent = "some text content";`,
            warnings: [],
          });
        }
      });

      it('warns and skips when missing encoding', async () => {
        const content = `const myTextContent = fs.readFileSync('${tmpPath}');`;
        const result = await inlineFs(content, filepath);

        // These expectations are deconstructed because the warning text can have slight
        // variations depending on the node version (18 vs 20).
        // TODO: Use a simpler expectation when support for Node 18 is dropped.
        expect(result.code).toBeNull();
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].location).toEqual({
          file: filepath,
          line: 1,
          column: 22,
        });
        expect(result.warnings[0].text).toMatch(/^fs\.readFileSync\(\) must have two arguments/);
      });

      it('warns and skips on unsupported encoding', async () => {
        const content = `const myTextContent = fs.readFileSync(
          '${tmpPath}',
          'binary'
        );`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: null,
          warnings: [{
            text: 'only utf8 readFileSync is supported',
            location: {
              file: filepath,
              line: 3,
              column: 10,
            },
          }],
        });
      });

      it('minifies inlined javascript files', async () => {
        const jsPath = `${tmpDir}/test.js`;
        // Completion value of `3` when evaluated.
        const jsContent = 'function add(a, b) {\nconst unused = a * b;return a + b;\n}\nadd(1, 2);';
        fs.writeFileSync(jsPath, jsContent);

        // When evaluated, `content` sets `sum` to 3 and returns it, also completing with `3`.
        const content = `const sum = eval(fs.readFileSync('${jsPath}', 'utf8')); sum;`;
        const unminifiedResult = `const sum = eval("${jsContent}"); sum;`;

        // Verify that it's inlined and result is smaller than `unminifiedResult`.
        const {code, warnings} = await inlineFs(content, filepath);
        if (code === null) {
          throw new Error('js was not inlined by readFileSync');
        }
        expect(code.length).toBeGreaterThan(40);
        expect(code.length).toBeLessThan(unminifiedResult.length - 20);
        expect(warnings).toEqual([]);

        // Verify that minification was valid. End result should be something like:
        // `const sum = eval('function add(a,b){return a+b}add(1,2);')sum;`
        const evaledResult = eval(code);
        expect(evaledResult).toEqual(3);
      });
    });

    describe('fs.readdirSync', () => {
      it('inlines content from fs.readdirSync calls', async () => {
        fs.writeFileSync(tmpPath, 'text');
        const content = `const files = fs.readdirSync('${tmpDir}');`;
        const result = await inlineFs(content, filepath);
        const tmpFilename = path.basename(tmpPath);
        expect(result).toEqual({
          code: `const files = ["${tmpFilename}"];`,
          warnings: [],
        });
      });

      it('handles methods chained on fs.readdirSync result', async () => {
        fs.writeFileSync(tmpPath, 'text');
        // eslint-disable-next-line max-len
        const content = `const files = fs.readdirSync('${tmpDir}').map(f => \`metrics/\${f}\`)`;
        const result = await inlineFs(content, filepath);
        // eslint-disable-next-line max-len
        expect(result).toEqual({
          code: 'const files = ["test.txt"].map(f => `metrics/${f}`)',
          warnings: [],
        });
      });

      it('handles mapped and spread fs.readdirSync results', async () => {
        fs.writeFileSync(tmpPath, 'text');
        // eslint-disable-next-line max-len
        const content = `const files = [...fs.readdirSync('${tmpDir}'), ...fs.readdirSync('${tmpDir}').map(f => \`metrics/\${f}\`)]`;
        const result = await inlineFs(content, filepath);
        // eslint-disable-next-line max-len
        expect(result).toEqual({
          code: 'const files = [...["test.txt"], ...["test.txt"].map(f => `metrics/${f}`)]',
          warnings: [],
        });
      });

      it('inlines content from fs.readdirSync with variants of utf8 options', async () => {
        fs.writeFileSync(tmpPath, 'text');
        const tmpFilename = path.basename(tmpPath);

        const utf8Variants = [
          '', // `options` are optional for readdirSync, so include missing opts.
          `'utf8'`,
          `'utf-8'`,
          `{encoding: 'utf8'}`,
          `{encoding: 'utf-8'}`,
          `{encoding: 'utf8', nonsense: 'flag'}`,
        ];

        for (const opts of utf8Variants) {
          // Trailing comma has no effect in missing opts case.
          const content = `const files = fs.readdirSync('${tmpDir}', ${opts});`;
          const result = await inlineFs(content, filepath);
          expect(result).toEqual({
            code: `const files = ["${tmpFilename}"];`,
            warnings: [],
          });
        }
      });

      it('warns and skips on unsupported encoding', async () => {
        const content = `const files = fs.readdirSync(
          '${tmpDir}',
          'binary'
        );`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: null,
          warnings: [{
            text: 'only utf8 readdirSync is supported',
            location: {
              file: filepath,
              line: 3,
              column: 10,
            },
          }],
        });
      });

      it('throws when trying to fs.readdirSync a non-existent directory', async () => {
        const nonsenseDir = `${LH_ROOT}/.tmp/nonsense-path/`;
        const content = `const files = fs.readdirSync('${nonsenseDir}');`;
        const result = await inlineFs(content, filepath);
        expect(result).toEqual({
          code: null,
          warnings: [{
            // eslint-disable-next-line max-len
            text: expect.stringMatching(/^could not inline fs\.readdirSync.+ENOENT.+nonsense-path\/'$/),
            location: {
              file: filepath,
              line: 1,
              column: 14,
            },
          }],
        });
      });
    });
  });
});
