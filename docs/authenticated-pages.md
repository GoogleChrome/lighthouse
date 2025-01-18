# Running Lighthouse on Authenticated Pages

Default runs of Lighthouse load a page as a "new user", with no previous session or storage data. This means that pages requiring authenticated access do not work without additional setup. You have a few options for running Lighthouse on pages behind a login:

## Option 1: Script the login with Puppeteer

[Puppeteer](https://pptr.dev) is the most flexible approach for running Lighthouse on pages requiring authentication.

See [a working demo at /docs/recipes/auth](./recipes/auth).

View our full documentation for using [Lighthouse along with Puppeteer](https://github.com/GoogleChrome/lighthouse/blob/main/docs/puppeteer.md).

## Option 2: Leverage logged-in state with Chrome DevTools

The Lighthouse panel in Chrome DevTools will never clear your cookies, so you can log in to the target site and then run Lighthouse. If `localStorage` or `indexedDB` is important for your authentication purposes, be sure to uncheck `Clear storage`.

## Option 3: Pass custom request headers with Lighthouse CLI

CLI:
```sh
lighthouse http://www.example.com --view --extra-headers="{\"Authorization\":\"...\"}"
```

Node:
```js
const result = await lighthouse('http://www.example.com', {
  extraHeaders: {
    Authorization: '...',
  },
});
```

You could also set the `Cookie` header, but beware: it will [override any other Cookies you expect to be there](https://github.com/GoogleChrome/lighthouse/pull/9170). For a more flexible cookie-based approach, use [puppeteer (Option 1)](./recipes/auth/README.md) instead.

## Option 4: Open a debug instance of Chrome and manually log in

1. Globally install lighthouse: `npm i -g lighthouse` or `yarn global add lighthouse`. `chrome-debug` is now in your PATH. This binary launches a standalone Chrome instance with an open debugging port.
1. Run chrome-debug. This logs the debugging port of your Chrome instance.
1. Navigate to your site and log in.
1. In a separate terminal, run `lighthouse http://mysite.com --disable-storage-reset --port port-number`, using the port number from chrome-debug.

## Option 5: Reuse a prepared Chrome User Profile

This option is currently under development. Track or join the discussion here: [#8957](https://github.com/GoogleChrome/lighthouse/issues/8957).
