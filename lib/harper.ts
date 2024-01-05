import { env } from 'hono/adapter'
import type { Context } from 'hono'

// Get a secret in your deployment
export const getEnv = (c: Context, name: string) => {
  const ENV = env(c, 'edge-light')
  return ENV[name]
}

export const harperFetch = (c: Context, body: { [k: string]: any }) => {
  const { HARPER_DB_URL, HARPER_AUTH_TOKEN } = env<{ HARPER_DB_URL: string | undefined; HARPER_AUTH_TOKEN: string | undefined }>(c, 'edge-light')
  if (!HARPER_DB_URL) throw new Error('No HARPER_DB_URL environment variable found.')
  if (!HARPER_AUTH_TOKEN) throw new Error('No HARPER_AUTH_TOKEN environment variable found.')
  const postBody: { [property: string]: any } = body
  if (postBody['operation'] !== 'add_role') {
    postBody['database'] = 'list'
    postBody['table'] = 'collection'
  }
  return fetch(HARPER_DB_URL, {
    method: 'POST',
    body: JSON.stringify(postBody),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + HARPER_AUTH_TOKEN,
    },
  })
}

export const addRole = async (c: Context, role: string, tableName: string) => {
  const t = await harperFetch(c, {
    operation: 'add_role',
    // role of the users
    role,
    // permission for the users added
    // by default allow them nothing
    permission: {
      super_user: false,
      list: {
        tables: {
          [tableName]: {
            read: false,
            insert: false,
            update: false,
            delete: false,
            attribute_permissions: [],
          },
        },
      },
    },
  })
  // the response would contain the "id" attribute
  return await t.json()
}

export const createUser = async (c: Context, username: string, password: string, role: string, active: boolean = true) => {
  const t = await harperFetch(c, {
    operation: 'add_user',
    username,
    password,
    active,
    role,
  })
  // the response would contain the "message" attribute which'd contain succesfully
  return await t.json()
}

export const getUser = async (c: Context, username: string, password: string) => {
  const t = await harperFetch(c, {
    operation: 'create_authentication_tokens',
    username,
    password,
  })
  // the response would contain the "operation_token" attribute
  return await t.json()
}

export const validateUser = async (c: Context) => {
  const t = await harperFetch(c, {
    operation: 'user_info',
  })
  // the response would contain the "operation_token" attribute
  return await t.json()
}
