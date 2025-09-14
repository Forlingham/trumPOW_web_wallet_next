'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { Lock, Key, Download, Globe, Shield, HelpCircle, LogOut, Eye, EyeOff, Copy, AlertTriangle, CheckCircle, Github, Twitter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

import { decryptWallet, downloadWalletFile, encryptWallet, passwordMD5, VERSION } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { useWalletStore, useWalletActions, type WalletInfo } from '@/stores/wallet-store'

interface WalletSettingsProps {
  onNavigate: (view: string) => void
  onLockWallet: () => void
}

type SettingsView = 'main' | 'changePassword' | 'backup' | 'security' | 'help'

export function WalletSettings({ onNavigate, onLockWallet }: WalletSettingsProps) {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [currentView, setCurrentView] = useState<SettingsView>('main')
  const [showPassword, setShowPassword] = useState(false)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [verifyPassword, setVerifyPassword] = useState('')
  const wallet = useWalletStore((state) => state.wallet)
  const { setWallet } = useWalletActions()
  const [mockMnemonic, setMockMnemonic] = useState('')

  // Mock mnemonic for backup

  const handlePasswordChange = () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast({
        title: t('common.error'),
        description: t('settings.missingInformation'),
        variant: 'destructive'
      })
      return
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        title: t('common.error'),
        description: t('settings.passwordMismatch'),
        variant: 'destructive'
      })
      return
    }

    if (passwords.new.length < 8) {
      toast({
        title: t('common.error'),
        description: t('settings.passwordTooShort'),
        variant: 'destructive'
      })
      return
    }

    const walletObj = decryptWallet(wallet.encryptedWallet, passwords.current)
    if (!walletObj.isSuccess) {
      toast({
        title: t('common.error'),
        description: t('settings.passwordError'),
        variant: 'destructive'
      })
      return
    }
    const passwordHash = passwordMD5(passwords.new)
    walletObj.wallet!.passwordHash = passwordHash
    const walletEncrypt = encryptWallet(walletObj.wallet!, passwordHash)

    downloadWalletFile(walletEncrypt)

    const walletInfo: WalletInfo = {
      isHasWallet: true,
      address: wallet.address,
      balance: wallet.balance,
      lockBalance: wallet.lockBalance,
      memPoolLockBalance: wallet.memPoolLockBalance,
      usableBalance: wallet.usableBalance,
      encryptedWallet: walletEncrypt
    }

    // 保存到状态管理中 - 自动持久化到 localStorage
    setWallet(walletInfo)

    // Mock password change
    toast({
      title: t('common.success'),
      description: t('settings.passwordChanged')
    })

    setPasswords({ current: '', new: '', confirm: '' })
    setCurrentView('main')
  }

  const handClickReveal = () => {
    setShowPasswordDialog(true)
  }

  const handlePasswordVerify = async () => {
    if (!verifyPassword.trim()) {
      toast({
        title: t('common.error'),
        description: t('settings.inputPassword'),
        variant: 'destructive'
      })
      return
    }

    try {
      const walletObj = decryptWallet(wallet.encryptedWallet, verifyPassword)
      if (!walletObj.isSuccess) {
        toast({
          title: t('common.error'),
          description: t('settings.passwordError'),
          variant: 'destructive'
        })
        return
      }

      setShowMnemonic(true)
      setShowPasswordDialog(false)
      setVerifyPassword('')
      setMockMnemonic(walletObj.wallet!.mnemonic)
    } catch (error) {
      toast({
        title: 'error',
        description: 'An error occurred during the password verification process.',
        variant: 'destructive'
      })
    }
  }

  const copyMnemonic = () => {
    navigator.clipboard.writeText(mockMnemonic)
    toast({
      title: 'Copied to Clipboard',
      description: 'Recovery phrase has been copied to clipboard'
    })
  }

  const downloadBackup = () => {
    downloadWalletFile(wallet.encryptedWallet)

    toast({
      title: 'Backup Downloaded',
      description: 'Your wallet backup has been downloaded successfully'
    })
  }

  const onResetWallet = () => {
    localStorage.clear()
    window.location.reload()
  }

  if (currentView === 'changePassword') {
    return (
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-500/30 trump-button-glow">
            <Key className="h-8 w-8 text-black font-bold" />
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text">
            {t('settings.changePassword')}
          </h2>
          <p className="text-gray-300 text-sm mt-3">{t('settings.changePasswordInfo2')}</p>
        </div>

        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
          <CardContent className="p-6 space-y-6">
            <div>
              <Label className="text-yellow-400 text-sm font-bold">{t('settings.currentPassword')}</Label>
              <div className="relative mt-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="bg-gray-900/80 border-yellow-600/30 text-white pr-12 py-3 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                  placeholder={t('settings.currentPassword')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-600/20"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-yellow-400 text-sm font-bold">{t('settings.newPassword')}</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="bg-gray-900/80 border-yellow-600/30 text-white py-3 mt-2 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                placeholder={t('wallet.passwordInput')}
              />
            </div>

            <div>
              <Label className="text-yellow-400 text-sm font-bold">{t('settings.confirmNewPassword')}</Label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="bg-gray-900/80 border-yellow-600/30 text-white py-3 mt-2 focus:border-yellow-500 focus:ring-yellow-500/20 transition-all duration-200"
                placeholder={t('settings.confirmNewPassword')}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={() => setCurrentView('main')}
            variant="outline"
            className="flex-1 border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-500 font-bold py-3 transition-all duration-200"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handlePasswordChange}
            className="flex-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold py-3 shadow-xl shadow-yellow-500/30 trump-button-glow transition-all duration-300 transform hover:scale-105"
            disabled={!passwords.current || !passwords.new || !passwords.confirm}
          >
            {t('settings.changePassword')}
          </Button>
        </div>
      </div>
    )
  }

  if (currentView === 'backup') {
    return (
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-500/30 trump-button-glow">
            <Download className="h-8 w-8 text-black font-bold" />
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text">
            {t('settings.backup')}
          </h2>
          <p className="text-gray-300 text-sm mt-3">Keep your recovery phrase and wallet file safe</p>
        </div>

        {/* Recovery Phrase */}
        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <h3 className="text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text font-bold text-lg">
                {t('wallet.saveRecovery')}
              </h3>
            </div>

            <div className="relative">
              <div
                className={`grid grid-cols-3 gap-3 p-5 bg-gradient-to-br from-gray-900 via-gray-900 to-black rounded-lg border border-yellow-600/40 shadow-lg ${
                  !showMnemonic ? 'blur-sm' : ''
                }`}
              >
                {mockMnemonic.split(' ').map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg text-sm border border-yellow-600/20 hover:border-yellow-500/40 transition-all duration-200"
                  >
                    <span className="text-yellow-400 text-xs font-bold">{index + 1}.</span>
                    <span className="text-white font-medium">{word}</span>
                  </div>
                ))}
              </div>

              {!showMnemonic && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    onClick={handClickReveal}
                    variant="outline"
                    className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-500 font-bold py-3 px-6 shadow-lg shadow-yellow-500/20 transition-all duration-200"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('wallet.clickReveal')}
                  </Button>
                </div>
              )}
            </div>

            {showMnemonic && (
              <Button
                onClick={copyMnemonic}
                variant="outline"
                className="w-full border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-500 font-bold py-3 shadow-lg shadow-yellow-500/20 transition-all duration-200"
              >
                <Copy className="h-4 w-4 mr-2" />
                {t('common.copy')}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Download Backup */}
        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 trump-button-glow">
                <Download className="h-5 w-5 text-black font-bold" />
              </div>
              <h3 className="text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text font-bold text-lg">
                {t('settings.backupConfirmTitle')}
              </h3>
            </div>

            <p className="text-gray-300 text-sm">{t('settings.backupConfirmInfo')}</p>

            <Button
              onClick={downloadBackup}
              className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold py-3 shadow-xl shadow-yellow-500/30 trump-button-glow transition-all duration-300 transform hover:scale-105"
            >
              <Download className="h-5 w-5 mr-2" />
              {t('settings.backupConfirm')}
            </Button>
          </CardContent>
        </Card>

        <Button
          onClick={() => setCurrentView('main')}
          variant="outline"
          className="w-full border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-500 font-bold py-3 transition-all duration-200"
        >
          {t('common.back')}
        </Button>

        {/* Password Verification Dialog */}
        <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <AlertDialogContent className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/50 trump-card-glow shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-xl font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-yellow-500" />
                {t('settings.verifyPassword')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">{t('settings.verifyPasswordInfo')}</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-password" className="text-yellow-400 font-bold">
                  {t('settings.password')}
                </Label>
                <Input
                  id="verify-password"
                  type="password"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  placeholder={t('settings.inputPassword')}
                  className="bg-gradient-to-br from-gray-900 to-black border-yellow-600/40 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500/20 p-3"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePasswordVerify()
                    }
                  }}
                />
              </div>
            </div>

            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel
                onClick={() => {
                  setShowPasswordDialog(false)
                  setVerifyPassword('')
                }}
                className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-500 font-bold py-3 transition-all duration-200"
              >
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handlePasswordVerify}
                className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold py-3 shadow-xl shadow-yellow-500/30 trump-button-glow transition-all duration-300 transform hover:scale-105"
              >
                {t('common.verify')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  if (currentView === 'security') {
    return (
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-500/30 trump-button-glow">
            <Shield className="h-8 w-8 text-black font-bold" />
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text">
            {t('settings.security')}
          </h2>
          <p className="text-gray-300 text-sm mt-3">Manage your wallet security preferences</p>
        </div>

        {/* Security Status */}
        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle className="h-6 w-6 text-black font-bold" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Wallet Encrypted</h3>
                  <p className="text-gray-300 text-sm">Your wallet is protected with a password</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle className="h-6 w-6 text-black font-bold" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Recovery Phrase Secured</h3>
                  <p className="text-gray-300 text-sm">Your 12-word recovery phrase is available for backup</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Actions */}
        <div className="space-y-4">
          <Button
            onClick={() => setCurrentView('changePassword')}
            className="w-full bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 hover:from-gray-700 hover:via-gray-700 hover:to-gray-800 text-white border border-yellow-600/30 hover:border-yellow-500/50 justify-start py-4 font-bold transition-all duration-200"
          >
            <Key className="h-5 w-5 mr-3 text-yellow-400" />
            {t('settings.changePassword')}
          </Button>

          <Button
            onClick={() => setCurrentView('backup')}
            className="w-full bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 hover:from-gray-700 hover:via-gray-700 hover:to-gray-800 text-white border border-yellow-600/30 hover:border-yellow-500/50 justify-start py-4 font-bold transition-all duration-200"
          >
            <Download className="h-5 w-5 mr-3 text-yellow-400" />
            {t('settings.backup')}
          </Button>

          <Button
            onClick={onLockWallet}
            className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold py-4 shadow-xl shadow-yellow-500/30 trump-button-glow transition-all duration-300 transform hover:scale-105 justify-start"
          >
            <Lock className="h-5 w-5 mr-3" />
            {t('settings.lock')}
          </Button>
        </div>

        <Button
          onClick={() => setCurrentView('main')}
          variant="outline"
          className="w-full border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-500 font-bold py-3 transition-all duration-200"
        >
          {t('common.back')}
        </Button>
      </div>
    )
  }

  if (currentView === 'help') {
    return (
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-500/30 trump-button-glow">
            <HelpCircle className="h-8 w-8 text-black font-bold" />
          </div>
          <h2 className="text-2xl font-bold text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text">
            {t('settings.help')}
          </h2>
          <p className="text-gray-300 text-sm mt-3">Get help with your TRMP wallet</p>
        </div>

        {/* Help Topics */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
            <CardContent className="p-6">
              <div
                className="text-gray-400 text-sm prose prose-sm max-w-none prose-invert"
                dangerouslySetInnerHTML={{ __html: t('safety.instructions') }}
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
            <CardContent className="p-6">
              <div
                className="text-gray-400 text-sm prose prose-sm max-w-none prose-invert"
                dangerouslySetInnerHTML={{ __html: t('Technical.Overview') }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Contact Support */}
        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text font-bold text-lg">
              {t('common.contactSupport')}
            </h3>
            <p className="text-gray-300 text-sm">{t('common.contactSupportDesc')}</p>
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 hover:from-gray-600 hover:via-gray-600 hover:to-gray-700 text-white font-bold py-3 border border-yellow-600/30 hover:border-yellow-500/50 transition-all duration-200"
                onClick={() => window.open('https://github.com/Forlingham/trumPOW_web_wallet_next', '_blank')}
              >
                <Github className="h-5 w-5 mr-2" />
                {t('common.contactSupportGitHub')}
              </Button>
              <Button
                className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white font-bold py-3 shadow-lg shadow-blue-500/30 transition-all duration-200"
                onClick={() => window.open('https://x.com/Hysanalde', '_blank')}
              >
                <Twitter className="h-5 w-5 mr-2" />
                Twitter / X
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
          <CardContent className="p-6 text-center">
            <h3 className="text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text font-bold text-lg mb-3">
              {t('wallet.title')}
            </h3>
            <p className="text-gray-300 text-sm font-medium">Version {VERSION}</p>
            <p className="text-gray-400 text-xs mt-2">{t('common.walletInfo')}</p>
          </CardContent>
        </Card>

        <Button
          onClick={() => setCurrentView('main')}
          variant="outline"
          className="w-full border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/20 hover:border-yellow-500 font-bold py-3 transition-all duration-200"
        >
          {t('common.back')}
        </Button>
      </div>
    )
  }

  // Main settings view
  const settingsItems = [
    {
      icon: Key,
      title: t('settings.changePassword'),
      description: t('settings.changePasswordInfo'),
      action: () => setCurrentView('changePassword')
    },
    {
      icon: Download,
      title: t('settings.backup'),
      description: t('settings.backupInfo'),
      action: () => setCurrentView('backup')
    },
    {
      icon: Shield,
      title: t('settings.lock'),
      description: t('settings.lockInfo'),
      action: () => setCurrentView('security')
    },
    {
      icon: HelpCircle,
      title: t('settings.help'),
      description: t('settings.helpInfo'),
      action: () => setCurrentView('help')
    }
  ]

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {/* Settings Items */}
      <div className="space-y-4">
        {settingsItems.map((item, index) => (
          <Card
            key={index}
            className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 hover:border-yellow-500/50 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20 trump-card-glow"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4" onClick={item.action}>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 trump-button-glow">
                  <item.icon className="h-6 w-6 text-black font-bold" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{item.title}</h3>
                  <p className="text-gray-300 text-sm mt-1">{item.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 pt-6">
        <Button
          onClick={onLockWallet}
          className="w-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700 text-black font-bold py-4 shadow-xl shadow-yellow-500/30 trump-button-glow transition-all duration-300 transform hover:scale-105"
        >
          <Lock className="h-5 w-5 mr-2" />
          {t('settings.lock')}
        </Button>

        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white font-bold py-4 shadow-xl shadow-red-500/30 transition-all duration-300 transform hover:scale-105"
            >
              <LogOut className="h-5 w-5 mr-2" />
              {t('settings.reset')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-900 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t('settings.resetConfirmTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                {t('settings.resetConfirm')}
                <br />
                <span className="text-red-400 font-medium mt-2 block">{t('settings.resetConfirmInfo')}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                {t('common.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={onResetWallet} className="bg-red-600 hover:bg-red-700 text-white">
                {t('common.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Wallet Info */}
      <Card className="bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-yellow-600/30 trump-card-glow">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-transparent bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text font-bold text-lg">
              {t('common.supportAuthor')}
            </h3>
            <p className="text-gray-300 text-sm">{t('common.supportAuthorDesc')}</p>
            <div className="space-y-3 text-left">
              {[
                { label: 'BTC', address: 'bc1qnvdrxs23t6ejuxjs6mswx7cez2rn80wrwjd0u8' },
                { label: 'BNB / USDT (BEP-20)', address: '0xD4dB57B007Ad386C2fC4d7DD146f5977c039Fefc' },
                { label: 'TRMP', address: 'TH1ffTyfj8EroCJ7FS2Re8tCM9rvcnYKw1' }
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 py-3  "
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-yellow-400 text-sm font-bold mb-1">{item.label}:</p>
                    <p className="text-gray-300 text-xs font-mono break-all">{item.address}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-600/20 rounded-lg transition-all duration-200"
                    onClick={() => {
                      navigator.clipboard.writeText(item.address)
                      toast({
                        title: t('common.copySuccess'),
                        description: `${item.label} ${t('common.addressCopied')}`,
                        duration: 2000
                      })
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-700/50">
              <p className="text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text font-bold text-sm">
                {t('wallet.title')} {VERSION}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
