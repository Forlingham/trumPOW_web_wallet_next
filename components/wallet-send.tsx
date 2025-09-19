'use client'

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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { useToast } from '@/hooks/use-toast'
import { onBroadcastApi, Unspent } from '@/lib/api'
import {
  calcAppFee,
  calcFee,
  calcValue,
  decryptWallet,
  hideString,
  isValidTrumpowAddress,
  NAME_TOKEN,
  onOpenExplorer,
  signTransaction,
  sleep
} from '@/lib/utils'
import { PendingTransaction, useWalletActions, useWalletState } from '@/stores/wallet-store'
import * as bip39 from 'bip39'
import Decimal from 'decimal.js'
import { ArrowUpDown, ChevronRight, ExternalLink, Lock, QrCode, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface WalletSendProps {
  onNavigate: (view: string) => void
}

export function WalletSend({ onNavigate }: WalletSendProps) {
  const { wallet, coinPrice, unspent } = useWalletState()
  const { getBaseFee, addPendingTransaction, setUpdateBalanceByMemPool } = useWalletActions()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form')
  // const [recipientAddress, setRecipientAddress] = useState('')
  // const [sendAmount, setSendAmount] = useState('')
  const [isSliding, setIsSliding] = useState(false)

  const [sendList, setSendList] = useState<SendList[]>([
    {
      address: '',
      amount: ''
    }
  ])
  const [sendListConfirm, setSendListConfirm] = useState<SendList[]>([])
  const [sendAmount, setSendAmount] = useState<number>(0)
  const [sendAmountTotal, setSendAmountTotal] = useState<number>(0)
  const [baseFee, setBaseFee] = useState<number>(0)
  const [networkFee, setNetworkFee] = useState<number>(0)
  const [appFee, setAppFee] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const [pickUnspents, setPickUnspents] = useState<Unspent[]>([])
  const [addressErrors, setAddressErrors] = useState<{ [key: number]: boolean }>({})
  const [amountErrors, setAmountErrors] = useState<{ [key: number]: boolean }>({})
  const [lastAmountInputIndex, setLastAmountInputIndex] = useState<number | null>(null)
  const [deductFeeFromAmount, setDeductFeeFromAmount] = useState<boolean>(false)
  const [isForcedDeductFeeFromAmount, setIsForcedDeductFeeFromAmount] = useState<boolean>(false)
  const [totalAmountError, setTotalAmountError] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [passwordError, setPasswordError] = useState<string>('')
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false)

  const [currentPendingTransaction, setCurrentPendingTransaction] = useState<PendingTransaction>()

  async function getInitData() {
    setIsLoading(true)
    try {
      const getBaseFeeRes = await getBaseFee()
      setBaseFee(getBaseFeeRes.fee)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setUpdateBalanceByMemPool()
    getInitData()
  }, [])

  const handleChangeAddress = (index: number, value: string) => {
    setSendList((prev) => {
      const newList = [...prev]
      newList[index].address = value
      return newList
    })
    // 清除该输入框的错误状态
    if (addressErrors[index]) {
      setAddressErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }
  }

  const handleBlurAddress = (index: number) => {
    if (sendList[index].address && !isValidTrumpowAddress(sendList[index].address)) {
      setAddressErrors((prev) => ({ ...prev, [index]: true }))
    }
  }

  const handleChangeAmount = (index: number, value: string) => {
    setSendList((prev) => {
      const newList = [...prev]
      newList[index].amount = value
      return newList
    })

    // 记录最后输入的输入框
    setLastAmountInputIndex(index)

    // 清除该输入框的错误状态
    if (amountErrors[index]) {
      setAmountErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }
  }

  const handleMaxAmount = (index: number) => {
    handleChangeAmount(index, wallet.usableBalance.toString())
    setDeductFeeFromAmount(true)
  }

  const validateAmount = (index: number, amount: string) => {
    const numAmount = parseFloat(amount)
    const walletBalance = parseFloat(wallet.usableBalance.toString())

    if (amount && !isNaN(numAmount) && numAmount > walletBalance) {
      setAmountErrors((prev) => ({ ...prev, [index]: true }))
    }
  }

  // 验证总金额是否超出余额
  const validateTotalAmount = () => {
    const validSendList = sendList.filter((item) => {
      return item.address && isValidTrumpowAddress(item.address) && item.amount && Number.parseFloat(item.amount) > 0
    })
    const totalAmount = validSendList.reduce((sum, item) => sum.add(item.amount), new Decimal(0))
    const availableBalance = parseFloat(wallet.usableBalance.toString())
    const fee = networkFee

    let requiredAmount = totalAmount
    if (!deductFeeFromAmount) {
      requiredAmount = requiredAmount.plus(fee)
    }

    if (requiredAmount.gt(availableBalance)) {
      setTotalAmountError(t('send.inputExceed'))
      return false
    } else {
      setTotalAmountError('')
      return true
    }
  }

  // 监听金额、手续费和开关状态变化，实时验证
  useEffect(() => {
    if (sendList.some((item) => item.amount) && networkFee) {
      validateTotalAmount()
    }
  }, [sendList, networkFee, deductFeeFromAmount, wallet.usableBalance])

  useEffect(() => {
    if (step !== 'form') return
    const validSendList = sendList.filter((item) => {
      return item.address && isValidTrumpowAddress(item.address) && item.amount && Number.parseFloat(item.amount) > 0
    })

    if (validSendList.length === 0) {
      setNetworkFee(0)
      setPickUnspents([])
      setSendAmount(0)
      return
    }

    const _sendAmount = new Decimal(
      validSendList.reduce((acc, item) => acc.plus(new Decimal(item.amount || '0')), new Decimal(0))
    ).toNumber()
    setSendAmount(_sendAmount)

    // 计算需要多少个输入才能满足发送的金额
    let pickAmount = new Decimal(0)
    const pickUnspentsArr: Unspent[] = []

    // 排序，区块小的排前面
    const unspent_ = [...unspent].sort((a, b) => a.height - b.height)
    console.log(unspent_, 'unspent')

    // 倒序遍历未花费的输出
    for (const unspentItem of unspent_) {
      if (unspentItem.isHasMemPool || !unspentItem.isUsable) {
        continue
      }
      pickAmount = pickAmount.plus(new Decimal(unspentItem.amount))
      console.log('pickAmount', pickAmount.toString(), 'sendAmount', _sendAmount)

      pickUnspentsArr.push(unspentItem)
      if (pickAmount.gte(new Decimal(_sendAmount))) {
        break
      }
    }
    if (pickAmount.lt(_sendAmount)) {
      setTotalAmountError(t('send.inputExceed'))
      return
    }

    setPickUnspents([...pickUnspentsArr])
    console.log(pickUnspentsArr)

    // 统计发送TX输入数量 - 使用本地变量而不是状态变量
    const inputCount = pickUnspentsArr.length
    // 统计输出地址数量 (收款地址 + 找零地址)
    const outputCount = sendList.filter((item) => item.address).length + 5

    // 计算app手续费
    const appFee = calcAppFee(_sendAmount)
    setAppFee(appFee)

    const _networkFee = new Decimal(appFee).plus(calcFee(inputCount, outputCount, baseFee).feeScash).toNumber()
    setNetworkFee(_networkFee)

    // 如何输入的金额刚刚好，能和交易数据金额相等,或者输出的总金额添加上手续费大于总的输入金额，就需要强制从金额中扣除手续费，并且不需要找零地址
    if (pickAmount.eq(new Decimal(_sendAmount)) || new Decimal(_sendAmount).plus(networkFee).gte(new Decimal(pickAmount))) {
      setDeductFeeFromAmount(true)
      setIsForcedDeductFeeFromAmount(true)
    } else {
      setIsForcedDeductFeeFromAmount(false)
    }
  }, [sendList])

  const handleAddAddress = () => {
    // Mock address book functionality
    setSendList([...sendList, { address: '', amount: '' }])
  }

  const handleSendToConfirm = () => {
    const validSendList = JSON.parse(
      JSON.stringify(
        sendList.filter((item) => {
          return item.address && isValidTrumpowAddress(item.address) && item.amount && Number.parseFloat(item.amount) > 0
        })
      )
    )
    if (validSendList.length === 0) {
      setSendListConfirm([])
      return
    }
    setStep('confirm')

    if (!deductFeeFromAmount) {
      setSendAmountTotal(+new Decimal(sendAmount).add(networkFee).toFixed(8))
    } else {
      // 如果从金额中减去手续费，就在最后一个地址减。需要判断金额够手续费不，不够就再向上找一个，全部不够就报错
      let lastIndex = validSendList.length - 1
      while (lastIndex >= 0) {
        if (new Decimal(validSendList[lastIndex].amount || '0').gte(networkFee)) {
          validSendList[lastIndex].amount = new Decimal(validSendList[lastIndex].amount || '0').minus(networkFee).toString()
          break
        }
        lastIndex--
      }
      if (lastIndex < 0) {
        setTotalAmountError(t('send.inputExceed'))
        return
      }
      setSendAmountTotal(sendAmount)
    }

    setSendListConfirm(validSendList)
  }

  const handleScanQR = () => {
    // Mock QR scanner functionality
    toast({
      title: 'QR Scanner',
      description: 'QR scanner feature will be implemented soon'
    })
  }

  const handlePasswordSubmit = () => {
    // 验证密码
    if (!password) {
      setPasswordError(t('wallet.lock.input'))
      return
    }

    // 这里可以添加密码验证逻辑
    // 假设密码正确，清除错误并显示确认弹窗
    setPasswordError('')
    setShowConfirmDialog(true)
  }

  const [isConfirmLoading, setIsConfirmLoading] = useState<boolean>(false)

  const handleConfirmTransaction = async () => {
    setIsConfirmLoading(true)
    // password
    const walletObj = decryptWallet(wallet.encryptedWallet, password)
    if (!walletObj.isSuccess) {
      setPasswordError(t('wallet.lock.error'))
      setShowConfirmDialog(false)
      setIsConfirmLoading(false)
      return
    }

    if (!walletObj.wallet) {
      setIsConfirmLoading(false)
      setShowConfirmDialog(false)
      return
    }

    const seed = bip39.mnemonicToSeedSync(walletObj.wallet.mnemonic)
    try {
      const signTransactionResult = await signTransaction(pickUnspents, sendListConfirm, networkFee, wallet.address, seed, appFee)
      if (!signTransactionResult.isSuccess) {
        toast({
          title: '签名失败',
          description: '',
          variant: 'destructive'
        })
        setShowConfirmDialog(false)
        setIsConfirmLoading(false)
        return
      }

      const res = await onBroadcastApi({
        address: wallet.address,
        txid: '',
        rawtx: signTransactionResult.rawtx,
        totalInput: signTransactionResult.totalInput.toNumber(),
        totalOutput: signTransactionResult.totalOutput.toNumber(),
        change: signTransactionResult.change.toNumber(),
        feeRate: signTransactionResult.feeRate,
        appFee: signTransactionResult.appFee
      })

      if (!res.data.success && res.data.error) {
        toast({
          title: '错误码:' + res.data.error.error.code,
          description: res.data.error.error.message,
          variant: 'destructive'
        })
        setIsConfirmLoading(false)
        return
      }

      const pendingTransaction: PendingTransaction = {
        id: res.data.rpcData.txid,
        rawtx: signTransactionResult.rawtx,
        totalInput: signTransactionResult.totalInput.toNumber(),
        totalOutput: signTransactionResult.totalOutput.toNumber(),
        change: signTransactionResult.change.toNumber(),
        feeRate: signTransactionResult.feeRate,
        pickUnspents: pickUnspents,
        sendListConfirm: sendListConfirm,
        timestamp: Date.now(),
        status: 'pending'
      }

      addPendingTransaction(pendingTransaction)
      setCurrentPendingTransaction(pendingTransaction)
      setStep('success')
      setIsSliding(false)
      setPassword('')
      toast({
        title: t('send.success'),
        description: t('send.broadcast'),
        variant: 'success'
      })
    } catch (error) {
      console.log(error)
      toast({
        title: t('send.error'),
        description: t('send.errorInfo'),
        variant: 'destructive'
      })
    } finally {
      setIsConfirmLoading(false)
      setShowConfirmDialog(false)
    }
  }

  const [isCancelLoading, setIsCancelLoading] = useState<boolean>(false)

  const handleCancelTransaction = async () => {
    setIsCancelLoading(true)
    await sleep(1533)
    setIsCancelLoading(false)
    setShowConfirmDialog(false)
  }

  if (step === 'success') {
    return (
      <div className="flex-1 flex items-center justify-center p-4 min-h-screen bg-gradient-to-br from-yellow-900 via-yellow-800 to-amber-900 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-amber-500/20 rounded-full blur-xl trump-pulse"></div>
          <div
            className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-400/15 to-amber-500/15 rounded-full blur-lg trump-pulse"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute top-1/2 left-1/3 w-20 h-20 bg-gradient-to-br from-yellow-400/10 to-amber-500/10 rounded-full blur-md trump-pulse"
            style={{ animationDelay: '2s' }}
          ></div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 right-20 text-4xl opacity-30 trump-float">💰</div>
        <div className="absolute bottom-32 left-16 text-3xl opacity-25 trump-float" style={{ animationDelay: '1.5s' }}>
          🚀
        </div>
        <div className="absolute top-1/3 left-20 text-2xl opacity-20 trump-float" style={{ animationDelay: '3s' }}>
          👑
        </div>
        <div className="w-full max-w-md mx-auto">
          <div className="text-center space-y-6">
            {/* Success Icon with Trump theme styling */}
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center mx-auto shadow-2xl border-2 border-yellow-400 trump-mini-glow">
                <ArrowUpDown className="h-10 w-10 text-yellow-100 rotate-90" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-yellow-100 tracking-tight meme-text">🎉 {t('send.success')} 🎉</h2>
              <p className="text-yellow-300 text-sm">{t('send.broadcast')}</p>
            </div>

            {/* Transaction Details */}
            {currentPendingTransaction && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 rounded-lg p-3 border border-yellow-600/40 backdrop-blur-sm trump-card-glow">
                  <div className="flex flex-col space-y-2">
                    <p className="text-yellow-300 text-xs uppercase tracking-wide meme-text">💳 Transaction ID</p>
                    <p className="text-yellow-100 text-sm font-mono break-all">{currentPendingTransaction.id}</p>
                    <button
                      onClick={() => onOpenExplorer('1', 'tx', currentPendingTransaction.id)}
                      className="flex items-center space-x-1 text-yellow-300 hover:text-yellow-100 text-sm transition-colors self-start mt-1 trump-button-hover"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span className="meme-text">🔍 {t('transactions.openExplorer')}</span>
                    </button>
                  </div>
                </div>
                {/* Amount Card */}
                <div className="bg-gradient-to-r from-yellow-900/60 to-amber-900/60 rounded-xl p-4 border border-yellow-500/50 backdrop-blur-sm trump-card-glow">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-100 mb-1 meme-text">
                      💰 {sendAmountTotal} {NAME_TOKEN}
                    </p>
                    <p className="text-yellow-300 text-sm">${calcValue(sendAmountTotal, coinPrice)} USD</p>
                  </div>
                </div>

                {/* Recipients */}
                <div className="space-y-3">
                  {currentPendingTransaction?.sendListConfirm.map((item, index) => (
                    <div
                      className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 rounded-lg p-3 border border-yellow-600/40 backdrop-blur-sm trump-card-glow"
                      key={index}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="text-yellow-300 text-xs uppercase tracking-wide mb-1 meme-text">📤 To</p>
                          <p className="text-yellow-100 text-sm font-mono truncate">{hideString(item.address)}</p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-yellow-300 text-xs uppercase tracking-wide mb-1 meme-text">💎 Amount</p>
                          <p className="text-yellow-100 text-sm font-semibold">
                            {item.amount} {NAME_TOKEN}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Raw Transaction */}
                <div className="bg-gradient-to-r from-yellow-950/60 to-amber-950/60 rounded-lg p-3 border border-yellow-600/40 backdrop-blur-sm trump-card-glow">
                  <p className="text-yellow-300 text-xs uppercase tracking-wide mb-2 meme-text">📜 {t('send.rawTransaction')}</p>
                  <div className="bg-black/50 rounded p-2 max-h-20 overflow-y-auto border border-yellow-800/30">
                    <p className="text-yellow-400 text-xs font-mono break-all leading-relaxed">{currentPendingTransaction?.rawtx}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Back Button */}
            <Button
              onClick={() => onNavigate('home')}
              className="w-full bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-700 hover:to-amber-800 text-yellow-100 font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl border border-yellow-500/50 trump-button-hover meme-text"
            >
              🏠 {t('send.backToHome')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirm') {
    return (
      <div className="flex-1 p-4 space-y-4 overflow-y-auto  from-yellow-900 via-yellow-800 to-amber-900 relative">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/15 to-amber-500/15 rounded-full blur-xl trump-pulse"></div>
          <div
            className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-400/10 to-amber-500/10 rounded-full blur-lg trump-pulse"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute top-1/2 left-1/3 w-20 h-20 bg-gradient-to-br from-yellow-400/8 to-amber-500/8 rounded-full blur-md trump-pulse"
            style={{ animationDelay: '2s' }}
          ></div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 right-20 text-3xl opacity-20 trump-float">💰</div>
        <div className="absolute bottom-32 left-16 text-2xl opacity-15 trump-float" style={{ animationDelay: '1.5s' }}>
          🚀
        </div>

        <div className="relative z-10">
          <div className="text-center">
            <h2 className="text-xl font-bold text-yellow-100 mb-2 meme-text">🔍 {t('send.confirm')} 🔍</h2>
          </div>

          {/* Transaction Summary */}
          <Card className="bg-gradient-to-r from-yellow-900/60 to-amber-900/60 border-yellow-600/50 trump-card-glow mb-4 py-0">
            <CardContent className="px-4 space-y-4">
              <div className="text-center">
                {/* <div className="text-3xl font-bold text-white">
                {sendList
                  .filter((item) => item.address && item.amount)
                  .reduce((acc, item) => acc + Number.parseFloat(item.amount || '0'), 0)}
              </div> */}
                {/* <div className="text-gray-400">
              
              </div> */}
              </div>

              <div className="flex justify-between">
                <span className="text-yellow-300 meme-text">📤 {t('send.from')}:</span>
                <span className="text-yellow-100">{hideString(wallet.address)}</span>
              </div>

              {sendListConfirm.map((item, index) => (
                <div className="space-y-3 border-t border-yellow-600/30 pt-3" key={index}>
                  <div className="flex justify-between">
                    <span className="text-yellow-300 meme-text">📥 {t('send.to')}:</span>
                    <span className="text-yellow-100 font-mono text-sm">{hideString(item.address)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-yellow-300 meme-text">💎 {t('send.amount')}:</span>
                    <span className="text-yellow-100 font-mono text-sm">{item.amount}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t border-yellow-600/30 pt-3">
                <span className="text-yellow-300 meme-text">⚡ {t('common.fee')}:</span>
                <span className="text-yellow-100 flex items-center gap-2">
                  {networkFee} {NAME_TOKEN}
                </span>
              </div>

              <div className="">
                <div className="flex justify-between font-semibold">
                  <span className="text-yellow-300 meme-text">💰 {t('send.total')}:</span>
                  <div className="text-right">
                    <span className="text-yellow-100">
                      {sendAmountTotal} {NAME_TOKEN}
                    </span>
                    <br />
                    <span className="text-yellow-100">${calcValue(sendAmountTotal, coinPrice)} USD</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Input */}
          <Card className="bg-gradient-to-r from-yellow-900/60 to-amber-900/60 border-yellow-600/50 trump-card-glow mb-4 py-0">
            <CardContent className="px-4 py-4 space-y-4">
              <div className="trump-input-container">
                <Label className="text-yellow-400 text-sm flex items-center gap-2 meme-text mb-2">
                  <Lock className="h-4 w-4 text-yellow-300" />
                  🔐 {t('send.confirmTransaction')}
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) setPasswordError('')
                  }}
                  placeholder="Enter your golden password..."
                  className="trump-input"
                />
              </div>
              {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
            </CardContent>
          </Card>

          {/* Confirm Button with Dialog */}
          <AlertDialog
            open={showConfirmDialog}
            onOpenChange={(open) => {
              // 只允许通过代码控制关闭，不允许点击外部关闭
              if (!open) return
              setShowConfirmDialog(open)
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                onClick={handlePasswordSubmit}
                disabled={isSliding || !password}
                className="w-full bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-700 hover:to-amber-800 text-yellow-100 font-bold py-4 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl border border-yellow-500/50 trump-button-hover meme-text disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:border-gray-600 transform hover:scale-105 trump-button-glow"
              >
                {isSliding ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-100"></div>
                ) : (
                  `🚀 ${t('send.confirmPay')}`
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gradient-to-br from-yellow-900 to-amber-900 border-yellow-600/50">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-yellow-100 meme-text">🔍 {t('send.confirm')}</AlertDialogTitle>
                <AlertDialogDescription className="text-yellow-300">
                  {t('send.send')} {sendAmountTotal} {NAME_TOKEN}，{t('send.fee')} {networkFee} {NAME_TOKEN}。
                  <br />
                  {t('send.confirmTransactionInfo')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={handleCancelTransaction}
                  className="bg-gradient-to-r from-gray-700 to-gray-800 border-yellow-600/30 text-yellow-300 hover:bg-gray-600 trump-button-hover"
                >
                  {isCancelLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-100"></div>
                  ) : (
                    `❌ ${t('send.cancel')}`
                  )}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmTransaction}
                  className="bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-700 hover:to-amber-800 text-yellow-100 trump-button-hover meme-text"
                >
                  {isConfirmLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-100"></div>
                  ) : (
                    `✅ ${t('send.confirmTransactionOn')}`
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={() => setStep('form')}
            variant="outline"
            className="w-full border-yellow-600/50 text-yellow-400 hover:text-yellow-200 hover:bg-yellow-600/30 trump-button-hover meme-text font-bold px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 mt-4"
          >
            ↩️ {t('send.backToEdit')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto  from-yellow-900 via-yellow-800 to-amber-900 relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-gradient-to-br from-yellow-400/15 to-amber-500/15 rounded-full blur-xl trump-pulse"></div>
        <div
          className="absolute bottom-1/3 left-1/4 w-24 h-24 bg-gradient-to-br from-yellow-400/10 to-amber-500/10 rounded-full blur-lg trump-pulse"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/3 w-20 h-20 bg-gradient-to-br from-yellow-400/8 to-amber-500/8 rounded-full blur-md trump-pulse"
          style={{ animationDelay: '2s' }}
        ></div>
        <div
          className="absolute top-3/4 right-1/3 w-16 h-16 bg-gradient-to-br from-yellow-400/6 to-amber-500/6 rounded-full blur-sm trump-pulse"
          style={{ animationDelay: '3s' }}
        ></div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute top-20 right-20 text-3xl opacity-20 trump-float">💰</div>
      <div className="absolute bottom-32 left-16 text-2xl opacity-15 trump-float" style={{ animationDelay: '1.5s' }}>
        🚀
      </div>
      <div className="absolute top-1/3 left-20 text-xl opacity-10 trump-float" style={{ animationDelay: '3s' }}>
        👑
      </div>

      <div className="relative z-10">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-yellow-300 meme-text">
              💰 {t('wallet.available')}: {wallet.usableBalance} {NAME_TOKEN}
            </span>
            <div className="text-right">
              <div className="text-yellow-100 font-medium">1 {NAME_TOKEN}</div>
              <div className="text-yellow-400">${coinPrice} USD</div>
            </div>
          </div>
        </div>

        {/* Send To Address */}
        {sendList.map((item, index) => (
          <Card key={index} className="bg-gradient-to-r from-yellow-900/60 to-amber-900/60 border-yellow-600/50 trump-card-glow mb-4">
            <CardContent className="px-4 space-y-3">
              <div className="trump-input-container">
                <Label className="text-yellow-400 text-sm meme-text mb-2">📤 {t('send.to')}</Label>
                <div className="relative">
                  <Input
                    value={item.address}
                    onChange={(e) => handleChangeAddress(index, e.target.value)}
                    onBlur={() => handleBlurAddress(index)}
                    placeholder={t('send.toInfo')}
                    className={`trump-input pr-20 ${addressErrors[index] ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  {item.address && (
                    <Button
                      onClick={() => handleChangeAddress(index, '')}
                      variant="ghost"
                      size="sm"
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-red-200 hover:bg-red-600/30 trump-button-hover shadow-md hover:shadow-lg transition-all duration-200 rounded-md"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    onClick={handleScanQR}
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-yellow-400 hover:text-yellow-200 hover:bg-yellow-600/20 trump-button-hover shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {addressErrors[index] && <div className="text-red-400 text-sm mt-1">地址格式错误，请检查输入的地址</div>}

              <div className="trump-input-container">
                <Label className="text-yellow-400 text-sm meme-text mb-2">💎 {t('common.amount')}</Label>
                <div className="relative">
                  <Input
                    value={item.amount}
                    onChange={(e) => handleChangeAmount(index, e.target.value)}
                    onBlur={() => validateAmount(index, item.amount)}
                    placeholder={t('send.amount')}
                    type="number"
                    className={`trump-input font-bold pr-20 ${
                      amountErrors[index] && lastAmountInputIndex === index ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMaxAmount(index)}
                      className="text-yellow-400 hover:text-yellow-200 text-sm font-bold trump-button-hover meme-text px-2 py-1 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      💰 MAX
                    </button>
                    <span className="text-yellow-100 font-medium">{NAME_TOKEN}</span>
                  </div>
                </div>
              </div>

              {amountErrors[index] && lastAmountInputIndex === index && (
                <div className="text-red-400 text-sm mt-1 bg-red-900/20 border border-red-700/50 rounded-lg p-2 trump-card-glow">
                  ⚠️ {t('send.amountExceed')} {wallet.usableBalance} {NAME_TOKEN}
                </div>
              )}

              <div className="text-center">
                {/* <span className="text-gray-400">${(Number.parseFloat(sendAmount || '0') * 0.0138).toFixed(4)}</span> */}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Another Address */}
        <Card
          className="bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-yellow-600/50 cursor-pointer hover:from-yellow-900/60 hover:to-amber-900/60 trump-card-glow trump-button-hover mb-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          onClick={handleAddAddress}
        >
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="text-yellow-300 meme-text font-bold">➕ {t('send.addAnother')}</span>
              <ChevronRight className="h-4 w-4 text-yellow-300" />
            </div>
          </CardContent>
        </Card>

        {/* Network Fee */}
        <Card className="bg-gradient-to-r from-yellow-900/60 to-amber-900/60 border-yellow-600/50 trump-card-glow mb-4">
          <CardContent className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-yellow-300 meme-text">⚡ {t('send.fee')}:</div>
                <div className="text-yellow-100 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                      <span className="text-yellow-400">...</span>
                    </>
                  ) : (
                    <>
                      {networkFee} {NAME_TOKEN}
                    </>
                  )}
                </div>
              </div>
            </div>

            <label className="flex items-center cursor-pointer hover:bg-yellow-800/30 p-2 rounded-lg transition-colors trump-button-hover">
              <Checkbox
                disabled={isForcedDeductFeeFromAmount}
                checked={deductFeeFromAmount}
                onCheckedChange={(checked) => setDeductFeeFromAmount(checked === true)}
                className="w-4 h-4 min-w-4 max-w-4 min-h-4 max-h-4 flex-shrink-0 mr-3 border-2 border-yellow-400 data-[state=unchecked]:border-yellow-400 data-[state=unchecked]:bg-transparent data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500 data-[state=checked]:text-yellow-900"
              />

              <span className="text-yellow-400 text-sm select-none meme-text">💸 {t('send.feeDeducted')}</span>
            </label>
          </CardContent>
        </Card>

        {/* Error Message */}
        {totalAmountError && (
          <div className="text-red-400 text-sm text-center bg-red-900/30 border border-red-700/50 rounded-lg p-3 trump-card-glow">
            ⚠️ {totalAmountError}
          </div>
        )}

        {/* Continue Button */}
        <Button
          onClick={handleSendToConfirm}
          disabled={networkFee <= 0 || isLoading || !!totalAmountError}
          className="w-full bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-700 hover:to-amber-800 text-yellow-100 font-bold py-4 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl border border-yellow-500/50 trump-button-hover meme-text disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:border-gray-600 transform hover:scale-105 trump-button-glow"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-100"></div>
              <span>⏳ Loading...</span>
            </div>
          ) : (
            `🚀 ${t('common.confirm')}`
          )}{' '}
        </Button>
      </div>
    </div>
  )
}
