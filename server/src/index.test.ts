import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ listen: vi.fn(), warm: vi.fn(), create: vi.fn() }));
vi.mock('./app.js', () => ({ createApp: mocks.create }));
vi.mock('./api/blocks.js', () => ({ warmBlockCache: mocks.warm }));
describe('production entry point', () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.create.mockReturnValue({ listen: mocks.listen });
    mocks.listen.mockImplementation((_port, _host, callback) => callback());
    mocks.warm.mockReturnValue({ count: 12, dir: '/fixture' });
    vi.stubEnv('PORT', undefined);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
  it('binds only to loopback and warms block metadata after startup', async () => {
    await import('./index.js');
    expect(mocks.listen).toHaveBeenCalledWith(3847, '127.0.0.1', expect.any(Function));
    expect(mocks.warm).toHaveBeenCalledOnce(); expect(console.info).toHaveBeenCalledWith(expect.stringContaining('12'));
  });
  it('supports a chosen port and starts without a configured installation', async () => {
    vi.stubEnv('PORT', '8003'); mocks.warm.mockImplementation(() => { throw new Error('not configured'); });
    await import('./index.js');
    expect(mocks.listen).toHaveBeenCalledWith(8003, '127.0.0.1', expect.any(Function));
    expect(console.warn).toHaveBeenCalled();
  });
  it.each(['NaN', '8003extra', '0', '65536'])('rejects invalid port %s', async port => {
    vi.stubEnv('PORT', port); await expect(import('./index.js')).rejects.toThrow('PORT'); expect(mocks.listen).not.toHaveBeenCalled();
  });
});
