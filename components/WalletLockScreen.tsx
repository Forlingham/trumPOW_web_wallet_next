'use client'

import { LanguageProvider, useLanguage } from '@/contexts/language-context'
import { useState } from 'react'

export function WalletLockScreen({ onUnlock }: { onUnlock: (password: string) => boolean }) {
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleUnlock = () => {
    // Mock password verification
    if (password.length >= 8) {
      const isUnlocked = onUnlock(password)
      if (isUnlocked) {
        setError('')
      } else {
        setError(t('wallet.lock.error'))
      }
    } else {
      setError(t('wallet.lock.error'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-400/15 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-yellow-600/8 rounded-full blur-2xl animate-pulse delay-2000"></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-yellow-400/20 rounded-full blur-md trump-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-20 h-20 bg-yellow-500/15 rounded-full blur-lg trump-pulse delay-3000"></div>
        <div className="absolute top-1/2 left-1/3 w-12 h-12 bg-yellow-300/25 rounded-full blur-sm trump-pulse delay-1500"></div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute inset-0 pointer-events-none z-5">
        <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-yellow-400/10 text-6xl animate-bounce delay-2000">💰</div>
        <div className="absolute top-3/4 right-1/4 text-yellow-500/15 text-4xl trump-float delay-1000">🚀</div>
        <div className="absolute bottom-1/3 left-1/6 text-yellow-300/20 text-5xl trump-float delay-3000">👑</div>
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center bg-gradient-to-br from-yellow-900/30 via-gray-800 to-yellow-800/40 border border-yellow-500/40 backdrop-blur-sm rounded-2xl p-8 trump-card-glow relative overflow-hidden">
          {/* 硬币logo背景 */}
          <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
            <img src="/logo.png" alt="Trump Coin Logo" className="w-full h-full object-contain filter brightness-200 trump-pulse" />
          </div>
          {/* 钻石装饰 */}
          <div className="absolute top-2 left-2 text-yellow-400/30 animate-bounce">
            💎
          </div>
          <div className="absolute bottom-2 right-2 text-yellow-400/30 animate-pulse">
            👑
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-yellow-400/70 shadow-2xl trump-button-glow relative">
              <img src="/logo.png" alt="TRUMP Logo" className="w-12 h-12 rounded-full" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping"></div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent meme-text mb-3">{t('wallet.lock.title')}</h1>
            <p className="text-yellow-300/90 mt-3 meme-text">{t('wallet.lock.passwordInfo')}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              className="w-full p-5 bg-gradient-to-r from-gray-800 to-yellow-900/20 border-2 border-yellow-500/40 rounded-xl text-white placeholder-yellow-400/60 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 trump-input-glow transition-all duration-300"
              placeholder="🔐 Enter wallet password"
              onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-yellow-400/70 hover:text-yellow-300 transition-colors duration-300 trump-button-hover"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && (
            <div className="bg-gradient-to-r from-red-900/30 to-red-800/30 border border-red-500/40 rounded-lg p-3 text-center">
              <p className="text-red-400 text-sm font-medium">❌ {error}</p>
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={!password}
            className="w-full p-5 bg-gradient-to-br from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 text-white rounded-xl font-bold text-lg transition-all duration-300 trump-action-button shadow-lg hover:shadow-yellow-400/25 hover:scale-105 transform meme-text"
          >
            🔓 {t('wallet.lock.unlock')}
          </button>
        </div>
      </div>
    </div>
  )
}
