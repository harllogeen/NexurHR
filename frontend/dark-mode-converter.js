const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'app', 'components');
const excludeFiles = [];

const replacements = [
  // Backgrounds
  { regex: /\bbg-white\b(?! dark:bg-)/g, replacement: 'bg-white dark:bg-slate-900 transition-colors' },
  { regex: /\bbg-gray-50\b(?! dark:bg-)/g, replacement: 'bg-gray-50 dark:bg-slate-950 transition-colors' },
  { regex: /\bbg-slate-50\b(?! dark:bg-)/g, replacement: 'bg-slate-50 dark:bg-slate-950 transition-colors' },
  { regex: /\bbg-gray-100\b(?! dark:bg-)/g, replacement: 'bg-gray-100 dark:bg-slate-800 transition-colors' },
  { regex: /\bbg-slate-100\b(?! dark:bg-)/g, replacement: 'bg-slate-100 dark:bg-slate-800 transition-colors' },
  { regex: /\bbg-blue-50\b(?! dark:bg-)/g, replacement: 'bg-blue-50 dark:bg-blue-900/30 transition-colors' },
  { regex: /\bbg-indigo-50\b(?! dark:bg-)/g, replacement: 'bg-indigo-50 dark:bg-indigo-900/30 transition-colors' },
  { regex: /\bbg-amber-50\b(?! dark:bg-)/g, replacement: 'bg-amber-50 dark:bg-amber-900/30 transition-colors' },
  { regex: /\bbg-emerald-50\b(?! dark:bg-)/g, replacement: 'bg-emerald-50 dark:bg-emerald-900/30 transition-colors' },
  { regex: /\bbg-red-50\b(?! dark:bg-)/g, replacement: 'bg-red-50 dark:bg-red-900/30 transition-colors' },
  
  // Text
  { regex: /\btext-gray-900\b(?! dark:text-)/g, replacement: 'text-gray-900 dark:text-white' },
  { regex: /\btext-slate-900\b(?! dark:text-)/g, replacement: 'text-slate-900 dark:text-white' },
  { regex: /\btext-gray-800\b(?! dark:text-)/g, replacement: 'text-gray-800 dark:text-slate-200' },
  { regex: /\btext-slate-800\b(?! dark:text-)/g, replacement: 'text-slate-800 dark:text-slate-200' },
  { regex: /\btext-gray-700\b(?! dark:text-)/g, replacement: 'text-gray-700 dark:text-slate-300' },
  { regex: /\btext-slate-700\b(?! dark:text-)/g, replacement: 'text-slate-700 dark:text-slate-300' },
  { regex: /\btext-gray-600\b(?! dark:text-)/g, replacement: 'text-gray-600 dark:text-slate-400' },
  { regex: /\btext-slate-600\b(?! dark:text-)/g, replacement: 'text-slate-600 dark:text-slate-400' },
  { regex: /\btext-gray-500\b(?! dark:text-)/g, replacement: 'text-gray-500 dark:text-slate-400' },
  { regex: /\btext-slate-500\b(?! dark:text-)/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { regex: /\btext-blue-600\b(?! dark:text-)/g, replacement: 'text-blue-600 dark:text-blue-400' },
  
  // Borders
  { regex: /\bborder-gray-300\b(?! dark:border-)/g, replacement: 'border-gray-300 dark:border-slate-600' },
  { regex: /\bborder-gray-200\b(?! dark:border-)/g, replacement: 'border-gray-200 dark:border-slate-700' },
  { regex: /\bborder-slate-200\b(?! dark:border-)/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /\bborder-gray-100\b(?! dark:border-)/g, replacement: 'border-gray-100 dark:border-slate-800' },
  { regex: /\bborder-slate-100\b(?! dark:border-)/g, replacement: 'border-slate-100 dark:border-slate-800' },
  { regex: /\bborder-blue-100\b(?! dark:border-)/g, replacement: 'border-blue-100 dark:border-blue-800/50' },

  // Forms / Inputs
  { regex: /\bplaceholder-gray-400\b(?! dark:placeholder-)/g, replacement: 'placeholder-gray-400 dark:placeholder-slate-500' },
  { regex: /\bplaceholder-gray-500\b(?! dark:placeholder-)/g, replacement: 'placeholder-gray-500 dark:placeholder-slate-400' },
  { regex: /\btext-gray-400\b(?! dark:text-)/g, replacement: 'text-gray-400 dark:text-slate-500' },
  { regex: /\btext-slate-400\b(?! dark:text-)/g, replacement: 'text-slate-400 dark:text-slate-500' },

  // Shadows
  { regex: /\bshadow-sm\b(?! dark:shadow-none)/g, replacement: 'shadow-sm dark:shadow-none' },
  { regex: /\bshadow\b(?! dark:shadow-none|-)/g, replacement: 'shadow dark:shadow-none' },
  { regex: /\bshadow-md\b(?! dark:shadow-none)/g, replacement: 'shadow-md dark:shadow-none' },
  
  // Dividers
  { regex: /\bdivide-gray-200\b(?! dark:divide-)/g, replacement: 'divide-gray-200 dark:divide-slate-700' },
  { regex: /\bdivide-gray-100\b(?! dark:divide-)/g, replacement: 'divide-gray-100 dark:divide-slate-800' },

  // Table rows
  { regex: /\bhover:bg-gray-50\b(?! dark:hover:bg-)/g, replacement: 'hover:bg-gray-50 dark:hover:bg-slate-800/50' },
  { regex: /\bhover:bg-slate-50\b(?! dark:hover:bg-)/g, replacement: 'hover:bg-slate-50 dark:hover:bg-slate-800/50' },
];

let modifiedFiles = 0;

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.html') && !excludeFiles.includes(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      if (content !== originalContent) {
        // Clean up any double transition-colors
        content = content.replace(/transition-colors transition-colors/g, 'transition-colors');
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
        modifiedFiles++;
      }
    }
  }
}

processDirectory(componentsDir);
console.log(`Dark mode conversion completed. Modified ${modifiedFiles} files.`);
