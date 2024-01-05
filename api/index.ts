import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'
import { addRole, createUser, getEnv, getUser } from '../lib/harper'

// Run it on the Vercel edge
export const config = {
  runtime: 'edge',
}

const app = new Hono()

// If you're getting started with deploying your auth
// Do this for the very first time to be able to
// Create custom user login(s) from here on
app.post('/create/user/roles', async (c) => {
  const { roleName, tableName } = await c.req.json()
  // Validation of the body fields
  if (!roleName || !tableName) return c.json({ error: 'Invalid role creation.' })
  // Create a new kind user roles
  const newRoleResponse = await addRole(c, roleName, tableName)
  return c.json(newRoleResponse)
})

app.post('/get/user', async (c) => {
  const { username, password } = await c.req.parseBody()
  // Validation of the body fields
  if (!username || !password) return c.json({ error: 'Invalid credentials' })
  // Fetch the user from the credentials by creating authentication token
  const tmp = await getUser(c, username as string, password as string)
  // Extract the two vital things: operation tokens & error (if any)
  const { operation_token, error } = tmp
  if (error) return c.json({ error })
  // Create and set a signed cookie based on the server-side secret
  await setSignedCookie(c, 'custom_auth', JSON.stringify({ username, operation_token }), getEnv(c, 'CUSTOM_SECRET'), {
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
  })
  return c.json({})
})

app.post('/create/user', async (c) => {
  const { username, password, roleName } = await c.req.parseBody()
  // Validation of the body fields
  if (!username || !roleName || !password) return c.json({ error: 'Invalid credentials.' })
  const tmp = await createUser(c, username as string, password as string, roleName as string)
  // Extract the two vital things: operation tokens & error (if any)
  const { operation_token, error } = tmp
  if (error) return c.json({ error })

  // Do some server-side operation
  // say detect that it's logged in via Web (and not mobile)
  // const web = true
  // await insert([{ username, web }])
  // Create and set a signed cookie based on the server-side secret
  await setSignedCookie(c, 'custom_auth', JSON.stringify({ username, operation_token }), getEnv(c, 'CUSTOM_SECRET'), {
    path: '/',
    httpOnly: true,
    sameSite: 'Strict',
  })
  return c.json({})
})

// Just like any endpoint
// You can use this method to obtain the user object
// containing the auth header for database calls
app.get('/get/session', async (c) => {
  // Obtain the signed cookie based on the server-side secret
  const authCookie = await getSignedCookie(c, getEnv(c, 'CUSTOM_SECRET'), 'custom_auth')
  if (authCookie) {
    const tmp = JSON.parse(authCookie)
    // Extract the vital thing: operation token of the logged in user
    const { operation_token } = tmp
    if (operation_token) {
      // delete the fields that you do not want
      // to be exposed on the client-side
      delete tmp['operation_token']
      delete tmp['refresh_token']
      // return everything that was stored with the session
      return c.json(tmp)
    }
  }
  return c.json({ error: 'No login found.' })
})

export default handle(app)
