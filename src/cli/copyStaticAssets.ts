import fs from 'fs';
import path from 'path';

function copyFolderSync(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyStaticAssets() {
  const projectRoot = path.resolve(__dirname, '../../..');
  const srcRoot = path.join(projectRoot, 'src');
  const distSrcRoot = path.join(projectRoot, 'dist', 'src');

  const foldersToCopy = [
    { source: 'assets', target: 'assets' },
    {
      source: path.join('modules', 'mailing', 'templates'),
      target: path.join('modules', 'mailing', 'templates'),
    },
  ];

  for (const folder of foldersToCopy) {
    const sourcePath = path.join(srcRoot, folder.source);
    const targetPath = path.join(distSrcRoot, folder.target);

    if (fs.existsSync(sourcePath)) {
      copyFolderSync(sourcePath, targetPath);
      console.log(`Copied ${folder.source} -> dist/src/${folder.target}`);
    } else {
      console.warn(`Folder src/${folder.source} not found - skipping.`);
    }
  }
}

copyStaticAssets();
