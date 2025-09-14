'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { Copy, Share, ArrowUpDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { NAME_TOKEN } from '@/lib/utils'
import { useWalletStore } from '@/stores/wallet-store'
import QRCode from 'qrcode'
import { useEffect, useRef } from 'react'

interface WalletReceiveProps {
  onNavigate: (view: string) => void
}

export function WalletReceive({ onNavigate }: WalletReceiveProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [requestAmount, setRequestAmount] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const wallet = useWalletStore((state) => state.wallet)
  const coinPrice = useWalletStore((state) => state.coinPrice)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 自动生成二维码
  useEffect(() => {
    if (wallet.address) {
      const qrText = requestAmount ? `${wallet.address}?amount=${requestAmount}` : wallet.address
      generateQRCode(qrText)
    }
  }, [wallet.address, requestAmount])

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address)
    toast({
      title: t('receive.addressCopied'),
      description: t('receive.addressCopiedDesc'),
      variant: 'success'
    })
  }

  const shareAddress = () => {
    if (navigator.share) {
      navigator.share({
        title: 'TRMP Wallet Address',
        text: `Send ${NAME_TOKEN} to: ${wallet.address}`
      })
    } else {
      copyAddress()
    }
  }

  const generateQRCode = async (text: string) => {
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      // 生成二维码到canvas
      await QRCode.toCanvas(canvas, text, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      // 转换为数据URL
      const dataUrl = canvas.toDataURL()
      setQrCodeUrl(dataUrl)
    } catch (error) {
      console.error('生成二维码失败:', error)
      toast({
        title: t('common.error'),
        description: t('common.errorDesc'),
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-yellow-900/30 text-white relative overflow-hidden min-h-screen">
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
        <div className="absolute top-3/4 right-1/4 text-yellow-500/15 text-4xl trump-float delay-1000">📱</div>
        <div className="absolute bottom-1/3 left-1/6 text-yellow-300/20 text-5xl trump-float delay-3000">💎</div>
      </div>

      <div className="relative z-10">
      {/* Header Info */}
      <div className="text-center space-y-2 bg-gradient-to-r from-yellow-900/20 to-yellow-800/30 border border-yellow-500/30 rounded-lg p-4 trump-card-glow">
        <div className="flex items-center justify-between text-sm">
          <span className="text-yellow-300 meme-text">
            💰 {t('common.youHave')} {wallet.balance} {NAME_TOKEN}
          </span>
          <div className="text-right">
            <div className="text-yellow-200 font-medium meme-text">👑 1 {NAME_TOKEN}</div>
            <div className="text-yellow-400/80">${coinPrice} USD</div>
          </div>
        </div>
      </div>
<br />
      {/* QR Code */}
      <Card className="bg-gradient-to-br from-yellow-900/30 via-gray-800 to-yellow-800/40 border-yellow-500/40 backdrop-blur-sm overflow-hidden trump-card-glow relative">
        {/* Decorative elements */}
        <div className="absolute top-2 right-2 text-yellow-400/30 text-2xl">💎</div>
        <div className="absolute bottom-2 left-2 text-yellow-500/20 text-xl">👑</div>
        
        <CardContent className="p-6 relative z-10">
          <div className="text-center space-y-4">
            <h3 className="text-yellow-300 font-medium meme-text mb-4">📱 扫码收款</h3>
            <div className="mx-auto w-48 h-48 bg-white rounded-lg flex items-center justify-center border-4 border-yellow-500/50 shadow-2xl">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-full h-full rounded-lg" />
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-500 meme-text">⏳ 生成中...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
<br />
      {/* 隐藏的canvas用于生成二维码 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} width={200} height={200} />

      {/* Wallet Address */}
      <Card className="bg-gradient-to-br from-gray-800 to-yellow-900/20 border-yellow-500/30 trump-card-glow">
        <CardContent className="px-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-yellow-300 meme-text">🏠 {t('receive.address')}</Label>
            </div>

            <div className="p-3 bg-gradient-to-r from-gray-900 to-yellow-900/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-100 font-mono text-sm break-all">{wallet.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>
<br />
      {/* Action Buttons */}
      <div className="flex gap-4">
     

        <Button onClick={copyAddress} className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white border border-yellow-400/50 shadow-lg trump-button-hover transition-all duration-300">
          <Copy className="h-4 w-4 mr-2 text-yellow-100" />
          <span className="meme-text">📋 {t('common.copy')}</span>
        </Button>

        <Button onClick={shareAddress} className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white border border-yellow-500/50 shadow-lg trump-button-hover transition-all duration-300">
          <Share className="h-4 w-4 mr-2 text-yellow-100" />
          <span className="meme-text">📤 {t('common.share')}</span>
        </Button>
      </div>
      </div>
    </div>
  )
}
