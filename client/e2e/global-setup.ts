import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Every run starts from the same demo data, so the tests can count on it.
export default function globalSetup() {
  const serverDir = fileURLToPath(new URL('../../server', import.meta.url));
  execSync('npm run seed', { cwd: serverDir, stdio: 'inherit' });
}
