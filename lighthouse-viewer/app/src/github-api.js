/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global logger, FirebaseAuth, idbKeyval, getFilenamePrefix */

/** @typedef {{etag: ?string, content: LH.Result}} CachableGist */

/**
 * Wrapper around the GitHub API for reading/writing gists.
 */
class GithubApi {
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
   * @param {LH.Result} jsonFile The gist file body.
   * @return {Promise<string>} id of the created gist.
   */
  createGist(jsonFile) {
    if (this._saving) {
      return Promise.reject(new Error('Save already in progress'));
    }

    logger.log('Saving report to GitHub...', false);
    this._saving = true;

    return this._auth.getAccessToken()
      .then(accessToken => {
        const filename = getFilenamePrefix({
          finalUrl: jsonFile.finalUrl,
          fetchTime: jsonFile.fetchTime,
        });
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
        return fetch(request);
      })
      .then(resp => resp.json())
      .then(json => {
        logger.log('Saved!');
        this._saving = false;
        return json.id;
      }).catch(err => {
        this._saving = false;
        throw err;
      });
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
        if (cachedGist && cachedGist.etag) {
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
            if (resp.status === 304) {
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
        // @ts-ignore - TODO(bckenny): tsc unable to flatten promise chain here
        return response.content;
      });
    });
  }
}

// node export for testing.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GithubApi;
}
