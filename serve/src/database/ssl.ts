/**
 * TLS settings for Postgres.
 *
 * Local connections and DATABASE_SSL=false use no TLS.
 * Every other host verifies the server certificate.
 * DATABASE_SSL_REJECT_UNAUTHORIZED=false is an explicit opt-out for a host
 * whose certificate is not in Node's trust store. Do not set
 * NODE_TLS_REJECT_UNAUTHORIZED.
 */

export function databaseSsl(
    connectionString: string
): false | { rejectUnauthorized: boolean } {
    const forceOff = process.env.DATABASE_SSL === 'false';
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    if (forceOff || isLocal) return false;

    return {
        rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
}
