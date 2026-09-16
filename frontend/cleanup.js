const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'app', 'components');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      // 1. Fix chained dark text classes caused by second script pass
      // (e.g. text-gray-500 dark:text-slate-400 dark:text-slate-500)
      content = content.replace(/dark:text-slate-400\s+dark:text-slate-500/g, 'dark:text-slate-400');
      
      // 2. Fix hover/focus/group-hover etc prefix missing on dark mode
      // e.g. hover:bg-white dark:bg-slate-900 -> hover:bg-white dark:hover:bg-slate-900
      const modifiers = ['hover', 'focus', 'active', 'group-hover', 'focus-within'];
      modifiers.forEach(mod => {
        // Match mod:bg-something dark:bg-something (optionally with opacity)
        const regex = new RegExp(`\\b${mod}:([a-z0-9-]+(?:\\/[0-9]+)?)\\s+dark:([a-z0-9-]+(?:\\/[0-9]+)?)(?:\\s+transition-colors)?`, 'g');
        content = content.replace(regex, (match, p1, p2) => {
          // If the dark class already has a modifier, skip
          if (p2.includes(':')) return match;
          
          let replacement = `${mod}:${p1} dark:${mod}:${p2}`;
          if (match.includes('transition-colors')) {
             replacement += ' transition-colors';
          }
          return replacement;
        });
      });

      // 3. Fix transition-colors opacity bug
      // e.g. bg-gray-50 dark:bg-slate-950 transition-colors/80 -> bg-gray-50/80 dark:bg-slate-950/80 transition-colors
      content = content.replace(/([a-z0-9-]+)\s+dark:([a-z0-9-]+)\s+transition-colors\/([0-9]+)/g, '$1/$3 dark:$2/$3 transition-colors');
      
      // 4. Any other duplicate cleanups
      content = content.replace(/transition-colors\s+transition-colors/g, 'transition-colors');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Cleaned: ${fullPath}`);
      }
    }
  }
}

processDirectory(componentsDir);
console.log('Cleanup completed.');
