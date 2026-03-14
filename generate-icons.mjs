// Generate simple SVG-based PWA icons
import { writeFileSync } from 'fs'

function createIconSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size*0.12}" fill="#2d1810"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.38}" fill="#f5e0b5" stroke="#8B1A1A" stroke-width="${size*0.03}"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.30}" fill="#f0d090" stroke="#8B1A1A" stroke-width="${size*0.015}"/>
  <text x="${size/2}" y="${size/2}" font-family="serif" font-size="${size*0.38}" font-weight="bold" fill="#8B0000" text-anchor="middle" dominant-baseline="central">象</text>
</svg>`
}

writeFileSync('public/icons/icon-192.svg', createIconSVG(192))
writeFileSync('public/icons/icon-512.svg', createIconSVG(512))
writeFileSync('public/favicon.svg', createIconSVG(64))
console.log('Icons generated as SVG')
