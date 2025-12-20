/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/* eslint-disable max-len */

'use strict';

const i18n = require('../../lighthouse-core/lib/i18n/i18n.js');

const magentoIcon = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="%23f26322" viewBox="0 0 1000 1000"%3E%3Cpath d="M916.9 267.4v465.3l-111.3 67.4V331.4l-1.5-.9-303.9-189-304.6 189.2-1.2.8V799L83.1 732.6V267.4l.7-.4L500.3 10l416 257 .6.4zM560.7 468.5v383.3L500.3 890l-61-38.2V306.7l-136 84.3v476.6l197 122.5 196.4-122.5V391l-136-84.3v161.8z"/%3E%3C/svg%3E`;

const UIStrings = {
  /** Additional description of a Lighthouse audit that tells the user how they can improve image loading by using webp in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_webp_images: 'Consider searching the [Magento Marketplace](https://marketplace.magento.com/catalogsearch/result/?q=webp) for a variety of third-party extensions to leverage newer image formats.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by lazy loading images that are initially offscreen in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  offscreen_images: 'Consider modifying your product and catalog templates to make use of the web platform\'s [lazy loading](https://web.dev/native-lazy-loading) feature.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve site loading performance by disabling JS bundling in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  disable_bundling: 'Disable Magento\'s built-in [JavaScript bundling and minification](https://devdocs.magento.com/guides/v2.3/frontend-dev-guide/themes/js-bundling.html), and consider using [baler](https://github.com/magento/baler/) instead.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by minifying their CSS files in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unminified_css: 'Enable the "Minify CSS Files" option in your store\'s Developer settings. [Learn more](https://devdocs.magento.com/guides/v2.3/performance-best-practices/configuration.html?itm_source=devdocs&itm_medium=search_page&itm_campaign=federated_search&itm_term=minify%20css%20files).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by minifying their Javascript files in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unminified_javascript: 'Use [Terser](https://www.npmjs.com/package/terser) to minify all JavaScript assets outfrom from static content deployment, and disable the built-in minification feature.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by removing unused Javascript files in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unused_javascript: 'Disable Magento\'s built-in [JavaScript bundling](https://devdocs.magento.com/guides/v2.3/frontend-dev-guide/themes/js-bundling.html).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve site performance by optimizing images, in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_optimized_images: 'Consider searching the [Magento Marketplace](https://marketplace.magento.com/catalogsearch/result/?q=optimize%20image) for a variety of third party extensions to optimize images.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve the server-response-time speed metric, in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  server_response_time: 'Use Magento\'s [Varnish integration](https://devdocs.magento.com/guides/v2.3/config-guide/varnish/config-varnish.html).',
  /** Additional description of a Lighthouse audit that tells the user how they can add preconnect or dns-prefetch resource hints, in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_rel_preconnect: 'Preconnect or dns-prefetch resource hints can be added by [modifying a themes\'s layout](https://devdocs.magento.com/guides/v2.3/frontend-dev-guide/layouts/xml-manage.html).',
  /** Additional description of a Lighthouse audit that tells the user how they can add preload tags, in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_rel_preload: '`<link rel=preload>` tags can be added by [modifying a themes\'s layout](https://devdocs.magento.com/guides/v2.3/frontend-dev-guide/layouts/xml-manage.html).',
  /** Additional description of a Lighthouse audit that tells the user how they can minimize critical request chains, in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  critical_request_chains: 'If you are not bundling your JavaScript assets, consider using [baler](https://github.com/magento/baler).',
  /** Additional description of a Lighthouse audit that tells the user how they can specify font-display, in the context of the Magento platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  font_display: 'Specify `@font-display` when [defining custom fonts](https://devdocs.magento.com/guides/v2.3/frontend-dev-guide/css-topics/using-fonts.html).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

module.exports = {
  id: 'magento',
  iconDataURL: magentoIcon,
  title: 'Magento',
  descriptions: {
    'uses-webp-images': str_(UIStrings.uses_webp_images),
    'offscreen-images': str_(UIStrings.offscreen_images),
    'total-byte-weight': str_(UIStrings.disable_bundling),
    'render-blocking-resources': str_(UIStrings.disable_bundling),
    'unminified-css': str_(UIStrings.unminified_css),
    'unminified-javascript': str_(UIStrings.unminified_javascript),
    'unused-javascript': str_(UIStrings.unused_javascript),
    'uses-optimized-images': str_(UIStrings.uses_optimized_images),
    'server-response-time': str_(UIStrings.server_response_time),
    'uses-rel-preconnect': str_(UIStrings.uses_rel_preconnect),
    'uses-rel-preload': str_(UIStrings.uses_rel_preload),
    'critical-request-chains': str_(UIStrings.critical_request_chains),
    'font-display': str_(UIStrings.font_display),
  },
};
module.exports.UIStrings = UIStrings;
