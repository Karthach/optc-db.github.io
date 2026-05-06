(function() {
    var app = angular.module('optc');

    app.controller('PresetsCtrl', ['$scope', '$timeout', 'LanguageService', function($scope, $timeout, LanguageService) {
        $scope.getLang = function() { return LanguageService.getLang(); };
        $scope.setLang = function(lang) { LanguageService.setLang(lang); };

        // Helper para traducir desde JS
        $scope.translate = function(key) {
            return LanguageService.translate(key);
        };

        // --- CONFIGURACIÓN INICIAL ---
        $scope.pastBosses = [];
        if (window.drops && window.drops['Kizuna Clash']) {
            $scope.pastBosses = window.drops['Kizuna Clash'].map(function(b) {
                return { name: b.name, id: b.thumb };
            }).reverse();
        }
        
        $scope.selectedBoss = $scope.pastBosses[0] || { name: 'Kizuna Mayo 2026', id: 3543 };
        
        // Gimmicks usando llaves de traducción para ser multilingüe
        $scope.bossGimmicks = {
            'STR': { st2: 'GIMMICK_STR_ST2', st3: 'GIMMICK_STR_ST3' },
            'DEX': { st2: 'GIMMICK_DEX_ST2', st3: 'GIMMICK_DEX_ST3' },
            'QCK': { st2: 'GIMMICK_QCK_ST2', st3: 'GIMMICK_QCK_ST3' },
            'PSY': { st2: 'GIMMICK_PSY_ST2', st3: 'GIMMICK_PSY_ST3' },
            'INT': { st2: 'GIMMICK_INT_ST2', st3: 'GIMMICK_INT_ST3' }
        };

        // --- SISTEMA DE UNIDADES QUE NO TENGO (BLACKLIST) ---
        $scope.missingUnits = JSON.parse(localStorage.getItem('kizuna_missing_units') || "[]");

        $scope.toggleMissing = function(id) {
            var index = $scope.missingUnits.indexOf(Number(id));
            if (index === -1) $scope.missingUnits.push(Number(id));
            else $scope.missingUnits.splice(index, 1);
            localStorage.setItem('kizuna_missing_units', JSON.stringify($scope.missingUnits));
        };

        $scope.presets = [];

        // --- LÓGICA DE NOMBRES ---
        function getBaseName(id) {
            var unit = window.units[id];
            if (!unit) return "";
            var name = unit.name.split(/ - |,/)[0].trim();
            var commonNames = ["Luffy", "Sanji", "Zoro", "Nami", "Robin", "Chopper", "Brook", "Franky", "Usopp", "Jinbe"];
            for (var i = 0; i < commonNames.length; i++) {
                if (name.includes(commonNames[i])) return commonNames[i];
            }
            return name;
        }

        // --- GENERADOR ---
        $scope.generateKizunaTeam = function(targetColor) {
            var unitsDB = window.units;
            var counterColor = getCounterColor(targetColor);
            var usedNames = [];
            var teamMembers = [];

            var candidates = Object.keys(unitsDB).filter(function(id) {
                var u = unitsDB[id];
                var uid = Number(id);
                return u && u.type === counterColor && uid > 2000 && !id.includes('-') && $scope.missingUnits.indexOf(uid) === -1;
            });

            candidates.sort((a, b) => Number(b) - Number(a));

            for (var i = 0; i < candidates.length && teamMembers.length < 6; i++) {
                var id = candidates[i];
                var baseName = getBaseName(id);
                if (!usedNames.includes(baseName)) {
                    usedNames.push(baseName);
                    teamMembers.push({ id: Number(id), name: baseName });
                }
            }

            var finalTeam = teamMembers.map(function(member) {
                var supportId = findValidSupport(member.id, usedNames, targetColor);
                if (supportId) usedNames.push(getBaseName(supportId));
                return { id: member.id, support: supportId || 1240 };
            });

            var newPreset = {
                title: 'Vs ' + $scope.selectedBoss.name + ' (' + targetColor + ')',
                targetType: targetColor,
                counterType: counterColor,
                bossThumb: $scope.selectedBoss.id,
                stage2: $scope.bossGimmicks[targetColor].st2,
                stage3: $scope.bossGimmicks[targetColor].st3,
                members: finalTeam
            };

            $timeout(function() {
                $scope.presets.unshift(newPreset);
                if ($scope.presets.length > 5) $scope.presets.pop();
            });
        };

        $scope.replaceUnit = function(preset, memberIndex) {
            var counterColor = preset.counterType;
            var usedNamesInTeam = preset.members.map(m => getBaseName(m.id));
            preset.members.forEach(m => usedNamesInTeam.push(getBaseName(m.support)));

            var candidates = Object.keys(window.units).filter(function(id) {
                var u = window.units[id];
                var uid = Number(id);
                var name = getBaseName(id);
                return u && u.type === counterColor && uid > 2000 && !id.includes('-') && 
                       $scope.missingUnits.indexOf(uid) === -1 && !usedNamesInTeam.includes(name);
            });

            candidates.sort((a, b) => Number(b) - Number(a));

            if (candidates.length > 0) {
                var newId = Number(candidates[0]);
                var newSupport = findValidSupport(newId, usedNamesInTeam, preset.targetType);
                $timeout(function() {
                    preset.members[memberIndex] = { id: newId, support: newSupport };
                });
            }
        };

        function findValidSupport(mainUnitId, usedNamesList, targetColor) {
            var detailsDB = window.details;
            var allSids = Object.keys(detailsDB).filter(sid => {
                var d = detailsDB[sid];
                var uid = Number(sid);
                if (!d || !d.support || d.support.length === 0 || uid < 500 || $scope.missingUnits.indexOf(uid) !== -1) return false;
                return !usedNamesList.includes(getBaseName(sid));
            });
            allSids.sort((a, b) => Number(b) - Number(a));
            var match = allSids.find(sid => JSON.stringify(detailsDB[sid].support).toLowerCase().includes(targetColor.toLowerCase()));
            return Number(match || allSids[0]);
        }

        function getCounterColor(type) {
            var map = { 'STR': 'QCK', 'DEX': 'STR', 'QCK': 'DEX', 'INT': 'PSY', 'PSY': 'INT' };
            return map[type] || 'STR';
        }

        $timeout(function() {
            $scope.generateKizunaTeam('STR');
            $scope.generateKizunaTeam('DEX');
        }, 1500);
    }]);

    app.directive('decorateSlot', [function() {
        return {
            restrict: "A",
            scope: { uid: "=" },
            link: function (scope, element, attrs) {
                var noimagePath = "../api/images/common/noimage.png";
                scope.$watch('uid', function(newVal) {
                    if (!newVal) { element[0].style.backgroundImage = "url(" + noimagePath + ")"; return; }
                    try {
                        var paths = window.Utils.getThumbnailUrl(newVal, "..");
                        element[0].style.backgroundImage = "url(" + paths.glo + ")";
                        element[0].style.backgroundSize = "cover";
                    } catch(e) { element[0].style.backgroundImage = "url(" + noimagePath + ")"; }
                });
            }
        };
    }]);
})();
