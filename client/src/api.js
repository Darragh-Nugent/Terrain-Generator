// Handles API requests
const API_BASE = '/api' // same origin in prod

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uName: username, pass: password })
  })
  return res.json()
}

export async function get3DTerrain() {
  const res = await fetch(`${API_BASE}/get3DTerrain`)
  return res.json()
}

export async function generateHeightMap() {
  const res = await fetch(`${API_BASE}/generateHeightMap`)
  return res.json()
}

export async function getAllTerrainsFromUser(token) {
  const res = await fetch(`${API_BASE}/getAllTerrainsFromUser`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.json()
}

export async function addTerrain(token, data) {
  const res = await fetch(`${API_BASE}/addTerrain`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteTerrain(token, id) {
  const res = await fetch(`${API_BASE}/deleteTerrain`, {
    method: 'DELETE',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ id })
  })
  return res.json()
}

export async function getAllUsers() {
  const res = await fetch(`${API_BASE}/getAllUsers`)
  return res.json()
}

export async function addUser(username, password) {
  const res = await fetch(`${API_BASE}/addUser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uName: username, pass: password })
  })
  return res.json()
}
