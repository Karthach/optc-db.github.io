(function() {

// Note: The 'notes' object previously defined here has been migrated 
// to common/data/translations.js to support multi-language localizations.
// Ability notes are now accessed via LanguageService with the 'NOTE_' prefix.
// Migrated keys: captainProportional, captainFixed, fixed, gOrbs, noFixedPerc, 
// orb, poison, toxic, random, randomHeal, randomHits, specialProportional, 
// stages, specialBind, rewind, ignoreBarrier, zombie, colorAffinity, 
// instantKill, additionalDamage, beneficial, enrage.

/***********
 * Angular *
 ***********/

var app = angular.module('optc');
var directives = { }, filters = { };

/************************
 * Attribute directives *
 ************************/

directives.toInt = function() {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attrs, ngModel) {
            ngModel.$parsers.push(function(value) { return '' + value; });
            ngModel.$formatters.push(function(value) { return parseInt(value, 10); });
        }
    };
};

/**********************
 * Element directives *
 **********************/

directives.linkButton = function() {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: '../common/views/links.html',
        scope: { exclude: '@' },
        controller: ['$scope', 'LanguageService', function($scope, LanguageService) {
            $scope.currentLang = LanguageService.getLang();
            $scope.setLang = function(lang) {
                LanguageService.setLang(lang);
            };
        }],
        link: function(scope, element, attrs) {
            element.find(".trigger").click(function() {
                element.toggleClass("active"); 
            });
        }
    };
};

/***********
 * Filters * 
 ***********/

filters.decorate = function() {
    return function(input) {
        if (!input) return window.LanguageService.translate('NONE_LABEL');
        if (Array.isArray(input)) { input = input[0]; }
        if (input.constructor != String) return window.LanguageService.translate('NA_LABEL');
        return input
            .replace(/\[?(STR|DEX|QCK|PSY|INT)\]?/g,'<span class="badge $1">$1</span>')
            .replace(/\[RCV\]/g,'<span class="badge RCV">RCV</span>')
            .replace(/\[TND\]/g,'<span class="badge TND"><i class="tnd-icon"></i>TND</span>')
            .replace(/\[EMPTY\]/g,'<span class="badge EMPTY"><i class="fa fa-circle-o"></i>EMPTY</span>')
            .replace(/\[BLOCK\]/g,'<span class="badge BLOCK"><i class="block-icon"></i>BLOCK</span>')
            .replace(/\[SUPERBLOCK\]/g,'<span class="badge SUPERBLOCK"><i class="block-icon"></i>SUPERBLOCK</span>')
            .replace(/\[BOMB\]/g,'<span class="badge BOMB"><i class="fa fa-bomb"></i>BOMB</span>')
            .replace(/\[SUPERBOMB\]/g,'<span class="badge SUPERBOMB"><i class="fa fa-bomb"></i>SUPERBOMB</span>')
            .replace(/\[PARALYSIS\]/g,'<span class="badge PARALYSIS"></i>PARALYSIS</span>')
            .replace(/\[RAINBOW\]/g,'<span class="badge RAINBOW"></i>RAINBOW</span>')
            .replace(/\[SEMLA\]/g,'<span class="badge SEMLA"></i>SEMLA</span>')
            .replace(/\[WANO\]/g,'<span class="badge WANO"></i>WANO</span>')
            .replace(/\[G\]/g,'<span class="badge G">G</span>');
    };
};

filters.range = function() {
    return function(input, total) {
        total = parseInt(total,10);
        for (var i=0;i<total;++i) input.push(i);
        return input;
    };
};

filters.notes = function() {
    return function(input) {
        if (!input) return input;
        return input.trim().replace(/#\{(.+?)\}/g,function(x,y) {
            var tokens = y.trim().split(/:/);
            if (!tokens.length) return x;
            var noteKey = 'NOTE_' + tokens[0].trim().replace(/([A-Z])/g, '_$1').toUpperCase();
            var translatedNote = window.LanguageService.translate(noteKey);
            if (translatedNote === noteKey) return x; // Key not found
            return translatedNote.replace(/#(\d+)/g,function(a,b) {
                return (tokens[parseInt(b,10)] || '').trim();
            });
        });
    };
};

/******************
 * Initialization *
 ******************/

for (var directive in directives)
    app.directive(directive, directives[directive]);

for (var filter in filters)
    app.filter(filter, filters[filter]);

})();
