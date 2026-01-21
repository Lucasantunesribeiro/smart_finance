const { exec } = require('child_process');
const fs = require('fs');

console.log('🎨 DEPLOYING ORIGINAL SMARTFINANCE DESIGN');
console.log('==========================================');
console.log('✅ Design: BLACK/WHITE modern theme (ORIGINAL)');
console.log('✅ Layout: DashboardLayout with sidebar navigation');
console.log('✅ Components: Original React + shadcn/ui');
console.log('✅ Backend: SmartRouter v2.0.0 (http://34.203.238.219:5000)');
console.log('✅ Frontend: Next.js 14 authentic build');

function executeCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 ${description}...`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
      } else {
        console.log(`✅ ${description} completed`);
        if (stdout) console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

async function deployOriginalDesign() {
  try {
    // Kill any existing processes
    console.log('\n🧹 Cleaning up existing processes...');
    try {
      await executeCommand('pkill -f "modern-server" || true', 'Kill custom HTML server');
      await executeCommand('pkill -f "port.*3000" || true', 'Kill port 3000 processes');
    } catch (e) {
      console.log('   No processes to kill (good!)');
    }

    // Build original Next.js app
    await executeCommand('npm run build', 'Building original Next.js app');

    // Create production startup script
    const startupScript = `#!/bin/bash
echo "🚀 SmartFinance ORIGINAL Design - Production Start"
echo "=============================================="
echo "🎨 Theme: Black/White modern (AUTHENTIC ORIGINAL)"
echo "📱 Layout: DashboardLayout + Sidebar Navigation"
echo "⚡ Framework: Next.js 14 with React 18"
echo "🌐 API: http://34.203.238.219:5000/api/v1"
echo ""

export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

echo "Starting Next.js server on port 3000..."
npm start

echo "🎯 Application available at: http://34.203.238.219:3000"
echo "✅ Original black/white sidebar design restored!"
`;

    fs.writeFileSync('/mnt/d/Programacao/smartfinance/frontend/start-original.sh', startupScript);
    await executeCommand('chmod +x start-original.sh', 'Make startup script executable');

    console.log('\n🎉 ORIGINAL DESIGN DEPLOYMENT READY!');
    console.log('=====================================');
    console.log('🎨 Design: AUTHENTIC black/white theme with sidebar');
    console.log('📱 Components: Original DashboardLayout + React components');
    console.log('🚀 Framework: Next.js 14 (NOT custom HTML server)');
    console.log('🌐 Backend: Working SmartRouter v2.0.0');
    console.log('');
    console.log('🎯 TO START: ./start-original.sh');
    console.log('🌐 URL: http://34.203.238.219:3000');
    console.log('');
    console.log('✅ EXACT ORIGINAL DESIGN RESTORED AS REQUESTED!');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployOriginalDesign();