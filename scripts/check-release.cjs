const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function checkTag(version, tag) {
  if (tag !== undefined) assert.equal(tag, `v${version}`, 'Release tag must match the application version');
}

function checkRelease(root = path.resolve(__dirname, '..'), tag) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const json = file => JSON.parse(read(file));
  const version = json('package.json').version;
  assert.match(version, /^\d+\.\d+\.\d+$/, 'Expected a stable semantic version');
  const lock = json('package-lock.json');
  const html = read('renderer/index.html');
  const versions = {
    'package-lock.json': lock.version,
    'package-lock.json root': lock.packages[''].version,
    'tauri.conf.json': json('src-tauri/tauri.conf.json').version,
    'Cargo.toml': read('src-tauri/Cargo.toml').match(/\[package\][\s\S]*?^version = "([^"]+)"/m)?.[1],
    'Cargo.lock': read('src-tauri/Cargo.lock').match(/\[\[package\]\]\r?\nname = "book-3d-app"\r?\nversion = "([^"]+)"/)?.[1],
    'renderer metadata': html.match(/name="application-version" content="([^"]+)"/)?.[1],
    'renderer badge': html.match(/id="app-version">v([^<]+)</)?.[1]
  };
  for (const [file, actual] of Object.entries(versions)) assert.equal(actual, version, `${file} version mismatch`);
  assert.ok(fs.existsSync(path.join(root, `docs/releases/v${version}.md`)), 'Release notes are missing');
  checkTag(version, tag);
  return version;
}

if (require.main === module) {
  console.log(`Release metadata consistent: v${checkRelease(undefined, process.argv[2])}`);
}

module.exports = { checkRelease, checkTag };
