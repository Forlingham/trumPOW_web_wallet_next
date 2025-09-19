'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/contexts/language-context'
import { ArrowDown, ArrowUp, ArrowUpDown, Menu, Bell, Settings, Clock, X, Database } from 'lucide-react'
import { calcValue, decryptWallet, formatDate, NAME_TOKEN, onOpenExplorer } from '@/lib/utils'
import { PendingTransaction, Transaction, useWalletActions, useWalletState } from '@/stores/wallet-store'
import { AddressTxsExt, getAddressTxsExtApi } from '@/lib/externalApi'
import Decimal from 'decimal.js'
import { getRawTransactionApi } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

interface WalletHomeProps {
  onNavigate: (view: string) => void
}

export function WalletHome({ onNavigate }: WalletHomeProps) {
  const { wallet, coinPrice, unspent, transactions, pendingTransactions, blockchainInfo, confirmations, isLocked } = useWalletState()
  const { addTransaction, addPendingTransaction, lockWallet } = useWalletActions()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState('30D')
  const [getAddressTxsLoading, setGetAddressTxsLoading] = useState<boolean>(false)

  async function getTxs() {
    if (!wallet.address) return
    if (getAddressTxsLoading) return
    try {
      setGetAddressTxsLoading(true)
      const res = await getAddressTxsExtApi(wallet.address)
      if (!res.data.data) return

      let txs: Transaction[] = []
      for (const tx of res.data.data.reverse()) {
        let txInfo: Transaction
        const unspentTx = unspent.find((item) => item.txid === tx[1])
        const type = tx[3] ? 'send' : 'receive'
        let amount = 0
        if (type === 'send') {
          amount = new Decimal(tx[3]).minus(tx[2]).toNumber()
          amount = amount * -1
        } else {
          amount = tx[2] as number
        }
        if (unspentTx) {
          txInfo = {
            id: tx[1] as string,
            type: type,
            amount: amount,
            address: '',
            timestamp: tx[0] as number,
            status: unspentTx.isUsable ? 'confirmed' : 'pending',
            height: unspentTx.height
          }
        } else {
          txInfo = {
            id: tx[1] as string,
            type: type,
            amount: amount,
            address: '',
            timestamp: tx[0] as number,
            status: 'confirmed',
            height: 0
          }
        }
        txs.push(txInfo)
      }

      for (const tx of txs) {
        addTransaction(tx)
      }
    } catch (error) {
      console.log(error, 'error')
    } finally {
      setGetAddressTxsLoading(false)
    }
  }

  async function getRawTransaction(pendingTx: PendingTransaction) {
    try {
      const res = await getRawTransactionApi(pendingTx.id)
      if (!res.data.success) return

      if (res.data.rpcData.blockhash) {
        addPendingTransaction({
          ...pendingTx,
          status: 'confirmed'
        })
      }
    } catch (error) {
      console.log(error, 'error')
    }
  }
  async function getPendingTxs() {
    for (const tx of pendingTransactions) {
      if (tx.status === 'pending') {
        await getRawTransaction(tx)
      }
    }
  }

  // 验证登录是否过期
  const onLoginExpired = () => {
    if (!isLocked) {
      const loginTime = localStorage.getItem('loginTime')
      if (!loginTime) {
        localStorage.setItem('loginTime', new Date().getTime().toString())
        return
      }
      const currentTime = new Date().getTime()
      const timeDiff = currentTime - Number(loginTime)
      const time = 1000 * 60 * 60 * 2
      if (timeDiff > time) {
        localStorage.setItem('loginTime', '')
        lockWallet()
      } else {
        localStorage.setItem('loginTime', new Date().getTime().toString())
      }
    }
  }

  useEffect(() => {
    getTxs()
    getPendingTxs()
    onLoginExpired()

    let interval: NodeJS.Timeout | null = null
    if (unspent.length > 0) {
      interval = setInterval(() => {
        getTxs()
      }, 22 * 1000)
    }

    // 清理函数，防止内存泄漏
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [wallet.balance, unspent])

  return (
    <>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-gray-900/95 via-yellow-900/20 to-gray-900/95 backdrop-blur-md border-b border-yellow-500/30 shadow-2xl">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/logo.jpg"
                  alt="TRUMP Logo"
                  className="w-10 h-10 rounded-full border-2 border-yellow-400/70 shadow-lg trump-pulse"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent meme-text">
                  {t('wallet.title')}
                </h1>
                <div className="text-xs text-yellow-400/80 meme-text">{t('wallet.subtitle')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5 trump-glow">
                <div className="text-yellow-400 text-xs font-medium meme-text">{t('wallet.blockHeight')}</div>
                <div className="text-white text-sm font-semibold">{blockchainInfo.headers.toLocaleString()}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/20 transition-all duration-300 trump-button-hover"
                onClick={() => onNavigate('settings')}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-yellow-400/15 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-yellow-600/8 rounded-full blur-2xl animate-pulse delay-2000"></div>
        {/* Additional Trump-themed decorative elements */}
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

      {/* Main Content with top padding for fixed header */}
      <div className="pt-20 flex-1 p-4 space-y-4 overflow-y-auto mt-10 relative z-10">
        <Card className="relative bg-gradient-to-br from-yellow-900/30 via-gray-800 to-yellow-800/40 border-yellow-500/40 backdrop-blur-sm overflow-hidden trump-card-glow">
          {/* 硬币logo背景 */}
          <div className="absolute top-0 right-0 w-20 h-20 opacity-20">
            <img src="/logo.png" alt="Trump Coin Logo" className="w-full h-full object-contain filter brightness-200 trump-pulse" />
          </div>
          {/* 钻石装饰 */}
          <div className="absolute top-2 left-2 text-yellow-400/30 animate-bounce">💎</div>
          <div className="absolute bottom-2 right-2 text-yellow-400/30 animate-pulse">👑</div>

          <CardContent className="px-6 py-6 relative z-10">
            <div className="space-y-6">
              {/* 总余额 - 置顶显示 */}
              <div className="text-center space-y-3 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 rounded-xl p-4 border border-yellow-500/30 trump-card-glow">
                <div className="text-yellow-400/80 text-sm font-medium meme-text uppercase tracking-wider">💎 Total Balance 💎</div>
                <div className="relative text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent flex items-end justify-center gap-2 meme-text trump-balance-glow">
                  <span>
                    {wallet.balance.toString().split('.')[0] && Number(wallet.balance.toString().split('.')[0]).toLocaleString()}
                    {wallet.balance.toString().includes('.') && <span className="text-lg">.{wallet.balance.toString().split('.')[1]}</span>}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-yellow-400/90 font-bold meme-text">{NAME_TOKEN}</span>
                  <span className="text-yellow-600">•</span>
                  <span className=" text-yellow-300/90 font-medium meme-text">${calcValue(wallet.balance, coinPrice)} USD</span>
                </div>
              </div>

              {/* 余额详情 */}
              <div className="space-y-3">
                <div className="text-yellow-400/80 text-sm font-medium meme-text uppercase tracking-wider text-center">
                  ⚡ Balance Details ⚡
                </div>

                {/* 可用余额 - 突出显示 */}
                <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-400/40 rounded-xl p-4 trump-mini-glow shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                      <div className="text-yellow-400 font-bold meme-text text-sm ">💰 {t('wallet.available')}</div>
                    </div>
                    <div className="text-white font-bold break-all">{wallet.usableBalance}</div>
                  </div>
                </div>

                {/* 锁定余额和内存池余额 - 并排显示 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-r from-orange-500/15 to-red-500/15 border border-orange-400/30 rounded-lg p-3 trump-mini-glow">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <div className="text-orange-400 font-medium meme-text text-xs">🔒 {t('wallet.locked')}</div>
                      </div>
                      <div className="text-white font-bold text-sm break-all">{wallet.lockBalance}</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500/15 to-cyan-500/15 border border-blue-400/30 rounded-lg p-3 trump-mini-glow">
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="text-blue-400 font-medium meme-text text-xs">⏳ {t('wallet.memPool')}</div>
                      </div>
                      <div className="text-white font-bold text-sm break-all">{wallet.memPoolLockBalance}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 sm:gap-8">
          <div className="text-center">
            <Button
              size="lg"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 border-2 border-yellow-400/50 hover:border-yellow-300 touch-manipulation trump-action-button shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
              onClick={() => {
                onNavigate('receive')
              }}
            >
              <ArrowDown className="h-6 w-6 text-white drop-shadow-lg" />
            </Button>
            <p className="text-xs sm:text-sm text-yellow-300 mt-2 meme-text">📥 {t('action.receive')}</p>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 border-2 border-yellow-400/50 hover:border-yellow-300 touch-manipulation trump-action-button shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
              onClick={() => {
                onNavigate('send')
              }}
            >
              <ArrowUp className="h-6 w-6 text-white drop-shadow-lg" />
            </Button>
            <p className="text-xs sm:text-sm text-yellow-300 mt-2 meme-text">📤 {t('action.send')}</p>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 border-2 border-yellow-400/50 hover:border-yellow-300 touch-manipulation trump-action-button shadow-lg hover:shadow-yellow-400/25 transition-all duration-300"
              onClick={() => {
                onNavigate('trade')
              }}
            >
              <ArrowUpDown className="h-6 w-6 text-white drop-shadow-lg" />
            </Button>
            <p className="text-xs sm:text-sm text-yellow-300 mt-2 meme-text">💱 {t('action.trade')}</p>
          </div>
        </div>

        {/* <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium">Ravencoin</h3>
              <Button variant="ghost" size="sm" className="text-green-400 hover:text-green-300">
                {t('transactions.seeAll')}
              </Button>
            </div>

            <div className="mb-4">
              <p className="text-gray-400 text-sm">0.01 USD/RVN</p>
            </div>

   
            <div className="flex gap-2 mb-4">
              {['1H', '24H', '7D', '30D', '1Y'].map((period) => (
                <Button
                  key={period}
                  variant={period === selectedPeriod ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  className={period === selectedPeriod ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}
                >
                  {period}
                </Button>
              ))}
            </div>

     
            <div className="h-32 bg-gray-900 rounded-lg flex items-end justify-between p-4 relative overflow-hidden">
              <div className="text-green-400 text-sm absolute top-4 left-4">$0.0163</div>
              <div className="text-green-400 text-sm absolute bottom-4 right-4">$0.0130</div>

           
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 120">
                <path d="M20,80 Q50,60 80,70 T140,50 T200,65 T260,45 T300,55" stroke="#10b981" strokeWidth="2" fill="none" />
                <path d="M20,80 Q50,60 80,70 T140,50 T200,65 T260,45 T300,55 L300,120 L20,120 Z" fill="url(#gradient)" opacity="0.3" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </CardContent>
        </Card> */}

        {/* Recent Transactions */}
        <Card className="bg-gradient-to-br from-gray-800 to-yellow-900/20 border-yellow-500/30 trump-card-glow">
          <CardContent className="px-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h3 className="text-yellow-300 font-medium meme-text">📊 {t('transactions.recent')}</h3>
                {/* getAddressTxsLoading */}
                {getAddressTxsLoading && (
                  <div className="ml-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-yellow-400 hover:text-yellow-300 trump-button-hover"
                onClick={() => onOpenExplorer('2', 'address', wallet.address)}
              >
                🔍 {t('transactions.openExplorer')}
              </Button>
            </div>

            <div className="space-y-3">
              {pendingTransactions.map((tx) => (
                <div key={tx.id}>
                  {tx.status === 'pending' && (
                    <div className="p-3 bg-gradient-to-r from-gray-900 to-yellow-900/10 border border-yellow-500/20 rounded-lg hover:bg-gradient-to-r hover:from-gray-800 hover:to-yellow-800/20 cursor-pointer transition-all duration-300 trump-mini-glow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 border border-orange-400/50 shadow-lg`}
                          >
                            <Database className="h-4 w-4 text-white" />
                          </div>

                          <div>
                            <p className="text-white font-medium meme-text">
                              📤 {t('transactions.sent')} {NAME_TOKEN}
                            </p>
                            {tx.id && (
                              <p className="text-yellow-400/70 text-sm">
                                {tx.id.slice(0, 6)}····{tx.id.slice(-6)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium text-red-400`}>- {tx.totalOutput}</p>
                          <p className="text-yellow-400/70 text-sm">${calcValue(tx.totalOutput, coinPrice)} USD</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-yellow-500/20 mt-2">
                        <div>
                          {/* 交易时间，时间戳转换成 月、日  时分秒 */}
                          <span className="text-yellow-400/70 text-sm">{formatDate(tx.timestamp, 'MM-DD HH:mm:ss')}</span>
                          {tx.status === 'pending' && <span className="text-orange-400 text-xs ml-5">⏳ {t('transactions.memPool')}</span>}
                        </div>
                        <div>
                          {/* 打开区块浏览器查看详情 */}
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:text-yellow-300 trump-button-hover"
                            onClick={() => onOpenExplorer('1', 'tx', tx.id)}
                          >
                            🔍 {t('transactions.particulars')}
                          </Button> */}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 bg-gradient-to-r from-gray-900 to-yellow-900/10 border border-yellow-500/20 rounded-lg hover:bg-gradient-to-r hover:from-gray-800 hover:to-yellow-800/20 cursor-pointer transition-all duration-300 trump-mini-glow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {tx.status === 'pending' && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 border border-orange-400/50 shadow-lg">
                          <Clock className="h-4 w-4 text-white" />
                        </div>
                      )}
                      {tx.status === 'confirmed' && (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg ${
                            tx.type === 'receive'
                              ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-400/50'
                              : 'bg-gradient-to-br from-red-500 to-red-600 border-red-400/50'
                          }`}
                        >
                          {tx.type === 'receive' ? (
                            <ArrowDown className="h-4 w-4 text-white" />
                          ) : (
                            <ArrowUp className="h-4 w-4 text-white" />
                          )}
                        </div>
                      )}
                      {tx.status === 'failed' && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-600 border border-gray-400/50 shadow-lg">
                          <X className="h-4 w-4 text-white" />
                        </div>
                      )}

                      <div>
                        <p className="text-white font-medium meme-text">
                          {tx.type === 'receive' ? '📥 ' + t('transactions.received') : '📤 ' + t('transactions.sent')} {NAME_TOKEN}
                        </p>
                        <p className="text-yellow-400/70 text-sm">
                          {tx.id.slice(0, 6)}····{tx.id.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${tx.type === 'receive' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' + tx.amount : tx.amount}
                      </p>
                      <p className="text-yellow-400/70 text-sm">${calcValue(tx.amount, coinPrice)} USD</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-yellow-500/20 mt-2">
                    <div>
                      {/* 交易时间，时间戳转换成 月、日  时分秒 */}
                      <span className="text-yellow-400/70 text-sm">{formatDate(tx.timestamp, 'MM-DD HH:mm:ss')}</span>
                      {tx.status === 'pending' && (
                        <span className="text-orange-400 text-xs ml-5 whitespace-nowrap">
                          ⏳ {t('transactions.confirmations')}: {blockchainInfo.headers - tx.height} / {confirmations}
                        </span>
                      )}
                      {tx.status === 'confirmed' && <span className="text-green-400 text-xs ml-5">✅</span>}
                    </div>
                    <div>
                      {/* 打开区块浏览器查看详情 */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-yellow-400 hover:text-yellow-300 trump-button-hover"
                        onClick={() => onOpenExplorer('2', 'tx', tx.id)}
                      >
                        🔍 {t('transactions.particulars')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
