const fs = require('fs');
const path = require('path');

function getAllJsFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getAllJsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }

    return results;
}

module.exports = { getAllJsFiles };