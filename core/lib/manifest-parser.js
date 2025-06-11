/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const ALLOWED_DISPLAY_VALUES = [
  'fullscreen',
  'standalone',
  'minimal-ui',
  'browser',
];
/**
 * All display-mode fallbacks, including when unset, lead to default display mode 'browser'.
 * @see https://www.w3.org/TR/2016/WD-appmanifest-20160825/#dfn-default-display-mode
 */
const DEFAULT_DISPLAY_MODE = 'browser';

const ALLOWED_ORIENTATION_VALUES = [
  'any',
  'natural',
  'landscape',
  'portrait',
  'portrait-primary',
  'portrait-secondary',
  'landscape-primary',
  'landscape-secondary',
];

/**
 * @param {*} raw
 * @param {boolean=} trim
 */
function parseString(raw, trim) {
  let value;
  let warning;

  if (typeof raw === 'string') {
    value = trim ? raw.trim() : raw;
  } else {
    if (raw !== undefined) {
      warning = 'ERROR: expected a string.';
    }
    value = undefined;
  }

  return {
    raw,
    value,
    warning,
  };
}

/**
 * @param {*} raw
 */
function parseColor(raw) {
  const color = parseString(raw);

  // Finished if color missing or not a string.
  if (color.value === undefined) {
    return color;
  }

  return color;
}

/**
 * @param {*} jsonInput
 */
function parseName(jsonInput) {
  return parseString(jsonInput.name, true);
}

/**
 * @param {*} jsonInput
 */
function parseShortName(jsonInput) {
  return parseString(jsonInput.short_name, true);
}

/**
 * Returns whether the urls are of the same origin. See https://html.spec.whatwg.org/#same-origin
 * @param {string} url1
 * @param {string} url2
 * @return {boolean}
 */
function checkSameOrigin(url1, url2) {
  const parsed1 = new URL(url1);
  const parsed2 = new URL(url2);

  return parsed1.origin === parsed2.origin;
}

/**
 * https://www.w3.org/TR/2016/WD-appmanifest-20160825/#start_url-member
 * @param {*} jsonInput
 * @param {string} manifestUrl
 * @param {string} documentUrl
 * @return {{raw: any, value: string, warning?: string}}
 */
function parseStartUrl(jsonInput, manifestUrl, documentUrl) {
  const raw = jsonInput.start_url;

  // 8.10(3) - discard the empty string and non-strings.
  if (raw === '') {
    return {
      raw,
      value: documentUrl,
      warning: 'ERROR: start_url string empty',
    };
  }
  if (raw === undefined) {
    return {
      raw,
      value: documentUrl,
    };
  }
  if (typeof raw !== 'string') {
    return {
      raw,
      value: documentUrl,
      warning: 'ERROR: expected a string.',
    };
  }

  // 8.10(4) - construct URL with raw as input and manifestUrl as the base.
  let startUrl;
  try {
    startUrl = new URL(raw, manifestUrl).href;
  } catch (e) {
    // 8.10(5) - discard invalid URLs.
    return {
      raw,
      value: documentUrl,
      warning: `ERROR: invalid start_url relative to ${manifestUrl}`,
    };
  }

  // 8.10(6) - discard start_urls that are not same origin as documentUrl.
  if (!checkSameOrigin(startUrl, documentUrl)) {
    return {
      raw,
      value: documentUrl,
      warning: 'ERROR: start_url must be same-origin as document',
    };
  }

  return {
    raw,
    value: startUrl,
  };
}

/**
 * @param {*} jsonInput
 */
function parseDisplay(jsonInput) {
  const parsedString = parseString(jsonInput.display, true);
  const stringValue = parsedString.value;

  if (!stringValue) {
    return {
      raw: jsonInput,
      value: DEFAULT_DISPLAY_MODE,
      warning: parsedString.warning,
    };
  }

  const displayValue = stringValue.toLowerCase();
  if (!ALLOWED_DISPLAY_VALUES.includes(displayValue)) {
    return {
      raw: jsonInput,
      value: DEFAULT_DISPLAY_MODE,
      warning: 'ERROR: \'display\' has invalid value ' + displayValue +
        `. will fall back to ${DEFAULT_DISPLAY_MODE}.`,
    };
  }

  return {
    raw: jsonInput,
    value: displayValue,
    warning: undefined,
  };
}

/**
 * @param {*} jsonInput
 */
function parseOrientation(jsonInput) {
  const orientation = parseString(jsonInput.orientation, true);

  if (orientation.value &&
      !ALLOWED_ORIENTATION_VALUES.includes(orientation.value.toLowerCase())) {
    orientation.value = undefined;
    orientation.warning = 'ERROR: \'orientation\' has an invalid value, will be ignored.';
  }

  return orientation;
}

/**
 * @see https://www.w3.org/TR/2016/WD-appmanifest-20160825/#src-member
 * @param {*} raw
 * @param {string} manifestUrl
 */
function parseIcon(raw, manifestUrl) {
  // 9.4(3)
  const src = parseString(raw.src, true);
  // 9.4(4) - discard if trimmed value is the empty string.
  if (src.value === '') {
    src.value = undefined;
  }
  if (src.value) {
    try {
      // 9.4(4) - construct URL with manifest URL as the base
      src.value = new URL(src.value, manifestUrl).href;
    } catch (_) {
      // 9.4 "This algorithm will return a URL or undefined."
      src.warning = `ERROR: invalid icon url will be ignored: '${raw.src}'`;
      src.value = undefined;
    }
  }

  const type = parseString(raw.type, true);

  const parsedPurpose = parseString(raw.purpose);
  const purpose = {
    raw: raw.purpose,
    value: ['any'],
    /** @type {string|undefined} */
    warning: undefined,
  };
  if (parsedPurpose.value !== undefined) {
    purpose.value = parsedPurpose.value.split(/\s+/).map(value => value.toLowerCase());
  }

  const density = {
    raw: raw.density,
    value: 1,
    /** @type {string|undefined} */
    warning: undefined,
  };
  if (density.raw !== undefined) {
    density.value = parseFloat(density.raw);
    if (isNaN(density.value) || !isFinite(density.value) || density.value <= 0) {
      density.value = 1;
      density.warning = 'ERROR: icon density cannot be NaN, +∞, or less than or equal to +0.';
    }
  }

  let sizes;
  const parsedSizes = parseString(raw.sizes);
  if (parsedSizes.value !== undefined) {
    /** @type {Set<string>} */
    const set = new Set();
    parsedSizes.value.trim().split(/\s+/).forEach(size => set.add(size.toLowerCase()));
    sizes = {
      raw: raw.sizes,
      value: set.size > 0 ? Array.from(set) : undefined,
      warning: undefined,
    };
  } else {
    sizes = {...parsedSizes, value: undefined};
  }

  return {
    raw,
    value: {
      src,
      type,
      density,
      sizes,
      purpose,
    },
    warning: undefined,
  };
}

/**
 * @param {*} jsonInput
 * @param {string} manifestUrl
 */
function parseIcons(jsonInput, manifestUrl) {
  const raw = jsonInput.icons;

  if (raw === undefined) {
    return {
      raw,
      /** @type {Array<ReturnType<typeof parseIcon>>} */
      value: [],
      warning: undefined,
    };
  }

  if (!Array.isArray(raw)) {
    return {
      raw,
      /** @type {Array<ReturnType<typeof parseIcon>>} */
      value: [],
      warning: 'ERROR: \'icons\' expected to be an array but is not.',
    };
  }

  const parsedIcons = raw
    // 9.6(3)(1)
    .filter(icon => icon.src !== undefined)
    // 9.6(3)(2)(1)
    .map(icon => parseIcon(icon, manifestUrl));

  // NOTE: we still lose the specific message on these icons, but it's not possible to surface them
  // without a massive change to the structure and paradigms of `manifest-parser`.
  const ignoredIconsWithWarnings = parsedIcons
    .filter(icon => {
      const possibleWarnings = [icon.warning, icon.value.type.warning, icon.value.src.warning,
        icon.value.sizes.warning, icon.value.density.warning].filter(Boolean);
      const hasSrc = !!icon.value.src.value;
      return !!possibleWarnings.length && !hasSrc;
    });

  const value = parsedIcons
    // 9.6(3)(2)(2)
    .filter(parsedIcon => parsedIcon.value.src.value !== undefined);

  return {
    raw,
    value,
    warning: ignoredIconsWithWarnings.length ?
      'WARNING: Some icons were ignored due to warnings.' : undefined,
  };
}

/**
 * @param {*} raw
 */
function parseApplication(raw) {
  const platform = parseString(raw.platform, true);
  const id = parseString(raw.id, true);

  // 10.2.(2) and 10.2.(3)
  const appUrl = parseString(raw.url, true);
  if (appUrl.value) {
    try {
      // 10.2.(4) - attempt to construct URL.
      appUrl.value = new URL(appUrl.value).href;
    } catch (e) {
      appUrl.value = undefined;
      appUrl.warning = `ERROR: invalid application URL ${raw.url}`;
    }
  }

  return {
    raw,
    value: {
      platform,
      id,
      url: appUrl,
    },
    warning: undefined,
  };
}

/**
 * @param {*} jsonInput
 */
function parseRelatedApplications(jsonInput) {
  const raw = jsonInput.related_applications;

  if (raw === undefined) {
    return {
      raw,
      value: undefined,
      warning: undefined,
    };
  }

  if (!Array.isArray(raw)) {
    return {
      raw,
      value: undefined,
      warning: 'ERROR: \'related_applications\' expected to be an array but is not.',
    };
  }

  // TODO(bckenny): spec says to skip apps missing `platform`, so debug messages
  // on individual apps are lost. Warn instead?
  const value = raw
    .filter(application => !!application.platform)
    .map(parseApplication)
    .filter(parsedApp => !!parsedApp.value.id.value || !!parsedApp.value.url.value);

  return {
    raw,
    value,
    warning: undefined,
  };
}

/**
 * @param {*} jsonInput
 */
function parsePreferRelatedApplications(jsonInput) {
  const raw = jsonInput.prefer_related_applications;
  let value;
  let warning;

  if (typeof raw === 'boolean') {
    value = raw;
  } else {
    if (raw !== undefined) {
      warning = 'ERROR: \'prefer_related_applications\' expected to be a boolean.';
    }
    value = undefined;
  }

  return {
    raw,
    value,
    warning,
  };
}

/**
 * @param {*} jsonInput
 */
function parseThemeColor(jsonInput) {
  return parseColor(jsonInput.theme_color);
}

/**
 * @param {*} jsonInput
 */
function parseBackgroundColor(jsonInput) {
  return parseColor(jsonInput.background_color);
}

/**
 * Parse a manifest from the given inputs.
 * @param {string} string Manifest JSON string.
 * @param {string} manifestUrl URL of manifest file.
 * @param {string} documentUrl URL of document containing manifest link element.
 */
function parseManifest(string, manifestUrl, documentUrl) {
  if (manifestUrl === undefined || documentUrl === undefined) {
    throw new Error('Manifest and document URLs required for manifest parsing.');
  }

  let jsonInput;

  try {
    jsonInput = JSON.parse(string);
  } catch (e) {
    return {
      raw: string,
      value: undefined,
      warning: 'ERROR: file isn\'t valid JSON: ' + e,
      url: manifestUrl,
    };
  }

  /* eslint-disable camelcase */
  const manifest = {
    name: parseName(jsonInput),
    short_name: parseShortName(jsonInput),
    start_url: parseStartUrl(jsonInput, manifestUrl, documentUrl),
    display: parseDisplay(jsonInput),
    orientation: parseOrientation(jsonInput),
    icons: parseIcons(jsonInput, manifestUrl),
    related_applications: parseRelatedApplications(jsonInput),
    prefer_related_applications: parsePreferRelatedApplications(jsonInput),
    theme_color: parseThemeColor(jsonInput),
    background_color: parseBackgroundColor(jsonInput),
  };
  /* eslint-enable camelcase */

  /** @type {string|undefined} */
  let manifestUrlWarning;
  try {
    const manifestUrlParsed = new URL(manifestUrl);
    if (!manifestUrlParsed.protocol.startsWith('http')) {
      manifestUrlWarning = `WARNING: manifest URL not available over a valid network protocol`;
    }
  } catch (_) {
    manifestUrlWarning = `ERROR: invalid manifest URL: '${manifestUrl}'`;
  }

  return {
    raw: string,
    value: manifest,
    warning: manifestUrlWarning,
    url: manifestUrl,
  };
}

export {parseManifest};
