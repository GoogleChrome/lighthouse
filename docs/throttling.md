# Network Throttling

Lighthouse applies network throttling to emulate the ~85th percentile mobile connection speed even when run on much faster fiber connections.

## The mobile network throttling preset

This is the standard recommendation for mobile throttling:

- Latency: 150ms
- Throughput: 1.6Mbps down / 750 Kbps up.
- Packet loss: none.

These exact figures are [defined in the Lighthouse constants](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js#:~:text=of%204G%20connections.-,mobileSlow4G,-%3A%20%7B) and used as Lighthouse's throttling default.
They represent roughly the bottom 25% of 4G connections and top 25% of 3G connections (in Lighthouse this configuration is currently called "Slow 4G" but used to be labeled as "Fast 3G").
This preset is identical to the [WebPageTest's "Mobile 3G - Fast"](https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/connectivity.ini.sample) and, due to a lower latency, slightly faster for some pages than the [WebPageTest "4G" preset](https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/connectivity.ini.sample).

## Types of network throttling

Within web performance testing, there are four typical styles of network throttling:

1. **_Simulated throttling_**, which Lighthouse uses by **default**, uses a simulation of a page load, based on the data observed in the initial unthrottled load. This approach makes it both very fast and deterministic. However, due to the imperfect nature of predicting alternate execution paths, there is inherent inaccuracy that is summarized in this doc: [Lighthouse Metric Variability and Accuracy](https://docs.google.com/document/d/1BqtL-nG53rxWOI5RO0pItSRPowZVnYJ_gBEQCJ5EeUE/edit). The TLDR: while it's roughly as accurate or better than DevTools throttling for most sites, it suffers from edge cases and a deep investigation to performance should use _Packet-level_ throttling tools.
1. **_Request-level throttling_** , also referred to as **_DevTools throttling_** in the Lighthouse panel or _`devtools` throttling_ in Lighthouse configuration, is how throttling is implemented with Chrome DevTools. In real mobile connectivity, latency affects things at the packet level rather than the request level. As a result, this throttling isn't highly accurate. It also has a few more downsides that are summarized in [Network Throttling & Chrome - status](https://docs.google.com/document/d/1TwWLaLAfnBfbk5_ZzpGXegPapCIfyzT4MWuZgspKUAQ/edit). The TLDR: while it's a [decent approximation](https://docs.google.com/document/d/10lfVdS1iDWCRKQXPfbxEn4Or99D64mvNlugP1AQuFlE/edit), it's not a sufficient model of a slow connection. The [multipliers used in Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/main/core/config/constants.js#:~:text=*%201024%2C-,requestLatencyMs,-%3A%20150%20*) attempt to correct for the differences.
1. **_Proxy-level_** throttling tools do not affect UDP data, so they're decent, but not ideal.
1. **_Packet-level_** throttling tools are able to make the most accurate network simulation. While this approach can model real network conditions most effectively, it also can introduce [more variance](https://docs.google.com/document/d/1BqtL-nG53rxWOI5RO0pItSRPowZVnYJ_gBEQCJ5EeUE/edit) than request-level or simulated throttling. [WebPageTest uses](https://github.com/WPO-Foundation/wptagent/blob/master/docs/remote_trafficshaping.md) packet-level throttling.

Lighthouse, by default, uses simulated throttling as it provides both quick evaluation and minimized variance. However, some may want to experiment with more accurate throttling... [Learn more about these throttling types and how they behave in in different scenarios](https://www.debugbear.com/blog/network-throttling-methods).

## DevTools' Lighthouse Panel Throttling

The Lighthouse panel has a simplified throttling setup:

1. _Simulated throttling_ remains the default setting. This matches the setup of PageSpeed Insights and the Lighthouse CLI default, maintaining cross-tool consistency.
   - If you click the `View Original Trace` button, the trace values will not match up with Lighthouse's metric results, as the original trace is prior to the simulation.
1. _DevTools throttling_ is available within the Lighthouse panel settings (⚙): select _DevTools throttling_ from the throttling method dropdown.
   - In this mode, the performance data seen after clicking the [`View Trace` button](https://developers.google.com/web/updates/2018/04/devtools#traces) will match Lighthouses's numbers.

Of course, CLI users can still control the exact [configuration](../readme.md#cli-options) of throttling.

## How do I get packet-level throttling?

This Performance Calendar article, [Testing with Realistic Networking Conditions](https://calendar.perfplanet.com/2016/testing-with-realistic-networking-conditions/), has a good explanation of packet-level traffic shaping (which applies across TCP/UDP/ICMP) and recommendations.

The [`@sitespeed.io/throttle`](https://www.npmjs.com/package/@sitespeed.io/throttle) npm package appears to be the most usable Mac/Linux commandline app for managing your network connection. Important to note: it changes your **entire** machine's network interface. Also, **`@sitespeed.io/throttle` requires `sudo`** (as all packet-level shapers do).

**Windows?** As of today, there is no single cross-platform tool for throttling. But there are two recommended **Windows 7** network shaping utilities: [WinShaper](https://calendar.perfplanet.com/2016/testing-with-realistic-networking-conditions/#introducing_winshaper) and [Clumsy](http://jagt.github.io/clumsy/).

For **Windows 10** [NetLimiter](https://www.netlimiter.com/buy/nl4lite/standard-license/1/0) (Paid option) and [TMeter](http://www.tmeter.ru/en/) (Freeware Edition) are the most usable solutions.

### `@sitespeed.io/throttle` set up

```sh
# Install with npm
npm install @sitespeed.io/throttle -g
# Ensure you have Node.js installed and npm is in your $PATH (https://nodejs.org/en/download/)

# To use the recommended throttling values:
throttle --up 768 --down 1638 --rtt 150

# or even simpler (using a predefined profile)
throttle 3gfast

# To disable throttling
throttle --stop
```

For more information and a complete list of features visit the documentation on [sitespeed.io website](https://www.sitespeed.io/documentation/throttle/).

### Using Lighthouse with `@sitespeed.io/throttle`

```sh
npm install @sitespeed.io/throttle -g

# Enable system traffic throttling
throttle 3gfast

# Run Lighthouse with its own network throttling disabled (while leaving CPU throttling)
lighthouse --throttling-method=devtools \
  --throttling.requestLatencyMs=0 \
  --throttling.downloadThroughputKbps=0 \
  --throttling.uploadThroughputKbps=0 \
  https://example.com

# Disable the traffic throttling once you see "Gathering trace"
throttle --stop
```

# CPU Throttling

Lighthouse applies CPU throttling to emulate a mid-tier mobile device even when run on far more powerful desktop hardware.

## Benchmarking CPU Power

Unlike network throttling where objective criteria like RTT and throughput allow targeting of a specific environment, CPU throttling is expressed relative to the performance of the host device. This poses challenges to [variability in results across devices](./variability.md), so it's important to calibrate your device before attempting to compare different reports.

Lighthouse computes and saves a `benchmarkIndex` as a rough approximation of the host device's CPU performance with every report. You can find this value under the title "CPU/Memory Power" at the bottom of the Lighthouse report:

<img src="https://user-images.githubusercontent.com/2301202/96950078-1b03d380-14af-11eb-9583-fbf8133315b2.png" alt="Screenshot of CPU/Memory Power in Lighthouse report" width=600 border=1 />

**NOTE:** In Lighthouse 6.3 BenchmarkIndex changed its definition to better align with changes in Chrome 86. Benchmark index values prior to 6.3 and Chrome 86 may differ.

Below is a table of various device classes and their approximate ranges of `benchmarkIndex` as of Chrome m86 along with a few other benchmarks. The amount of variation in each class is quite high. Even the same device can be purchased with multiple different processors and memory options.

| -                                   | High-End Desktop | Low-End Desktop | High-End Mobile | Mid-Tier Mobile | Low-End Mobile    |
| ----------------------------------- | ---------------- | --------------- | --------------- | --------------- | ----------------- |
| Example Device                      | 16" Macbook Pro  | Intel NUC i3    | Samsung S10     | Moto G4         | Samsung Galaxy J2 |
| **Lighthouse BenchmarkIndex**           | 1500-2000        | 1000-1500       | 800-1200        | 125-800         | <125              |
| Octane 2.0                          | 30000-45000      | 20000-35000     | 15000-25000     | 2000-20000      | <2000             |
| Speedometer 2.0                     | 90-200           | 50-90           | 20-50           | 10-20           | <10               |
| JavaScript Execution of a News Site | 2-4s             | 4-8s            | 4-8s            | 8-20s           | 20-40s            |


## Calibrating the CPU slowdown

By default, Lighthouse uses **a constant 4x CPU multiplier** which moves a typical run in the high-end desktop bracket somewhere into the mid-tier mobile bracket.

You may choose to calibrate if your benchmarkIndex is in a different range than the above table would expect. Additionally, when Lighthouse is run from the CLI with default settings on an underpowered device, a warning will be added to the report suggesting you calibrate the slowdown:

![image](https://user-images.githubusercontent.com/39191/101437249-99cc9880-38c4-11eb-8122-76f2c73d9283.png)

The `--throttling.cpuSlowdownMultiplier` CLI flag allows you to configure the throttling level applied. On a weaker machine, you can lower it from the default of 4x  to something more appropriate.

The [Lighthouse CPU slowdown calculator webapp](https://lighthouse-cpu-throttling-calculator.vercel.app/) will compute what multiplier to use from the  `CPU/Memory Power` value from the bottom of the report.

<a href="https://lighthouse-cpu-throttling-calculator.vercel.app/">
<img src="https://user-images.githubusercontent.com/39191/101436708-8a991b00-38c3-11eb-89c5-7d43752932e9.png" width=300>
</a>

Alternatively, consider the below table of the various `cpuSlowdownMultiplier`s you might want to use to target different devices along with the possible range:

| -                | High-End Desktop | Low-End Desktop | High-End Mobile | Mid-Tier Mobile | Low-End Mobile |
| ---------------- | ---------------- | --------------- | --------------- | --------------- | -------------- |
| High-End Desktop | 1x               | 2x (1-4)        | 2x (1-4)        | 4x (2-10)       | 10x (5-20)     |
| Low-End Desktop  | -                | 1x              | 1x              | 2x (1-5)        | 5x (3-10)      |
| High-End Mobile  | -                | -               | 1x              | 2x (1-5)        | 5x (3-10)      |
| Mid-Tier Mobile  | -                | -               | -               | 1x              | 2x (1-5)       |
| Low-End Mobile   | -                | -               | -               | -               | 1x             |


If your device's BenchmarkIndex falls on the _higher_ end of its bracket, use a _higher_ multiplier from the range in the table. If your device's BenchmarkIndex falls on the _lower_ end of its bracket, use a _lower_ multiplier from the range in the table. If it's somewhere in the middle, use the suggested multiplier.

```bash
# Run Lighthouse with a custom CPU slowdown multiplier
lighthouse --throttling.cpuSlowdownMultiplier=6 https://example.com
```

## Types of CPU Throttling

Within web performance testing, there are two typical styles of CPU throttling:

1. **_Simulated throttling_**, which Lighthouse uses by **default**, uses a simulation of a page load, based on the data observed in the initial unthrottled load. This approach makes it very fast. However, due to the imperfect nature of predicting alternate execution paths, there is inherent inaccuracy that is summarized in this doc: [Lighthouse Metric Variability and Accuracy](https://docs.google.com/document/d/1BqtL-nG53rxWOI5RO0pItSRPowZVnYJ_gBEQCJ5EeUE/edit). The TLDR: while it's fairly accurate for most circumstances, it suffers from edge cases and a deep investigation to performance should use _DevTools_ CPU throttling tools.
1. **_DevTools throttling_** , also called _`devtools` throttling_ in Lighthouse configuration. This method actually interrupts execution of CPU work at periodic intervals to emulate a slower processor. It is [fairly accurate](https://docs.google.com/document/d/1jGHeGjjjzfTAE2WHXipKF3aqwF2bFA6r0B877nFtBpc/edit) and much easier than obtaining target hardware. The same underlying principle can be used by [linux cgroups](https://www.kernel.org/doc/html/latest/scheduler/sched-bwc.html) to throttle any process, not just the browser. Other tools like [WebPageTest use CPU throttling](https://github.com/WPO-Foundation/wptagent/commit/f7fe0d6b5b01bd1b042a1fe3144c68a6bff846a6) offered by DevTools.
