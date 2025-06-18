// Quick PWA Icon Generator Script
// Save as scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon for MTG Scanner
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#2563eb" rx="12"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white" stroke="#1e40af" stroke-width="2"/>
  <path d="M${size/2-size/6} ${size/2} L${size/2+size/6} ${size/2} M${size/2} ${size/2-size/6} L${size/2} ${size/2+size/6}" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
  <text x="${size/2}" y="${size-10}" text-anchor="middle" fill="white" font-family="Arial" font-size="${Math.max(8, size/20)}" font-weight="bold">MTG</text>
</svg>`;

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons
iconSizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  const fileName = `icon-${size}x${size}.svg`;
  const filePath = path.join(iconsDir, fileName);
  
  fs.writeFileSync(filePath, svgContent);
  console.log(`✅ Generated ${fileName}`);
});

// Create a simple placeholder PNG (you should replace with actual PNG conversion)
iconSizes.forEach(size => {
  const placeholderContent = `<!-- PNG placeholder for ${size}x${size} - Convert SVG to PNG using online tool -->`;
  const fileName = `icon-${size}x${size}.png.placeholder`;
  const filePath = path.join(iconsDir, fileName);
  
  fs.writeFileSync(filePath, placeholderContent);
  console.log(`📝 Created placeholder for icon-${size}x${size}.png`);
});

console.log('\n🎯 Next steps:');
console.log('1. Convert SVG files to PNG using online converter');
console.log('2. Replace .png.placeholder files with actual PNG files');
console.log('3. Or use the SVG files directly by updating manifest.json');

// Update manifest to use SVG files instead
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Update icons to use SVG
  manifest.icons = iconSizes.map(size => ({
    src: `/icons/icon-${size}x${size}.svg`,
    sizes: `${size}x${size}`,
    type: "image/svg+xml",
    purpose: "maskable any"
  }));
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Updated manifest.json to use SVG icons');
}