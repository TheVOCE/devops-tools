const fs = require('fs');
const path = require('path');

const installerDir = 'installer';
if (!fs.existsSync(installerDir)) {
    fs.mkdirSync(installerDir);
}
fs.readdirSync('.')
    .filter(f => f.endsWith('.vsix'))
    .forEach(f => {
        const dest = path.join(installerDir, f);
        if (fs.existsSync(f)) {
            try {
                fs.renameSync(f, dest);
            } catch (e) {
                console.error('Failed to move', f, e);
            }
        }
    });
