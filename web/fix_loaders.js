const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const newLoader = `      <div className="loading-container animate-fade">
        <div className="loader"></div>
        <div className="loading-text">Memuat...</div>
      </div>`;

walk('src/app', (filePath) => {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern for full screen loading
    const fullScreenRegex = /<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>\s*<div className="gradient-text".*?>.*?<\/div>\s*<\/div>/g;
    content = content.replace(fullScreenRegex, newLoader);

    // Pattern for purchase overlay loading
    const overlayRegex = /<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba\(0,0,0,0\.3\)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>\s*<div className="glass-card">Memproses...<\/div>\s*<\/div>/g;
    
    const newOverlay = `<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, gap: '16px', backdropFilter: 'blur(4px)' }}>
                    <div className="loader"></div>
                    <div className="loading-text" style={{ color: 'white' }}>Memproses...</div>
                </div>`;
    
    content = content.replace(overlayRegex, newOverlay);

    // Pattern for autobuy taking data
    const autoBuyLoadingRegex = /<div style={{ textAlign: 'center', padding: '40px' }}>\s*<div className="label animate-pulse">Sedang mengambil data...<\/div>\s*<\/div>/g;
    const newAutoBuyLoading = `<div style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="loader"></div>
                                <div className="label">Sedang mengambil data...</div>
                            </div>`;
    content = content.replace(autoBuyLoadingRegex, newAutoBuyLoading);

    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log('Loading animations standardized.');
