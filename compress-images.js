#!/usr/bin/env node
/**
 * Studio Maxime — Pipeline d'optimisation d'images
 *
 * Exécution unique (après modif d'images source) :
 *   npm install sharp --save-dev
 *   node compress-images.js
 *
 * Résultat :
 *   - Compresse PNG/JPG du dossier images/ → versions WebP + fallback optimisé
 *   - Rastérise images/og-cover.svg en og-cover.jpg (1200x630, qualité 85)
 *   - Garde les originaux intacts
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const IMG_DIR = path.join(__dirname, 'images');

const SOURCES = [
  { file: 'accessouspont.png', width: 1280, type: 'png' },
  { file: 'blocsdebeton.png', width: 1280, type: 'png' },
  { file: 'mecaniquesolution.png', width: 1280, type: 'png' },
  { file: 'maxime.jpg', width: 1200, type: 'jpg' }
];

async function compress() {
  console.log('--- Compression des images sources ---\n');

  for (const src of SOURCES) {
    const inputPath = path.join(IMG_DIR, src.file);
    if (!fs.existsSync(inputPath)) {
      console.warn(`  [SKIP] ${src.file} introuvable`);
      continue;
    }

    const baseName = path.parse(src.file).name;
    const webpOut = path.join(IMG_DIR, `${baseName}.webp`);
    const fallbackOut = path.join(IMG_DIR, `${baseName}-opt.${src.type === 'jpg' ? 'jpg' : 'png'}`);

    const sizeBefore = (fs.statSync(inputPath).size / 1024).toFixed(0);

    // Version WebP — format moderne, meilleur ratio compression
    await sharp(inputPath)
      .resize({ width: src.width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(webpOut);

    // Fallback optimisé (PNG/JPG)
    if (src.type === 'png') {
      await sharp(inputPath)
        .resize({ width: src.width, withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 85 })
        .toFile(fallbackOut);
    } else {
      await sharp(inputPath)
        .resize({ width: src.width, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(fallbackOut);
    }

    const sizeWebp = (fs.statSync(webpOut).size / 1024).toFixed(0);
    const sizeFallback = (fs.statSync(fallbackOut).size / 1024).toFixed(0);
    console.log(`  ${src.file.padEnd(28)} ${sizeBefore.padStart(5)}KB  →  webp: ${sizeWebp}KB  +  fallback: ${sizeFallback}KB`);
  }

  console.log('\n--- Génération de l\'OG image (1200x630) ---\n');

  const ogSvg = path.join(IMG_DIR, 'og-cover.svg');
  const ogJpg = path.join(IMG_DIR, 'og-cover.jpg');

  if (fs.existsSync(ogSvg)) {
    await sharp(ogSvg)
      .resize(1200, 630)
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(ogJpg);

    const ogSize = (fs.statSync(ogJpg).size / 1024).toFixed(0);
    console.log(`  og-cover.svg → og-cover.jpg (${ogSize}KB)`);
  } else {
    console.warn('  [SKIP] images/og-cover.svg introuvable');
  }

  console.log('\nFait.\n');
  console.log('Étapes suivantes :');
  console.log('  1. Vérifie les fichiers dans images/');
  console.log('  2. Remplace les <img src="...png"> dans les HTML par <picture> avec WebP + fallback (optionnel)');
  console.log('  3. Ou simplement remplace les originaux par les versions -opt si tu veux garder le tag <img> simple');
}

compress().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
