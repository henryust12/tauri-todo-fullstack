import { spawn } from 'node:child_process';
import net from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const application = path.resolve(here, '../src-tauri/target/debug/tauri-todo');

// Fresh data home per run: the app keeps its SQLite file under XDG_DATA_HOME.
// The launcher creates it; worker processes inherit it through the environment.
process.env.E2E_DATA_HOME ??= mkdtempSync(path.join(tmpdir(), 'tauri-todo-e2e-'));
const dataHome = process.env.E2E_DATA_HOME;

const DRIVER_PORT = 4444;
let tauriDriver;
let exiting = false;

// Resolve once the driver accepts connections; fail after 30 s.
function waitForDriver() {
  const deadline = Date.now() + 30000;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(DRIVER_PORT, '127.0.0.1');
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`tauri-driver did not listen on port ${DRIVER_PORT} within 30s`));
        } else {
          setTimeout(attempt, 100);
        }
      });
    };
    attempt();
  });
}

function stopDriver() {
  exiting = true;
  tauriDriver?.kill();
}

export const config = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: DRIVER_PORT,
  specs: ['./specs/**/*.e2e.js'],
  maxInstances: 1,
  capabilities: [{ maxInstances: 1, 'tauri:options': { application } }],
  logLevel: 'warn',
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: { ui: 'bdd', timeout: 60000 },
  // One driver for the whole run, so reloadSession can open a second app process.
  onPrepare: () => {
    tauriDriver = spawn('tauri-driver', [], {
      stdio: [null, process.stdout, process.stderr],
      env: { ...process.env, XDG_DATA_HOME: dataHome }
    });
    tauriDriver.on('error', (error) => {
      console.error('tauri-driver failed to start:', error);
      process.exit(1);
    });
    tauriDriver.on('exit', (code) => {
      if (!exiting) {
        console.error('tauri-driver exited with code:', code);
        process.exit(1);
      }
    });
    return waitForDriver();
  },
  onComplete: () => {
    stopDriver();
    rmSync(dataHome, { recursive: true, force: true });
  }
};

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    stopDriver();
    process.exit(1);
  });
}
