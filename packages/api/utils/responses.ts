import { respond } from './api-tools';

export const ok = () => respond({ ok: true });

export const missingParameters = () =>
  respond({ error: 'missing parameters' }, { status: 400 });

export const lowPermissions = () =>
  respond({ error: 'no permissions for this action' }, { status: 403 });

export const notFound = () => respond({ error: 'not found' }, { status: 404 });

export const conflict = () => respond({ error: 'conflict' }, { status: 409 });

export const rateLimited = () =>
  respond({ error: 'rate limit hit, enhance your calm' }, { status: 419 });
