import { exec, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

console.log('[DEPLOY-HOOK] Ejecutando hook de reinicio automático del servidor...');

const serverPath = path.resolve(process.cwd(), 'dist', 'server.js');
const logPath = path.resolve(process.cwd(), 'app.log');

if (!fs.existsSync(serverPath)) {
  console.log('[DEPLOY-HOOK] Archivo dist/server.js no encontrado, omitiendo reinicio.');
  process.exit(0);
}

// 1. Matar procesos anteriores que ocupen el puerto 3000 o ejecuten dist/server.js
const killCmd = 'fuser -k 3000/tcp 2>/dev/null || kill $(lsof -t -i:3000) 2>/dev/null || pkill -f "dist/server.js" 2>/dev/null';

exec(killCmd, () => {
  setTimeout(() => {
    try {
      const out = fs.openSync(logPath, 'a');
      const err = fs.openSync(logPath, 'a');

      const child = spawn(process.execPath, [serverPath], {
        detached: true,
        stdio: ['ignore', out, err],
        cwd: process.cwd(),
        env: process.env
      });

      child.unref();
      console.log(`[DEPLOY-HOOK] Servidor Node.js reiniciado exitosamente en background con PID ${child.pid}`);
    } catch (e) {
      console.error('[DEPLOY-HOOK] Error al iniciar servidor:', e.message);
    }
    process.exit(0);
  }, 1000);
});
