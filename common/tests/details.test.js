import { DBdetail, DButils, DBunit } from "./DBLoader"

// Split generated family query
function splitCriteria(criteria){
    if (!criteria)
        return null;
    let params = criteria.split(' ');
    let families = [];
    for (let param of params){
        if (!param.startsWith('family:^('))
            continue;
        families = param
            .slice(9, -2) // strip `family:^(` and `)$`
            .split('|')
            .map(family => family.replace(/_+/g, ' ').replace(/\\/g, ''));
    }
    return families;
}

describe('Used family names should be valid', () => {
    let allFamilies = Object.keys(DButils.getReverseFamilyMap());
    allFamilies.push("Toy Bears"); // No such family name yet, but it is valid (Sugar)

    it("Supported characters' families", () => {
        for (let id in DBdetail) {
            const data = DBdetail[id];
            if (!data.support)
                continue;

            // stored in an array, though there doesn't seem to be any unit that has multiple supports
            for (const supportData of data.support){
                expect(supportData.Characters).toBeDefined();

                let criteria = DButils.generateSupportedCharactersQuery(supportData.Characters);
                if (!criteria)
                    continue;

                let familyNames = splitCriteria(criteria);
                for (const familyName of familyNames) {
                    if (!allFamilies.includes(familyName)){
                        throw new Error(`${id} support: "${familyName}" should be in window.families (families.js)`);
                    }
                }
            }
        }
    })

    it('Super special criteria families', () => {
        for (let id in DBdetail) {
            let data = DBdetail[id];

            if (!data.superSpecialCriteria)
                continue;

            let criteria = DButils.generateSuperSpecialQuery(data.superSpecialCriteria);
            if (!criteria)
                continue;

            let familyNames = splitCriteria(criteria);
            for (const familyName of familyNames) {
                if (!allFamilies.includes(familyName)){
                    throw new Error(`${id} superSpecial: "${familyName}" should be in window.families (families.js)`);
                }
            }
        }
    });
});

describe('Typos', () => {
    const typoChecks = [
        {
            name: 'consecutive spaces',
            check: (target) => {
                let corrected = target.replace(/ {2,}/g, ' ');
                return target === corrected;
            },
            message: (id, property, target) => `${id}: ${property} has consecutive spaces`
        },
        {
            name: 'invalid variable multipliers',
            check: (target) => {
                let corrected = target.replace(/([?.\d]+)(?:-([?.\d]+)(%|x))/g, '$1$3-$2$3');
                return target === corrected;
            },
            message: (id, property, target) => `${id}: ${property} has invalid variable multipliers`
        },
        {
            name: '"1 turns"',
            check: (target) => {
                let corrected = target.replace(/\b1 turns/g, '1 turn');
                return target === corrected;
            },
            message: (id, property, target) => `${id}: ${property} has "1 turns"`
        },
        {
            name: '"n turn"',
            check: (target) => {
                let corrected = target.replace(/\b(\d{2,}|[02-9]) turn(?!s)/g, '$1 turns');
                return target === corrected;
            },
            message: (id, property, target) => `${id}: ${property} has "n turn"`
        },
        {
            name: '"ie" typos',
            check: (target) => {
                return !/thier|recieve/.test(target);
            },
            message: (id, property, target) => `${id}: ${property} has "thier" or "recieve"`
        },
        {
            name: '"a" that should be "an"',
            check: (target) => {
                return !/\ba (8|\[INT\])/.test(target);
            },
            message: (id, property, target) => `${id}: ${property} has "a" instead of "an" before 8/INT`
        }
    ];

    typoChecks.forEach(typoCheck => {
        it(`checks for ${typoCheck.name}`, () => {
            const failures = [];
            for (let id in DBdetail) {
                let data = DBdetail[id];
                if (Number(id) >= 5000)
                    break;
                for (let property in data){
                    let target = data[property];
                    if (typeof target !== 'string')
                        target = JSON.stringify(target);
                    
                    if (!typoCheck.check(target)) {
                        failures.push(typoCheck.message(id, property, target));
                    }
                }
            }
            if (failures.length > 0) {
                throw new Error(`Found ${failures.length} issues:\n${failures.slice(0, 20).join('\n')}${failures.length > 20 ? '\n...' : ''}`);
            }
        });
    });
});
