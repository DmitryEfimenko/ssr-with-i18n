"use strict";
const fs = require('fs');
const path = require('path');
const md5 = require('md5');

const srcPath = 'src/assets/i18n';
const destPath = 'src/assets/i18n/autogen';

cleanDestinationDir();
const map = generateHashedFiles();
saveHashMapFile(map);

function cleanDestinationDir() {
  console.log("Cleaning existing destinaiton directory");
  if (fs.existsSync(destPath) && fs.statSync(destPath).isDirectory()) {
    const destFiles = fs.readdirSync(destPath);
    destFiles.forEach(function(fileName) {
      fs.unlinkSync(path.join(destPath, fileName));
    });
  } else {
    fs.mkdirSync(destPath);
  }
}

function generateHashedFiles() {
  const map = {};
  const srcFiles = fs.readdirSync(srcPath);

  srcFiles.forEach(function(fileName) {
    if (fileName === 'autogen') { return; };
    const srcFile = path.join(srcPath, fileName);
    console.log('Reading source file: ', srcFile);
    const buf = fs.readFileSync(srcFile);
    const hash = md5(buf);
    const lang = fileName.split('.')[0];
    map[lang] = hash;
    const destFile = path.join(destPath, `${lang}.${hash}.json`);
    console.log('Writing new file:', destFile);
    fs.writeFileSync(destFile, buf);
  });
  return map;
}

function saveHashMapFile(map) {
  const mapFile = path.join(destPath, 'map.json');
  console.log('Writing map file: ', mapFile);
  fs.writeFileSync(mapFile, JSON.stringify(map, null, 2));
}
