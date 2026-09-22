import { publicUploadBase } from '../public-url';

describe('publicUploadBase', () => {
    it('uses a configured public URL and strips a trailing slash', () => {
        expect(publicUploadBase({
            configured: 'https://api.abilispace.org/',
            host: 'evil.example',
            port: 4000,
        })).toBe('https://api.abilispace.org');
    });

    it('allows localhost hosts used in development', () => {
        expect(publicUploadBase({ host: 'localhost:4001', port: 4000 }))
            .toBe('http://localhost:4001');
    });

    it('rejects a spoofed Host header', () => {
        expect(publicUploadBase({ host: 'evil.example', port: 4001 }))
            .toBe('http://127.0.0.1:4001');
    });
});
