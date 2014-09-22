'use strict';

/* Services */

angular.module('pluffApp.services', [])
  .factory('hourService', function() {
    var hour = {};

    hour.getHour = function($scope, dayNumber, hourNumber) {
      // dayNumber can be 1 to 5 (day of the week)
      // hourNumber can be 1 to 14

      // Allow multiple lessons in one hour
      var hourCallback = [];

      // Filter all subjects in this array
      var filterSubjects = ['delta'];

      // Get the complete date from the daynumber and current weeknumber
      var currentDay = $scope.currentDayDate(dayNumber);

      // Get the exponent of the hourNumber (current hour) (^2 - 1)
      // Equalize the current hour with the mask
      var hourExp = Math.pow(2, hourNumber - 1);

      // Wait until the JSON is fully loaded
      if ($scope.tableData != false) {
        // TODO: Optimize for performance
        $scope.tableData.forEach(function(lesson) {
          // Check if the lesson is on the current day and if the current hour is in the mask
          // Ex.: if a mask is 12, the binary code of it is 1100. This means that the lesson is in the third and fourth hour.
          if (currentDay.isSame(lesson.start, 'day') && filterSubjects.indexOf(lesson.subject) && lesson.hoursMask & hourExp) {
            hourCallback.push(lesson);
          }
        });
      }

      return hourCallback;
    };

    return hour;
  })
  .factory('dataService', function($http, $log, $q) {
    return {
      getTeacher: function(teacher) {
        return $http.jsonp(APIconfig.url('/people/search/' + teacher + '?test'));
      },
      getSuggestions: function() {
        return $http.jsonp(APIconfig.url('/schedule/autocomplete?test'));
      }
    }
  });
