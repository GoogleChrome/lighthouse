
## The mobile network throttling preset

This is the standard recommendation for mobile throttling:

- Latency: 150ms
- Throughput: 1.6Mbps down / 750 Kbps up.
- Packet loss: none.

These exact figures are used as [Lighthouse's throttling default](https://github.com/GoogleChrome/lighthouse/blob/8f500e00243e07ef0a80b39334bedcc8ddc8d3d0/lighthouse-core/config/constants.js#L19-L26) and represent roughly the bottom 25% of 4G connections and top 25% of 3G connections (In Lighthouse it is sometimes called "Slow 4G" used to be labeled as "Fast 3G"). This preset is identical to the [WebPageTest's "Mobile 3G - Fast"](https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/connectivity.ini.sample) and, due to a lower latency, slightly faster for some pages than the [WebPageTest "4G" preset](https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/connectivity.ini.sample).

## Types of throttling

Within web performance testing, there are four typical styles of throttling:

1. **_Simulated throttling_**, which Lighthouse uses by **default**, uses a simulation of a page load, based on the data observed in the initial unthrottled load. This approach which makes it both very fast and deterministic. However, due to the imperfect nature of predicting alternate execution paths, there is inherent inaccuracy that is summarized in this doc: [Lighthouse Metric Variability and Accuracy](https://docs.google.com/document/d/1BqtL-nG53rxWOI5RO0pItSRPowZVnYJ_gBEQCJ5EeUE/edit). The TLDR: while it's roughly as accurate or better than DevTools throttling for most sites, it suffers from edge cases and a deep investigation to performance should use _Packet-level_ throttling tools.
1. **_Request-level throttling_** , also referred to as **_Applied throttling_** in the Audits panel or _`devtools` throttling_ in Lighthouse configuration, is how throttling is implemented with Chrome DevTools. In real mobile connectivity, latency affects things at the packet level rather than the request level. As a result, this throttling isn't highly accurate. It also has a few more downsides that are summarized in [Network Throttling & Chrome - status](https://docs.google.com/document/d/1TwWLaLAfnBfbk5_ZzpGXegPapCIfyzT4MWuZgspKUAQ/edit). The TLDR: while it's a [decent approximation](https://docs.google.com/document/d/10lfVdS1iDWCRKQXPfbxEn4Or99D64mvNlugP1AQuFlE/edit), it's not a sufficient model of a slow connection. The [multipliers used in Lighthouse](https://github.com/GoogleChrome/lighthouse/blob/3be483287a530fb560c843b7299ef9cfe91ce1cc/lighthouse-core/lib/emulation.js#L33-L39) attempt to correct for the differences.
1. **_Proxy-level_** throttling tools do not affect UDP data, so they're decent, but not ideal.
1. **_Packet-level_** throttling tools are able to make the most accurate network simulation. While this approach can model real network conditions most effectively, it also can introduce [more variance](https://docs.google.com/document/d/1BqtL-nG53rxWOI5RO0pItSRPowZVnYJ_gBEQCJ5EeUE/edit) than request-level or simulated throttling. [WebPageTest uses](https://github.com/WPO-Foundation/wptagent/blob/master/docs/remote_trafficshaping.md) packet-level throttling.

Lighthouse, by default, uses simulated throttling as it provides both quick evaluation and minimized variance. However, some may want to experiment with more accurate throttling... [Learn more about these throttling types and how they behave in in different scenarios](https://www.debugbear.com/blog/network-throttling-methods).

## DevTools' Audits Panel Throttling

In Chrome 79 and earlier, you could choose between [the throttling types](#types-of-throttling) of Simulated, Applied, and none.

Starting with Chrome 80, the Audits panel is simplifying the throttling configuration:

1. _Simulated throttling_ remains the default setting. This matches the setup of PageSpeed Insights and the Lighthouse CLI default, so this provides cross-tool consistency.
1. _No throttling_ is removed as it leads to innacurate scoring and misleading metric results.
1. Within the Audits panel settings, you can uncheck the _Simulated throttling_ checkbox to use _Applied throttling_. For the moment, we are keeping this _Applied throttling_ option available for users of the [`View Trace` button](https://developers.google.com/web/updates/2018/04/devtools#traces). Under applied throttling, the trace matches the metrics values, whereas under Simulated things do not currently match up.

We plan to improve the experience of viewing a trace under simulated throttling. At that point, the _Applied throttling_ option will be removed and _Simulated throttling_ will be the only option within the DevTools Audits panel. Of course, CLI users can still control the exact [configuration](../#cli-options) of throttling.

## How do I get packet-level throttling?

This Performance Calendar article, [Testing with Realistic Networking Conditions](https://calendar.perfplanet.com/2016/testing-with-realistic-networking-conditions/), has a good explanation of packet-level traffic shaping (which applies across TCP/UDP/ICMP) and recommendations.

The `comcast` Go package appears to be the most usable Mac/Linux commandline app for managing your network connection. Important to note: it changes your **entire** machine's network interface. Also, **`comcast` requires `sudo`** (as all packet-level shapers do).

**Windows?** As of today, there is no single cross-platform tool for throttling. But there are two recommended Windows-specific network shaping utilities: [WinShaper](https://calendar.perfplanet.com/2016/testing-with-realistic-networking-conditions/#introducing_winshaper) and [Clumsy](http://jagt.github.io/clumsy/).

### `comcast` set up

```sh
# Install with go
go get github.com/tylertreat/comcast
# Ensure your $GOPATH/bin is in your $PATH (https://github.com/golang/go/wiki/GOPATH)

# To use the recommended throttling values:
comcast --latency=150 --target-bw=1638 --dry-run

# To disable throttling
# comcast --stop
```

Currently, `comcast` will also throttle the websocket port that Lighthouse uses to connect to Chrome. This isn't a big problem but mostly means that receiving the trace from the browser takes significantly more time. Also, `comcast` [doesn't support](https://github.com/tylertreat/comcast/issues/17) a separate uplink throughput.

### Using Lighthouse with `comcast`

```sh
# Enable system traffic throttling
comcast --latency=150 --target-bw=1638

# Run Lighthouse with its own throttling disabled
lighthouse --throttling.requestLatencyMs=0 --throttling.downloadThroughputKbps=0 --throttling.uploadThroughputKbps=0 # ...

# Disable the traffic throttling once you see "Gathering trace"
comcast --stop
```
