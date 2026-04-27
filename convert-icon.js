#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const toIco = require('to-ico');

const logoPath = path.join(__dirname, 'public', 'Namaste_desk_logo.jpg');
const outputPath = path.join(__dirname, 'build', 'icon.ico');

if (!fs.existsSync(logoPath)) {
  console.error(`❌ Logo not found at ${logoPath}`);
  process.exit(1);
}

console.log('🔄 Converting logo to .ico format...');

// First resize to 256x256 for better icon quality
sharp(logoPath)
  .resize(256, 256, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
  .toBuffer()
  .then(async (resizedBuffer) => {
    try {
      const icoBuffer = await toIco([resizedBuffer]);

      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }

      fs.writeFileSync(outputPath, icoBuffer);
      console.log(`✅ Icon successfully created at build/icon.ico`);
    } catch (error) {
      console.error(`❌ Conversion failed: ${error.message}`);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(`❌ Failed to resize image: ${err.message}`);
    process.exit(1);
  });
