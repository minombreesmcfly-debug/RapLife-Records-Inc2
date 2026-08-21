import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

function createProjectZip() {
  const zip = new AdmZip();
  const rootDir = process.cwd();
  const publicDir = path.join(rootDir, 'public');

  // Ignored directories and files
  const ignoredPatterns = [
    'node_modules',
    'dist',
    '.git',
    '.aistudio',
    'server-crash.log',
    'server-requests.log',
    'test.b64',
    'bundle_project.ts',
    'raplife-records-website.zip'
  ];

  function addFolderRecursively(currentPath: string, zipPath: string = '') {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      if (ignoredPatterns.includes(item) || item.endsWith('.zip')) {
        continue;
      }

      const fullPath = path.join(currentPath, item);
      const relativeZipPath = zipPath ? `${zipPath}/${item}` : item;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        addFolderRecursively(fullPath, relativeZipPath);
      } else if (stat.isFile()) {
        // Exclude large binary mp4 files if desired or include them safely
        if (item.endsWith('.mp4') && stat.size > 50 * 1024 * 1024) {
          continue;
        }
        zip.addLocalFile(fullPath, zipPath);
      }
    }
  }

  console.log('Bundling project into ZIP file...');
  addFolderRecursively(rootDir);

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, 'raplife-records-website.zip');
  zip.writeZip(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`Successfully created ZIP at: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

createProjectZip();
