/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global logger */

/** @typedef {{etag: ?string, content: LH.Result}} CachableGist */

import idbKeyval from 'idb-keyval';

import {FirebaseAuth} from './firebase-auth.js';
// eslint-disable-next-line max-len
import {getLhrFilenamePrefix, getFlowResultFilenamePrefix} from '../../../report/generator/file-namer.js';
import {Util} from '../../../shared/util.js';

/**
 * Wrapper around the GitHub API for reading/writing gists.
 */
export class GithubApi {
  constructor() {
    this._auth = new FirebaseAuth();
    this._saving = false;
  }

  static get LH_JSON_EXT() {
    return '.lighthouse.report.json';
  }

  getFirebaseAuth() {
    return this._auth;
  }

  /**
   * Creates a gist under the users account.
   * @param {LH.Result|LH.FlowResult} jsonFile The gist file body.
   * @return {Promise<string>} id of the created gist.
   */
  async createGist(jsonFile) {
    if (this._saving) {
      throw new Error('Save already in progress');
    }

    logger.log('Saving report to GitHub...', false);
    this._saving = true;

    try {
      const accessToken = await this._auth.getAccessToken();
      let filename;
      if ('steps' in jsonFile) {
        filename = getFlowResultFilenamePrefix(jsonFile);
      } else {
        filename = getLhrFilenamePrefix({
          finalDisplayedUrl: Util.getFinalDisplayedUrl(jsonFile),
          fetchTime: jsonFile.fetchTime,
        });
      }
      const body = {
        description: 'Lighthouse json report',
        public: false,
        files: {
          [`${filename}${GithubApi.LH_JSON_EXT}`]: {
            content: JSON.stringify(jsonFile),
          },
        },
      };
      const request = new Request('https://api.github.com/gists', {
        method: 'POST',
        headers: new Headers({Authorization: `token ${accessToken}`}),
        // Stringify twice so quotes are escaped for POST request to succeed.
        body: JSON.stringify(body),
      });
      const response = await fetch(request);
      const json = await response.json();
      if (json.id) {
        logger.log('Saved!');
        return json.id;
      } else {
        throw new Error('Error: ' + JSON.stringify(json));
      }
    } finally {
      this._saving = false;
    }
  }

  /**
   * Fetches a Lighthouse report from a gist.
   * @param {string} id The id of a gist.
   * @return {Promise<LH.Result>}
   */
  getGistFileContentAsJson(id) {
    logger.log('Fetching report from GitHub...', false);

    return this._auth.getAccessTokenIfLoggedIn().then(accessToken => {
      const headers = new Headers();

      // If there's an authenticated token, include an Authorization header to
      // have higher rate limits with the GitHub API. Otherwise, rely on ETags.
      if (accessToken) {
        headers.set('Authorization', `token ${accessToken}`);
      }

      return idbKeyval.get(id).then(/** @param {?CachableGist} cachedGist */ (cachedGist) => {
        if (cachedGist?.etag) {
          headers.set('If-None-Match', cachedGist.etag);
        }

        // Always make the request to see if there's newer content.
        return fetch(`https://api.github.com/gists/${id}`, {headers}).then(resp => {
          const remaining = Number(resp.headers.get('X-RateLimit-Remaining'));
          const limit = Number(resp.headers.get('X-RateLimit-Limit'));
          if (remaining < 10) {
            logger.warn('Approaching GitHub\'s rate limit. ' +
                        `${limit - remaining}/${limit} requests used. Consider signing ` +
                        'in to increase this limit.');
          }

          if (!resp.ok) {
            // Should only be 304 if cachedGist exists and etag was sent, but double check.
            if (resp.status === 304 && cachedGist) {
              return Promise.resolve(cachedGist);
            } else if (resp.status === 404) {
              // Delete the entry from IDB if it no longer exists on the server.
              idbKeyval.delete(id); // Note: async.
            }
            throw new Error(`${resp.status} fetching gist`);
          }

          const etag = resp.headers.get('ETag');
          return resp.json().then(json => {
            const gistFiles = Object.keys(json.files);
            // Attempt to use first file in gist with report extension.
            let filename = gistFiles.find(filename => filename.endsWith(GithubApi.LH_JSON_EXT));
            // Otherwise, fall back to first json file in gist
            if (!filename) {
              filename = gistFiles.find(filename => filename.endsWith('.json'));
            }
            if (!filename) {
              throw new Error(
                `Failed to find a Lighthouse report (*${GithubApi.LH_JSON_EXT}) in gist ${id}`
              );
            }
            const f = json.files[filename];
            if (f.truncated) {
              return fetch(f.raw_url)
                .then(resp => resp.json())
                .then(content => ({etag, content}));
            }
            const lhr = /** @type {LH.Result} */ (JSON.parse(f.content));
            return {etag, content: lhr};
          });
        });
      });
    }).then(response => {
      // Cache the contents to speed up future lookups, even if an invalid
      // report. Future requests for the id will either still be invalid or will
      // not return a 304 and so will be overwritten.
      return idbKeyval.set(id, response).then(_ => {
        logger.hide();
        return response.content;
      });
    });
  }
}
