(function() {
    var app = angular.module('optc');

    app.controller('PresetsCtrl', ['$scope', '$timeout', 'LanguageService', function($scope, $timeout, LanguageService) {
        $scope.getLang = function() { return LanguageService.getLang(); };
        $scope.setLang = function(lang) { LanguageService.setLang(lang); };
        $scope.translate = function(key) { return LanguageService.translate(key); };

        // --- CONFIGURACIÓN ---
        $scope.pastEvents = [];
        if (window.drops && window.drops['Kizuna Clash']) {
            $scope.pastEvents = window.drops['Kizuna Clash'].slice().reverse(); // Copia y reversa para no mutar el original
        }
        
        $scope.selectedEvent = $scope.pastEvents[0];
        $scope.detectedVariations = [];
        $scope.presets = [];
        $scope.missingUnits = JSON.parse(localStorage.getItem('kizuna_missing_units') || "[]");

        // --- ANALIZADOR DE VARIACIONES (CRÍTICO: Limpia y Regenera) ---
        $scope.analyzeEventColors = function() {
            if (!$scope.selectedEvent) return;
            
            console.log("Cambiando a evento:", $scope.selectedEvent.name);
            
            var event = $scope.selectedEvent;
            var types = new Set();
            var unitIds = [event.thumb];

            // Recopilar IDs de todas las posibles claves de rondas en la DB
            var rounds = ['All Difficulties', 'Round 1', 'Round 2', 'Round 3'];
            rounds.forEach(function(r) {
                if (event[r] && Array.isArray(event[r])) {
                    unitIds = unitIds.concat(event[r]);
                }
            });

            // Escanear tipos de los personajes relacionados
            unitIds.forEach(function(id) {
                var u = window.units[id];
                if (u && u.type && !id.toString().includes('skull')) {
                    types.add(u.type);
                }
            });

            // Lógica de Negocio: Si detecta solo el color de la unidad principal, asume trío estándar
            if (types.size <= 1) {
                $scope.detectedVariations = ['STR', 'DEX', 'QCK'];
            } else {
                $scope.detectedVariations = Array.from(types);
            }

            // LIMPIEZA TOTAL Y REGENERACIÓN
            $timeout(function() {
                $scope.presets = []; 
                $scope.autoGenerateAll();
            });
        };

        $scope.autoGenerateAll = function() {
            // Generar un equipo por cada color detectado
            $scope.detectedVariations.forEach(function(color) {
                $scope.generateKizunaTeam(color);
            });
        };

        function getBaseName(id) {
            var unit = window.units[id];
            if (!unit) return "Unknown";
            var name = unit.name.split(/ - |,/)[0].trim();
            var common = ["Luffy", "Sanji", "Zoro", "Nami", "Robin", "Chopper", "Brook", "Franky", "Usopp", "Jinbe", "Law", "Kid", "Yamato", "Kaido", "Big Mom", "Shanks", "Ace", "Sabo"];
            for (var i = 0; i < common.length; i++) {
                if (name.includes(common[i])) return common[i];
            }
            return name;
        }

        // --- GENERADOR TÉCNICO ---
        $scope.generateKizunaTeam = function(targetColor) {
            var unitsDB = window.units;
            var specialsDB = window.specials;
            var detailsDB = window.details;
            var counterColor = getCounterColor(targetColor);
            
            var usedNames = [];
            var teamMembers = [];

            // 1. Filtrar candidatos del color counter
            var candidates = Object.keys(unitsDB).filter(function(id) {
                var u = unitsDB[id];
                var uid = Number(id);
                return u && u.type === counterColor && uid > 2000 && 
                       !id.toString().includes('-') && 
                       detailsDB[id] && 
                       $scope.missingUnits.indexOf(uid) === -1;
            }).sort((a, b) => Number(b) - Number(a));

            if (candidates.length < 6) return;

            // 2. Utilidad (Escaneo de código)
            var utility = candidates.filter(function(id) {
                var s = specialsDB[id];
                if (!s) return false;
                var sStr = JSON.stringify(s).toLowerCase();
                return sStr.includes('p.') || sStr.includes('return 1') || sStr.includes('specialbind');
            });

            for (var i = 0; i < utility.length && teamMembers.length < 3; i++) {
                var uid = Number(utility[i]);
                var name = getBaseName(uid);
                if (!usedNames.includes(name)) {
                    usedNames.push(name);
                    teamMembers.push({ id: uid, name: name });
                }
            }

            // 3. Daño (Rellenar hasta 6)
            for (var j = 0; j < candidates.length && teamMembers.length < 6; j++) {
                var duid = Number(candidates[j]);
                var dname = getBaseName(duid);
                if (!usedNames.includes(dname)) {
                    usedNames.push(dname);
                    teamMembers.push({ id: duid, name: dname });
                }
            }

            // 4. Supports Pro (Sin repetir nombres)
            var finalTeam = teamMembers.map(function(m) {
                var supportId = findProfessionalSupport(m.id, usedNames, targetColor);
                if (supportId) usedNames.push(getBaseName(supportId));
                return { id: m.id, support: supportId || 1240 };
            });

            var gimmicks = predictGimmicks(targetColor);

            $timeout(function() {
                $scope.presets.push({
                    title: 'Tactical Team vs ' + targetColor,
                    targetType: targetColor,
                    counterType: counterColor,
                    bossThumb: $scope.selectedEvent.thumb, // USAR EL THUMB DEL EVENTO SELECCIONADO
                    stage2: gimmicks.st2,
                    stage3: gimmicks.st3,
                    members: finalTeam
                });
            });
        };

        function findProfessionalSupport(mainId, usedList, color) {
            var detailsDB = window.details;
            var possible = Object.keys(detailsDB).filter(function(sid) {
                var d = detailsDB[sid];
                var suid = Number(sid);
                return d && d.support && d.support.length > 0 && suid > 1000 && 
                       !usedList.includes(getBaseName(sid)) && 
                       $scope.missingUnits.indexOf(suid) === -1;
            }).sort((a,b) => Number(b) - Number(a));

            var match = possible.find(function(sid) {
                return JSON.stringify(detailsDB[sid].support).toLowerCase().includes(color.toLowerCase());
            });
            return Number(match || possible[0]);
        }

        function predictGimmicks(color) {
            var map = {
                'STR': { st2: 'GIMMICK_STR_ST2', st3: 'GIMMICK_STR_ST3' },
                'DEX': { st2: 'GIMMICK_DEX_ST2', st3: 'GIMMICK_DEX_ST3' },
                'QCK': { st2: 'GIMMICK_QCK_ST2', st3: 'GIMMICK_QCK_ST3' },
                'PSY': { st2: 'GIMMICK_PSY_ST2', st3: 'GIMMICK_PSY_ST3' },
                'INT': { st2: 'GIMMICK_INT_ST2', st3: 'GIMMICK_INT_ST3' }
            };
            return map[color] || map['STR'];
        }

        function getCounterColor(type) {
            var map = { 'STR': 'QCK', 'DEX': 'STR', 'QCK': 'DEX', 'INT': 'PSY', 'PSY': 'INT' };
            return map[type] || 'STR';
        }

        $scope.toggleMissing = function(id) {
            var index = $scope.missingUnits.indexOf(Number(id));
            if (index === -1) $scope.missingUnits.push(Number(id));
            else $scope.missingUnits.splice(index, 1);
            localStorage.setItem('kizuna_missing_units', JSON.stringify($scope.missingUnits));
            $scope.analyzeEventColors(); // Refrescar equipos para aplicar blacklist
        };

        $scope.replaceUnit = function(preset, idx) {
            var counter = preset.counterType;
            var inUse = preset.members.map(function(m) { return getBaseName(m.id); });
            preset.members.forEach(function(m) { inUse.push(getBaseName(m.support)); });

            var pool = Object.keys(window.units).filter(function(id) {
                var u = window.units[id];
                var uid = Number(id);
                return u && u.type === counter && uid > 2000 && !id.toString().includes('-') && 
                       window.details[id] && !inUse.includes(getBaseName(id)) && $scope.missingUnits.indexOf(uid) === -1;
            }).sort((a,b) => Number(b) - Number(a));

            if (pool.length > 0) {
                var nid = Number(pool[0]);
                var nsup = findProfessionalSupport(nid, inUse, preset.targetType);
                $timeout(function() { preset.members[idx] = { id: nid, support: nsup }; });
            }
        };

        // ANALIZAR INICIAL
        $timeout(function() {
            $scope.analyzeEventColors();
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
                        var id = String(newVal).split('-')[0].padStart(4, '0');
                        var paths = window.Utils.getThumbnailUrl(newVal, "..");
                        var img = new Image();
                        img.onload = function() { 
                            element[0].style.backgroundImage = "url(" + paths.glo + ")"; 
                            element[0].style.backgroundSize = "cover";
                        };
                        img.onerror = function() {
                            element[0].style.backgroundImage = "url(" + noimagePath + ")";
                        };
                        img.src = paths.glo;
                    } catch(e) { element[0].style.backgroundImage = "url(" + noimagePath + ")"; }
                });
            }
        };
    }]);
})();
