'use client'

import { LanguageSelector } from '@/components/language-selector'
import { Button } from '@/components/ui/button'
import { WalletAssets } from '@/components/wallet-assets'
import { WalletHome } from '@/components/wallet-home'
import { WalletReceive } from '@/components/wallet-receive'
import { WalletSend } from '@/components/wallet-send'
import { WalletSettings } from '@/components/wallet-settings'
import { useLanguage } from '@/contexts/language-context'
import { useWalletActions, useWalletState } from '@/stores/wallet-store'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

interface WalletDashboardProps {
  onLogout: () => void
}

export function WalletDashboard({ onLogout }: WalletDashboardProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('home')
  const [currentView, setCurrentView] = useState('home')
  const { pendingTransactions,unspent } = useWalletState()
  const { setUpdateBlockchaininfo, setUpdateBalance, setUpdateBalanceByMemPool } = useWalletActions()

  const initGetWalletInfo = async () => {
    await setUpdateBlockchaininfo()
    await setUpdateBalance()
    if (pendingTransactions.length) {
      setUpdateBalanceByMemPool()
    }    
  }

  useEffect(() => {
    initGetWalletInfo()
    const interval = setInterval(() => {
      initGetWalletInfo()
    }, 1000 * 22)
    return () => clearInterval(interval)
  }, [])

  const handleNavigation = (view: string) => {
    setCurrentView(view)
    if (['home', 'assets', 'buy', 'sell', 'trade'].includes(view)) {
      setActiveTab(view)
    }
  }

  const handleLockWallet = () => {
    onLogout()
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <WalletHome onNavigate={handleNavigation} />
      case 'assets':
        return <WalletAssets onNavigate={handleNavigation} />
      case 'receive':
        return <WalletReceive onNavigate={handleNavigation} />
      case 'send':
        return <WalletSend onNavigate={handleNavigation} />
      case 'settings':
        return <WalletSettings onNavigate={handleNavigation} onLockWallet={handleLockWallet} />
      case 'buy':
      case 'sell':
      case 'trade':
        return (
          <div className="flex-1 flex items-center justify-center p-4 relative">
            {/* Background decorative elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 right-1/4 w-24 h-24 bg-gradient-to-br from-yellow-400/15 to-amber-500/15 rounded-full blur-xl trump-pulse"></div>
              <div className="absolute bottom-1/3 left-1/4 w-20 h-20 bg-gradient-to-br from-yellow-400/10 to-amber-500/10 rounded-full blur-lg trump-pulse" style={{animationDelay: '1s'}}></div>
            </div>
            
            {/* Floating decorative elements */}
            <div className="absolute top-16 right-16 text-2xl opacity-20 trump-float">🚧</div>
            <div className="absolute bottom-20 left-20 text-xl opacity-15 trump-float" style={{animationDelay: '2s'}}>⚡</div>
            
            <div className="text-center bg-gradient-to-r from-yellow-900/60 to-amber-900/60 rounded-xl p-8 border border-yellow-600/50 backdrop-blur-sm trump-card-glow relative z-10">
              <h2 className="text-2xl font-semibold text-yellow-100 mb-3 meme-text">
                🚀 {currentView.charAt(0).toUpperCase() + currentView.slice(1)} Feature
              </h2>
              <p className="text-yellow-300 mb-6 meme-text">⏳ This feature will be implemented soon.</p>
              <Button
                onClick={() => handleNavigation('home')}
                className="bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-700 hover:to-amber-800 text-yellow-100 font-semibold py-2 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl border border-yellow-500/50 trump-button-hover meme-text"
              >
                🏠 Back to Home
              </Button>
            </div>
          </div>
        )
      default:
        return <WalletHome onNavigate={handleNavigation} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-800 to-amber-900 flex flex-col relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/10 to-amber-500/10 rounded-full blur-xl trump-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-400/8 to-amber-500/8 rounded-full blur-lg trump-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-gradient-to-br from-yellow-400/6 to-amber-500/6 rounded-full blur-md trump-pulse" style={{animationDelay: '2s'}}></div>
      </div>
      
      {/* Floating decorative elements */}
      <div className="absolute top-20 right-20 text-2xl opacity-15 trump-float">💰</div>
      <div className="absolute bottom-32 left-16 text-xl opacity-10 trump-float" style={{animationDelay: '1.5s'}}>👑</div>
      {currentView !== 'home' && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900/95 via-yellow-900/20 to-gray-900/95 backdrop-blur-md border-b border-yellow-500/30 shadow-2xl">
            <div className="max-w-md mx-auto">
              <div className="flex justify-between items-center p-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/20 transition-all duration-300 trump-button-hover"
                    onClick={() => handleNavigation('home')}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="relative">
                    <img src="/logo.jpg" alt="TRUMP Logo" className="w-10 h-10 rounded-full border-2 border-yellow-400/70 shadow-lg trump-pulse" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping"></div>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent meme-text">
                      {currentView === 'receive' && `📥 ${t('receive.title')}`}
                      {currentView === 'send' && `📤 ${t('action.send')}`}
                      {currentView === 'assets' && `💎 ${t('nav.assets')}`}
                      {currentView === 'settings' && `⚙️ ${t('settings.title')}`}
                      {['buy', 'sell', 'trade'].includes(currentView) &&
                        (currentView === 'buy' ? '💰 购买' : currentView === 'sell' ? '💸 出售' : '🔄 交易')}
                    </h1>
                    <div className="text-xs text-yellow-400/80 meme-text">{t('common.walletFunction')} </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
              
                  <LanguageSelector />
                </div>
              </div>
            </div>
          </div>
        )}

      <div className={`relative z-10 ${currentView !== 'home' ? 'pt-20' : ''}`}>{renderCurrentView()}</div>
    </div>
  )
}
