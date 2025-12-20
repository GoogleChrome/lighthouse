/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/* eslint-disable max-len */

'use strict';

const i18n = require('../../lighthouse-core/lib/i18n/i18n.js');

const ampIcon = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"%3E%3Cpath d="M171.887 116.28l-53.696 89.36h-9.728l9.617-58.227-30.2.047a4.852 4.852 0 01-4.855-4.855c0-1.152 1.07-3.102 1.07-3.102l53.52-89.254 9.9.043-9.86 58.317 30.413-.043a4.852 4.852 0 014.855 4.855c0 1.088-.427 2.044-1.033 2.854l.004.004zM128 0C57.306 0 0 57.3 0 128s57.306 128 128 128 128-57.306 128-128S198.7 0 128 0z" fill="%230379c4" fill-rule="evenodd"/%3E%3C/svg%3E`;

const UIStrings = {
  /** Additional description of a Lighthouse audit that tells the user how they can improve image loading by using WebP in the context of AMP. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_webp_images: 'Consider displaying all your `amp-img` components in WebP formats while specifying an appropriate fallback for other browsers. [Learn more](https://amp.dev/documentation/components/amp-img/#example:-specifying-a-fallback-image).',
  /** Additional description of a Lighthouse audit that tells the user how images are automatically lazy loaded for the AMP framewok. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  offscreen_images: 'Ensure that you are you using valid `amp-img` tags for your images which automatically lazy-load outside the first viewport. [Learn more](https://amp.dev/documentation/guides-and-tutorials/develop/media_iframes_3p/?format=websites#images).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by reducing the amount of render blocking resources present on their page in the context of the AMP framework. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  render_blocking_resources: 'Use tools such as [AMP Optimizer](https://github.com/ampproject/amp-toolbox/tree/master/packages/optimizer) to [server-side render AMP layouts](https://amp.dev/documentation/guides-and-tutorials/optimize-and-measure/server-side-rendering/).',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by ensuring all the CSS written is supported by the AMP framework. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  unminified_css: 'Refer to the [AMP documentation](https://amp.dev/documentation/guides-and-tutorials/develop/style_and_layout/style_pages/) to ensure all your styles are supported.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by using a runtime-managed animated image in the context of the AMP framework. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  efficient_animated_content: 'For animated content, use [amp-anim](https://amp.dev/documentation/components/amp-anim/) to minimize CPU usage while the content remains offscreen.',
  /** Additional description of a Lighthouse audit that tells the user how they can improve performance by using responsive images in the context of the AMP framework. This is displayed after a user expands the section to see more. No character length limits. Links in (parenthesis) become link texts to additional documentation. */
  uses_responsive_images: 'The `amp-img` element supports the `srcset` attribute to specify which image assets to use based on the screen size.  [Learn more](https://amp.dev/documentation/guides-and-tutorials/develop/style_and_layout/art_direction/).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

module.exports = {
  id: 'amp',
  iconDataURL: ampIcon,
  title: 'AMP',
  descriptions: {
    'uses-webp-images': str_(UIStrings.uses_webp_images),
    'offscreen-images': str_(UIStrings.offscreen_images),
    'render-blocking-resources': str_(UIStrings.render_blocking_resources),
    'unminified-css': str_(UIStrings.unminified_css),
    'efficient-animated-content': str_(UIStrings.efficient_animated_content),
    'uses-responsive-images': str_(UIStrings.uses_responsive_images),
  },
};
module.exports.UIStrings = UIStrings;
