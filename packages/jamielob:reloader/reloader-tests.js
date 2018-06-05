// NOTE: I think our Reload._onMigrate messes with test app reloading?
// See "Cannot read property '0' of undefined" in browser console
// after editing the code
//
// In order to get test output to update, you may need to
// click the "refresh" header

import { _ } from 'meteor/underscore';

// http://chaijs.com/api/assert/
import { assert } from 'meteor/practicalmeteor:chai';

// http://sinonjs.org/
import sinon from 'sinon'

describe('refresh', function() {

  beforeEach(function() {
    Reloader.reload = sinon.spy(); //
  });

  describe('startAndResume', function() {

    before(function() {
      Reloader.configure({
        refresh: 'startAndResume'
      })
    });

    it('reloads on resume when update is available', function() {
      Reloader.updateAvailable.set(true);

      Reloader._onResume();
      assert.isTrue(Reloader.reload.called);
    });

    it("doesn't reload on resume when update isn't available", function() {
      Reloader.updateAvailable.set(false);

      Reloader._onResume();
      
      assert.isFalse(Reloader.reload.called);
    });

  })

  describe('start', function() {

    before(function() {
      Reloader.configure({
        refresh: 'start'
      })
    });

    it("doesn't reload on resume when update is available", function() {
      Reloader.updateAvailable.set(true);

      Reloader._onResume();
      
      assert.isFalse(Reloader.reload.called);
    });

  });
})

describe('check', function() {
  // should call / not call _checkForUpdate
})

