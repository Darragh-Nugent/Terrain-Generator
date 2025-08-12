import React, { useState } from 'react'
import * as api from './api'

export default function App() {
  const [token, setToken] = useState('')
  const [output, setOutput] = useState(null)

  async function handleLogin() {
    const data = await api.login('testuser', 'testpass')
    setOutput(data)
    if (data.token) setToken(data.token)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Map Generator API Client</h1>
      <button onClick={handleLogin}>Login</button>
      <button onClick={async () => setOutput(await api.get3DTerrain())}>
        Get 3D Terrain
      </button>
      <button onClick={async () => setOutput(await api.generateHeightMap())}>
        Generate Height Map
      </button>
      {token && (
        <>
          <button onClick={async () => setOutput(await api.getAllTerrainsFromUser(token))}>
            Get My Terrains
          </button>
          <button onClick={async () => setOutput(await api.addTerrain(token, { name: "New Terrain" }))}>
            Add Terrain
          </button>
          <button onClick={async () => setOutput(await api.deleteTerrain(token, 1))}>
            Delete Terrain ID 1
          </button>
        </>
      )}
      <button onClick={async () => setOutput(await api.getAllUsers())}>
        Get All Users
      </button>
      <button onClick={async () => setOutput(await api.addUser("newuser", "newpass"))}>
        Add User
      </button>

      <pre style={{ marginTop: 20 }}>{JSON.stringify(output, null, 2)}</pre>
    </div>
  )
}
