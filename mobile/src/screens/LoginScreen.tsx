import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { API, setToken } from '../lib/api'

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [busy, setBusy]     = useState(false)

  async function submit() {
    if (!email || !pass) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      })
      if (!res.ok) {
        const d = await res.json()
        Alert.alert('Login failed', d.detail ?? 'Unknown error')
        return
      }
      const data = await res.json()
      await setToken(data.access_token)
      onLogin()
    } catch {
      Alert.alert('Network error', 'Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={s.logo}>1nexio</Text>
      <Text style={s.sub}>Your AI Workforce</Text>

      <View style={s.form}>
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor="#555"
          value={pass}
          onChangeText={setPass}
          secureTextEntry
        />
        <TouchableOpacity
          style={[s.btn, busy && s.btnDisabled]}
          onPress={submit}
          disabled={busy}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.btnText}>Sign in</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#080810', alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo:       { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 4 },
  sub:        { fontSize: 13, color: '#555', marginBottom: 48 },
  form:       { width: '100%', gap: 12 },
  input:      { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 14, color: '#fff', fontSize: 14 },
  btn:        { backgroundColor: '#0d9488', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDisabled:{ opacity: 0.5 },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
})
