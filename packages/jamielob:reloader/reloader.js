const launchScreen = LaunchScreen.hold();

Reloader = {

  _options: {},

  configure(options) {
    check(options, {
      check: Match.Optional(Match.OneOf('everyStart', 'firstStart', false)),
      checkTimer: Match.Optional(Match.Integer),
      refresh: Match.Optional(Match.OneOf('startAndResume', 'start', 'instantly')),
      idleCutoff: Match.Optional(Match.Integer),
      launchScreenDelay: Match.Optional(Match.Integer),
    });

    _.extend(this._options, options);
  },

  updateAvailable: new ReactiveVar(false),

  prereload() {
    // Show the splashscreen
    navigator.splashscreen.show();

    // Set the refresh flag
    localStorage.setItem('reloaderWasRefreshed', Date.now());
  },

  reload() {
    this.prereload()

    // We'd like to make the browser reload the page using location.replace()
    // instead of location.reload(), because this avoids validating assets
    // with the server if we still have a valid cached copy. This doesn't work
    // when the location contains a hash however, because that wouldn't reload
    // the page and just scroll to the hash location instead.
    if (window.location.hash || window.location.href.endsWith("#")) {
      window.location.reload();
    } else {
      window.location.replace(window.location.href);
    }
  },


  // Should check if a cold start and (either everyStart is set OR firstStart
  // is set and it's our first start)
  _shouldCheckForUpdateOnStart() {
    const isColdStart = !localStorage.getItem('reloaderWasRefreshed');
    return isColdStart &&
    (
      this._options.check === 'everyStart' ||
      (
        this._options.check === 'firstStart' &&
        !localStorage.getItem('reloaderLastStart')
      )
    );
  },

  // Check if the idleCutoff is set AND we exceeded the idleCutOff limit AND the everyStart check is set
  _shouldCheckForUpdateOnResume() {
    // In case a pause event was missed, assume it didn't make the cutoff
    if (!localStorage.getItem('reloaderLastPause')) {
      return false;
    }

    // Grab the last time we paused
    const lastPause = Number(localStorage.getItem('reloaderLastPause'));

    // Calculate the cutoff timestamp
    const idleCutoffAt = Number( Date.now() - this._options.idleCutoff );

    return (
      this._options.idleCutoff &&
      lastPause < idleCutoffAt &&
      this._options.check === 'everyStart'
    );
  },

  _waitForUpdate(computation) {
    // Check if we have a HCP after the check timer is up
    Meteor.setTimeout(() => {

      // If there is a new version available
      if (this.updateAvailable.get()) {

        this.reload();

      } else {

        // Stop waiting for update
        if (computation) {
          computation.stop()
        }

        launchScreen.release();
        navigator.splashscreen.hide();

      }

    }, this._options.checkTimer );
  },

  _checkForUpdate() {
    if (this.updateAvailable.get()) {

      // Check for an even newer update
      this._waitForUpdate()

    } else {

      // Wait until update is available, or give up on timeout
      Tracker.autorun((c) => {

        if (this.updateAvailable.get()) {
          this.reload();
        }

        this._waitForUpdate(c)

      });

    }
  },

  _onPageLoad() {
    if (this._shouldCheckForUpdateOnStart()) {

      this._checkForUpdate();

    } else {

      Meteor.setTimeout(function() {

        launchScreen.release();

        // Reset the reloaderWasRefreshed flag
        localStorage.removeItem('reloaderWasRefreshed');

      }, this._options.launchScreenDelay); // Short delay helps with white flash

    }
  },

  _onResume() {
    const shouldCheck = this._shouldCheckForUpdateOnResume();

    localStorage.removeItem('reloaderLastPause');

    if (shouldCheck) {

      navigator.splashscreen.show();

      this._checkForUpdate();

      // If we don't need to do an additional check
    } else {

      // Check if there's a new version available already AND we need to refresh on resume
      if ( this.updateAvailable.get() && this._options.refresh === 'startAndResume' ) {

        this.reload();

      }

    }
  },

  // https://github.com/meteor/meteor/blob/devel/packages/reload/reload.js#L104-L122
  _onMigrate(retry) {
    if (this._options.refresh === 'instantly') {

      this.prereload()

      return [true, {}];

    } else {

      // Set the flag
      this.updateAvailable.set(true);

      // Don't refresh yet
      return [false];

    }
  }

};

// Set the defaults
Reloader.configure({
  check: 'everyStart',
  checkTimer: 3000,
  refresh: 'startAndResume',
  idleCutoff: 1000 * 60 * 10, // 10 minutes
  launchScreenDelay: 100
});


Reloader._onPageLoad();

// Set the last start flag
localStorage.setItem('reloaderLastStart', Date.now());

// Watch for the app resuming
document.addEventListener("resume", function () {
  Reloader._onResume();
}, false);


localStorage.removeItem('reloaderLastPause');

// Watch for the device pausing
document.addEventListener("pause", function() {
  // Save to localStorage
  localStorage.setItem('reloaderLastPause', Date.now());
}, false);


// Capture the reload
Reload._onMigrate('jamielob:reloader', function (retry) {
  return Reloader._onMigrate(retry);
});


// Update available template helper
Template.registerHelper("updateAvailable", function() {
  return Reloader.updateAvailable.get();
});

// Update available event
$(document).on('click', '[reloader-update]', function(event) {
  Reloader.reload();
});
