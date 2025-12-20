/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/* eslint-disable max-len */

'use strict';

const i18n = require('../../lighthouse-core/lib/i18n/i18n.js');

const wordpressIcon = `data:image/svg+xml,%3Csvg viewBox='0 0 122.5 122.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%232f3439'%3E%3Cpath d='M8.7 61.3c0 20.8 12.1 38.7 29.6 47.3l-25-68.7c-3 6.5-4.6 13.7-4.6 21.4zM96.7 58.6c0-6.5-2.3-11-4.3-14.5-2.7-4.3-5.2-8-5.2-12.3 0-4.8 3.7-9.3 8.9-9.3h.7a52.4 52.4 0 0 0-79.4 9.9h3.3c5.5 0 14-.6 14-.6 2.9-.2 3.2 4 .4 4.3 0 0-2.9.4-6 .5l19.1 57L59.7 59l-8.2-22.5c-2.8-.1-5.5-.5-5.5-.5-2.8-.1-2.5-4.5.3-4.3 0 0 8.7.7 13.9.7 5.5 0 14-.7 14-.7 2.8-.2 3.2 4 .3 4.3 0 0-2.8.4-6 .5l19 56.5 5.2-17.5c2.3-7.3 4-12.5 4-17z'/%3E%3Cpath d='M62.2 65.9l-15.8 45.8a52.6 52.6 0 0 0 32.3-.9l-.4-.7zM107.4 36a49.6 49.6 0 0 1-3.6 24.2l-16.1 46.5A52.5 52.5 0 0 0 107.4 36z'/%3E%3Cpath d='M61.3 0a61.3 61.3 0 1 0 .1 122.7A61.3 61.3 0 0 0 61.3 0zm0 119.7a58.5 58.5 0 1 1 .1-117 58.5 58.5 0 0 1-.1 117z'/%3E%3C/g%3E%3C/svg%3E`;

const UIStrings = {
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by removing unused CSS, in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unused_css_rules: 'Consider reducing, or switching, the number of [WordPress plugins](https://wordpress.org/plugins/) loading unused CSS in your page. To identify plugins that are adding extraneous CSS, try running [code coverage](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) in Chrome DevTools. You can identify the theme/plugin responsible from the URL of the stylesheet. Look out for plugins that have many stylesheets in the list which have a lot of red in code coverage. A plugin should only enqueue a stylesheet if it is actually used on the page.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve image loading by using webp in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_webp_images: 'Consider using a [plugin](https://wordpress.org/plugins/search/convert+webp/) or service that will automatically convert your uploaded images to the optimal formats.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by lazy loading images that are initially offscreen in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  offscreen_images: 'Install a [lazy-load WordPress plugin](https://wordpress.org/plugins/search/lazy+load/) that provides the ability to defer any offscreen images, or switch to a theme that provides that functionality. Also consider using [the AMP plugin](https://wordpress.org/plugins/amp/).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve site loading performance by reducing the total bytes delivered by their page in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  total_byte_weight: 'Consider showing excerpts in your post lists (e.g. via the more tag), reducing the number of posts shown on a given page, breaking your long posts into multiple pages, or using a plugin to lazy-load comments.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by reducing the amount of render blocking resources present on their page, in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  render_blocking_resources: 'There are a number of WordPress plugins that can help you [inline critical assets](https://wordpress.org/plugins/search/critical+css/) or [defer less important resources](https://wordpress.org/plugins/search/defer+css+javascript/). Beware that optimizations provided by these plugins may break features of your theme or plugins, so you will likely need to make code changes.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by minifying their CSS files in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unminified_css: 'A number of [WordPress plugins](https://wordpress.org/plugins/search/minify+css/) can speed up your site by concatenating, minifying, and compressing your styles. You may also want to use a build process to do this minification up-front if possible.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by minifying their Javascript files in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unminified_javascript: 'A number of [WordPress plugins](https://wordpress.org/plugins/search/minify+javascript/) can speed up your site by concatenating, minifying, and compressing your scripts. You may also want to use a build process to do this minification up front if possible.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by encoding animated images as video, in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  efficient_animated_content: 'Consider uploading your GIF to a service which will make it available to embed as an HTML5 video.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by removing unused Javascript files in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unused_javascript: 'Consider reducing, or switching, the number of [WordPress plugins](https://wordpress.org/plugins/) loading unused JavaScript in your page. To identify plugins that are adding extraneous JS, try running [code coverage](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage) in Chrome DevTools. You can identify the theme/plugin responsible from the URL of the script. Look out for plugins that have many scripts in the list which have a lot of red in code coverage. A plugin should only enqueue a script if it is actually used on the page.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve their site by enabling long caching in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_long_cache_ttl: 'Read about [Browser Caching in WordPress](https://wordpress.org/support/article/optimization/#browser-caching).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve site performance by optimizing images, in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_optimized_images: 'Consider using an [image optimization WordPress plugin](https://wordpress.org/plugins/search/optimize+images/) that compresses your images while retaining quality.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance via enabling text compression in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_text_compression: 'You can enable text compression in your web server configuration.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by using responsive images in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_responsive_images: 'Upload images directly through the [media library](https://wordpress.org/support/article/media-library-screen/) to ensure that the required image sizes are available, and then insert them from the media library or use the image widget to ensure the optimal image sizes are used (including those for the responsive breakpoints). Avoid using `Full Size` images unless the dimensions are adequate for their usage. [Learn More](https://wordpress.org/support/article/inserting-images-into-posts-and-pages/).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve the server-response-time speed metric, in the context of the Wordpress CMS platform. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  server_response_time: 'Themes, plugins, and server specifications all contribute to server response time. Consider finding a more optimized theme, carefully selecting an optimization plugin, and/or upgrading your server.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

module.exports = {
  id: 'wordpress',
  iconDataURL: wordpressIcon,
  title: 'WordPress',
  descriptions: {
    'unused-css-rules': str_(UIStrings.unused_css_rules),
    'uses-webp-images': str_(UIStrings.uses_webp_images),
    'offscreen-images': str_(UIStrings.offscreen_images),
    'total-byte-weight': str_(UIStrings.total_byte_weight),
    'render-blocking-resources': str_(UIStrings.render_blocking_resources),
    'unminified-css': str_(UIStrings.unminified_css),
    'unminified-javascript': str_(UIStrings.unminified_javascript),
    'efficient-animated-content': str_(UIStrings.efficient_animated_content),
    'unused-javascript': str_(UIStrings.unused_javascript),
    'uses-long-cache-ttl': str_(UIStrings.uses_long_cache_ttl),
    'uses-optimized-images': str_(UIStrings.uses_optimized_images),
    'uses-text-compression': str_(UIStrings.uses_text_compression),
    'uses-responsive-images': str_(UIStrings.uses_responsive_images),
    'server-response-time': str_(UIStrings.server_response_time),
  },
};
module.exports.UIStrings = UIStrings;
