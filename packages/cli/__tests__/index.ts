import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { execSync } from 'node:child_process';
import fetch from 'cross-fetch';

describe('kuai cli', () => {
  beforeAll(async () => {
    execSync('node ./lib/main.js node -p 9002 -d', { stdio: 'inherit' });
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }, 30000);

  afterAll(() => {
    execSync('node ./lib/main.js node stop', { stdio: 'inherit' });
  });

  test('ckb listening port', async () => {
    const res = await fetch('http://localhost:9002/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 0,
        jsonrpc: '2.0',
        method: 'get_tip_header',
        params: [],
      }),
    });
    expect(res.status).toEqual(200);

    const data = await res.json();

    expect(typeof data.result.number).toEqual('string');
    expect(typeof data.result.hash).toEqual('string');
  });
});
