const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const outputFile = path.join(__dirname, 'content.js');

function build() {
  console.log('Building content.js...');
  
  // Get all .js files in src directory
  const files = fs.readdirSync(srcDir)
    .filter(file => file.endsWith('.js'))
    .sort(); // This ensures 00-header, 01-..., etc are in correct order

  let mergedContent = '';
  
  for (const file of files) {
    const filePath = path.join(srcDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    mergedContent += `// --- File: ${file} ---\n${content}\n\n`;
  }

  fs.writeFileSync(outputFile, mergedContent, 'utf8');
  console.log(`✅ Successfully built content.js from ${files.length} modules!`);
}

build();
