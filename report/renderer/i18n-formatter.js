/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Not named `NBSP` because that creates a duplicate identifier (util.js).
const NBSP2 = '\xa0';
const KiB = 1024;
const MiB = KiB * KiB;

export class I18nFormatter {
  /**
   * @param {LH.Locale} locale
   */
  constructor(locale) {
    // When testing, use a locale with more exciting numeric formatting.
    if (locale === 'en-XA') locale = 'de';

    this._locale = locale;
    this._cachedNumberFormatters = new Map();
  }

  /**
   * @param {number} number
   * @param {number|undefined} granularity
   * @param {Intl.NumberFormatOptions=} opts
   * @return {string}
   */
  _formatNumberWithGranularity(number, granularity, opts = {}) {
    if (granularity !== undefined) {
      const log10 = -Math.log10(granularity);
      if (!Number.isInteger(log10)) {
        // eslint-disable-next-line no-console
        console.warn(`granularity of ${granularity} is invalid. Using 1 instead`);
        granularity = 1;
      }

      if (granularity < 1) {
        opts = {...opts};
        opts.minimumFractionDigits = opts.maximumFractionDigits = Math.ceil(log10);
      }

      number = Math.round(number / granularity) * granularity;

      // Avoid displaying a negative value that rounds to zero as "0".
      if (Object.is(number, -0)) number = 0;
    } else if (Math.abs(number) < 0.0005) {
      // Also avoids "-0".
      number = 0;
    }

    let formatter;

    const cacheKey = [
      opts.minimumFractionDigits,
      opts.maximumFractionDigits,
      opts.style,
      opts.unit,
      opts.unitDisplay,
      this._locale,
    ].join('');

    formatter = this._cachedNumberFormatters.get(cacheKey);
    if (!formatter) {
      formatter = new Intl.NumberFormat(this._locale, opts);
      this._cachedNumberFormatters.set(cacheKey, formatter);
    }

    return formatter.format(number).replace(' ', NBSP2);
  }

  /**
   * Format number.
   * @param {number} number
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed as described
   *                              by the Intl defaults: tinyurl.com/7s67w5x7
   * @return {string}
   */
  formatNumber(number, granularity) {
    return this._formatNumberWithGranularity(number, granularity);
  }

  /**
   * Format integer.
   * Just like {@link formatNumber} but uses a granularity of 1, rounding to the nearest
   * whole number.
   * @param {number} number
   * @return {string}
   */
  formatInteger(number) {
    return this._formatNumberWithGranularity(number, 1);
  }

  /**
   * Format percent.
   * @param {number} number 0–1
   * @return {string}
   */
  formatPercent(number) {
    return new Intl.NumberFormat(this._locale, {style: 'percent'}).format(number);
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed in full.
   * @return {string}
   */
  formatBytesToKiB(size, granularity = undefined) {
    return this._formatNumberWithGranularity(size / KiB, granularity) + `${NBSP2}KiB`;
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed in full.
   * @return {string}
   */
  formatBytesToMiB(size, granularity = undefined) {
    return this._formatNumberWithGranularity(size / MiB, granularity) + `${NBSP2}MiB`;
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed in full.
   * @return {string}
   */
  formatBytes(size, granularity = 1) {
    return this._formatNumberWithGranularity(size, granularity, {
      style: 'unit',
      unit: 'byte',
      unitDisplay: 'long',
    });
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed in full.
   * @return {string}
   */
  formatBytesWithBestUnit(size, granularity = 0.1) {
    if (size >= MiB) return this.formatBytesToMiB(size, granularity);
    if (size >= KiB) return this.formatBytesToKiB(size, granularity);
    return this._formatNumberWithGranularity(size, granularity, {
      style: 'unit',
      unit: 'byte',
      unitDisplay: 'narrow',
    });
  }

  /**
   * @param {number} size
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed in full.
   * @return {string}
   */
  formatKbps(size, granularity = undefined) {
    return this._formatNumberWithGranularity(size, granularity, {
      style: 'unit',
      unit: 'kilobit-per-second',
      unitDisplay: 'short',
    });
  }

  /**
   * @param {number} ms
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed in full.
   * @return {string}
   */
  formatMilliseconds(ms, granularity = undefined) {
    return this._formatNumberWithGranularity(ms, granularity, {
      style: 'unit',
      unit: 'millisecond',
      unitDisplay: 'short',
    });
  }

  /**
   * @param {number} ms
   * @param {number=} granularity Controls how coarse the displayed value is.
   *                              If undefined, the number will be displayed in full.
   * @return {string}
   */
  formatSeconds(ms, granularity = undefined) {
    return this._formatNumberWithGranularity(ms / 1000, granularity, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
    });
  }

  /**
   * Format time.
   * @param {string} date
   * @return {string}
   */
  formatDateTime(date) {
    /** @type {Intl.DateTimeFormatOptions} */
    const options = {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', timeZoneName: 'short',
    };

    // Force UTC if runtime timezone could not be detected.
    // See https://github.com/GoogleChrome/lighthouse/issues/1056
    // and https://github.com/GoogleChrome/lighthouse/pull/9822
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat(this._locale, options);
    } catch (err) {
      options.timeZone = 'UTC';
      formatter = new Intl.DateTimeFormat(this._locale, options);
    }

    return formatter.format(new Date(date));
  }

  /**
   * Converts a time in milliseconds into a duration string, i.e. `1d 2h 13m 52s`
   * @param {number} timeInMilliseconds
   * @return {string}
   */
  formatDuration(timeInMilliseconds) {
    // There is a proposal for a Intl.DurationFormat.
    // https://github.com/tc39/proposal-intl-duration-format
    // Until then, we do things a bit more manually.

    let timeInSeconds = timeInMilliseconds / 1000;
    if (Math.round(timeInSeconds) === 0) {
      return 'None';
    }

    /** @type {Array<string>} */
    const parts = [];
    /** @type {Record<string, number>} */
    const unitToSecondsPer = {
      day: 60 * 60 * 24,
      hour: 60 * 60,
      minute: 60,
      second: 1,
    };

    Object.keys(unitToSecondsPer).forEach(unit => {
      const secondsPerUnit = unitToSecondsPer[unit];
      const numberOfUnits = Math.floor(timeInSeconds / secondsPerUnit);
      if (numberOfUnits > 0) {
        timeInSeconds -= numberOfUnits * secondsPerUnit;
        const part = this._formatNumberWithGranularity(numberOfUnits, 1, {
          style: 'unit',
          unit,
          unitDisplay: 'narrow',
        });
        parts.push(part);
      }
    });

    return parts.join(' ');
  }
}
