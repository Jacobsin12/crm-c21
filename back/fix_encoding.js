const fs = require('fs');
const path = require('path');

const dir = 'c:\\C21\\front\\a_admin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const replacements = {
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Ã ': 'Í', // TÃ TULO -> TÍTULO
    'Ã“': 'Ó', // UBICACIÃ“N -> UBICACIÓN
};

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    for (const [bad, good] of Object.entries(replacements)) {
        if (content.includes(bad)) {
            content = content.split(bad).join(good);
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
});
