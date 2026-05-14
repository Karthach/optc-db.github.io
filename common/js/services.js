(function() {

var app = angular.module('optc');
var services = { };

services.$storage = function() {
    return {
        get: function(key, defaultValue) {
            try {
                var value = localStorage.getItem(key);
                if (value === null) return defaultValue;
                var parsed = JSON.parse(value);
                return parsed === undefined ? defaultValue : parsed;
            } catch (e) { return defaultValue; }
        },
        set: function(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
        },
        remove: function(key) {
            try { localStorage.removeItem(key); } catch (e) { }
        }
    };
};

services.LanguageService = ['$storage', function($storage) {
    var currentLang = $storage.get('lang', 'es');
    var service = {
        getLang: function() { return currentLang; },
        setLang: function(lang) {
            if (currentLang === lang) return;
            currentLang = lang;
            $storage.set('lang', lang);
            window.location.reload(); 
        },
        translate: function(key) {
            return (window.translations[currentLang] && window.translations[currentLang][key]) || key;
        }
    };
    window.LanguageService = service;
    return service;
}];

app.filter('translate', ['LanguageService', function(LanguageService) {
    return function(key) {
        return LanguageService.translate(key);
    };
}]);

for (var service in services)
    app.factory(service, services[service]);

})();
