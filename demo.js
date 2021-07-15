'use strict';
const puppeteer = require('puppeteer');
const lighthouse = require('./lighthouse-core/fraggle-rock/api.js');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  await page.goto('https://paulirish.com');

  const {artifacts} = await lighthouse.snapshot({page});

  await page.close();
  await browser.close();
  console.log(artifacts.ScriptElementsSnapshot);
}
run();
