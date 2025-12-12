/**
 * Kill process using port 5000 (Windows)
 * Usage: node scripts/kill-port.js
 */

const { exec } = require('child_process');
const os = require('os');

const PORT = process.env.PORT || 5000;

function killPortWindows(port) {
  return new Promise((resolve, reject) => {
    // Find process using the port
    exec(`netstat -ano | findstr :${port}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`✅ Port ${port} is free (no process found)`);
        return resolve();
      }

      // Extract PID from output
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      lines.forEach(line => {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          pids.add(match[1]);
        }
      });

      if (pids.size === 0) {
        console.log(`✅ Port ${port} is free`);
        return resolve();
      }

      // Kill all processes
      const pidArray = Array.from(pids);
      console.log(`🔍 Found ${pidArray.length} process(es) using port ${port}: ${pidArray.join(', ')}`);
      
      let killed = 0;
      pidArray.forEach(pid => {
        exec(`taskkill /PID ${pid} /F`, (killError) => {
          if (killError) {
            console.warn(`⚠️  Could not kill process ${pid}: ${killError.message}`);
          } else {
            console.log(`✅ Killed process ${pid}`);
            killed++;
          }
          
          if (killed === pidArray.length) {
            console.log(`\n✅ Port ${port} is now free. You can start the server.`);
            resolve();
          }
        });
      });
    });
  });
}

function killPortUnix(port) {
  return new Promise((resolve, reject) => {
    exec(`lsof -ti:${port}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`✅ Port ${port} is free (no process found)`);
        return resolve();
      }

      const pids = stdout.trim().split('\n').filter(Boolean);
      if (pids.length === 0) {
        console.log(`✅ Port ${port} is free`);
        return resolve();
      }

      console.log(`🔍 Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);
      
      pids.forEach(pid => {
        exec(`kill -9 ${pid}`, (killError) => {
          if (killError) {
            console.warn(`⚠️  Could not kill process ${pid}: ${killError.message}`);
          } else {
            console.log(`✅ Killed process ${pid}`);
          }
        });
      });
      
      console.log(`\n✅ Port ${port} is now free. You can start the server.`);
      resolve();
    });
  });
}

// Main
const platform = os.platform();
console.log(`🔍 Checking port ${PORT}...\n`);

if (platform === 'win32') {
  killPortWindows(PORT).catch(console.error);
} else {
  killPortUnix(PORT).catch(console.error);
}

