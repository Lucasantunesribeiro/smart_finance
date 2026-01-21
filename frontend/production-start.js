const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SmartFinance with ORIGINAL React Design...');
console.log('📱 Design: Black/White modern theme with sidebar navigation');
console.log('🎨 Components: DashboardLayout + shadcn/ui original');

const nextProcess = spawn('npm', ['start'], {
  stdio: 'inherit',
  cwd: path.join(__dirname),
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '3000',
    HOSTNAME: '0.0.0.0'
  }
});

nextProcess.on('error', (err) => {
  console.error('❌ Error starting Next.js:', err);
  process.exit(1);
});

nextProcess.on('close', (code) => {
  console.log(`Next.js process exited with code ${code}`);
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  nextProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  nextProcess.kill('SIGINT');
});