import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Working directory - let's make sure we're in the right place
process.chdir(path.join(__dirname, '..'));

// Relative paths from the contracts directory
const srcFile = 'src/ai-gaming-club.js';
const outputFile = 'build/ai-gaming-club.wasm';

// Ensure build directory exists
if (!fs.existsSync('build')) {
  fs.mkdirSync('build', { recursive: true });
}

// Check if contract file exists
if (!fs.existsSync(srcFile)) {
  console.error(`Contract file not found: ${srcFile}`);
  process.exit(1);
}

console.log('Building AI Gaming Club contract...');

try {
  // Use near-sdk-js to build the contract with relative paths
  const command = `npx near-sdk-js build ${srcFile} ${outputFile}`;
  console.log(`Executing command: ${command}`);
  execSync(command, { stdio: 'inherit' });
  console.log(`Contract built successfully: ${outputFile}`);
} catch (error) {
  console.error('Error building contract:', error.message);
  process.exit(1);
}
