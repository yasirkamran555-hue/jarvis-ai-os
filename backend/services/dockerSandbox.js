import { spawn } from 'node:child_process';

export async function runCodeInSandbox({ language = 'bash', code, timeoutMs = 20000 }) {
  return new Promise((resolve, reject) => {
    const command = language.toLowerCase();
    let child;
    let output = '';

    if (command === 'python') {
      child = spawn('python3', ['-c', code], { shell: false });
    } else if (command === 'javascript' || command === 'node' || command === 'js') {
      child = spawn('node', ['-e', code], { shell: false });
    } else {
      child = spawn('bash', ['-lc', code], { shell: false });
    }

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        ok: false,
        stdout: output,
        stderr: 'Execution timed out.',
        exitCode: 124
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`Sandbox failed: ${error.message}`));
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({
        ok: exitCode === 0,
        stdout: output,
        stderr: exitCode === 0 ? '' : output,
        exitCode
      });
    });
  });
}
