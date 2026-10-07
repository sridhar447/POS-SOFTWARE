import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🏎️  STARTING SHOWROOM ERP & POS FULLSTACK SYSTEM...\n');

// 1. Start Backend Server
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'backend'),
  shell: true,
  stdio: 'inherit'
});

// 2. Start Frontend Vite Server
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  shell: true,
  stdio: 'inherit'
});

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping Showroom ERP servers...');
  backend.kill();
  frontend.kill();
  process.exit();
});
