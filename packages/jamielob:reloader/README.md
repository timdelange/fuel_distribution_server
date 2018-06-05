# Reloader

More control over hot code push reloading for your mobile apps. A replacement for [`mdg:reload-on-resume`](https://github.com/meteor/mobile-packages/blob/master/packages/mdg:reload-on-resume/README.md) with more options and better UX.

As of Meteor 1.3, if you prevent instant reloading on updates, the newest version of the code will be used on your app's next cold start - no reload necessary. This can be achieved with `Reloader.configure({check: false, refresh: 'start'})`. However, you can also:
- Reload on resume, to update to the newest version of the code when the app is returned from the background: see [`refresh`](#refresh) (the launch screen is put back up during such reloads to hide the white screen you get with `mdg:reload-on-resume`)
- On start or resume, leave the launch screen up and wait to see whether there is an update available: see [`check`](#check), [`checkTimer`](#checktimer), and [`idleCutoff`](#idlecutoff)
- Delay removal of the launch screen, to hide the white screen that appears at the beginning of a reload: see [`launchScreenDelay`](#launchscreendelay)

### Contents

- [Configure](#configure)
  - [check](#check)
  - [checkTimer](#checktimer)
  - [refresh](#refresh)
  - [idleCutoff](#idlecutoff)
  - [launchScreenDelay](#launchscreendelay)
- [Helpers](#helpers)
  - [Reloader.updateAvailable.get()](#reloaderupdateavailableget)
  - [{{updateAvailable}}](#updateavailable)
  - [Reloader.reload()](#reloaderreload)
  - [reloader-update](#reloader-update)
- [Development](#development)
  - [Run tests](#run-tests)
  - [Credits](#credits)

### Installation

```sh
meteor add jamielob:reloader
meteor remove mdg:reload-on-resume
```

If you have any calls to `location.reload()` or `location.replace(location.href)` in your app, replace them with `Reloader.reload()`.

## Configure

The default options are shown below. You can override them anywhere in your `client/` folder.

```js
Reloader.configure({
  check: 'everyStart', // Check for new code every time the app starts
  checkTimer: 3000,  // Wait 3 seconds to see if new code is available
  refresh: 'startAndResume', // Refresh to already downloaded code on both start and resume
  idleCutoff: 1000 * 60 * 10  // Wait 10 minutes before treating a resume as a start
});
```

These default options will make sure that your app is up to date every time a user starts your app, or comes back to it after 10 minutes of being idle.

Another popular configuration is:

```js
Reloader.configure({
  check: 'firstStart', // Only make an additonal check the first time the app ever starts
  checkTimer: 5000,  // Wait 5 seconds to see if new code is available on first start
  refresh: 'start' // Only refresh to already downloaded code on a start and not a resume
});
```

This will make sure the first time your app is run it is up to date, will download new versions of code while the app is being used, and then only update when the app is next started.

You can have a different configuration for development, for instance:

```js
if (Meteor.isDevelopment) {
  Reloader.configure({
    check: false, // don't check on startup
    refresh: 'instantly' // refresh as soon as updates are available
  });
} else {
  Reloader.configure({
    // production configuration
  });
}
```

### check

When to make additional checks for new code bundles. The app splash screen is shown during the check. Possible values are:

- `everyStart` (default): Check every time the app starts.  Does not include resuming the app, unless the `idleCutOff` has been reached.
- `firstStart`: Check only the first time the app starts (just after downloading it).
- `false`: Never make additional checks and rely purely on code bundles being downlaoded in the background while the app is being used.

### checkTimer

Default: `3000`

How long to wait (in ms) when making additional checks for new file bundles. In future versions of Meteor we will have an API to instantly check if an update is available or not, but until then we need to simply wait to see if a new code bundle is downloaded. Depending on the size of your app bundle and the phone's connection speed, the default three seconds may not be enough - you can increase it if you find that you have new code immediately after starting the app.

### refresh

When to refresh to the latest code bundle if one finished downloading after the end of the `check` period. The app splash screen is shown during the refresh. Possible values are:

- `startAndResume` (default): Refresh to the latest bundle both when starting and resuming the app.
- `start`: Refresh only when the app is started (not resumed).
- `instantly`: Overrides everything else.  If set, your app will have similar behaviour to the default in Meteor, with code updates being refreshed immeidately. The only improvement/difference is that the app's splash screen is displayed during the refresh.

### idleCutoff

Default: `1000 * 60 * 10 // 10 minutes`

How long (in ms) can an app be idle before we consider it a start and not a resume. Applies only when `check: 'everyStart'`. Set to `0` to never check on resume.

### launchScreenDelay

**Planned option for future version. Currently not configurable.**

Default: `100`

How long to wait (in ms) after reload before hiding the launch screen. The goal is to leave it up until your page has finished rendering, so the user does not see a blank white screen. The duration will vary based on your app's render time and the speed of the device. To be more precise, set `launchScreenDelay` to 0 and release the launch screen yourself when the page has rendered. For example, if the only two pages that might be displayed on reload are `index` and `post`, then you would do:

```javascript
launchScreenHandle = Launchscreen.hold()

Template.index.onRendered(() => {
  launchScreenHandle.release()
});

Template.post.onRendered(() => {
  launchScreenHandle.release()
});
```

Or if you have a layout template, you could put a single `.release()` in that template's `onRendered`.

## Helpers

These helpers can help you to have an "Update Now" button.

### A note about using these helpers
Some people have reported having their app rejected during the Apple review process for having an "Update Now" button or similar as opposed to using the refresh on resume behavior that this package provides by default.  If you really want to have an update button when new code is available, make sure you don't push any new code to the server until after your app has been approved. But it's probably safer/better to simply not have an update button at all!

### How to use them anyway

#### Reloader.updateAvailable.get()

`Reloader.updateAvailable` is a reactive variable that returns true when an update has been downloaded.

```js
Reloader.updateAvailable.get(); // Reactively returns true if an update is ready
```

#### {{updateAvailable}}

This package provides a Blaze template helper that retrieves the value of the reactiveVar easily.

```html
{{#if updateAvailable}}
  	<p>Update available!</p>
{{/if}}
```

#### Reloader.reload()

Call `Reloader.reload()` to refresh the page.

#### reloader-update

This package also provides an easy reload event that you can attach to a button that will briefly show the splash screen and update to the latest version. Simply add the `reloader-update` attribute to a button.

```html
{{#if updateAvailable}}
	<a class="button" reloader-update>Tap here to update!</a>
{{/if}}
```

## Development

### Run tests

```bash
git clone git@github.com:jamielob/reloader.git
cd reloader
# uncomment the noted line in package.js
meteor test-packages ./ --driver-package practicalmeteor:mocha
open localhost:3000
```

### Credits

[Contributors](https://github.com/jamielob/reloader/graphs/contributors)

And thanks to @martijnwalraven for his help with this packages and superb work on Meteor Cordova! 👏
