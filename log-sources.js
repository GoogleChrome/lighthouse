import fs from 'fs';

const mapPath = 'dist/lighthouse-devtools-mcp-bundle.js.map';
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const sources = map.sources.sort();

console.log(JSON.stringify(sources, null, 2));
