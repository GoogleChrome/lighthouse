// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/* eslint-disable no-console */

// Grabbed from https://github.com/ChromeDevTools/devtools-frontend/commit/26bb5ad91b147e9c918819711542ec2337d6b268

import fs from 'fs';

import path from 'path';
import { execSync as shell } from 'child_process';
import * as utils from './utils.js';
import { LH_ROOT } from '../../shared/root.js';

const TARGET = 'Release';
const CONTENT_SHELL_ZIP = 'content-shell.zip';
const MAX_CONTENT_SHELLS = 10;
const PLATFORM = getPlatform();

const CACHE_PATH = path.resolve(LH_ROOT, '.tmp', 'chromium-web-tests', 'content-shells');
const COMMIT_POSITION_UPDATE_PERIOD = 420;

function main() {
  fs.mkdirSync(CACHE_PATH, {recursive: true});
  deleteOldContentShells();

  findMostRecentChromiumCommit()
    .then(findPreviousUploadedPosition)
    .then(onUploadedCommitPosition)
    .catch(onError);

  function onError(error) {
    console.log('Unable to download because of error:', error);
  }
}

function onUploadedCommitPosition(commitPosition) {
  const contentShellDirPath = path.resolve(CACHE_PATH, commitPosition, 'out', TARGET);
  const contentShellPath = path.resolve(CACHE_PATH, commitPosition, 'out');

  const hasCachedContentShell = utils.isFile(getContentShellBinaryPath(contentShellDirPath));
  if (hasCachedContentShell) {
    console.log(`Using cached content shell at: ${contentShellPath}`);
    // return runTests(contentShellPath, true);
    return;
  }
  const url = `http://commondatastorage.googleapis.com/chromium-browser-snapshots/${PLATFORM}/${commitPosition
  }/${CONTENT_SHELL_ZIP}`;
  return prepareContentShellDirectory(commitPosition)
      .then(() => downloadContentShell(url, commitPosition))
      .then(extractContentShell);
}

function getPlatform() {
  if (process.platform === 'linux') {
    return 'Linux_x64';
  }
  if (process.platform === 'win32') {
    return 'Win_x64';
  }
  if (process.platform === 'darwin') {
    return 'Mac';
  }

  throw new Error(`Unrecognized platform detected: ${process.platform}`);
}

async function findMostRecentChromiumCommit() {
  const snapshotUrl = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${PLATFORM}%2FLAST_CHANGE?alt=media`;
  const commitPosition = Number((await utils.fetch(snapshotUrl)).toString());

  // Only update the content shell roughly once a day.
  // see https://github.com/GoogleChrome/lighthouse/pull/12232#discussion_r592016416
  return commitPosition - commitPosition % COMMIT_POSITION_UPDATE_PERIOD;
}

function deleteOldContentShells() {
  const files = fs.readdirSync(CACHE_PATH);
  if (files.length < MAX_CONTENT_SHELLS) {
    return;
  }
  files.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  const remainingNumberOfContentShells = MAX_CONTENT_SHELLS / 2;
  const oldContentShellDirs = files.slice(remainingNumberOfContentShells);
  for (let i = 0; i < oldContentShellDirs.length; i++) {
    fs.rmSync(path.resolve(CACHE_PATH, oldContentShellDirs[i]), {recursive: true, force: true});
  }
  console.log(`Removed old content shells: ${oldContentShellDirs}`);
}

function findPreviousUploadedPosition(commitPosition) {
  const previousPosition = commitPosition - 100;
  const positionsListURL =
      `http://commondatastorage.googleapis.com/chromium-browser-snapshots/?delimiter=/&prefix=${PLATFORM
      }/&marker=${PLATFORM}/${previousPosition}/`;
  return utils.fetch(positionsListURL).then(onPositionsList).catch(onError);

  function onPositionsList(buffer) {
    const positions = buffer.toString('binary')
                        .match(/([^<>]+)(?=<\/Prefix><\/CommonPrefixes>)/g)
                        .map(prefixedPosition => prefixedPosition.split('/')[1])
                        .map(positionString => parseInt(positionString, 10));
    const positionSet = new Set(positions);
    let previousUploadedPosition = commitPosition;
    while (commitPosition - previousUploadedPosition < 100) {
      if (positionSet.has(previousUploadedPosition)) {
        return previousUploadedPosition.toString();
      }
      previousUploadedPosition--;
    }
    onError();
  }

  function onError(error) {
    if (error) {
      console.log(
        `Received error: ${error} trying to fetch positions list from url: ${positionsListURL}`);
    }
    throw new Error(
      `Unable to find a previous upload position for commit position: ${commitPosition}`);
  }
}

async function prepareContentShellDirectory(folder) {
  const contentShellPath = path.join(CACHE_PATH, folder);
  if (utils.isDir(contentShellPath)) {
    fs.rmSync(contentShellPath, {recursive: true, force: true});
  }
  fs.mkdirSync(contentShellPath);
  return folder;
}

function downloadContentShell(url, folder) {
  console.log('Downloading content shell from:', url);
  console.log('NOTE: Download is ~300 MB depending on OS');
  return utils.fetch(url).then(writeZip).catch(onError);

  function writeZip(buffer) {
    console.log('Completed download of content shell');
    const contentShellZipPath = path.join(CACHE_PATH, folder, CONTENT_SHELL_ZIP);
    fs.writeFileSync(contentShellZipPath, buffer);
    return contentShellZipPath;
  }

  function onError(error) {
    console.log(`Received error: ${error} trying to download content shell from url: ${url}`);
    throw new Error('Unable to download content shell');
  }
}

function extractContentShell(contentShellZipPath) {
  console.log(`Extracting content shell zip: ${contentShellZipPath}`);
  const src = contentShellZipPath;
  const dest = path.resolve(path.dirname(src), 'out');
  shell(`unzip ${src} -d ${dest}`);
  fs.unlinkSync(src);
  const originalDirPath = path.resolve(dest, 'content-shell');
  const newDirPath = path.resolve(dest, TARGET);
  fs.renameSync(originalDirPath, newDirPath);
  fs.chmodSync(getContentShellBinaryPath(newDirPath), '755');
  return dest;
}

function getContentShellBinaryPath(dirPath) {
  if (process.platform === 'linux') {
    return path.resolve(dirPath, 'content_shell');
  }

  if (process.platform === 'win32') {
    return path.resolve(dirPath, 'content_shell.exe');
  }

  if (process.platform === 'darwin') {
    return path.resolve(dirPath, 'Content Shell.app', 'Contents', 'MacOS', 'Content Shell');
  }
}

if (process.argv[2] === '--resolve-executable-path') {
  console.log(getContentShellBinaryPath(process.argv[3]));
} else {
  main();
}
