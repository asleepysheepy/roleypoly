import {
  evaluatePermission,
  permissions as Permissions,
} from '@roleypoly/misc-utils/hasPermission';
import { SessionData, UserGuildPermissions } from '@roleypoly/types';
import KSUID from 'ksuid';
import { Handler } from '../router';
import { allowedCallbackHosts, apiPublicURI, rootUsers } from './config';
import { Sessions, WrappedKVNamespace } from './kv';

export const formData = (obj: Record<string, any>): string => {
  return Object.keys(obj)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
};

export const addCORS = (init: ResponseInit = {}) => ({
  ...init,
  headers: {
    ...(init.headers || {}),
    'access-control-allow-origin': '*',
    'access-control-allow-methods': '*',
    'access-control-allow-headers': '*',
  },
});

export const respond = (obj: Record<string, any>, init: ResponseInit = {}) =>
  new Response(JSON.stringify(obj), addCORS(init));

export const resolveFailures = (
  handleWith: () => Response,
  handler: (request: Request) => Promise<Response> | Response
) => async (request: Request): Promise<Response> => {
  try {
    return handler(request);
  } catch (e) {
    console.error(e);
    return handleWith() || respond({ error: 'internal server error' }, { status: 500 });
  }
};

export const parsePermissions = (
  permissions: bigint,
  owner: boolean = false
): UserGuildPermissions => {
  if (owner || evaluatePermission(permissions, Permissions.ADMINISTRATOR)) {
    return UserGuildPermissions.Admin;
  }

  if (evaluatePermission(permissions, Permissions.MANAGE_ROLES)) {
    return UserGuildPermissions.Manager;
  }

  return UserGuildPermissions.User;
};

export const getSessionID = (request: Request): { type: string; id: string } | null => {
  const sessionID = request.headers.get('authorization');
  if (!sessionID) {
    return null;
  }

  const [type, id] = sessionID.split(' ');
  if (type !== 'Bearer') {
    return null;
  }

  return { type, id };
};

export const userAgent =
  'DiscordBot (https://github.com/roleypoly/roleypoly, git-main) (+https://roleypoly.com)';

export enum AuthType {
  Bearer = 'Bearer',
  Bot = 'Bot',
}

export const discordFetch = async <T>(
  url: string,
  auth: string,
  authType: AuthType = AuthType.Bearer,
  init?: RequestInit
): Promise<T | null> => {
  const response = await fetch('https://discord.com/api/v8' + url, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      authorization: `${AuthType[authType]} ${auth}`,
      'user-agent': userAgent,
    },
  });

  if (response.status >= 400) {
    console.error('discordFetch failed', {
      url,
      authType,
      payload: await response.text(),
    });
  }

  if (response.ok) {
    return (await response.json()) as T;
  } else {
    return null;
  }
};

export const cacheLayer = <Identity, Data>(
  kv: WrappedKVNamespace,
  keyFactory: (identity: Identity) => string,
  missHandler: (identity: Identity) => Promise<Data | null>,
  ttlSeconds?: number
) => async (
  identity: Identity,
  options: { skipCachePull?: boolean } = {}
): Promise<Data | null> => {
  const key = keyFactory(identity);

  if (!options.skipCachePull) {
    const value = await kv.get<Data>(key);
    if (value) {
      return value;
    }
  }

  const fallbackValue = await missHandler(identity);
  if (!fallbackValue) {
    return null;
  }

  await kv.put(key, fallbackValue, ttlSeconds);

  return fallbackValue;
};

const NotAuthenticated = (extra?: string) =>
  respond(
    {
      error: extra || 'not authenticated',
    },
    { status: 403 }
  );

export const withSession = (
  wrappedHandler: (session: SessionData) => Handler
): Handler => async (request: Request): Promise<Response> => {
  const sessionID = getSessionID(request);
  if (!sessionID) {
    return NotAuthenticated('missing authentication');
  }

  const session = await Sessions.get<SessionData>(sessionID.id);
  if (!session) {
    return NotAuthenticated('authentication expired or not found');
  }

  return await wrappedHandler(session)(request);
};

export const setupStateSession = async <T>(data: T): Promise<string> => {
  const stateID = (await KSUID.random()).string;

  await Sessions.put(`state_${stateID}`, { data }, 60 * 5);

  return stateID;
};

export const getStateSession = async <T>(stateID: string): Promise<T | undefined> => {
  const stateSession = await Sessions.get<{ data: T }>(`state_${stateID}`);

  return stateSession?.data;
};

export const isRoot = (userID: string): boolean => rootUsers.includes(userID);

export const onlyRootUsers = (handler: Handler): Handler =>
  withSession((session) => (request: Request) => {
    if (isRoot(session.user.id)) {
      return handler(request);
    }

    return respond(
      {
        error: 'not_found',
      },
      {
        status: 404,
      }
    );
  });

export const getQuery = (request: Request): { [x: string]: string } => {
  const output: { [x: string]: string } = {};

  for (let [key, value] of new URL(request.url).searchParams.entries()) {
    output[key] = value;
  }

  return output;
};

export const isAllowedCallbackHost = (host: string): boolean => {
  return (
    host === apiPublicURI ||
    allowedCallbackHosts.includes(host) ||
    allowedCallbackHosts
      .filter((callbackHost) => callbackHost.includes('*'))
      .find((wildcard) => new RegExp(wildcard.replace('*', '[a-z0-9-]+')).test(host)) !==
      null
  );
};
