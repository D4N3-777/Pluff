import moment from 'moment';
import authenticatePartial from 'partials/dialog-authenticate.html';
import parseQueryString from 'satellizer';

export default function ($http, $auth, $q, ngDialog) {
  // When requesting an URL without user interaction, a dialog should be shown
  // to prevent the browser from blocking the popup.
  let isFirstAuthAttempt = true;

  function isAuthenticated() {
    if ($auth.isAuthenticated()) {
      // Now check if the token is not expired yet.
      // TODO: Maybe we can use Satellizer's built-in shit for this.
      //       For this to work, we need to mimic the JWT standard.
      const expires = localStorage.getItem('satellizer_expires');
      const isStillValid = expires >= moment().format('X');

      if (!isStillValid) {
        console.log('Token is no longer valid, removing...');
        localStorage.removeItem('satellizer_expires');
        $auth.removeToken();
      } else {
        console.log('Token is valid, continuing!');
      }

      return isStillValid;
    }
    return false;
  }

  function setExpires(expiresIn) {
    // The token is only valid for x seconds, so save this.
    if (expiresIn) {
      const expires = moment().add(expiresIn, 's').format('X');
      console.log('Setting token as expired after;', expires);
      localStorage.setItem('satellizer_expires', expires);
    }
  }

  // Popup a authentication popup from FHICT where the user can login.
  function showAuthPopup(dialogId) {
    const authPromise = $auth.authenticate('fhict').then((response) => {
      $auth.setToken(response.access_token);
      setExpires(response.expires_in);

      if (dialogId) ngDialog.close(dialogId, authPromise);
    }, (data) => {
      // TODO: Create a nice dialog explaining that something weird went wrong.
      // Don't know yet when this would occur.
      console.error('FHICT authentication went wrong.', data);
    });

    return authPromise;
  }

  function authenticate() {
    // If coming from the authentication server, parse and save the hash.
    // This allows one to direct link to the FHICT auth URL.
    // It shouldn't happen if the window is in a popup.
    if (location.hash.startsWith('#access_token') && !window.opener) {
      const hashParams = location.hash.substring(1).replace(/\/$/, '');
      const hash = parseQueryString(hashParams);
      console.log('Trying to use given hash to set access token', hash);

      $auth.setToken(hash.access_token);
      setExpires(hash.expires_in);
      // Cleanup after yourself.
      location.hash = '';
    }

    if (!isAuthenticated()) {
      if (isFirstAuthAttempt) {
        isFirstAuthAttempt = false;
        // Show dialog about why the user must authenticate.
        // TODO: Prevent that multiple dialogs are opened.
        const dialog = ngDialog.open({
          name: 'auth',
          template: authenticatePartial,
          plain: true,
          // User shouldn't be able to ignore this dialog.
          showClose: false,
          closeByEscape: false,
          closeByDocument: false,
          data: { showAuthPopup },
        });

        // Forward the authPromise.
        return dialog.closePromise.then((closedDialog) => closedDialog.value);
      }
      // The user is already in the app, so show him the auth directly.
      return showAuthPopup();
    }

    // Create a fake promise if already authenticated.
    // TODO: Hm, there must be a better solution...
    const deferred = $q.defer();
    deferred.resolve();
    return deferred.promise;
  }

  function get(url, options) {
    // Authenticate before trying to load the url.
    return authenticate().then(() =>
      $http(angular.extend({
        url: `https://api.fhict.nl${url}`,
        method: 'GET',
        responseType: 'json',
      }, options))
    );
  }

  return {
    getSuggestions(kind, query, timeoutPromise) {
      return get(`/schedule/autocomplete/${kind}`, {
        params: {
          filter: query,
        },
        timeout: timeoutPromise,
      });
    },
    getTimeTable(input, start) {
      return get(`/schedule${input}`, {
        params: {
          expandTeacher: true,
          expandWeeks: true,
          start: start.format('YYYY-MM-DD'),
          days: 6,
        },
      });
    },
    getTeacher(teacher) {
      return get(`/people/abbreviation/${teacher}`);
    },
    getHolidays() {
      return get('/schedule/holidays');
    },
    getRoomOccupancy(date) {
      return get(`/rooms/occupancy/${date}`);
    },
    getPicture(id) {
      return get(`/pictures/${id}.jpg`, {
        responseType: 'blob',
      });
    },
    // API URL encoding
    encode(url) {
      return encodeURIComponent(url);
    },
  };
}
