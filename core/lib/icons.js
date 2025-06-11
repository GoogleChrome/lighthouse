/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @param {NonNullable<LH.Artifacts.Manifest['value']>} manifest
 * @return {boolean} Does the manifest have any icons?
 */
function doExist(manifest) {
  if (!manifest || !manifest.icons) {
    return false;
  }
  if (manifest.icons.value.length === 0) {
    return false;
  }
  return true;
}

/**
 * @param {number} sizeRequirement
 * @param {NonNullable<LH.Artifacts.Manifest['value']>} manifest
 * @return {Array<string>} Value of satisfactory sizes (eg. ['192x192', '256x256'])
 */
function pngSizedAtLeast(sizeRequirement, manifest) {
  // An icon can be provided for a single size, or for multiple sizes.
  // To handle both, we flatten all found sizes into a single array.
  const iconValues = manifest.icons.value;
  /** @type {Array<string>} */
  const flattenedSizes = [];
  iconValues
    .filter(icon => {
      const typeHint = icon.value.type.value;
      if (typeHint) {
        // If a type hint is present, filter out icons that are not 'image/png'.
        return typeHint === 'image/png';
      }
      // Otherwise, fall back to filtering on the icons' extension.
      const src = icon.value.src.value;
      return src && new URL(src).pathname.endsWith('.png');
    })
    .forEach(icon => {
      // check that the icon has a size
      if (icon.value.sizes.value) {
        flattenedSizes.push(...icon.value.sizes.value);
      }
    });

  return flattenedSizes
      // discard sizes that are not AAxBB (eg. "any")
      .filter(size => /\d+x\d+/.test(size))
      .filter(size => {
        // Split the '24x24' strings into ['24','24'] arrays
        const sizeStrs = size.split(/x/i);
        // Cast the ['24','24'] strings into [24,24] numbers
        const sizeNums = [parseFloat(sizeStrs[0]), parseFloat(sizeStrs[1])];
        // Only keep sizes that are as big as our required size
        const areIconsBigEnough = sizeNums[0] >= sizeRequirement && sizeNums[1] >= sizeRequirement;
        // Square is required: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/manifest/manifest_icon_selector.cc&q=ManifestIconSelector::IconSizesContainsBiggerThanMinimumSize&sq=package:chromium
        const areIconsSquare = sizeNums[0] === sizeNums[1];
        return areIconsBigEnough && areIconsSquare;
      });
}

/**
 * @param {NonNullable<LH.Artifacts.Manifest['value']>} manifest
 * @return {boolean} Does the manifest icons value contain at least one icon with purpose including "maskable"
 */
function containsMaskableIcon(manifest) {
  const iconValues = manifest.icons.value;
  return iconValues.some(icon => {
    return icon.value.purpose?.value &&
      icon.value.purpose.value.includes('maskable');
  });
}

export {
  doExist,
  pngSizedAtLeast,
  containsMaskableIcon,
};
