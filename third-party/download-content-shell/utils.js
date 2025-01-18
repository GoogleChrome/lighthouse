// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { parse as parseURL } from 'url';
import { execSync as shell } from 'child_process';
import { Transform as Stream } from 'stream';

function fetch(url) {
  return new Promise(fetchPromise);

  function fetchPromise(resolve, reject) {
    let request;
    const protocol = parseURL(url).protocol;
    const handleResponse = getCallback.bind(null, resolve, reject);
    if (protocol === 'https:') {
      request = https.get(url, handleResponse);
    } else if (protocol === 'http:') {
      request = http.get(url, handleResponse);
    } else {
      reject(new Error(`Invalid protocol for url: ${url}`));
      return;
    }
    request.on('error', err => reject(err));
  }

  function getCallback(resolve, reject, response) {
    if (response.statusCode !== 200) {
      reject(new Error(`Request error: ${response.statusCode}`));
      return;
    }
    const body = new Stream();
    response.on('data', chunk => body.push(chunk));
    response.on('end', () => resolve(body.read()));
  }
}

function atob(str) {
  return new Buffer(str, 'base64').toString('binary');
}

function isFile(path) {
  try {
    return fs.statSync(path).isFile();
  } catch (error) {
    return false;
  }
}

function isDir(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch (error) {
    return false;
  }
}

function copy(src, dest) {
  try {
    const targetFilePath = path.resolve(dest, path.basename(src));
    fs.writeFileSync(targetFilePath, fs.readFileSync(src));
  } catch (error) {
    throw new Error(`Received an error: [${error}] while trying to copy: ${src} -> ${dest}`);
  }
}

function copyRecursive(src, dest) {
  try {
    if (isFile(src)) {
      copy(src, dest);
      return;
    }
    const targetDirPath = path.resolve(dest, path.basename(src));
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath);
    }
    if (isDir(src)) {
      const files = fs.readdirSync(src);
      for (let i = 0; i < files.length; i++) {
        const childPath = path.resolve(src, files[i]);
        if (isDir(childPath)) {
          copyRecursive(childPath, targetDirPath);
        } else {
          const targetFilePath = path.resolve(targetDirPath, path.basename(childPath));
          fs.writeFileSync(targetFilePath, fs.readFileSync(childPath));
        }
      }
    }
  } catch (error) {
    throw new Error(`Received an error: [${error}] while trying to copy: ${src} -> ${dest}`);
  }
}

function includes(sequence, target) {
  return sequence.indexOf(target) > -1;
}

function shellOutput(command) {
  return shell(command).toString().trim();
}

function parseArgs(args) {
  const argObject = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const components = arg.split('=');
    const key = components[0];
    argObject[key] = components[1] || true;
  }
  return argObject;
}

export {
  fetch,
  atob,
  isFile,
  isDir,
  copy,
  copyRecursive,
  includes,
  shellOutput,
  parseArgs,
};
