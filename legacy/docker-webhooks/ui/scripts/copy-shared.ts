import fs from 'fs';
import path from 'path';

const source = path.resolve(__dirname, '../../shared');
const target = path.resolve(__dirname, '../src/shared');

function copyDir(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Clean old copy first
if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
}

copyDir(source, target);

console.log('✅ Copied shared folder to src/shared');