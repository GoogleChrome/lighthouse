/**
 * @license Copyright 2023 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

// To open result in chrome:
//   node core/scripts/full-page-screenshot-debug.js latest-run/lhr.report.json | xargs "$CHROME_PATH"

import * as fs from 'fs';

import esMain from 'es-main';
import * as puppeteer from 'puppeteer-core';
import {getChromePath} from 'chrome-launcher';

import {LH_ROOT} from '../../shared/root.js';

/**
 * @param {LH.Result} lhr
 * @return {Promise<string>}
 */
async function getDebugImage(lhr) {
  if (!lhr.fullPageScreenshot) {
    return '';
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: getChromePath(),
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const page = await browser.newPage();

  const debugDataUrl = await page.evaluate(async (fullPageScreenshot) => {
    const img = await new Promise((resolve, reject) => {
      // eslint-disable-next-line no-undef
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = fullPageScreenshot.screenshot.data;
    });

    // eslint-disable-next-line no-undef
    const canvasEl = document.createElement('canvas');
    canvasEl.width = img.width;
    canvasEl.height = img.height;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(img, 0, 0);
    for (const [lhId, node] of Object.entries(fullPageScreenshot.nodes)) {
      if (!node.width && !node.height) continue;

      ctx.strokeStyle = '#D3E156';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(node.left, node.top, node.width, node.height);
      ctx.stroke();

      const txt = node.id || lhId;
      const txtWidth = Math.min(ctx.measureText(txt).width, node.width);
      const txtHeight = 10;
      const txtTop = node.top - 3;
      const txtLeft = node.left;
      ctx.fillStyle = '#FFFFFF88';
      ctx.fillRect(txtLeft, txtTop, txtWidth, txtHeight);
      ctx.fillStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.textBaseline = 'top';
      ctx.fillText(txt, txtLeft, txtTop);
    }

    return canvasEl.toDataURL();
  }, lhr.fullPageScreenshot);

  await browser.close();

  if (!debugDataUrl.startsWith('data:image/')) {
    throw new Error('invalid data url');
  }

  return debugDataUrl;
}

if (esMain(import.meta)) {
  const lhr = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
  const imageUrl = await getDebugImage(lhr);
  const [type, base64Data] = imageUrl.split(',');
  const ext = type.replace('data:image/', '');
  const dest = `${LH_ROOT}/.tmp/fps-debug.${ext}`;
  fs.writeFileSync(dest, base64Data, 'base64');
  console.log(dest);
}

export {getDebugImage};
