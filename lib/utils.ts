import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { decryptAES, encryptAES, hexToString, MD5, stringToHex } from './cryoto'
import Decimal from 'decimal.js'
import { bech32 } from 'bech32'
import * as bitcoin from 'bitcoinjs-lib'
import { getTransactionApi, Unspent } from './api'
import { BIP32Interface } from 'bip32'
import dayjs from 'dayjs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const VERSION = '1.0'

export const NAME_TOKEN = 'TRMP'

export const TRUMPOW_NETWORK = {
  messagePrefix: '\x18TrumPOW Signed Message:\n',
  // bech32 属性对于非 SegWit 币种不应被使用，最好移除或忽略
  bech32: 'trmp',
  bip32: {
    public: 0x02fadafe, // ✅ 正确的值
    private: 0x02fac495 // 这个值之前是正确的
  },
  pubKeyHash: 0x41, // 65 -> 对应地址开头的 'T'
  scriptHash: 0x1c, // 28
  wif: 0x97 // 151
}

export const TRUMPOW_PATH = "m/44'/3'/0'/0/0"

export const explorerUrl1 = 'https://explorer-1.trumpow.meme/'
export const explorerUrl2 = 'https://explorer-1.trumpow.meme/'

export function onOpenExplorer(network: string, type: string, id: string) {
  if (network === '1') {
    window.open(`${explorerUrl1}${type}/${id}`)
  } else {
    window.open(`${explorerUrl2}${type}/${id}`)
  }
}

export const ARR_FEE_ADDRESS = 'TE1WqowKDtoAb8PwQr4LgHArbvVPSH83JE'
// app 手续费收取标准
export const APP_FEE_ARR = [
  {
    min: 0,
    max: 1,
    fee: 0.01
  },
  {
    min: 1,
    max: 50,
    fee: 0.1
  },
  {
    min: 50,
    max: 500,
    fee: 3
  },
  {
    min: 500,
    max: 5000,
    fee: 30
  },
  {
    min: 5000,
    max: 10000,
    fee: 300
  },
  {
    min: 10000,
    max: 10000000,
    fee: 2000
  },
  {
    min: 10000000,
    max: Number.MAX_SAFE_INTEGER,
    fee: 8000
  }
]
export function calcAppFee(amount: string | number) {
  const amountDecimal = new Decimal(amount)
  for (const item of APP_FEE_ARR) {
    if (amountDecimal.gte(item.min) && amountDecimal.lt(item.max)) {
      return item.fee
    }
  }
  return 0
}

export function passwordMD5(password: string) {
  return MD5(password, 'trumPOW_password')
}

export function encryptWallet(wallet: WalletFile, passwordMD5String: string) {
  const walletString = JSON.stringify(wallet)
  const encryptedWallet = encryptAES(walletString, 'walletFile', passwordMD5String)
  return stringToHex(encryptedWallet)
}

export function decryptWallet(walletHex: string, password: string) {
  const passwordMD5String = passwordMD5(password)

  const walletString = hexToString(walletHex)
  const wallet = decryptAES(walletString, 'walletFile', passwordMD5String)

  if (!wallet) {
    return {
      isSuccess: false,
      wallet: null
    }
  }
  return {
    isSuccess: true,
    wallet: JSON.parse(wallet) as WalletFile
  }
}

export function downloadWalletFile(encryptedWallet: string) {
  // Create mock encrypted wallet file
  const walletData: WalletFileData = {
    version: VERSION,
    encrypted: true,
    data: encryptedWallet,
    timestamp: Date.now()
  }

  const blob = new Blob([JSON.stringify(walletData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trumPOW-wallet.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const SAT_PER_SCASH = new Decimal(1e8)
export function scashToSat(scashAmount: string | number) {
  return +new Decimal(scashAmount).times(SAT_PER_SCASH).toFixed(0)
  // toFixed(0) 保证是整数形式的字符串，可以再转 BigInt
}

// satoshi → TRMP (返回字符串，带 8 位小数)
export function satToScash(satAmount: number) {
  return +new Decimal(satAmount).div(SAT_PER_SCASH).toFixed(8)
}

/**
 * 计算交易手续费
 * @param {number} inputCount - 输入数量 (UTXO 个数)
 * @param {number} outputCount - 输出数量 (收款地址 + 找零地址)
 * @param {number} feerate - 每KB手续费率 (SCASH/kB) 来自 estimatefee 或 estimatesmartfee
 * @returns {object} { size: 交易大小 (vbytes), feeSat: 手续费 (sat), feeScash: 手续费 (SCASH) }
 */
export function calcFee(inputCount: number, outputCount: number, feerate: number) {
  // === 1. 换算 feerate 到 sat/byte ===
  // feerate 是 SCASH/kB → sat/byte
  const feerateDecimal = new Decimal(feerate)
  const satPerByte = feerateDecimal.mul(SAT_PER_SCASH).div(1000)

  // === 2. 估算交易大小 (vbytes) ===
  // P2WPKH 输入大约 68 vbytes，输出大约 31 vbytes，额外开销 10,
  const size = 10 + inputCount * 68 + outputCount * 31

  // === 3. 计算手续费 ===
  const sizeDecimal = new Decimal(size)
  const feeSatDecimal = sizeDecimal.mul(satPerByte).ceil()
  const feeSat = feeSatDecimal.toNumber()
  const feeScash = feeSatDecimal.div(SAT_PER_SCASH).toNumber()

  return { size, feeSat, feeScash }
}

/**
 * 验证一个地址是否是有效的 TrumPOW P2PKH 地址
 * @param address 要验证的地址字符串
 * @returns {boolean} 如果有效则返回 true，否则返回 false
 */
export function isValidTrumpowAddress(address: string): boolean {
  try {
    // 1. 尝试使用 TrumPOW 的网络参数来解码地址
    // bitcoin.address.toOutputScript 会进行 Base58Check 解码和版本字节检查
    bitcoin.address.toOutputScript(address, TRUMPOW_NETWORK)

    // 2. 如果上面那行代码没有抛出错误，就意味着：
    //    a. 地址的 Base58Check 校验和是正确的。
    //    b. 地址的版本字节与 TRUMPOW_NETWORK.pubKeyHash (65) 或 scriptHash (28) 匹配。
    return true
  } catch (error) {
    // 3. 如果解码过程中发生任何错误（例如，校验和错误、版本不匹配、格式无效），
    //    库会抛出一个异常。我们捕获这个异常并返回 false。
    // console.error(`地址验证失败: ${address}`, error.message);
    return false
  }
}

/**
 * 计算价值.  数量 * 单价
 */
export function calcValue(amount: number | string, price: number | string) {
  return new Decimal(amount).times(price).toFixed(2)
}

/**
 * 字符串隐藏中间部分
 */
export function hideString(str: string) {
  if (str.length <= 4) {
    return str
  }
  const prefix = str.slice(0, 4)
  const suffix = str.slice(-4)
  return `${prefix}...${suffix}`
}

/**
 * 签名交易
 */
export async function signTransaction(
  utxos: Unspent[],
  outputs: { address: string; amount: string }[],
  feeRate: number,
  myAddress: string,
  child: BIP32Interface,
  appFee: number
) {
  // 计算手续费
  let networkFee = feeRate
  if (appFee) {
    networkFee = new Decimal(feeRate).minus(appFee).toNumber()
  }

  // 计算总输入金额
  const totalInput = utxos.reduce((acc, utxo) => acc.plus(utxo.amount), new Decimal(0))

  // 计算总输出金额
  const totalOutput = outputs.reduce((acc, output) => acc.plus(output.amount), new Decimal(0))

  // === 构建交易 ===
  const psbt = new bitcoin.Psbt({ network: TRUMPOW_NETWORK })

  console.log('utxos', utxos)
  console.log('outputs', outputs)
  console.log('feeRate', feeRate)
  console.log('appFee', appFee)
  console.log('networkFee', networkFee)
  console.log('totalInput', totalInput.toString(), 'totalOutput', totalOutput.toString())

  for (const utxo of utxos) {
    const res = await getTransactionApi(utxo.txid)
    console.log(res)

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(res.data.rpcData, 'hex')
    })
  }

  outputs.forEach((output) => {
    psbt.addOutput({
      address: output.address,
      value: scashToSat(output.amount)
    })
  })
  if (appFee) {
    psbt.addOutput({
      address: ARR_FEE_ADDRESS,
      value: scashToSat(appFee)
    })
  }

  // 计算找零金额
  const change = totalInput.minus(totalOutput).minus(feeRate)
  console.log('change', change.toString())

  if (change.gt(0)) {
    psbt.addOutput({
      address: myAddress,
      value: scashToSat(change.toString())
    })
  }

  const publicKeyBuffer = Buffer.isBuffer(child.publicKey) ? child.publicKey : Buffer.from(child.publicKey)
  try {
    const customSigner = {
      publicKey: publicKeyBuffer,
      sign: (hash: Buffer) => {
        const signature = child.sign(hash)
        // 确保返回Buffer类型
        return Buffer.isBuffer(signature) ? signature : Buffer.from(signature)
      }
    }

    utxos.forEach((_, idx) => {
      psbt.signInput(idx, customSigner)
    })
    psbt.finalizeAllInputs()
  } catch (error) {
    console.log('签名失败', error)
    return {
      isSuccess: false,
      rawtx: '',
      totalInput,
      totalOutput,
      change,
      feeRate,
      appFee
    }
  }

  const rawtx = psbt.extractTransaction().toHex()

  return {
    isSuccess: true,
    rawtx,
    totalInput,
    totalOutput,
    change,
    feeRate,
    appFee
  }
}

/**
 * 一个健壮的日期格式化工具函数
 * @param date - 需要格式化的日期，可以是字符串、时间戳（秒/毫秒）、Date对象
 * @param format - 返回的日期格式，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串，如果输入无效则返回空字符串
 */
export function formatDate(date: string | number | Date, format = 'YYYY-MM-DD HH:mm:ss'): string {
  // 1. 处理空值或无效输入
  if (!date) {
    return ''
  }
  let dayjsInstance: dayjs.Dayjs
  // 2. 根据不同输入类型创建 dayjs 实例
  if (typeof date === 'number') {
    // 智能判断时间戳是秒还是毫秒
    // Unix 时间戳（秒）通常是 10 位, JavaScript 时间戳（毫秒）是 13 位
    if (String(date).length === 10) {
      // 如果是 10 位数字，我们认为是秒，需要乘以 1000
      dayjsInstance = dayjs(date * 1000)
    } else {
      // 否则，我们认为是毫秒
      dayjsInstance = dayjs(date)
    }
  } else {
    // 对于 string 和 Date 对象，dayjs 可以直接处理
    dayjsInstance = dayjs(date)
  }
  // 3. 校验 dayjs 实例是否有效
  if (!dayjsInstance.isValid()) {
    // 如果传入的字符串无法被 dayjs 解析，则返回空字符串
    console.warn('Invalid date input provided:', date)
    return ''
  }
  // 4. 返回格式化后的字符串
  return dayjsInstance.format(format)
}
