'use server'

import { login, logout } from './auth'

export async function c3paoLogin(formData: FormData) {
  return login(formData)
}

export async function c3paoLogout() {
  return logout()
}
