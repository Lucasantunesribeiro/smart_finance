// Test para verificar as variáveis de ambiente do Next.js
const { spawn } = require('child_process');
const path = require('path');

const nextProcess = spawn('node', ['-e', `
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
`], {
  cwd: '/mnt/d/Programacao/smartfinance/frontend',
  stdio: 'inherit'
});

nextProcess.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});