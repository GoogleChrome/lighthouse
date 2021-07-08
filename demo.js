'use strict';
const puppeteer = require('puppeteer');
const lighthouse = require('./lighthouse-core/fraggle-rock/api.js');
const open = require('open');
const fs = require('fs');

const defaultConfig = require('./lighthouse-core/fraggle-rock/config/default-config.js');

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  const config = {...defaultConfig, settings: {output: 'html'}};
  const run = await lighthouse.startTimespan({page, config});

  await page.goto('https://store.google.com');
  await new Promise(r => setTimeout(r, 1000));

  const time = await run.endTimespan();
  fs.writeFileSync('fr-report-timespan.html', time.report);
  open('fr-report-timespan.html');

  await page.close();
  await browser.close();
}
run();
