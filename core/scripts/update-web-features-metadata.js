import fs from 'fs';
import {execSync} from 'node:child_process';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.resolve(__dirname, '../../');
const pkgPath = path.join(rootPath, 'package.json');
const outputPath = path.join(rootPath, 'core/lib/baseline/web-features-metadata.json');

function main() {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const versionSpec = pkg.dependencies['web-features'];
    if (!versionSpec) {
      throw new Error('web-features dependency not found in package.json');
    }

    // Normalize version spec (remove carets/tildes)
    const version = versionSpec.replace(/^[\^~]/, '');

    console.log(`Fetching release date for web-features v${version}...`);
    const timeJson = execSync(`npm view web-features time --json`, {encoding: 'utf8'});
    const times = JSON.parse(timeJson);
    const dateStr = times[version];
    if (!dateStr) {
      throw new Error(`Could not find release date for version ${version} in 'npm view time'`);
    }

    const date = dateStr.split('T')[0]; // YYYY-MM-DD

    const metadata = {version, date};
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2) + '\n');
    console.log(`Generated ${outputPath}`);
  } catch (err) {
    console.error(`Error in update-web-features-metadata: ${err.message}`);
    process.exit(1);
  }
}

main();
