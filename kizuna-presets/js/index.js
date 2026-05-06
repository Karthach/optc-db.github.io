(function() {
    var app = angular.module('optc');

    app.controller('PresetsCtrl', ['$scope', '$timeout', function($scope, $timeout) {
        // 1. Obtener la lista de jefes históricos de Kizuna desde drops.js
        $scope.pastBosses = [];
        if (window.drops && window.drops['Kizuna Clash']) {
            $scope.pastBosses = window.drops['Kizuna Clash'].map(function(b) {
                return { name: b.name, id: b.thumb };
            }).reverse();
        }
        
        $scope.selectedBoss = $scope.pastBosses[0] || { name: 'Kizuna Mayo 2026', id: 3543 };

        $scope.bossGimmicks = {
            'STR': { st2: 'Parálisis & Silencio', st3: 'Escudo Rainbow (5) & Defensa' },
            'DEX': { st2: 'Bind (5) & Despair', st3: 'Threshold & ATK Down' },
            'QCK': { st2: 'Special Reverse & Bomb', st3: 'Resilience & Percent Reduction' },
            'PSY': { st2: 'Blind & Delay Immunity', st3: 'Burn & Chain Lock' },
            'INT': { st2: 'Hunger & RCV Down', st3: 'NAO & Slot Bind' }
        };

        $scope.presets = [];

        // --- LÓGICA DE NOMBRES PARA EVITAR DUPLICADOS ---
        function getBaseName(id) {
            var unit = window.units[id];
            if (!unit) return "";
            // El nombre suele venir como "Sanji - Vinsmoke Family"
            // Cortamos por el primer guión o espacio para obtener el nombre base
            var name = unit.name.split(/ - |,/)[0].trim();
            // Limpieza extra para nombres compuestos comunes (ej: "Monkey D. Luffy")
            if (name.includes("Luffy")) return "Luffy";
            if (name.includes("Sanji")) return "Sanji";
            if (name.includes("Zoro")) return "Zoro";
            if (name.includes("Nami")) return "Nami";
            if (name.includes("Robin")) return "Robin";
            if (name.includes("Chopper")) return "Chopper";
            if (name.includes("Brook")) return "Brook";
            if (name.includes("Franky")) return "Franky";
            if (name.includes("Usopp")) return "Usopp";
            if (name.includes("Jinbe")) return "Jinbe";
            return name;
        }

        $scope.generateKizunaTeam = function(targetColor) {
            var unitsDB = window.units;
            var detailsDB = window.details;
            var counterColor = getCounterColor(targetColor);
            
            var usedNames = [];
            var teamMembers = [];

            // 1. Filtrar candidatos del color correcto
            var candidates = Object.keys(unitsDB).filter(function(id) {
                var u = unitsDB[id];
                return u && u.type === counterColor && parseInt(id) > 2000 && !id.includes('-');
            });

            candidates.sort(() => 0.5 - Math.random());

            // 2. Seleccionar 6 Unidades Únicas por nombre
            for (var i = 0; i < candidates.length && teamMembers.length < 6; i++) {
                var id = candidates[i];
                var baseName = getBaseName(id);
                
                if (!usedNames.includes(baseName)) {
                    usedNames.push(baseName);
                    teamMembers.push({ id: Number(id), name: baseName });
                }
            }

            // 3. Asignar Supports Únicos (que no coincidan con PJ ni con otros supports)
            var finalTeam = teamMembers.map(function(member) {
                var supportId = findValidSupport(member.id, usedNames, targetColor);
                if (supportId) {
                    usedNames.push(getBaseName(supportId));
                }
                return { id: member.id, support: supportId || 1240 };
            });

            var newPreset = {
                title: 'Vs ' + $scope.selectedBoss.name + ' (' + targetColor + ')',
                targetType: targetColor,
                counterType: counterColor,
                bossThumb: $scope.selectedBoss.id,
                stage2: $scope.bossGimmicks[targetColor] ? $scope.bossGimmicks[targetColor].st2 : 'Varios',
                stage3: $scope.bossGimmicks[targetColor] ? $scope.bossGimmicks[targetColor].st3 : 'Final',
                members: finalTeam
            };

            $timeout(function() {
                $scope.presets.unshift(newPreset);
                if ($scope.presets.length > 6) $scope.presets.pop();
            });
        };

        function findValidSupport(mainUnitId, usedNamesList, targetColor) {
            var detailsDB = window.details;
            var allSids = Object.keys(detailsDB).filter(sid => {
                var d = detailsDB[sid];
                if (!d || !d.support || d.support.length === 0 || parseInt(sid) < 500) return false;
                var sName = getBaseName(sid);
                return !usedNamesList.includes(sName);
            });

            // Buscar afinidad
            var match = allSids.find(sid => {
                var sData = JSON.stringify(detailsDB[sid].support).toLowerCase();
                return sData.includes(targetColor.toLowerCase());
            });

            return Number(match || allSids[Math.floor(Math.random() * allSids.length)]);
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
