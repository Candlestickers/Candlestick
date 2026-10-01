const { spawnSync } = require('node:child_process');
const path = require('node:path');

if (process.versions.node.split('.')[0] !== '24') {
  console.error('Candlestick iOS builds require Node 24. Run nvm use first.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const [command, ...args] = process.argv.slice(2);
function run(executable, argv, extraEnv = {}) {
  const result = spawnSync(executable, argv, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status || 1);
}

if (command === 'frontend' || command === 'frontend-dev') {
  run('npm', ['run', 'build-engine']);
  run('npm', ['run', command === 'frontend' ? 'build:nocname' : 'start'], {
    PUBLIC_URL: '.',
    BROWSER: 'none',
    HOST: '0.0.0.0',
    REACT_APP_TAURI_PLATFORM: 'ios',
  });
} else if (['init', 'dev', 'build'].includes(command)) {
  if (process.platform !== 'darwin') {
    console.error('iOS builds require macOS and Xcode.');
    process.exit(1);
  }
  run(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), 'ios', command, ...args]);
} else {
  console.error('Usage: node scripts/ios.cjs init|dev|build|frontend|frontend-dev');
  process.exit(1);
}
