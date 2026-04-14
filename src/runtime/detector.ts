import { checkPrerequisite } from './prerequisite.js';

export interface RuntimeStatus {
  node: { available: boolean; version: string | null; manager: 'volta' | 'nvm' | 'system' | null };
  python: { available: boolean; version: string | null; manager: 'uv' | 'system' | null };
  uv: { available: boolean; version: string | null };
  volta: { available: boolean; version: string | null };
}

export function detectRuntimes(): RuntimeStatus {
  const nodeCheck = checkPrerequisite('node');
  const pythonCheck = checkPrerequisite('python');
  const uvCheck = checkPrerequisite('uv');
  const voltaCheck = checkPrerequisite('volta');

  // Detect node manager
  let nodeManager: 'volta' | 'nvm' | 'system' | null = null;
  if (nodeCheck.found) {
    if (voltaCheck.found) nodeManager = 'volta';
    else if (process.env.NVM_DIR) nodeManager = 'nvm';
    else nodeManager = 'system';
  }

  // Detect python manager
  let pythonManager: 'uv' | 'system' | null = null;
  if (pythonCheck.found) {
    pythonManager = uvCheck.found ? 'uv' : 'system';
  }

  return {
    node: { available: nodeCheck.found, version: nodeCheck.version, manager: nodeManager },
    python: { available: pythonCheck.found, version: pythonCheck.version, manager: pythonManager },
    uv: { available: uvCheck.found, version: uvCheck.version },
    volta: { available: voltaCheck.found, version: voltaCheck.version },
  };
}
