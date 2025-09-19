import crypto from 'crypto'

/**
 * 安全的交易验证 - 避免大数问题
 * 不使用bitcoinjs-lib的Transaction.fromHex()方法
 */
export default class SafeTransactionVerifier {
  /**
   * 验证交易格式（不解析金额）
   */
  static verifyTransactionFormat(txHex: string) {
    try {
      console.log('🔍 安全验证交易格式...')
      console.log('交易长度:', txHex.length / 2, '字节')

      const buffer = Buffer.from(txHex, 'hex')
      let offset = 0

      // 验证版本号
      if (buffer.length < 4) {
        throw new Error('交易太短，无法包含版本号')
      }

      const version = buffer.readUInt32LE(offset)
      console.log('✅ 版本号:', version)
      offset += 4

      // 验证输入数量
      const inputCount = this.readVarInt(buffer, offset)
      console.log('✅ 输入数量:', inputCount.value)
      offset = inputCount.offset

      if (inputCount.value === 0) {
        throw new Error('交易必须至少有一个输入')
      }

      // 验证每个输入
      for (let i = 0; i < inputCount.value; i++) {
        const inputResult = this.verifyInput(buffer, offset, i)
        if (!inputResult.valid) {
          throw new Error(`输入 ${i + 1} 验证失败: ${inputResult.error}`)
        }
        offset = inputResult.offset ?? offset
      }

      console.log('✅ 所有输入验证通过')

      // 验证输出数量
      const outputCount = this.readVarInt(buffer, offset)
      console.log('✅ 输出数量:', outputCount.value)
      offset = outputCount.offset

      if (outputCount.value === 0) {
        throw new Error('交易必须至少有一个输出')
      }

      // 验证每个输出（跳过金额解析）
      for (let i = 0; i < outputCount.value; i++) {
        const outputResult = this.verifyOutput(buffer, offset, i)
        if (!outputResult.valid) {
          throw new Error(`输出 ${i + 1} 验证失败: ${outputResult.error}`)
        }
        offset = outputResult.offset ?? offset
      }

      console.log('✅ 所有输出验证通过')

      // 验证锁定时间
      if (offset + 4 > buffer.length) {
        throw new Error('交易缺少锁定时间字段')
      }

      const lockTime = buffer.readUInt32LE(offset)
      console.log('✅ 锁定时间:', lockTime)
      offset += 4

      // 验证交易长度
      if (offset !== buffer.length) {
        throw new Error(`交易长度不匹配: 期望 ${offset}, 实际 ${buffer.length}`)
      }

      console.log('✅ 交易长度验证通过')

      // 计算交易哈希
      const txHash = this.calculateTransactionHash(buffer)
      console.log('🆔 交易哈希:', txHash)

      return {
        valid: true,
        version,
        inputCount: inputCount.value,
        outputCount: outputCount.value,
        lockTime,
        txHash,
        size: buffer.length
      }
    } catch (error) {
      console.error('❌ 交易验证失败:', (error as Error).message)
      return {
        valid: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * 验证单个输入
   */
  static verifyInput(buffer: Buffer, offset: number, index: number) {
    try {
      const startOffset = offset

      // 前一个交易哈希 (32字节)
      if (offset + 32 > buffer.length) {
        return { valid: false, error: '缺少前一个交易哈希' }
      }
      offset += 32

      // 输出索引 (4字节)
      if (offset + 4 > buffer.length) {
        return { valid: false, error: '缺少输出索引' }
      }
      offset += 4

      // 脚本长度
      const scriptLength = this.readVarInt(buffer, offset)
      offset = scriptLength.offset

      // 脚本内容
      if (offset + scriptLength.value > buffer.length) {
        return { valid: false, error: '脚本长度超出缓冲区' }
      }

      const script = buffer.slice(offset, offset + scriptLength.value)
      offset += scriptLength.value

      // 序列号 (4字节)
      if (offset + 4 > buffer.length) {
        return { valid: false, error: '缺少序列号' }
      }
      offset += 4

      // 验证scriptSig格式（如果有签名）
      if (scriptLength.value > 0) {
        const scriptValid = this.verifyScriptSig(script)
        if (!scriptValid) {
          console.log(`⚠️  输入 ${index + 1} 的scriptSig格式可能有问题`)
        } else {
          console.log(`✅ 输入 ${index + 1} scriptSig格式正确`)
        }
      }

      return { valid: true, offset }
    } catch (error) {
      return { valid: false, error: (error as Error).message }
    }
  }

  /**
   * 验证单个输出
   */
  static verifyOutput(buffer: Buffer, offset: number, index: number) {
    try {
      // 金额 (8字节) - 不解析，只跳过
      if (offset + 8 > buffer.length) {
        return { valid: false, error: '缺少金额字段' }
      }

      // 记录金额字节用于显示
      const amountBytes = buffer.slice(offset, offset + 8)
      console.log(`💰 输出 ${index + 1} 金额字节:`, amountBytes.toString('hex'))
      offset += 8

      // 脚本长度
      const scriptLength = this.readVarInt(buffer, offset)
      offset = scriptLength.offset

      // 脚本内容
      if (offset + scriptLength.value > buffer.length) {
        return { valid: false, error: '脚本长度超出缓冲区' }
      }
      offset += scriptLength.value

      console.log(`✅ 输出 ${index + 1} 脚本长度:`, scriptLength.value)

      return { valid: true, offset }
    } catch (error) {
      return { valid: false, error: (error as Error).message }
    }
  }

  /**
   * 验证scriptSig格式
   */
  static verifyScriptSig(script: Buffer) {
    try {
      if (script.length < 2) return false

      let offset = 0

      // 第一个元素应该是签名
      const sigLength = script.readUInt8(offset)
      if (sigLength < 6 || sigLength > 73) return false // DER签名长度范围
      offset += 1 + sigLength

      if (offset >= script.length) return false

      // 第二个元素应该是公钥
      const pubkeyLength = script.readUInt8(offset)
      if (pubkeyLength !== 33 && pubkeyLength !== 65) return false // 压缩或未压缩公钥
      offset += 1 + pubkeyLength

      // 应该正好消耗完所有字节
      return offset === script.length
    } catch (error) {
      return false
    }
  }

  /**
   * 计算交易哈希
   */
  static calculateTransactionHash(buffer: Buffer) {
    const hash1 = crypto.createHash('sha256').update(buffer).digest()
    const hash2 = crypto.createHash('sha256').update(hash1).digest()
    return hash2.reverse().toString('hex') // 小端序
  }

  /**
   * 读取变长整数
   */
  static readVarInt(buffer: Buffer, offset: number) {
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
}
