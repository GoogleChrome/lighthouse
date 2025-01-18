
# Emulation in Lighthouse

In Lighthouse, "Emulation" refers to the screen/viewport emulation and UserAgent string spoofing.
["Throttling"](./throttling.md) covers the similar topics around network and CPU throttling/simulation.

With the default configuration, Lighthouse emulates a mobile device. There's [a `desktop` configuration](../core/config/desktop-config.js), available to CLI users with `--preset=desktop`, which applies a consistent desktop environment and scoring calibration. This is recommended as a replacement for `--emulated-form-factor=desktop`.

### Advanced emulation setups

Some products use Lighthouse in scenarios where emulation is applied outside of Lighthouse (e.g. by Puppeteer) or running against Chrome on real mobile devices.

You must always set `formFactor`. It doesn't control emulation, but it determines how Lighthouse should interpret the run in regards to scoring performance metrics and skipping mobile-only tests in desktop.

You can choose how `screenEmulation` is applied. It can accept an object of `{width: number, height: number, deviceScaleRatio: number, mobile: boolean, disabled: false}` to apply that screen emulation or an object of `{disabled: true}` if Lighthouse should avoid applying screen emulation. It's typically set to disabled if either emulation is applied outside of Lighthouse, or it's being run on a mobile device. The `mobile` boolean applies overlay scrollbars and a few other mobile-specific screen emulation characteristics.

You can choose how to handle userAgent emulation. The `emulatedUserAgent` property accepts either a `string` to apply the provided userAgent or a `boolean` -- `true` if the default UA spoofing should be applied (default) or `false` if no UA spoofing should be applied. Typically `false` is used if UA spoofing is applied outside of Lighthouse or on a mobile device. You can also redundantly apply userAgent emulation with no risk.

If you're using Lighthouse on a mobile device, you want to set `--screenEmulation.disabled` and `--throttling.cpuSlowdownMultiplier=1`. (`--formFactor=mobile` is the default already).

### Changes made in v7

In Lighthouse v7, most of the configuration regarding emulation changed to be more intuitive and clear. The [tracking issue](https://github.com/GoogleChrome/lighthouse/issues/10910
) captures additional motivations.

* Removed: The `emulatedFormFactor` property (which determined how emulation is applied).
* Removed: The `TestedAsMobileDevice` artifact. Instead of being inferred, the explicit `formFactor` property is used.
* Removed: The `internalDisableDeviceScreenEmulation` property. It's equivalent to the new `--screenEmulation.disabled=true`.
* Added: The `formFactor` property.
* Added: The `screenEmulation` property.
* Added: The `emulatedUserAgent` property.
* (`throttling` and `throttlingMethod` remain unchanged)
