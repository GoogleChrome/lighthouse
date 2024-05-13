# Running Lighthouse using headless Chrome

## CLI (headless)

Setup:

```sh
# Lighthouse requires Node 18 LTS (18.x) or later.
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash - &&\
sudo apt-get install -y nodejs npm

# get chromium (stable)
apt-get install chromium

# install lighthouse
npm i -g lighthouse
```

Kick off run of Lighthouse using headless Chrome:

```sh
lighthouse --chrome-flags="--headless" https://github.com
```

## (CLI headless=new)

There is also the new `--headless=new` option, which includes functionality that
was explicitly omitted from the original headless browser.

## CLI (xvfb)

Alternatively, you can run full Chrome + xvfb instead of headless mode. These steps worked on Debian Jessie:

```sh
# get node 18
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# get chromium (stable) and Xvfb
apt-get install chromium-browser xvfb

# install lighthouse
npm i -g lighthouse
```

Run it:

```sh
export DISPLAY=:1.5
TMP_PROFILE_DIR=$(mktemp -d -t lighthouse.XXXXXXXXXX)

# start up chromium inside xvfb
xvfb-run --server-args='-screen 0, 1024x768x16' \
    chromium-browser --user-data-dir=$TMP_PROFILE_DIR \
    --start-maximized \
    --no-first-run \
    --remote-debugging-port=9222 "about:blank"

# Kick off Lighthouse run on same port as debugging port.
lighthouse --port=9222 https://github.com
```

## Posting Lighthouse reports to GitHub Gists

Be sure to replace `${GITHUB_OWNER}` and `${GITHUB_TOKEN}` with your own credentials. The code below is tested on Ubuntu.

```sh
apt-get install -y nodejs npm chromium jq
npm install -g lighthouse

# Run lighthouse as JSON, pipe it to jq to wrangle and send it to GitHub Gist via curl
# so Lighthouse Viewer can grab it.
lighthouse "http://localhost" --chrome-flags="--no-sandbox --headless" \
  --output json \
| jq -r "{ description: \"YOUR TITLE HERE\", public: \"false\", files: {\"$(date "+%Y%m%d").lighthouse.report.json\": {content: (. | tostring) }}}" \
| curl -sS -X POST -H 'Content-Type: application/json' \
    -u ${GITHUB_OWNER}:${GITHUB_TOKEN} \
    -d @- https://api.github.com/gists > results.gist

# Let's be nice and add the Lighthouse Viewer link in the Gist description.
GID=$(cat results.gist | jq -r '.id') && \
curl -sS -X POST -H 'Content-Type: application/json' \
  -u ${GITHUB_OWNER}:${GITHUB_TOKEN} \
  -d "{ \"description\": \"YOUR TITLE HERE - Lighthouse: https://googlechrome.github.io/lighthouse/viewer/?gist=${GID}\" }" "https://api.github.com/gists/${GID}" > updated.gist
```

## Node module

Install:

```sh
yarn add lighthouse
```

Run it:

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

function launchChromeAndRunLighthouse(url, flags = {}, config = null) {
  return chromeLauncher.launch(flags).then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results => {
      chrome.kill();
      return results;
    }
  });
}

const flags = {
  chromeFlags: ['--headless']
};

launchChromeAndRunLighthouse('https://github.com', flags).then(results => {
  // Use results!
});
```

## Other resources

Other resources you might find helpful:

- [Getting Started with Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome)
- Example [Dockerfile](https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/recipes/docker-client/Dockerfile)
- Lighthouse's GitHub Actions [`.ci.yml`](https://github.com/GoogleChrome/lighthouse/blob/main/.github/workflows/ci.yml)
