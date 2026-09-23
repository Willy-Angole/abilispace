/**
 * Base URL for locally stored uploads.
 * Never trust an arbitrary Host or X-Forwarded-Proto header: a client can
 * set those and store a link to another site inside a message.
 */
const LOCAL_HOST = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

export function publicUploadBase(options: {
    configured?: string;
    host?: string;
    port: number;
}): string {
    const configured = options.configured?.trim().replace(/\/$/, '');
    if (configured) return configured;

    const host = (options.host || '').trim().toLowerCase();
    if (LOCAL_HOST.test(host)) return `http://${host}`;

    return `http://127.0.0.1:${options.port}`;
}
