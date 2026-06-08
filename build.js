const fs   = require('fs');
const path = require('path');

const DOCS     = path.join(__dirname, 'docs');
const PICS_SRC = path.join(__dirname, 'pictures');
const PICS_DST = path.join(DOCS, 'pictures');

fs.mkdirSync(PICS_DST, { recursive: true });

const restaurants = JSON.parse(fs.readFileSync('restaurants.json', 'utf8'));

// Copy photos
let copied = 0;
if (fs.existsSync(PICS_SRC)) {
  fs.readdirSync(PICS_SRC).forEach(f => {
    fs.copyFileSync(path.join(PICS_SRC, f), path.join(PICS_DST, f));
    copied++;
  });
}

// Patch index.html — swap API fetch for inline data, inject token
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  /const raw = await fetch\('\/api\/restaurants'\)\.then\(r => r\.json\(\)\);/,
  `const raw = ${JSON.stringify(restaurants)};`
);

fs.writeFileSync(path.join(DOCS, 'index.html'), html);

console.log(`✓ ${restaurants.length} restaurants baked in`);
console.log(`✓ ${copied} photos copied to docs/pictures/`);
console.log(`✓ docs/index.html ready\n`);
console.log(`Push to publish:`);
console.log(`  git add . && git commit -m "Update site" && git push`);
