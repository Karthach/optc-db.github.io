(function() {
    var app = angular.module('optc');

    app.controller('PresetsCtrl', ['$scope', '$timeout', 'LanguageService', function($scope, $timeout, LanguageService) {
        $scope.getLang = function() { return LanguageService.getLang(); };
        $scope.setLang = function(lang) { LanguageService.setLang(lang); };
        $scope.translate = function(key) { return LanguageService.translate(key); };

        // --- GIMMICKS ---
        $scope.gimmickOptions = [
            { id: 'bind', label: 'GIMMICK_BIND', regex: /reduces? bind duration by (\d+) turns?/i },
            { id: 'despair', label: 'GIMMICK_DESPAIR', regex: /reduces? despair duration by (\d+) turns?/i },
            { id: 'paralysis', label: 'GIMMICK_PARALYSIS', regex: /reduces? paralysis duration by (\d+) turns?/i },
            { id: 'silence', label: 'GIMMICK_SILENCE', regex: /reduces? special bind duration by (\d+) turns?/i },
            { id: 'atkdown', label: 'GIMMICK_ATKDOWN', regex: /reduces? atk down duration by (\d+) turns?/i },
            { id: 'threshold', label: 'GIMMICK_THRESHOLD', regex: /reduces? enemies? damage threshold duration by (\d+) turns?/i },
            { id: 'shield', label: 'GIMMICK_SHIELD', regex: /reduces? damage taken by enemies duration by (\d+) turns?/i },
            { id: 'burn', label: 'GIMMICK_BURN', regex: /reduces? burn duration by (\d+) turns?/i }
        ];

        $scope.bossConfig = {
            st2Type: 'STR',
            st3Type: 'STR',
            st2Gimmicks: [],
            st3Gimmicks: []
        };

        $scope.addGimmick = function(stage) {
            var target = stage === 2 ? $scope.bossConfig.st2Gimmicks : $scope.bossConfig.st3Gimmicks;
            target.push({ id: 'bind', turns: 5 });
        };

        $scope.removeGimmick = function(stage, index) {
            var target = stage === 2 ? $scope.bossConfig.st2Gimmicks : $scope.bossConfig.st3Gimmicks;
            target.splice(index, 1);
        };

        $scope.presets = [];
        $scope.missingUnits = JSON.parse(localStorage.getItem('kizuna_missing_units') || "[]");

        function getSpecialDescription(unitId) {
            var detail = window.details[unitId];
            if (!detail || !detail.special) return "";
            return (typeof detail.special === "string") ? detail.special : Object.values(detail.special).join(" ");
        }

        function getSupportDescription(unitId) {
            var detail = window.details[unitId];
            if (!detail || !detail.support || !Array.isArray(detail.support)) return "";
            var lastSupport = detail.support[detail.support.length - 1];
            if (!lastSupport || !lastSupport.description) return "";
            return (typeof lastSupport.description === "string") ? lastSupport.description : (Array.isArray(lastSupport.description) ? lastSupport.description.join(" ") : "");
        }

        function getBaseName(id) {
            var unit = window.units[id];
            if (!unit) return "Unknown";
            var name = unit.name.split(/ - |,/)[0].trim();
            var common = ["Luffy", "Sanji", "Zoro", "Nami", "Robin", "Chopper", "Brook", "Franky", "Usopp", "Jinbe", "Law", "Kid", "Yamato", "Kaido", "Big Mom", "Shanks", "Ace", "Sabo"];
            for (var i = 0; i < common.length; i++) { if (name.includes(common[i])) return common[i]; }
            return name;
        }

        function getCounterColor(type) {
            var map = { 'STR': 'QCK', 'DEX': 'STR', 'QCK': 'DEX', 'INT': 'PSY', 'PSY': 'INT' };
            return map[type] || 'STR';
        }

        // --- ENGINE V10: MULTI-COLOR STAGE ENGINE ---
        $scope.generatePerfectTeam = function() {
            var unitsDB = window.units;
            var detailsDB = window.details;
            
            // Requerimientos combinados
            var requirements = {};
            var combinedGimmicks = $scope.bossConfig.st2Gimmicks.concat($scope.bossConfig.st3Gimmicks);
            combinedGimmicks.forEach(g => { requirements[g.id] = (requirements[g.id] || 0) + Number(g.turns); });

            var usedNames = [];
            var teamMembers = [];

            // El color principal del equipo será el counter del FINAL BOSS (Stage 3)
            var mainCounterColor = getCounterColor($scope.bossConfig.st3Type);

            var candidates = Object.keys(unitsDB).filter(id => {
                var u = unitsDB[id];
                return u && u.type === mainCounterColor && parseInt(id) > 2000 && !id.toString().includes('-') && 
                       (u.stars == "5" || u.stars == "6" || u.stars == "6+") && detailsDB[id] && 
                       $scope.missingUnits.indexOf(Number(id)) === -1;
            });

            var scoredUnits = candidates.map(id => {
                var specialText = getSpecialDescription(id);
                var score = 0;
                Object.keys(requirements).forEach(gid => {
                    var opt = $scope.gimmickOptions.find(o => o.id === gid);
                    var match = specialText.match(opt.regex);
                    if (match) score += Math.min(parseInt(match[1]), requirements[gid]) * 10;
                });
                return { id: Number(id), score: score };
            });

            scoredUnits.sort((a, b) => b.score - a.score || b.id - a.id);

            for (var i = 0; i < scoredUnits.length && teamMembers.length < 6; i++) {
                var uid = scoredUnits[i].id;
                var baseName = getBaseName(uid);
                if (!usedNames.includes(baseName)) {
                    usedNames.push(baseName);
                    teamMembers.push({ id: uid, name: baseName });
                }
            }

            var currentClears = {};
            teamMembers.forEach(m => {
                var specialText = getSpecialDescription(m.id);
                Object.keys(requirements).forEach(gid => {
                    var opt = $scope.gimmickOptions.find(o => o.id === gid);
                    var match = specialText.match(opt.regex);
                    if (match) currentClears[gid] = (currentClears[gid] || 0) + parseInt(match[1]);
                });
            });

            var finalTeam = teamMembers.map(m => {
                var supportId = findProfessionalSupport(m.id, usedNames, currentClears, requirements, $scope.bossConfig.st3Type);
                if (supportId) usedNames.push(getBaseName(supportId));
                return { id: m.id, support: supportId || 1240 };
            });

            $timeout(() => {
                $scope.presets = [{
                    title: 'Strategic Hub v10 Counter',
                    st2Type: $scope.bossConfig.st2Type,
                    st3Type: $scope.bossConfig.st3Type,
                    counterType: mainCounterColor,
                    st2Summary: $scope.bossConfig.st2Gimmicks.map(g => $scope.translate('GIMMICK_'+g.id.toUpperCase()) + " ("+g.turns+")").join(", "),
                    st3Summary: $scope.bossConfig.st3Gimmicks.map(g => $scope.translate('GIMMICK_'+g.id.toUpperCase()) + " ("+g.turns+")").join(", "),
                    members: finalTeam,
                    bossThumb: 3543
                }];
            });
        };

        function findProfessionalSupport(mainId, usedList, currentClears, requirements, bossColor) {
            var detailsDB = window.details;
            var unitsDB = window.units;
            var mainUnitObj = unitsDB[mainId];
            var possibleSids = Object.keys(detailsDB).filter(sid => {
                var d = detailsDB[sid];
                var su = unitsDB[sid];
                var suid = Number(sid);
                return d && d.support && d.support.length > 0 && suid > 500 && su && (su.stars == "5" || su.stars == "6") &&
                       !usedList.includes(getBaseName(sid)) && $scope.missingUnits.indexOf(suid) === -1 &&
                       window.Utils.canSupportUnit(mainUnitObj, d);
            });

            var scoredSupports = possibleSids.map(sid => {
                var sText = getSupportDescription(sid).toLowerCase();
                var score = 0;
                Object.keys(requirements).forEach(gid => {
                    var opt = $scope.gimmickOptions.find(o => o.id === gid);
                    var match = sText.match(opt.regex);
                    if (match) {
                        var val = parseInt(match[1]);
                        var gap = (requirements[gid] || 0) - (currentClears[gid] || 0);
                        if (gap > 0) score += Math.min(val, gap) * 20;
                    }
                });
                if (sText.includes("base atk") || sText.includes(bossColor.toLowerCase())) score += 2;
                score += (Number(sid) / 10000);
                return { id: Number(sid), score: score };
            });
            scoredSupports.sort((a,b) => b.score - a.score);
            return scoredSupports.length > 0 ? scoredSupports[0].id : null;
        }

        $scope.toggleMissing = function(id) {
            var index = $scope.missingUnits.indexOf(Number(id));
            if (index === -1) $scope.missingUnits.push(Number(id));
            else $scope.missingUnits.splice(index, 1);
            localStorage.setItem('kizuna_missing_units', JSON.stringify($scope.missingUnits));
            $scope.generatePerfectTeam();
        };

        $scope.replaceUnit = function(idx) {
            if ($scope.presets.length === 0) return;
            var preset = $scope.presets[0];
            var inUse = preset.members.map(m => getBaseName(m.id));
            preset.members.forEach(m => inUse.push(getBaseName(m.support)));
            var pool = Object.keys(window.units).filter(id => {
                var u = window.units[id];
                return u && u.type === preset.counterType && (u.stars == "5" || u.stars == "6") &&
                       window.details[id] && !inUse.includes(getBaseName(id)) && $scope.missingUnits.indexOf(Number(id)) === -1;
            }).sort((a,b) => Number(b) - Number(a));
            if (pool.length > 0) {
                var nid = Number(pool[0]);
                var nsup = findProfessionalSupport(nid, inUse, {}, {}, preset.st3Type);
                $timeout(() => { preset.members[idx] = { id: nid, support: nsup || 1240 }; });
            }
        };
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
                        element[0].style.backgroundImage = "url(" + paths.glo + ")";
                        element[0].style.backgroundSize = "cover";
                    } catch(e) { element[0].style.backgroundImage = "url(" + noimagePath + ")"; }
                });
            }
        };
    }]);
})();
