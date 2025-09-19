'use client'

import type React from 'react'

import { LanguageSelector } from '@/components/language-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/language-context'
import { useToast } from '@/hooks/use-toast'
import { decryptWallet, downloadWalletFile, encryptWallet, passwordMD5, TRUMPOW_NETWORK, TRUMPOW_PATH } from '@/lib/utils'
import { useWalletActions, useWalletStore, type WalletInfo } from '@/stores/wallet-store'
import { BIP32Factory } from 'bip32'
import * as bip39 from 'bip39'
import * as bitcoin from 'bitcoinjs-lib'
import { AlertTriangle, Check, Copy, Download, Eye, EyeOff, Upload } from 'lucide-react'
import { useState } from 'react'
import * as ecc from 'tiny-secp256k1'
import { onUserCreateApi } from '@/lib/api'

interface WalletSetupProps {
  onWalletCreated: () => void
}

type SetupStep =
  | 'welcome'
  | 'create-mnemonic'
  | 'verify-mnemonic'
  | 'set-password'
  | 'download-wallet'
  | 'restore-method'
  | 'restore-mnemonic'
  | 'restore-file'
  | 'restore-password'

export function WalletSetup({ onWalletCreated }: WalletSetupProps) {
  const { t } = useLanguage()
  const { toast } = useToast()

  // 使用 Zustand 状态管理 - 类似 Pinia
  const { setWallet, setLoading, setError } = useWalletActions()
  const wallet = useWalletStore((state) => state.wallet)
  const isLoading = useWalletStore((state) => state.isLoading)
  const error = useWalletStore((state) => state.error)

  // 本地组件状态
  const [step, setStep] = useState<SetupStep>('welcome')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // const [mnemonic, setMnemonic] = useState('')
  const [generatedMnemonic, setGeneratedMnemonic] = useState('')
  const [verificationWords, setVerificationWords] = useState<{ word: string; index: number }[]>([])
  const [userVerification, setUserVerification] = useState<string[]>([])
  const [walletFile, setWalletFile] = useState<File | null>(null)
  const [walletInfo, setWalletInfo] = useState<WalletInfo>()
  const [uploadedWalletEncrypted, setUploadedWalletEncrypted] = useState<string>()

  const handleCreateWallet = () => {
    setShowMnemonic(false)
    const newMnemonic = bip39.generateMnemonic()
    setGeneratedMnemonic(newMnemonic)
    setStep('create-mnemonic')
  }

  const handleVerifyMnemonic = () => {
    const words = generatedMnemonic.split(' ')
    const randomIndices = [] as number[]
    while (randomIndices.length < 3) {
      const randomIndex = Math.floor(Math.random() * words.length)
      if (!randomIndices.includes(randomIndex)) {
        randomIndices.push(randomIndex)
      }
    }

    const verification = randomIndices.map((index) => ({
      word: words[index],
      index: index + 1
    }))

    setVerificationWords(verification)
    setUserVerification(new Array(3).fill(''))
    setStep('verify-mnemonic')
  }

  const handleVerificationSubmit = () => {
    // setStep('set-password')
    // return

    const isCorrect = verificationWords.every((item, index) => userVerification[index]?.toLowerCase().trim() === item.word.toLowerCase())

    if (isCorrect) {
      setStep('set-password')
    } else {
      toast({
        title: t('wallet.verificationFailed'),
        description: t('wallet.verificationFailedInfo'),
        variant: 'destructive'
      })
    }
  }

  const handlePasswordSubmit = () => {
    if (password.length < 8) {
      toast({
        title: t('wallet.passwordTooShort'),
        description: t('wallet.passwordMinLength'),
        variant: 'destructive'
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: t('wallet.passwordsDontMatch'),
        description: t('wallet.passwordsDontMatchInfo'),
        variant: 'destructive'
      })
      return
    }

    const passwordHash = passwordMD5(password)

    // 完成钱包生成，使用用户密码对钱包进行加密
    const bip2 = BIP32Factory(ecc)
    const seed = bip39.mnemonicToSeedSync(generatedMnemonic)
    const root = bip2.fromSeed(seed, TRUMPOW_NETWORK)
    const path = TRUMPOW_PATH
    const child = root.derivePath(path)
    const { address } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(child.publicKey),
      network: TRUMPOW_NETWORK
    })

    if (!address) {
      toast({
        title: t('wallet.addressGenerationFailed'),
        description: t('wallet.addressGenerationFailedInfo'),
        variant: 'destructive'
      })
      return
    }

    // 创建加密的钱包文件用于下载
    const walletForFile: WalletFile = {
      mnemonic: generatedMnemonic,
      path,
      address,
      privateKey: child.toWIF(),
      passwordHash
    }

    const encryptedWallet = encryptWallet(walletForFile, passwordHash)

    // 使用 Zustand 状态管理存储钱包信息 - 类似 Pinia 的响应式状态
    const walletInfoData: WalletInfo = {
      isHasWallet: true,
      address: address!,
      balance: 0,
      lockBalance: 0,
      memPoolLockBalance: 0,
      usableBalance: 0,
      encryptedWallet: encryptedWallet
    }

    onUserCreateApi(address)
    setWalletInfo(walletInfoData)

    setStep('download-wallet')
  }

  const handleDownloadWallet = () => {
    if (!walletInfo || !walletInfo.encryptedWallet) {
      toast({
        title: 'Error',
        description: 'Wallet not encrypted',
        variant: 'destructive'
      })
      return
    }

    downloadWalletFile(walletInfo.encryptedWallet)

    // 保存到状态管理中 - 自动持久化到 localStorage
    setWallet(walletInfo)

    toast({
      title: 'Wallet Created Successfully',
      description: 'Your wallet file has been downloaded. Keep it safe!'
    })

    onWalletCreated()
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setWalletFile(file)
    }
  }

  const handleRestoreFromFile = () => {
    if (!walletFile) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const walletData = JSON.parse(e.target?.result as string) as WalletFileData
        if (walletData && walletData.data && walletData.encrypted && walletData.timestamp) {
          setUploadedWalletEncrypted(walletData.data)

          setStep('restore-password')
        } else {
          // 钱包文件有问题
          toast({
            title: 'Invalid Wallet File',
            description: 'The selected file is not a valid wallet file.',
            variant: 'destructive'
          })
        }
      } catch (error) {
        toast({
          title: 'Invalid Wallet File',
          description: 'The selected file is not a valid wallet file.',
          variant: 'destructive'
        })
      }
    }
    reader.readAsText(walletFile)
  }

  const onRestorePassword = () => {
    if (!password) {
      toast({
        title: t('wallet.enterPassword'),
        variant: 'destructive'
      })
      return
    }

    if (!uploadedWalletEncrypted) {
      toast({
        title: 'Invalid Wallet File',
        description: 'The selected file is not a valid wallet file.',
        variant: 'destructive'
      })
      return
    }

    try {
      const decryptedWallet = decryptWallet(uploadedWalletEncrypted, password)

      if (!decryptedWallet.isSuccess) {
        toast({
          title: 'Invalid Password',
          description: 'The password you entered is incorrect.',
          variant: 'destructive'
        })
        return
      }

      const walletInfoData: WalletInfo = {
        isHasWallet: true,
        address: decryptedWallet.wallet!.address,
        balance: 0,
        lockBalance: 0,
        memPoolLockBalance: 0,
        usableBalance: 0,
        encryptedWallet: uploadedWalletEncrypted
      }

      setWalletInfo(walletInfoData)
      setWallet(walletInfoData)
      onWalletCreated()
    } catch (error) {
      toast({
        title: 'Invalid Password',
        description: 'The password you entered is incorrect.',
        variant: 'destructive'
      })
      return
    }
  }

  const handleRestoreFromMnemonic = () => {
    if (generatedMnemonic.split(' ').length !== 12) {
      toast({
        title: 'Invalid Mnemonic',
        description: 'Please enter a valid 12-word mnemonic phrase.',
        variant: 'destructive'
      })
      return
    }

    setStep('set-password')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to Clipboard',
      description: 'Mnemonic phrase has been copied to clipboard.'
    })
  }

  return (
    <div className="min-h-screen trump-theme flex flex-col">
      {/* Header with Language Selector */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="TRUMP MEME Logo"
            className="w-8 h-8 rounded-full trump-logo trump-pulse"
          />
          <h1 className="text-xl font-semibold trump-shine meme-text">{t('wallet.title')}</h1>
        </div>
        <LanguageSelector />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md trump-card trump-glow money-rain">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 diamond-hands">
              <img
                src="/logo.png"
                alt="TRUMP MEME Logo"
                className="w-20 h-20 rounded-full mx-auto trump-logo trump-pulse"
              />
            </div>
            <CardTitle className="text-3xl trump-shine meme-text">{t('wallet.title')}</CardTitle>
            <p className="text-sm text-yellow-400 mt-2 meme-text rocket-animation">🚀 TO THE MOON! 🚀</p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Welcome Step */}
            {step === 'welcome' && (
              <>
                <Button onClick={handleCreateWallet} className="w-full trump-button meme-text">
                  💰 {t('wallet.createNew')} 💰
                </Button>
                <Button
                  onClick={() => setStep('restore-method')}
                  variant="outline"
                  className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500  meme-text transition-all duration-300"
                >
                  🔄 {t('wallet.restoreExisting')} 🔄
                </Button>
                <div className="text-center mt-4">
                  <p className="text-yellow-400 text-xs meme-text animate-pulse">⚡ MAKE CRYPTO GREAT AGAIN! ⚡</p>
                </div>
              </>
            )}

            {/* Create Mnemonic Step */}
            {step === 'create-mnemonic' && (
              <div className="space-y-4">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-white mb-2">{t('wallet.saveRecovery')}</h3>
                  <p className="text-gray-300 text-sm mb-4">{t('wallet.writeDown')}</p>
                </div>

                <div className="relative">
                  <div className={`grid grid-cols-3 gap-2 p-4 bg-gray-900 rounded-lg ${!showMnemonic ? 'blur-sm' : ''}`}>
                    {generatedMnemonic.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-800 rounded text-sm">
                        <span className="text-gray-400 text-xs">{index + 1}.</span>
                        <span className="text-white">{word}</span>
                      </div>
                    ))}
                  </div>

                  {!showMnemonic && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        onClick={() => setShowMnemonic(true)}
                        variant="outline"
                        className="border-yellow-500 text-yellow-400 hover:bg-yellow-500  trump-button meme-text"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        👁️ {t('wallet.clickReveal')} 👁️
                      </Button>
                    </div>
                  )}
                </div>

                {showMnemonic && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => copyToClipboard(generatedMnemonic)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-yellow-500 text-yellow-400 hover:bg-yellow-500  meme-text transition-all duration-300"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      📋 {t('common.copy')}
                    </Button>
                    <Button onClick={handleVerifyMnemonic} className="flex-1 trump-button meme-text">
                      ✅ {t('wallet.savedIt')} ✅
                    </Button>
                  </div>
                )}

                <Button onClick={() => setStep('welcome')} variant="ghost" className="w-full text-gray-400 hover:text-white">
                  {t('common.back')}
                </Button>
              </div>
            )}

            {/* Verify Mnemonic Step */}
            {step === 'verify-mnemonic' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">{t('wallet.verifyPhrase')}</h3>
                  <p className="text-gray-300 text-sm mb-4">{t('wallet.enterWords')}</p>
                </div>

                <div className="space-y-3">
                  {verificationWords.map((item, index) => (
                    <div key={index} className="trump-input-container">
                      <Label className="text-yellow-400 text-sm meme-text">💎 Word #{item.index}</Label>
                      <Input
                        value={userVerification[index] || ''}
                        onChange={(e) => {
                          const newVerification = [...userVerification]
                          newVerification[index] = e.target.value
                          setUserVerification(newVerification)
                        }}
                        className="trump-input"
                        placeholder="Enter the golden word..."
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep('create-mnemonic')}
                    variant="outline"
                    className="flex-1 border-yellow-500 text-yellow-400 hover:bg-yellow-500  meme-text transition-all duration-300"
                  >
                    ⬅️ {t('common.back')}
                  </Button>
                  <Button
                    onClick={handleVerificationSubmit}
                    className="flex-1 trump-button meme-text"
                    disabled={userVerification.some((word) => !word.trim())}
                  >
                    🔐 Verify 🔐
                  </Button>
                </div>
              </div>
            )}

            {/* Set Password Step */}
            {step === 'set-password' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">{t('wallet.setPassword')}</h3>
                  <p className="text-gray-300 text-sm mb-4">{t('wallet.passwordInfo')}</p>
                </div>

                <div className="space-y-3">
                  <div className="trump-input-container">
                    <Label className="text-yellow-400 text-sm meme-text">🔐 {t('wallet.password')}</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="trump-input pr-10"
                        placeholder="Enter your golden password..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="trump-input-container">
                    <Label className="text-yellow-400 text-sm meme-text">🔐 {t('wallet.confirmPassword')}</Label>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="trump-input"
                      placeholder="Confirm your golden password..."
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep(generatedMnemonic ? 'verify-mnemonic' : 'restore-mnemonic')}
                    variant="outline"
                    className="flex-1 border-yellow-500 text-yellow-400 hover:bg-yellow-500  meme-text transition-all duration-300"
                  >
                    ⬅️ {t('common.back')}
                  </Button>
                  <Button
                    onClick={handlePasswordSubmit}
                    className="flex-1 trump-button meme-text"
                    disabled={!password || !confirmPassword}
                  >
                    🚀 {t('common.next')} 🚀
                  </Button>
                </div>
              </div>
            )}

            {/* Download Wallet Step */}
            {step === 'download-wallet' && (
              <div className="space-y-4 text-center">
                <div>
                  <Download className="h-12 w-12 text-yellow-400 mx-auto mb-4 trump-pulse" />
                  <h3 className="text-lg font-semibold text-white mb-2">{t('wallet.downloadWallet')}</h3>
                  <p className="text-gray-300 text-sm mb-4">{t('wallet.downloadInfo')}</p>
                </div>

                <Button onClick={handleDownloadWallet} className="w-full trump-button meme-text">
                  <Download className="h-4 w-4 mr-2" />
                  💾 {t('wallet.downloadButton')} 💾
                </Button>

                <p className="text-xs text-gray-400">{t('wallet.needFile')}</p>
              </div>
            )}

            {/* Restore Method Step */}
            {step === 'restore-method' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">{t('wallet.restoreMethod')}</h3>
                  <p className="text-gray-300 text-sm mb-4">{t('wallet.chooseMethod')}</p>
                </div>

                <Button
                  onClick={() => {
                    setStep('restore-mnemonic')
                    setGeneratedMnemonic('')
                  }}
                  className="w-full trump-button meme-text"
                >
                  🔑 {t('wallet.useRecovery')} 🔑
                </Button>

                <Button
                  onClick={() => setStep('restore-file')}
                  variant="outline"
                  className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500  meme-text transition-all duration-300"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  📁 {t('wallet.uploadWalletFile')} 📁
                </Button>

                <Button onClick={() => setStep('welcome')} variant="ghost" className="w-full text-yellow-400 hover:text-yellow-300 meme-text">
                  ⬅️ {t('common.back')}
                </Button>
              </div>
            )}

            {/* Restore Mnemonic Step */}
            {step === 'restore-mnemonic' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold trump-shine meme-text mb-2">{t('wallet.enterRecovery')}</h3>
                  <p className="text-yellow-400 text-sm mb-4 meme-text">🔐 {t('wallet.enter12Words')} 🔐</p>
                </div>

                <div className="trump-input-container">
                  <Label className="text-yellow-400 text-sm meme-text">🔑 {t('wallet.recoveryPhrase')}</Label>
                  <Textarea
                    value={generatedMnemonic}
                    onChange={(e) => setGeneratedMnemonic(e.target.value)}
                    className="trump-textarea"
                    placeholder="Enter your 12 golden words separated by spaces..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setStep('restore-method')
                      setGeneratedMnemonic('')
                    }}
                    variant="outline"
                    className="flex-1 border-yellow-500 text-yellow-400 hover:bg-yellow-500 meme-text transition-all duration-300"
                  >
                    ⬅️ {t('common.back')}
                  </Button>
                  <Button
                    onClick={handleRestoreFromMnemonic}
                    className="flex-1 trump-button meme-text"
                    disabled={!generatedMnemonic.trim()}
                  >
                    🚀 {t('common.next')} 🚀
                  </Button>
                </div>
              </div>
            )}

            {/* Restore File Step */}
            {step === 'restore-file' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">{t('wallet.uploadWalletFile')}</h3>
                  <p className="text-gray-300 text-sm mb-4">{t('wallet.selectFile')}</p>
                </div>

                <div className="trump-input-container">
                  <Label className="text-yellow-400 text-sm meme-text">📁 {t('wallet.walletFile')}</Label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="trump-input file:bg-yellow-600 file:text-black file:border-0 file:rounded file:px-3 file:py-1 file:font-bold file:mr-4"
                  />
                </div>

                {walletFile && (
                  <div className="p-3 bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-gray-300">{walletFile.name}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep('restore-method')}
                    variant="outline"
                    className="flex-1 border-yellow-500 text-yellow-400 hover:bg-yellow-500 meme-text transition-all duration-300"
                  >
                    ⬅️ {t('common.back')}
                  </Button>
                  <Button
                    onClick={handleRestoreFromFile}
                    className="flex-1 trump-button meme-text"
                    disabled={!walletFile}
                  >
                    🔄 {t('wallet.restoreWallet')} 🔄
                  </Button>
                </div>
              </div>
            )}

            {/* Restore Password Step */}
            {step === 'restore-password' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">{t('wallet.enterPassword')}</h3>
                  <p className="text-gray-300 text-sm mb-4">{t('wallet.passwordUsed')}</p>
                </div>

                <div className="trump-input-container">
                  <Label className="text-yellow-400 text-sm meme-text">🔐 {t('wallet.password')}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="trump-input pr-10"
                      placeholder="Enter your golden password..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setStep('restore-file')}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    onClick={() => {
                      // Mock password verification
                      onRestorePassword()
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!password}
                  >
                    {t('wallet.unlockWallet')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
