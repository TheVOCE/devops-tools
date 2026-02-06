const fs = require('fs');
const path = require('path');

const installerDir = 'installer';
const vsixFiles = fs.readdirSync('.')
    .filter(f => f.endsWith('.vsix'));

if (vsixFiles.length > 0) {
    if (!fs.existsSync(installerDir)) {
        fs.mkdirSync(installerDir);
    }
    vsixFiles.forEach(f => {
        const dest = path.join(installerDir, f);
        if (fs.existsSync(f)) {
            try {
                fs.renameSync(f, dest);
            } catch (e) {
                console.error('Failed to move', f, e);
            }
        }
    });
}
