const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

walk('src/app', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace hardcoded whites
    content = content.replace(/color:\s*['"]white['"]/g, "color: 'inherit'");
    
    // Replace hardcoded transparent whites with theme variables
    content = content.replace(/['"]rgba\(255,\s*255,\s*255,\s*0\.05\)['"]/g, "'var(--background)'");
    content = content.replace(/['"]rgba\(255,\s*255,\s*255,\s*0\.1\)['"]/g, "'var(--border-thin)'");
    content = content.replace(/['"]rgba\(255,\s*255,\s*255,\s*0\.[2-7]\)['"]/g, "'var(--text-secondary)'");
    content = content.replace(/['"]rgba\(255,\s*255,\s*255,\s*0\.[8-9]\)['"]/g, "'var(--foreground)'");
    
    // Replace old css variables
    content = content.replace(/var\(--glass-border\)/g, "var(--border-thin)");
    
    // Soften black modal overlays
    content = content.replace(/background:\s*['"]rgba\(0,\s*0,\s*0,\s*0\.8[5]?\)['"]/g, "background: 'rgba(0,0,0,0.3)'");
    
    // Remove green/yellow highlights for success/warning
    content = content.replace(/background:\s*['"]rgba\(0,\s*255,\s*0,\s*0\.1\)['"]/g, "background: 'var(--background)'");
    content = content.replace(/borderColor:\s*['"]rgba\(0,\s*255,\s*0,\s*0\.2\)['"]/g, "borderColor: 'var(--border-thin)'");
    content = content.replace(/background:\s*['"]rgba\(255,\s*204,\s*0,\s*0\.05\)['"]/g, "background: 'var(--background)'");
    content = content.replace(/border:\s*['"]1px solid rgba\(255,\s*204,\s*0,\s*0\.1\)['"]/g, "border: '1px solid var(--border-thin)'");
    
    // Replace old secondary dark colors
    content = content.replace(/background:\s*['"]#444['"]/g, "background: 'var(--border)'");
    content = content.replace(/background:\s*['"]rgba\(0,\s*0,\s*0,\s*0\.2\)['"]/g, "background: 'var(--background)'");
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log('Done replacing styles.');
