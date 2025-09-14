'use client'

import { useState, useEffect } from 'react'
import { WalletSetup } from '@/components/wallet-setup'
import { WalletDashboard } from '@/components/wallet-dashboard'
import { LanguageProvider, useLanguage } from '@/contexts/language-context'
import { useWalletActions, useWalletStore } from '@/stores/wallet-store'
import { WalletLockScreen } from '@/components/WalletLockScreen'

export default function Home() {
  const { wallet, isLocked } = useWalletStore()
  const { setWallet, setLoading, setError, lockWallet, unlockWallet } = useWalletActions()
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    if (wallet.address) {
      setIsLoading(false)
    }
    if (!wallet.address) {
      setIsLoading(false)
    }
  }, [wallet])

  const handleWalletCreated = () => {
    console.log('create')
  }

  const handleLogout = () => {
    lockWallet()
  }

  const handleUnlock = (password: string) => {
    return unlockWallet(password)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900/20 to-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-400/15 rounded-full blur-lg animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-yellow-600/8 rounded-full blur-2xl animate-pulse delay-2000"></div>
          <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-yellow-400/20 rounded-full blur-md trump-pulse"></div>
          <div className="absolute bottom-1/4 right-10 w-20 h-20 bg-yellow-500/15 rounded-full blur-lg trump-pulse delay-3000"></div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute inset-0 pointer-events-none z-5">
          <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-yellow-400/10 text-6xl animate-bounce delay-2000">💰</div>
          <div className="absolute top-3/4 right-1/4 text-yellow-500/15 text-4xl trump-float delay-1000">🚀</div>
          <div className="absolute bottom-1/3 left-1/6 text-yellow-300/20 text-5xl trump-float delay-3000">👑</div>
        </div>

        {/* Loading content */}
        <div className="text-center space-y-6 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full mx-auto flex items-center justify-center border-4 border-yellow-400/70 shadow-2xl trump-button-glow relative animate-pulse">
              <img src="/logo.png" alt="TRUMP Logo" className="w-16 h-16 rounded-full" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full border-2 border-gray-900 animate-ping"></div>
              <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping delay-500"></div>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30 animate-spin"></div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent meme-text">
              💎 TRUMP WALLET 💎
            </h1>
            <p className="text-yellow-300/80 text-sm meme-text animate-pulse">
              🚀 Loading the future of finance... 🚀
            </p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-gray-900">
        {!wallet.address ? (
          <WalletSetup onWalletCreated={handleWalletCreated} />
        ) : isLocked ? (
          <WalletLockScreen onUnlock={handleUnlock} />
        ) : (
          <WalletDashboard onLogout={handleLogout} />
        )}
      </div>
    </LanguageProvider>
  )
}
