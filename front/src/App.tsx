import { useState, useEffect } from 'react'
import './App.css'

// 扩展Window接口以支持ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

interface RedPacketData {
  id: string
  amount: number
  message: string
  sender: string
  timestamp: string
  totalAmount?: number
  totalCount?: number
  remainingCount?: number
  type: 'normal' | 'lucky'
  txHash?: string
  tbaAddress?: string
}

interface CreateRedPacketForm {
  recipient: string
  erc20: string
  amount: number
  count: number
  message: string
  type: 'normal' | 'lucky'
}

interface WalletState {
  isConnected: boolean
  address: string
  chainId: string
  balance: string
  networkName: string
}

// Monad网络配置
const MONAD_NETWORK = {
  chainId: '0x15B3', // 5555 in hex
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
}

// 智能合约配置
const MONAD_PACKET_CONTRACT = {
  address: '0xd89C5C99B854470a3ea68b533441898Dee74B681',
  abi: [
    {
      "inputs": [
        {"internalType": "address", "name": "_recipient", "type": "address"},
        {"internalType": "address", "name": "_erc20", "type": "address"},
        {"internalType": "uint256", "name": "_amount", "type": "uint256"}
      ],
      "name": "createWithERC20",
      "outputs": [{"internalType": "address", "name": "tba", "type": "address"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "address", "name": "_recipient", "type": "address"}
      ],
      "name": "createWithNativeToken",
      "outputs": [{"internalType": "address", "name": "tba", "type": "address"}],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}
      ],
      "name": "getAccount",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "address", "name": "tba", "type": "address"},
        {"indexed": true, "internalType": "address", "name": "recipient", "type": "address"},
        {"indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256"},
        {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
        {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
      ],
      "name": "MonaPacketCreated",
      "type": "event"
    }
  ]
}

function App() {
  const [step, setStep] = useState<
    | 'wallet'
    | 'home'
    | 'create'
    | 'discover'
    | 'receive'
    | 'open'
    | 'result'
    | 'claim'
  >('wallet')
  const [redPacket, setRedPacket] = useState<RedPacketData | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: '',
    chainId: '',
    balance: '',
    networkName: '',
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletError, setWalletError] = useState<string>('')

  // 创建红包相关状态
  const [createForm, setCreateForm] = useState<CreateRedPacketForm>({
    recipient: '',
    erc20: '0x0000000000000000000000000000000000000000', // ETH地址，表示使用原生代币
    amount: 10,
    count: 5,
    message: 'HAPPY NEW YEAR',
    type: 'lucky',
  })
  const [createdRedPackets, setCreatedRedPackets] = useState<RedPacketData[]>(
    []
  )
  const [isCreating, setIsCreating] = useState(false)
  const [currentRedPacketId, setCurrentRedPacketId] = useState<string>('')

  // 初始化音效和钱包检查
  useEffect(() => {
    initSoundEffects()
    checkWalletConnection()
    setupWalletEventListeners()
    checkUrlForRedPacket()

    return () => {
      removeWalletEventListeners()
    }
  }, [])

  // 检查URL是否包含红包ID
  const checkUrlForRedPacket = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const redPacketId = urlParams.get('id')

    if (redPacketId) {
      console.log('🔗 检测到红包链接:', redPacketId)
      setCurrentRedPacketId(redPacketId)

      // 如果钱包已连接，直接进入领取页面
      if (walletState.isConnected) {
        setStep('claim')
      } else {
        // 否则先连接钱包
        setStep('wallet')
      }
    }
  }

  // 简单的音效系统
  const initSoundEffects = () => {
    if (typeof window !== 'undefined') {
      try {
        ;(window as any).audioContext = new ((window as any).AudioContext ||
          (window as any).webkitAudioContext)()
      } catch (error) {
        console.warn('Web Audio API not supported:', error)
      }
    }
  }

  const playSound = (type: 'click' | 'open' | 'success') => {
    if (!soundEnabled || !(window as any).audioContext) return

    const audioContext = (window as any).audioContext
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    switch (type) {
      case 'click':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.1
        )
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.1)
        break
      case 'open':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(
          800,
          audioContext.currentTime + 0.5
        )
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.5
        )
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.5)
        break
      case 'success':
        ;[523.25, 659.25, 783.99].forEach((freq, index) => {
          const osc = audioContext.createOscillator()
          const gain = audioContext.createGain()
          osc.connect(gain)
          gain.connect(audioContext.destination)
          osc.frequency.setValueAtTime(freq, audioContext.currentTime)
          gain.gain.setValueAtTime(0.1, audioContext.currentTime)
          gain.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 1
          )
          osc.start(audioContext.currentTime + index * 0.1)
          osc.stop(audioContext.currentTime + 1)
        })
        break
    }
  }

  // 触摸反馈
  const vibrate = (pattern: number | number[] = 100) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  // 钱包相关函数
  const checkWalletConnection = async () => {
    console.log('🔍 检查钱包连接状态...')

    if (typeof window.ethereum === 'undefined') {
      console.log('❌ 未检测到MetaMask')
      setWalletError('请安装MetaMask钱包')
      return
    }

    console.log('✅ 检测到MetaMask')

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      console.log('📊 账户信息:', accounts)

      if (accounts.length > 0) {
        const address = accounts[0]
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        const balance = await getBalance(address)
        const networkName = getNetworkName(chainId)

        const newWalletState = {
          isConnected: true,
          address,
          chainId,
          balance,
          networkName,
        }

        setWalletState(newWalletState)
        console.log('💰 钱包状态:', newWalletState)

        // 如果已连接钱包，直接进入主页
        setStep('home')
      } else {
        console.log('⚠️ 钱包未连接')
        setWalletState({
          isConnected: false,
          address: '',
          chainId: '',
          balance: '',
          networkName: '',
        })
      }
    } catch (error) {
      console.error('❌ 检查钱包连接失败:', error)
      setWalletError('检查钱包连接失败')
    }
  }

  // 获取余额
  const getBalance = async (address: string): Promise<string> => {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      })
      const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18)
      console.log('💎 账户余额:', balanceInEth.toFixed(4), 'MONAD')
      return balanceInEth.toFixed(4)
    } catch (error) {
      console.error('❌ 获取余额失败:', error)
      return '0.0000'
    }
  }

  // 获取网络名称
  const getNetworkName = (chainId: string): string => {
    const networks: { [key: string]: string } = {
      '0x1': 'Ethereum Mainnet',
      '0x5': 'Goerli Testnet',
      '0x89': 'Polygon Mainnet',
      '0x38': 'BSC Mainnet',
      '0x15B3': 'Monad Testnet',
    }
    const networkName = networks[chainId] || `Unknown Network (${chainId})`
    console.log('🌐 当前网络:', networkName)
    return networkName
  }

  // 连接钱包
  const connectWallet = async () => {
    console.log('🔗 开始连接钱包...')

    if (typeof window.ethereum === 'undefined') {
      console.log('❌ 未检测到MetaMask')
      setWalletError('请安装MetaMask钱包')
      return
    }

    setIsConnecting(true)
    setWalletError('')

    try {
      console.log('📞 请求账户访问权限...')
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length > 0) {
        console.log('✅ 账户连接成功:', accounts[0])

        const address = accounts[0]
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        const balance = await getBalance(address)
        const networkName = getNetworkName(chainId)

        const newWalletState = {
          isConnected: true,
          address,
          chainId,
          balance,
          networkName,
        }

        setWalletState(newWalletState)
        console.log('🎉 钱包连接完成:', newWalletState)

        // 检查是否在Monad网络
        if (chainId !== MONAD_NETWORK.chainId) {
          console.log('⚠️ 不在Monad网络，尝试切换...')
          await switchToMonadNetwork()
        }

        // 连接成功后进入主页
        setStep('home')
        playSound('success')
      }
    } catch (error: any) {
      console.error('❌ 连接钱包失败:', error)

      if (error.code === 4001) {
        setWalletError('用户拒绝连接钱包')
        console.log('👤 用户拒绝了连接请求')
      } else if (error.code === -32002) {
        setWalletError('MetaMask已有连接请求待处理')
        console.log('⏳ MetaMask已有连接请求待处理')
      } else {
        setWalletError(`连接失败: ${error.message || '未知错误'}`)
        console.log('💥 连接失败:', error.message)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  // 切换到Monad网络
  const switchToMonadNetwork = async () => {
    console.log('🔄 尝试切换到Monad网络...')

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_NETWORK.chainId }],
      })
      console.log('✅ 成功切换到Monad网络')

      // 重新获取钱包状态
      await checkWalletConnection()
    } catch (error: any) {
      console.log('⚠️ 切换网络失败:', error)

      if (error.code === 4902) {
        console.log('📝 网络不存在，尝试添加...')
        await addMonadNetwork()
      } else if (error.code === 4001) {
        console.log('👤 用户拒绝了网络切换')
        setWalletError('用户拒绝切换网络')
      } else {
        console.log('💥 切换网络失败:', error.message)
        setWalletError(`切换网络失败: ${error.message}`)
      }
    }
  }

  // 添加Monad网络
  const addMonadNetwork = async () => {
    console.log('➕ 尝试添加Monad网络...')

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_NETWORK],
      })
      console.log('✅ Monad网络添加成功')

      // 重新获取钱包状态
      await checkWalletConnection()
    } catch (error: any) {
      console.error('❌ 添加网络失败:', error)

      if (error.code === 4001) {
        setWalletError('用户拒绝添加Monad网络')
        console.log('👤 用户拒绝了添加网络')
      } else {
        setWalletError(`添加网络失败: ${error.message}`)
        console.log('💥 添加网络失败:', error.message)
      }
    }
  }

  // 设置钱包事件监听器
  const setupWalletEventListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      console.log('🎧 设置钱包事件监听器...')

      // 监听账户变化
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      // 监听网络变化
      window.ethereum.on('chainChanged', handleChainChanged)
      // 监听连接状态变化
      window.ethereum.on('connect', handleConnect)
      window.ethereum.on('disconnect', handleDisconnect)
    }
  }

  // 移除钱包事件监听器
  const removeWalletEventListeners = () => {
    if (typeof window.ethereum !== 'undefined') {
      console.log('🔇 移除钱包事件监听器...')

      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
      window.ethereum.removeListener('connect', handleConnect)
      window.ethereum.removeListener('disconnect', handleDisconnect)
    }
  }

  // 处理账户变化
  const handleAccountsChanged = (accounts: string[]) => {
    console.log('🔄 账户变化事件:', accounts)

    if (accounts.length > 0) {
      console.log('✅ 切换到新账户:', accounts[0])
      checkWalletConnection()
    } else {
      console.log('❌ 账户已断开连接')
      setWalletState({
        isConnected: false,
        address: '',
        chainId: '',
        balance: '',
        networkName: '',
      })
      setStep('wallet')
    }
  }

  // 处理网络变化
  const handleChainChanged = (chainId: string) => {
    console.log('🌐 网络变化事件:', chainId)
    console.log('🔄 重新检查钱包状态...')
    checkWalletConnection()
  }

  // 处理连接事件
  const handleConnect = (connectInfo: any) => {
    console.log('🔗 钱包连接事件:', connectInfo)
    checkWalletConnection()
  }

  // 处理断开连接事件
  const handleDisconnect = (error: any) => {
    console.log('💔 钱包断开连接事件:', error)
    setWalletState({
      isConnected: false,
      address: '',
      chainId: '',
      balance: '',
      networkName: '',
    })
    setStep('wallet')
  }

  // 发现红包
  const discoverRedPacket = () => {
    playSound('click')
    vibrate(100)
    setIsAnimating(true)
    setTimeout(() => {
      setStep('receive')
      setIsAnimating(false)
    }, 800)
  }

  // 领取红包
  const receiveRedPacket = () => {
    playSound('click')
    vibrate(150)
    setIsAnimating(true)
    setTimeout(() => {
      setStep('open')
      setIsAnimating(false)
    }, 600)
  }

  // 拆红包
  const openRedPacket = () => {
    playSound('open')
    vibrate([200, 100, 300])
    setIsAnimating(true)

    // 生成随机红包数据 - Neo-brutalism风格
    const amounts = [10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0]
    const messages = [
      'HODL STRONG',
      'TO THE MOON',
      'DIAMOND HANDS',
      'WAGMI',
      'LFG!',
    ]
    const senders = ['CRYPTO WHALE', 'MONAD LABS', 'WEB3 BUILDER', 'DEFI DEGEN']

    const newRedPacket: RedPacketData = {
      id: `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      sender: senders[Math.floor(Math.random() * senders.length)],
      timestamp: new Date().toLocaleTimeString('zh-CN'),
      type: 'lucky',
    }

    setRedPacket(newRedPacket)

    // 生成庆祝粒子
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
    }))
    setParticles(newParticles)

    setTimeout(() => {
      playSound('success')
      setStep('result')
      setIsAnimating(false)
    }, 1200)

    // 清除粒子
    setTimeout(() => {
      setParticles([])
    }, 3000)
  }

  // 重新开始
  const restart = () => {
    playSound('click')
    vibrate(50)
    setStep('home')
    setRedPacket(null)
    setParticles([])
  }

  // 创建红包功能
  const createRedPacket = async () => {
    console.log('🎁 开始创建红包...', createForm)

    if (!walletState.isConnected) {
      console.log('❌ 钱包未连接')
      setWalletError('请先连接钱包')
      return
    }

    if (createForm.amount <= 0) {
      console.log('❌ 红包参数无效')
      setWalletError('请输入有效的金额')
      return
    }

    if (!createForm.recipient || createForm.recipient.length !== 42) {
      console.log('❌ 接收者地址无效')
      setWalletError('请输入有效的接收者地址')
      return
    }

    setIsCreating(true)
    setWalletError('')
    playSound('click')
    vibrate(100)

    try {
      // 模拟创建红包的过程
      console.log('💰 检查余额...')
      const currentBalance = parseFloat(walletState.balance)

      if (currentBalance < createForm.amount) {
        console.log('❌ 余额不足')
        setWalletError(`余额不足，当前余额: ${walletState.balance} MONAD`)
        return
      }

      console.log('✅ 余额充足，调用智能合约...')
      console.log(`📝 合约地址: ${MONAD_PACKET_CONTRACT.address}`)
      console.log(
        `📝 合约参数: recipient=${createForm.recipient}, erc20=${createForm.erc20}, amount=${createForm.amount}`
      )

      // 准备交易参数
      const isNativeToken = createForm.erc20 === '0x0000000000000000000000000000000000000000'
      const amountInWei = BigInt(Math.floor(createForm.amount * Math.pow(10, 18))).toString()

      let txHash: string

      try {
        if (isNativeToken) {
          // 使用原生代币创建红包
          console.log('🔗 调用 createWithNativeToken...')
          console.log(`📝 金额(Wei): ${amountInWei}`)

          // 编码函数调用 createWithNativeToken(address)
          const functionSelector = '0x8b7afe2e' // createWithNativeToken(address) 的函数选择器
          const paddedRecipient = createForm.recipient.toLowerCase().replace('0x', '').padStart(64, '0')
          const encodedData = functionSelector + paddedRecipient

          console.log(`📝 编码数据: ${encodedData}`)

          // 先估算Gas
          let gasEstimate
          try {
            gasEstimate = await window.ethereum.request({
              method: 'eth_estimateGas',
              params: [{
                to: MONAD_PACKET_CONTRACT.address,
                from: walletState.address,
                value: '0x' + BigInt(amountInWei).toString(16),
                data: encodedData
              }]
            })
            console.log(`📝 Gas估算: ${gasEstimate}`)
          } catch (gasError) {
            console.log('⚠️ Gas估算失败，使用默认值:', gasError)
            gasEstimate = '0x15F90' // 90000 gas
          }

          const txParams = {
            to: MONAD_PACKET_CONTRACT.address,
            from: walletState.address,
            value: '0x' + BigInt(amountInWei).toString(16),
            data: encodedData,
            gas: gasEstimate
          }

          console.log('📝 交易参数:', txParams)

          txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [txParams]
          })

        } else {
          // 使用ERC20代币创建红包
          console.log('🔗 调用 createWithERC20...')

          // 编码函数调用 createWithERC20(address,address,uint256)
          const functionSelector = '0x123456789' // 需要实际的函数选择器
          const paddedRecipient = createForm.recipient.toLowerCase().replace('0x', '').padStart(64, '0')
          const paddedErc20 = createForm.erc20.toLowerCase().replace('0x', '').padStart(64, '0')
          const paddedAmount = BigInt(amountInWei).toString(16).padStart(64, '0')
          const encodedData = functionSelector + paddedRecipient + paddedErc20 + paddedAmount

          // 先估算Gas
          let gasEstimate
          try {
            gasEstimate = await window.ethereum.request({
              method: 'eth_estimateGas',
              params: [{
                to: MONAD_PACKET_CONTRACT.address,
                from: walletState.address,
                data: encodedData
              }]
            })
            console.log(`📝 Gas估算: ${gasEstimate}`)
          } catch (gasError) {
            console.log('⚠️ Gas估算失败，使用默认值:', gasError)
            gasEstimate = '0x30D40' // 200000 gas
          }

          const txParams = {
            to: MONAD_PACKET_CONTRACT.address,
            from: walletState.address,
            data: encodedData,
            gas: gasEstimate
          }

          txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [txParams]
          })
        }
      } catch (rpcError: any) {
        console.error('🚨 RPC调用失败:', rpcError)

        // 处理常见的RPC错误
        if (rpcError.code === -32603) {
          throw new Error('内部JSON-RPC错误，请检查网络连接和参数')
        } else if (rpcError.code === -32602) {
          throw new Error('无效的方法参数')
        } else if (rpcError.code === -32601) {
          throw new Error('方法不存在')
        } else if (rpcError.code === -32600) {
          throw new Error('无效的请求')
        } else {
          throw new Error(`RPC错误: ${rpcError.message || '网络连接失败'}`)
        }
      }

      console.log('📝 交易已发送，哈希:', txHash)
      console.log('⏳ 等待交易确认...')

      // 等待交易确认
      let receipt = null
      let attempts = 0
      const maxAttempts = 30

      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))

        try {
          receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash]
          })
          attempts++

          if (!receipt) {
            console.log(`⏳ 等待确认... (${attempts}/${maxAttempts})`)
          }
        } catch (error) {
          console.log('查询交易状态失败:', error)
          attempts++
        }
      }

      if (!receipt) {
        throw new Error('交易确认超时，请稍后查看交易状态')
      }

      if (receipt.status === '0x0') {
        throw new Error('交易失败，请检查参数和余额')
      }

      console.log('✅ 交易确认成功:', receipt)

      // 从交易回执中解析TBA地址（简化处理）
      const tbaAddress = receipt.logs?.[0]?.topics?.[1] || `0x${Math.random().toString(16).substring(2, 42)}`

      // 生成红包数据
      const newRedPacket: RedPacketData = {
        id: `rp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        amount: createForm.amount,
        totalAmount: createForm.amount,
        totalCount: 1, // 智能合约每次创建一个红包
        remainingCount: 1,
        message: createForm.message,
        sender: walletState.address,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: createForm.type,
        txHash: txHash,
        tbaAddress: tbaAddress
      }

      console.log('🎉 红包创建成功:', newRedPacket)

      // 添加到已创建红包列表
      setCreatedRedPackets((prev) => [newRedPacket, ...prev])

      // 模拟扣除余额
      const newBalance = (currentBalance - createForm.amount).toFixed(4)
      setWalletState((prev) => ({ ...prev, balance: newBalance }))

      console.log(
        `💸 扣除 ${createForm.amount} MONAD，剩余余额: ${newBalance} MONAD`
      )

      playSound('success')
      vibrate([200, 100, 200])

      // 跳转到分享页面
      setRedPacket(newRedPacket)
      setCurrentRedPacketId(newRedPacket.id)
      setStep('result')
    } catch (error: any) {
      console.error('❌ 创建红包失败:', error)

      // 详细的错误处理
      if (error.code === 4001) {
        setWalletError('用户取消了交易')
      } else if (error.code === -32603) {
        setWalletError('内部JSON-RPC错误，请检查网络连接和参数')
      } else if (error.code === -32602) {
        setWalletError('无效的方法参数')
      } else if (error.code === -32601) {
        setWalletError('方法不存在')
      } else if (error.code === -32600) {
        setWalletError('无效的请求')
      } else if (error.message?.includes('insufficient funds')) {
        setWalletError('余额不足，请检查账户余额')
      } else if (error.message?.includes('gas')) {
        setWalletError('Gas费用不足，请增加Gas限制')
      } else if (error.message?.includes('network')) {
        setWalletError('网络连接错误，请检查网络设置')
      } else if (error.message?.includes('nonce')) {
        setWalletError('Nonce错误，请重试')
      } else {
        setWalletError(`创建失败: ${error.message || '未知错误'}`)
      }

      // 如果是RPC错误，建议用户检查网络
      if (error.code && error.code < -32000) {
        console.log('💡 建议：检查网络连接，确认RPC节点正常工作')
        setWalletError(prev => prev + ' (建议检查网络连接)')
      }
    } finally {
      setIsCreating(false)
    }
  }

  // 更新创建表单
  const updateCreateForm = (field: keyof CreateRedPacketForm, value: any) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
    console.log(`📝 更新表单 ${field}:`, value)
  }

  // 进入发现红包页面
  const goToDiscover = () => {
    playSound('click')
    vibrate(50)
    setStep('discover')
  }

  // 进入创建红包页面
  const goToCreate = () => {
    playSound('click')
    vibrate(50)
    setStep('create')
  }

  // 返回主页
  const goToHome = () => {
    playSound('click')
    vibrate(50)
    setStep('home')
  }

  // 通过链接领取红包
  const claimRedPacketFromLink = async () => {
    console.log('🎁 通过链接领取红包:', currentRedPacketId)

    if (!currentRedPacketId) {
      console.log('❌ 红包ID无效')
      setWalletError('红包链接无效')
      return
    }

    if (!walletState.isConnected) {
      console.log('❌ 钱包未连接')
      setWalletError('请先连接钱包')
      return
    }

    setIsAnimating(true)
    playSound('click')
    vibrate(100)

    try {
      console.log('🔍 查询红包信息...')

      // 模拟查询红包信息
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // 模拟红包数据（实际应该从区块链查询）
      const amounts = [10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0]
      const messages = [
        'HODL STRONG',
        'TO THE MOON',
        'DIAMOND HANDS',
        'WAGMI',
        'LFG!',
      ]
      const senders = [
        'CRYPTO WHALE',
        'MONAD LABS',
        'WEB3 BUILDER',
        'DEFI DEGEN',
      ]

      const claimedRedPacket: RedPacketData = {
        id: currentRedPacketId,
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        sender: senders[Math.floor(Math.random() * senders.length)],
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: 'lucky',
      }

      console.log('🎉 红包领取成功:', claimedRedPacket)

      setRedPacket(claimedRedPacket)
      setStep('result')

      playSound('success')
      vibrate([200, 100, 200])
    } catch (error: any) {
      console.error('❌ 领取红包失败:', error)
      setWalletError(`领取失败: ${error.message || '未知错误'}`)
    } finally {
      setIsAnimating(false)
    }
  }

  // 切换音效
  const toggleSound = () => {
    setSoundEnabled(!soundEnabled)
    if (!soundEnabled) {
      playSound('click')
    }
  }

  return (
    <div className='app-container'>
      {/* 音效控制按钮 */}
      <button
        className='sound-toggle'
        onClick={toggleSound}
        title={soundEnabled ? '关闭音效' : '开启音效'}>
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      {/* 背景粒子效果 */}
      <div className='background-particles'>
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className='particle'
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 庆祝粒子 */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className='celebration-particle'
          style={{
            left: particle.x,
            top: particle.y,
          }}
        />
      ))}

      <div className='content-container'>
        {/* 步骤0: 连接钱包 */}
        {step === 'wallet' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            <div className='floating-icon'>
              <div className='red-packet-icon'>🔗</div>
            </div>

            <h1 className='title gradient-text'>CONNECT WALLET</h1>

            <p className='subtitle'>CONNECT TO ACCESS MONAD RED PACKETS</p>

            {walletError && (
              <div className='wallet-error'>⚠️ {walletError}</div>
            )}

            <button
              className='primary-button pulse-animation'
              onClick={connectWallet}
              disabled={isConnecting}>
              <span>{isConnecting ? 'CONNECTING...' : 'CONNECT METAMASK'}</span>
              <div className='button-glow'></div>
            </button>

            <div className='wallet-info'>
              <p>
                A MetaMask wallet is required to use the red envelope feature.
              </p>
              <p>It will automatically switch to the Monad testnet.</p>
            </div>
          </div>
        )}

        {/* 主页 */}
        {step === 'home' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            {/* 钱包状态显示 */}
            {walletState.isConnected && (
              <div className='wallet-status-display'>
                <div className='wallet-info-item'>
                  <span className='label'>ADDRESS:</span>
                  <span className='value'>
                    {walletState.address.slice(0, 6)}...
                    {walletState.address.slice(-4)}
                  </span>
                </div>
                <div className='wallet-info-item'>
                  <span className='label'>NETWORK:</span>
                  <span className='value'>{walletState.networkName}</span>
                </div>
                <div className='wallet-info-item'>
                  <span className='label'>BALANCE:</span>
                  <span className='value'>{walletState.balance} MONAD</span>
                </div>
              </div>
            )}

            <div className='floating-icon'>
              <div className='red-packet-icon'>🎁</div>
            </div>

            <h1 className='title gradient-text'>MONAD 红包</h1>

            <p className='subtitle'>CREATE OR CLAIM RED PACKETS</p>

            <div className='action-buttons'>
              <button
                className='primary-button'
                onClick={goToCreate}>
                <span>CREATE RED PACKET</span>
                <div className='button-glow'></div>
              </button>

              <button
                className='secondary-button'
                onClick={goToDiscover}>
                CLAIM RED PACKET
              </button>
            </div>

            {/* 已创建的红包列表 */}
            {createdRedPackets.length > 0 && (
              <div className='created-packets-list'>
                <h3>MY RED PACKETS</h3>
                {createdRedPackets.slice(0, 3).map((packet) => (
                  <div
                    key={packet.id}
                    className='packet-item'>
                    <div className='packet-info'>
                      <span className='amount'>{packet.totalAmount} MONAD</span>
                      <span className='count'>
                        {packet.remainingCount}/{packet.totalCount}
                      </span>
                    </div>
                    <div className='packet-status'>
                      {packet.remainingCount === 0 ? 'CLAIMED' : 'ACTIVE'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className='outline-button'
              onClick={() => setStep('wallet')}
              style={{ marginTop: '24px' }}>
              DISCONNECT WALLET
            </button>
          </div>
        )}

        {/* 创建红包页面 */}
        {step === 'create' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            <h1 className='title gradient-text'>CREATE RED PACKET</h1>

            <div className='create-form'>
              <div className='form-group'>
                <label className='form-label'>RECIPIENT ADDRESS</label>
                <input
                  type='text'
                  className='form-input'
                  value={createForm.recipient}
                  onChange={(e) =>
                    updateCreateForm('recipient', e.target.value)
                  }
                  placeholder='0x742d35Cc6634C0532925a3b8D...'
                />
              </div>

              <div className='form-group'>
                <label className='form-label'>ERC20 TOKEN ADDRESS</label>
                <input
                  type='text'
                  className='form-input'
                  value={createForm.erc20}
                  onChange={(e) => updateCreateForm('erc20', e.target.value)}
                  placeholder='0x0000000000000000000000000000000000000000 (ETH)'
                />
              </div>

              <div className='form-group'>
                <label className='form-label'>AMOUNT (MONAD)</label>
                <input
                  type='number'
                  className='form-input'
                  value={createForm.amount}
                  onChange={(e) =>
                    updateCreateForm('amount', parseFloat(e.target.value) || 0)
                  }
                  min='0.01'
                  step='0.01'
                />
              </div>

              <div className='form-group'>
                <label className='form-label'>NUMBER OF PACKETS</label>
                <input
                  type='number'
                  className='form-input'
                  value={createForm.count}
                  onChange={(e) =>
                    updateCreateForm('count', parseInt(e.target.value) || 1)
                  }
                  min='1'
                  max='100'
                />
              </div>

              <div className='form-group'>
                <label className='form-label'>MESSAGE</label>
                <input
                  type='text'
                  className='form-input'
                  value={createForm.message}
                  onChange={(e) => updateCreateForm('message', e.target.value)}
                  maxLength={50}
                  placeholder='HAPPY NEW YEAR'
                />
              </div>

              <div className='form-group'>
                <label className='form-label'>TYPE</label>
                <div className='radio-group'>
                  <label className='radio-label'>
                    <input
                      type='radio'
                      name='type'
                      value='normal'
                      checked={createForm.type === 'normal'}
                      onChange={(e) => updateCreateForm('type', e.target.value)}
                    />
                    <span>EQUAL AMOUNT</span>
                  </label>
                  <label className='radio-label'>
                    <input
                      type='radio'
                      name='type'
                      value='lucky'
                      checked={createForm.type === 'lucky'}
                      onChange={(e) => updateCreateForm('type', e.target.value)}
                    />
                    <span>LUCKY DRAW</span>
                  </label>
                </div>
              </div>

              {walletError && (
                <div className='wallet-error'>⚠️ {walletError}</div>
              )}

              <div className='create-summary'>
                <p>
                  Each packet: ~
                  {(createForm.amount / createForm.count).toFixed(4)} MONAD
                </p>
                <p>Your balance: {walletState.balance} MONAD</p>
                <p>Recipient: {createForm.recipient || 'Not set'}</p>
                <p>
                  Token:{' '}
                  {createForm.erc20 ===
                  '0x0000000000000000000000000000000000000000'
                    ? 'Native ETH'
                    : 'ERC20 Token'}
                </p>
              </div>
            </div>

            <div className='action-buttons'>
              <button
                className='primary-button'
                onClick={createRedPacket}
                disabled={isCreating || !walletState.isConnected}>
                <span>{isCreating ? 'CREATING...' : 'CREATE NOW'}</span>
                <div className='button-glow'></div>
              </button>

              <button
                className='outline-button'
                onClick={goToHome}>
                BACK TO HOME
              </button>
            </div>
          </div>
        )}

        {/* 通过链接领取红包 */}
        {step === 'claim' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            {/* 钱包状态显示 */}
            {walletState.isConnected && (
              <div className='wallet-status-display'>
                <div className='wallet-info-item'>
                  <span className='label'>ADDRESS:</span>
                  <span className='value'>
                    {walletState.address.slice(0, 6)}...
                    {walletState.address.slice(-4)}
                  </span>
                </div>
                <div className='wallet-info-item'>
                  <span className='label'>RED PACKET ID:</span>
                  <span className='value'>
                    {currentRedPacketId.slice(0, 8)}...
                    {currentRedPacketId.slice(-8)}
                  </span>
                </div>
              </div>
            )}

            <div className='floating-icon'>
              <div className='red-packet-icon'>🎁</div>
            </div>

            <h1 className='title gradient-text'>CLAIM RED PACKET</h1>

            <p className='subtitle'>SOMEONE SENT YOU A GIFT</p>

            {walletError && (
              <div className='wallet-error'>⚠️ {walletError}</div>
            )}

            <button
              className='primary-button pulse-animation'
              onClick={claimRedPacketFromLink}
              disabled={isAnimating || !walletState.isConnected}>
              <span>{isAnimating ? 'CLAIMING...' : 'CLAIM NOW'}</span>
              <div className='button-glow'></div>
            </button>

            <button
              className='outline-button'
              onClick={goToHome}
              style={{ marginTop: '16px' }}>
              BACK TO HOME
            </button>
          </div>
        )}

        {/* 步骤1: 发现红包 */}
        {step === 'discover' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            {/* 钱包状态显示 */}
            {walletState.isConnected && (
              <div className='wallet-status-display'>
                <div className='wallet-info-item'>
                  <span className='label'>ADDRESS:</span>
                  <span className='value'>
                    {walletState.address.slice(0, 6)}...
                    {walletState.address.slice(-4)}
                  </span>
                </div>
                <div className='wallet-info-item'>
                  <span className='label'>NETWORK:</span>
                  <span className='value'>{walletState.networkName}</span>
                </div>
                <div className='wallet-info-item'>
                  <span className='label'>BALANCE:</span>
                  <span className='value'>{walletState.balance} MONAD</span>
                </div>
              </div>
            )}

            <div className='floating-icon'>
              <div className='red-packet-icon'>🎁</div>
            </div>

            <h1 className='title gradient-text'>MONAD 红包</h1>

            <p className='subtitle'>WEB3 LUCKY MONEY AWAITS</p>

            <button
              className='primary-button pulse-animation'
              onClick={discoverRedPacket}
              disabled={isAnimating}>
              <span>CLAIM NOW</span>
              <div className='button-glow'></div>
            </button>

            <button
              className='outline-button'
              onClick={() => setStep('wallet')}
              style={{ marginTop: '16px' }}>
              DISCONNECT WALLET
            </button>
          </div>
        )}

        {/* 步骤2: 领取红包 */}
        {step === 'receive' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            <div className='red-packet-card'>
              <div className='card-header'>
                <div className='sender-avatar'>🤖</div>
                <div className='sender-info'>
                  <h3>MONAD COMMUNITY</h3>
                  <p>SENT YOU A GIFT</p>
                </div>
              </div>

              <div className='red-packet-visual'>
                <div className='red-packet-3d'>
                  <div className='packet-front'>
                    <div className='golden-pattern'></div>
                    <div className='packet-symbol'>💎</div>
                  </div>
                  <div className='packet-shadow'></div>
                </div>
              </div>

              <div className='packet-message'>FORTUNE AWAITS THE BRAVE!</div>
            </div>

            <button
              className='secondary-button'
              onClick={receiveRedPacket}
              disabled={isAnimating}>
              RECEIVE GIFT
            </button>
          </div>
        )}

        {/* 步骤3: 拆红包 */}
        {step === 'open' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            <div className='open-instruction'>
              <h2>TAP TO OPEN</h2>
              <div className='touch-hint'>👇</div>
            </div>

            <div
              className='interactive-packet'
              onClick={openRedPacket}>
              <div className='packet-wrapper'>
                <div className='red-packet-interactive'>
                  <div className='packet-glow'></div>
                  <div className='packet-body'>
                    <div className='golden-decoration'></div>
                    <div className='packet-text'>OPEN</div>
                    <div className='sparkles'>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className={`sparkle sparkle-${i + 1}`}>
                          ⚡
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className='hint-text'>CLICK TO REVEAL YOUR PRIZE</p>
          </div>
        )}

        {/* 步骤4: 展示结果 */}
        {step === 'result' && redPacket && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            <div className='result-celebration'>
              <div className='success-icon'>
                {redPacket.sender === walletState.address ? '🎁' : '💰'}
              </div>
              <h1 className='congratulations'>
                {redPacket.sender === walletState.address
                  ? 'RED PACKET CREATED!'
                  : 'JACKPOT!'}
              </h1>
            </div>

            <div className='amount-display'>
              <div className='currency-symbol'>$</div>
              <div className='amount-value'>{redPacket.amount}</div>
            </div>

            <div className='result-details'>
              {redPacket.sender === walletState.address ? (
                // 创建红包的详情
                <>
                  <div className='detail-item'>
                    <span className='label'>TOTAL AMOUNT:</span>
                    <span className='value'>{redPacket.totalAmount} MONAD</span>
                  </div>
                  <div className='detail-item'>
                    <span className='label'>PACKET COUNT:</span>
                    <span className='value'>{redPacket.totalCount}</span>
                  </div>
                  <div className='detail-item'>
                    <span className='label'>TYPE:</span>
                    <span className='value'>
                      {redPacket.type === 'lucky'
                        ? 'LUCKY DRAW'
                        : 'EQUAL AMOUNT'}
                    </span>
                  </div>
                  <div className='detail-item'>
                    <span className='label'>MESSAGE:</span>
                    <span className='value'>{redPacket.message}</span>
                  </div>
                  {redPacket.txHash && (
                    <div className='detail-item'>
                      <span className='label'>TX HASH:</span>
                      <span
                        className='value'
                        style={{ fontSize: '0.7rem' }}>
                        {redPacket.txHash.slice(0, 10)}...{redPacket.txHash.slice(-8)}
                      </span>
                    </div>
                  )}
                  {redPacket.tbaAddress && (
                    <div className='detail-item'>
                      <span className='label'>TBA ADDRESS:</span>
                      <span
                        className='value'
                        style={{ fontSize: '0.7rem' }}>
                        {redPacket.tbaAddress.slice(0, 10)}...{redPacket.tbaAddress.slice(-8)}
                      </span>
                    </div>
                  )}
                  <div className='detail-item'>
                    <span className='label'>SHARE LINK:</span>
                    <span
                      className='value'
                      style={{ fontSize: '0.7rem' }}>
                      {window.location.origin}?id={redPacket.id}
                    </span>
                  </div>
                </>
              ) : (
                // 领取红包的详情
                <>
                  <div className='detail-item'>
                    <span className='label'>FROM:</span>
                    <span className='value'>{redPacket.sender}</span>
                  </div>
                  <div className='detail-item'>
                    <span className='label'>MESSAGE:</span>
                    <span className='value'>{redPacket.message}</span>
                  </div>
                  <div className='detail-item'>
                    <span className='label'>TIME:</span>
                    <span className='value'>{redPacket.timestamp}</span>
                  </div>
                </>
              )}
            </div>

            <div className='action-buttons'>
              {redPacket.sender === walletState.address ? (
                // 创建者的操作
                <>
                  <button
                    className='primary-button'
                    onClick={() => {
                      const shareUrl = `${window.location.origin}?id=${redPacket.id}`
                      navigator.clipboard.writeText(shareUrl)
                      console.log('📋 分享链接已复制到剪贴板:', shareUrl)
                    }}>
                    COPY SHARE LINK
                  </button>
                  <button
                    className='secondary-button'
                    onClick={goToHome}>
                    BACK TO HOME
                  </button>
                </>
              ) : (
                // 领取者的操作
                <>
                  <button
                    className='primary-button'
                    onClick={restart}>
                    CLAIM ANOTHER
                  </button>
                  <button
                    className='outline-button'
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `I just claimed ${redPacket.amount} MONAD from a red packet! 🧧`
                      )
                      console.log('📋 分享文本已复制到剪贴板')
                    }}>
                    SHARE LUCK
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
