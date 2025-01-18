/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {EntityClassification} from '../../computed/entity-classification.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

function mockArtifacts(networkRecords) {
  return {
    devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
    URL: {
      requestedUrl: networkRecords[0].url,
      mainDocumentUrl: networkRecords[0].url,
      finalDisplayedUrl: networkRecords[0].url,
    },
  };
}

describe('Entity Classification computed artifact', () => {
  let artifacts;
  let context;

  beforeEach(() => {
    artifacts = mockArtifacts([
      {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
      {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
      {url: 'http://cdn.example.com/script.js', resourceType: 'Script', transferSize: 50},
      {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
    ]);
    context = {computedCache: new Map()};
  });

  it('computes entity classification for all urls in devtoolsLogs', async () => {
    const result = await EntityClassification.request(artifacts, context);
    // Make sure classification was successful.
    expect(result).toHaveProperty('entityByUrl');
    expect(result).toHaveProperty('urlsByEntity');
    expect(result).toHaveProperty('firstParty');
    // Make sure all entities have been identified.
    expect(result.entityByUrl.size).toBe(4);
    expect(result.urlsByEntity.size).toBe(2);
    // Make sure first party is one of the entities.
    expect(result.urlsByEntity.keys()).toContainEqual(result.firstParty);
    // Make sure convenience functions work.
    expect(result).toHaveProperty('isFirstParty');
    expect(result.isFirstParty).toBeInstanceOf(Function);
    expect(result.isFirstParty('http://example.com/file.html')).toEqual(true);
    expect(result.isFirstParty('http://cdn.example.com/script.js')).toEqual(true);
    expect(result.isFirstParty('http://third-party.com/file.jpg')).toEqual(false);
  });

  it('identifies 1st party URL given finalDisplayedUrl', async () => {
    artifacts.URL = {
      finalDisplayedUrl: 'http://example.com',
    };
    const result = await EntityClassification.request(artifacts, context);

    const entities = Array.from(result.urlsByEntity.keys()).map(e => e.name);
    // Make sure first party is correctly identified.
    expect(result.firstParty).not.toBeFalsy();
    expect(result.firstParty.name).toBe('example.com');
    // Make sure all entities were identified..
    expect(entities).toEqual(['example.com', 'third-party.com']);
    expect(result.entityByUrl.size).toBe(4);
  });

  it('identifies 1st party URL given mainDocumentUrl', async () => {
    artifacts.URL = {
      mainDocumentUrl: 'http://cdn.example.com',
    };
    const result = await EntityClassification.request(artifacts, context);
    const entities = Array.from(result.urlsByEntity.keys()).map(e => e.name);
    // Make sure first party is correctly identified.
    expect(result.firstParty).not.toBeFalsy();
    expect(result.firstParty.name).toBe('example.com');
    // Make sure all entities were identified.
    expect(entities).toEqual(['example.com', 'third-party.com']);
    expect(result.entityByUrl.size).toBe(4);
  });

  it('does not identify 1st party if URL artifact is missing', async () => {
    artifacts.URL = {};
    const result = await EntityClassification.request(artifacts, context);
    const entities = Array.from(result.urlsByEntity.keys()).map(e => e.name);
    // Make sure first party is not identified.
    expect(result.firstParty).toBeFalsy();
    // Make sure all entities were identified.
    expect(entities).toEqual(['example.com', 'third-party.com']);
    expect(result.entityByUrl.size).toBe(4);
  });

  it('prioritizes mainDocumentUrl over finalDisplayUrl when both are available', async () => {
    artifacts.URL = {
      finalDisplayedUrl: 'http://example.com',
      mainDocumentUrl: 'http://third-party.com',
    };
    const result = await EntityClassification.request(artifacts, context);
    const entities = Array.from(result.urlsByEntity.keys()).map(e => e.name);
    // Make sure first party is not identified.
    expect(result.firstParty).not.toBeFalsy();
    expect(result.firstParty.name).toBe('third-party.com');
    // Make sure all entities were identified.
    expect(entities).toEqual(['example.com', 'third-party.com']);
    expect(result.entityByUrl.size).toBe(4);
  });

  it('does not classify non-network URLs', async () => {
    artifacts.URL = {
      mainDocumentUrl: 'http://third-party.com',
    };
    artifacts.devtoolsLog = networkRecordsToDevtoolsLog([
      {url: 'http://third-party.com'},
      {url: 'chrome://version'},
      {url: 'data:foobar'},
    ]);
    const result = await EntityClassification.request(artifacts, context);
    const entities = Array.from(result.urlsByEntity.keys()).map(e => e.name);
    // Make sure first party is identified.
    expect(result.firstParty.name).toBe('third-party.com');
    // Make sure only valid network urls with a domain is recognized.
    expect(entities).toEqual(['third-party.com']);
    expect(result.entityByUrl.size).toBe(1);
    // First party check returns false for non-DT-log URLs.
    expect(result.isFirstParty('chrome://version')).toEqual(false);
  });

  it('classifies chrome-extension URLs and resolves their names', async () => {
    artifacts.URL = {
      mainDocumentUrl: 'http://third-party.com',
    };
    artifacts.devtoolsLog = networkRecordsToDevtoolsLog([
      {url: 'http://third-party.com'},
      {url: 'data:foobar'},
      {'url': 'chrome-extension://abcdefghijklmnopqrstuvwxyz/foo/bar.js'},
      {'url': 'chrome-extension://nonresolvablechromextension/bar/baz.js'},
    ]);

    // Inject an executionContextCreated entry to resolve extension names
    artifacts.devtoolsLog.push({
      method: 'Runtime.executionContextCreated',
      params: {
        context: {
          origin: 'chrome-extension://abcdefghijklmnopqrstuvwxyz',
          name: 'Sample Chrome Extension',
        },
      },
    });

    const result = await EntityClassification.request(artifacts, context);
    const entities = Array.from(result.urlsByEntity.keys()).map(e => e.name);
    // Make sure first party is identified.
    expect(result.firstParty.name).toBe('third-party.com');
    // Make sure only valid network urls with a domain is recognized.
    expect(entities).toEqual(['third-party.com', 'Sample Chrome Extension',
      'nonresolvablechromextension']);

    const extensionEntity = result.entityByUrl
      .get('chrome-extension://abcdefghijklmnopqrstuvwxyz/foo/bar.js');
    expect(extensionEntity).toHaveProperty('category', 'Chrome Extension');
    expect(extensionEntity).toHaveProperty('name', 'Sample Chrome Extension');
    expect(extensionEntity).toHaveProperty('homepage',
      'https://chromewebstore.google.com/detail/abcdefghijklmnopqrstuvwxyz');

    const extensionUnknownEntity = result.entityByUrl
      .get('chrome-extension://nonresolvablechromextension/bar/baz.js');
    expect(extensionUnknownEntity).toHaveProperty('category', 'Chrome Extension');
    expect(extensionUnknownEntity).toHaveProperty('name', 'nonresolvablechromextension');
    expect(extensionUnknownEntity).toHaveProperty('homepage',
      'https://chromewebstore.google.com/detail/nonresolvablechromextension');

    expect(result.entityByUrl.size).toBe(3);
    // First party check fails for non-DT-log URLs.
    expect(result.isFirstParty('chrome-extension://abcdefghijklmnopqrstuvwxyz/foo/bar.js'))
      .toEqual(false);
    expect(result.isFirstParty('chrome://new-tab-page')).toEqual(false);
  });
});
