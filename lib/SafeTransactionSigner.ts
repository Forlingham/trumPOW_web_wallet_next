import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import { BIP32Factory, BIP32Interface } from 'bip32'
import crypto from 'crypto'

export type UTXO = {
  txid: string
  vout: number
}

/**
 * 安全的裸交易签名方法 - 完全避免金额解析
 * 通过手动构建签名哈希，绕过bitcoinjs-lib的金额验证
 */
export default class SafeTransactionSigner {
  network: bitcoin.Network
  bip32: ReturnType<typeof BIP32Factory>
  keyPair: BIP32Interface

  constructor(seed: Buffer, network: bitcoin.Network, powPath: string) {
    this.network = network
    this.bip32 = BIP32Factory(ecc)
    // const seed = bip39.mnemonicToSeedSync(mnemonic)
    const root = this.bip32.fromSeed(seed, network)
    this.keyPair = root.derivePath(powPath)

    // 生成并显示地址信息
    const { address } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(this.keyPair.publicKey),
      network: this.network
    })
    console.log('🏠 钱包地址:', address)
  }

  /**
   * 解析交易的基本结构（不解析金额）
   */
  parseTransactionStructure(txHex: string) {
    const buffer = Buffer.from(txHex, 'hex')
    let offset = 0

    // 版本号 (4字节)
    const version = buffer.readUInt32LE(offset)
    offset += 4

    // 输入数量
    const inputCount = this.readVarInt(buffer, offset)
    offset = inputCount.offset

    // 解析输入
    const inputs = []
    for (let i = 0; i < inputCount.value; i++) {
      const input = this.parseInput(buffer, offset)
      inputs.push(input.data)
      offset = input.offset
    }

    // 输出数量
    const outputCount = this.readVarInt(buffer, offset)
    offset = outputCount.offset

    // 跳过输出（不解析金额）
    for (let i = 0; i < outputCount.value; i++) {
      offset += 8 // 跳过金额 (8字节)
      const scriptLength = this.readVarInt(buffer, offset)
      offset = scriptLength.offset + scriptLength.value
    }

    // 锁定时间 (4字节)
    const lockTime = buffer.readUInt32LE(offset)

    return {
      version,
      inputs,
      inputCount: inputCount.value,
      outputCount: outputCount.value,
      lockTime,
      buffer
    }
  }

  /**
   * 解析单个输入
   */
  parseInput(buffer: Buffer, offset: number) {
    const startOffset = offset

    // 前一个交易哈希 (32字节)
    const prevTxHash = buffer.slice(offset, offset + 32)
    offset += 32

    // 输出索引 (4字节)
    const outputIndex = buffer.readUInt32LE(offset)
    offset += 4

    // 脚本长度
    const scriptLength = this.readVarInt(buffer, offset)
    offset = scriptLength.offset

    // 脚本内容
    const script = buffer.slice(offset, offset + scriptLength.value)
    offset += scriptLength.value

    // 序列号 (4字节)
    const sequence = buffer.readUInt32LE(offset)
    offset += 4

    return {
      data: {
        prevTxHash,
        outputIndex,
        script,
        sequence,
        scriptLength: scriptLength.value,
        startOffset,
        endOffset: offset
      },
      offset
    }
  }

  /**
   * 读取变长整数
   */
  readVarInt(buffer: Buffer, offset: number) {
    const first = buffer.readUInt8(offset)

    if (first < 0xfd) {
      return { value: first, offset: offset + 1 }
    } else if (first === 0xfd) {
      return { value: buffer.readUInt16LE(offset + 1), offset: offset + 3 }
    } else if (first === 0xfe) {
      return { value: buffer.readUInt32LE(offset + 1), offset: offset + 5 }
    } else {
      // 0xff - 8字节，但我们只读取低4字节避免大数问题
      return { value: buffer.readUInt32LE(offset + 1), offset: offset + 9 }
    }
  }

  /**
   * 创建用于签名的交易哈希
   */
  createSignatureHash(txBuffer: Buffer, inputIndex: number, scriptPubKey: Buffer) {
    // 创建交易副本用于签名
    const txCopy = Buffer.from(txBuffer)

    // 解析交易结构
    const tx = this.parseTransactionStructure(txCopy.toString('hex'))

    // 构建用于签名的交易
    const sigTx = this.buildTransactionForSigning(tx, inputIndex, scriptPubKey)

    // 添加签名类型 (SIGHASH_ALL)
    const sigHashType = Buffer.alloc(4)
    sigHashType.writeUInt32LE(1, 0) // SIGHASH_ALL = 1

    const txWithSigType = Buffer.concat([sigTx, sigHashType])

    // 双重SHA256
    const hash1 = crypto.createHash('sha256').update(txWithSigType).digest()
    const hash2 = crypto.createHash('sha256').update(hash1).digest()

    return hash2
  }

  /**
   * 构建用于签名的交易
   */
  buildTransactionForSigning(tx: ReturnType<typeof this.parseTransactionStructure>, inputIndex: number, scriptPubKey: Buffer) {
    const buffer = tx.buffer
    let result = Buffer.alloc(0)

    // 版本号
    const version = Buffer.alloc(4)
    version.writeUInt32LE(buffer.readUInt32LE(0), 0)
    result = Buffer.concat([result, version])

    // 输入数量
    result = Buffer.concat([result, this.writeVarInt(tx.inputCount)])

    // 处理每个输入
    for (let i = 0; i < tx.inputs.length; i++) {
      const input = tx.inputs[i]

      // 前一个交易哈希
      result = Buffer.concat([result, input.prevTxHash])

      // 输出索引
      const outputIndex = Buffer.alloc(4)
      outputIndex.writeUInt32LE(input.outputIndex, 0)
      result = Buffer.concat([result, outputIndex])

      // 脚本
      if (i === inputIndex) {
        // 当前输入：使用scriptPubKey
        result = Buffer.concat([result, this.writeVarInt(scriptPubKey.length)])
        result = Buffer.concat([result, scriptPubKey])
      } else {
        // 其他输入：空脚本
        result = Buffer.concat([result, this.writeVarInt(0)])
      }

      // 序列号
      const sequence = Buffer.alloc(4)
      sequence.writeUInt32LE(input.sequence, 0)
      result = Buffer.concat([result, sequence])
    }

    // 输出部分（保持原样，不解析金额）
    let offset = 4 // 跳过版本号

    // 跳过输入部分
    const inputCount = this.readVarInt(buffer, offset)
    offset = inputCount.offset

    for (let i = 0; i < inputCount.value; i++) {
      offset += 32 // 前一个交易哈希
      offset += 4 // 输出索引
      const scriptLength = this.readVarInt(buffer, offset)
      offset = scriptLength.offset + scriptLength.value
      offset += 4 // 序列号
    }

    // 从这里开始复制输出部分到结尾
    const outputsPart = buffer.slice(offset)
    result = Buffer.concat([result, outputsPart])

    return result
  }

  /**
   * 写入变长整数
   */
  writeVarInt(value: number) {
    if (value < 0xfd) {
      return Buffer.from([value])
    } else if (value <= 0xffff) {
      const buffer = Buffer.alloc(3)
      buffer.writeUInt8(0xfd, 0)
      buffer.writeUInt16LE(value, 1)
      return buffer
    } else if (value <= 0xffffffff) {
      const buffer = Buffer.alloc(5)
      buffer.writeUInt8(0xfe, 0)
      buffer.writeUInt32LE(value, 1)
      return buffer
    } else {
      const buffer = Buffer.alloc(9)
      buffer.writeUInt8(0xff, 0)
      buffer.writeUInt32LE(value, 1)
      buffer.writeUInt32LE(0, 5) // 高位为0
      return buffer
    }
  }

  /**
   * 签名裸交易
   */
  async signRawTransaction(rawTxHex: string, utxos: UTXO[]) {
    try {
      const txBuffer = Buffer.from(rawTxHex, 'hex')
      const tx = this.parseTransactionStructure(rawTxHex)

      // 获取P2PKH脚本
      const { output: scriptPubKey } = bitcoin.payments.p2pkh({
        pubkey: Buffer.from(this.keyPair.publicKey),
        network: this.network
      })
      if (!scriptPubKey) {
        throw new Error('无法生成P2PKH脚本')
      }

      // 为每个输入创建签名
      const signatures = []
      for (let i = 0; i < utxos.length; i++) {
        console.log(`正在签名输入 ${i + 1}/${utxos.length}`)

        // 创建签名哈希
        const signatureHash = this.createSignatureHash(txBuffer, i, scriptPubKey)

        // 使用私钥签名
        const signature = this.keyPair.sign(signatureHash)

        // 确保签名是Buffer类型，然后使用DER编码
        const signatureBuffer = Buffer.from(signature)
        const derSignature = bitcoin.script.signature.encode(signatureBuffer, bitcoin.Transaction.SIGHASH_ALL)

        signatures.push(derSignature)
      }

      // 构建最终的签名交易
      const signedTx = this.buildSignedTransaction(tx, signatures)
      return signedTx.toString('hex')
    } catch (error) {
      console.error('签名失败:', error)
      throw error
    }
  }

  /**
   * 构建签名后的交易
   */
  buildSignedTransaction(tx: ReturnType<typeof this.parseTransactionStructure>, signatures: Buffer[]) {
    const buffer = tx.buffer
    let result = Buffer.alloc(0)

    // 版本号
    const version = Buffer.alloc(4)
    version.writeUInt32LE(buffer.readUInt32LE(0), 0)
    result = Buffer.concat([result, version])

    // 输入数量
    result = Buffer.concat([result, this.writeVarInt(tx.inputCount)])

    // 处理每个输入，添加签名
    for (let i = 0; i < tx.inputs.length; i++) {
      const input = tx.inputs[i]
      const signature = signatures[i]

      // 前一个交易哈希
      result = Buffer.concat([result, input.prevTxHash])

      // 输出索引
      const outputIndex = Buffer.alloc(4)
      outputIndex.writeUInt32LE(input.outputIndex, 0)
      result = Buffer.concat([result, outputIndex])

      // 构建scriptSig: 使用正确的比特币脚本格式
      const pubkeyBuffer = Buffer.from(this.keyPair.publicKey)

      // 使用bitcoinjs-lib构建正确的scriptSig
      const scriptSig = bitcoin.script.compile([signature, pubkeyBuffer])

      result = Buffer.concat([result, this.writeVarInt(scriptSig.length)])
      result = Buffer.concat([result, scriptSig])

      // 序列号
      const sequence = Buffer.alloc(4)
      sequence.writeUInt32LE(input.sequence, 0)
      result = Buffer.concat([result, sequence])
    }

    // 添加输出部分（从原交易复制）
    let offset = 4 // 跳过版本号

    // 跳过输入部分
    const inputCount = this.readVarInt(buffer, offset)
    offset = inputCount.offset

    for (let i = 0; i < inputCount.value; i++) {
      offset += 32 // 前一个交易哈希
      offset += 4 // 输出索引
      const scriptLength = this.readVarInt(buffer, offset)
      offset = scriptLength.offset + scriptLength.value
      offset += 4 // 序列号
    }

    // 复制输出部分到结尾
    const outputsPart = buffer.slice(offset)
    result = Buffer.concat([result, outputsPart])

    return result
  }
}
