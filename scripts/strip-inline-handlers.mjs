import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.join(__dirname, '..', 'index.html');
let h = fs.readFileSync(p, 'utf8');
h = h.replace(/\s+onclick="[^"]*"/g, '');
h = h.replace(/\s+onkeydown="[^"]*"/g, '');
h = h.replace(/\s+oninput="[^"]*"/g, '');
h = h.replace(/\s+onchange="[^"]*"/g, '');
fs.writeFileSync(p, h);
