const express        = require('express');
const multer         = require('multer');
const fs             = require('fs');
const path           = require('path');
const { execFileSync } = require('child_process');
const app  = express();
const PORT = 3000;
const DATA = path.join(__dirname, 'restaurants.json');

app.use(express.json());
app.use(express.static(__dirname));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'pictures'),
    filename: (_, file, cb) => {
      const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      cb(null, `_tmp_${uid}${path.extname(file.originalname).toLowerCase() || '.jpg'}`);
    }
  }),
  fileFilter: (_, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

const read  = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
const write = d  => fs.writeFileSync(DATA, JSON.stringify(d, null, 2));

function toJpeg(src, dest) {
  execFileSync('/usr/bin/sips', ['-Z', '1200', '-s', 'format', 'jpeg', src, '--out', dest], { stdio: 'ignore' });
  if (src !== dest) fs.unlinkSync(src);
}

function savePhotos(files, existingPhotos, id) {
  const photos = [...existingPhotos];
  files.forEach(file => {
    const n = photos.length;
    const filename = n === 0 ? `${id}.jpg` : `${id}_${n + 1}.jpg`;
    const dest = path.join(__dirname, 'pictures', filename);
    toJpeg(file.path, dest);
    photos.push(filename);
  });
  return photos;
}

app.get('/api/restaurants', (_, res) => {
  try { res.json(read()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/restaurants', (req, res, next) => {
  upload.array('photos', 20)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const r        = JSON.parse(req.body.data);
      const existing = JSON.parse(req.body.existingPhotos || '[]');
      r.photos       = savePhotos(req.files || [], existing, r.id);
      const data     = read();
      data.push(r);
      write(data);
      res.json({ ok: true, idx: data.length - 1 });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

app.put('/api/restaurants/:idx', (req, res, next) => {
  upload.array('photos', 20)(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const data     = read();
      const idx      = Number(req.params.idx);
      const r        = JSON.parse(req.body.data);
      const existing = JSON.parse(req.body.existingPhotos || '[]');
      r.photos       = savePhotos(req.files || [], existing, r.id);
      data[idx]      = r;
      write(data);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

app.delete('/api/restaurants/:idx', (req, res) => {
  try {
    const data = read();
    data.splice(Number(req.params.idx), 1);
    write(data);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/push', (req, res) => {
  try {
    const { execSync } = require('child_process');
    const opts = { cwd: __dirname, stdio: 'pipe' };
    execSync('git add restaurants.json pictures/', opts);
    const status = execSync('git status --porcelain', opts).toString().trim();
    if (!status) return res.json({ ok: true, message: 'Nothing to push — already up to date.' });
    const msg = req.body.message || `update restaurants ${new Date().toISOString().slice(0,10)}`;
    execSync(`git commit -m ${JSON.stringify(msg)}`, opts);
    execSync('git push', opts);
    res.json({ ok: true, message: 'Pushed to GitHub successfully.' });
  } catch (e) {
    res.status(500).json({ error: e.stderr?.toString() || e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Seungmo's Food Journal`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Site:   http://localhost:${PORT}`);
  console.log(`  Admin:  http://localhost:${PORT}/admin.html\n`);
});
