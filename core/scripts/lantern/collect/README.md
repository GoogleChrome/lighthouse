# Lantern Collect Traces

Collects many traces using a local machine and mobile devices via WPT.

There are 9 runs for each URL in the big zip. The golden zip contains just the median runs (by performance score), along with a dump of the `metrics` collected by Lighthouse.

[Download all](https://drive.google.com/open?id=17WsQ3CU0R1072sezXw5Np2knV_NvGAfO) traces (3.2GB zipped, 19GB unzipped).
[Download golden](https://drive.google.com/open?id=1aQp-oqX7jeFq9RFwNik6gkEZ0FLtjlHp) traces (363MB zipped, 2.1GB unzipped).

Note: Only 45/80 of the URLs in `./urls.js` have been processed.

## Get a WPT key

This is how you get a regular key:

http://www.webpagetest.org/getkey.php -> "Login with Google" -> fill form. Key will be emailed to you.

But you'll really need a privileged key to run the collection in a reasonable amount of time.

Note: to actually run this, you want a better key than the default. Ask @connorjclark for it.

## Lighthouse Version

Check what version of Lighthouse WPT is using. You should use the same version of lighthouse for the desktop collection.

## Verify URLs

```sh
node --input-type=module -e "import urls from './urls.js'; console.log(urls.join('\n'))" |\
  xargs -P 10 -I{} curl -A 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3694.0 Mobile Safari/537.36 Chrome-Lighthouse' -o /dev/null -s --write-out '%{http_code} {} (if redirect: %{redirect_url})\n' {} |\
  sort
```

Note: some good URLs will 4xx b/c the site blocks such usages of `curl`.

## Run

```sh
DEBUG=1 WPT_KEY=... node --max-old-space-size=4096 collect.js
```

Output will be in `dist/collect-lantern-traces`, and zipped at `dist/collect-lantern-traces.zip`.

Update the zip on Google Drive and `download-traces.sh`.


## Run in GCP

```sh
WPT_KEY=... core/scripts/lantern/collect/gcp-create-and-run.sh
```
