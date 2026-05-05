const fs = require('fs');
const path = require('path');

// Fix typos in details.js
function fixDetails() {
    const filePath = path.join(__dirname, '../../data/details.js');
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. consecutive spaces (avoiding indentation)
    content = content.replace(/([^ \r\n]) {2,}([^ \r\n])/g, '$1 $2');

    // 2. invalid variable multipliers
    content = content.replace(/([?.\d]+)(?:-([?.\d]+)(%|x))/g, '$1$3-$2$3');

    // 3. "1 turns"
    content = content.replace(/\b1 turns/g, '1 turn');

    // 4. "n turn"
    content = content.replace(/\b(\d{2,}|[02-9]) turn(?!s)/g, '$1 turns');

    // 5. "ie" typos
    content = content.replace(/thier/g, 'their');
    content = content.replace(/recieve/g, 'receive');

    // 6. "a" that should be "an"
    content = content.replace(/\ba (8|\[INT\])/g, 'an $1');

    fs.writeFileSync(filePath, content);
    console.log('Fixed typos in details.js');
}

fixDetails();
