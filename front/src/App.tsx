import { useState, useEffect } from 'react'
import './App.css'

// 扩展Window接口以支持ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

interface RedPacketData {
  amount: number
  message: string
  sender: string
  timestamp: string
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

function App() {
  const [step, setStep] = useState<'wallet' | 'discover' | 'receive' | 'open' | 'result'>(
    'wallet'
  )
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
    networkName: ''
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletError, setWalletError] = useState<string>('')

  // 初始化音效和钱包检查
  useEffect(() => {
    initSoundEffects()
    checkWalletConnection()
    setupWalletEventListeners()

    return () => {
      removeWalletEventListeners()
    }
  }, [])

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
          networkName
        }

        setWalletState(newWalletState)
        console.log('💰 钱包状态:', newWalletState)

        // 如果已连接钱包，直接进入红包页面
        setStep('discover')
      } else {
        console.log('⚠️ 钱包未连接')
        setWalletState({
          isConnected: false,
          address: '',
          chainId: '',
          balance: '',
          networkName: ''
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
        params: [address, 'latest']
      })
      const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18)
      console.log('💎 账户余额:', balanceInEth.toFixed(4), 'ETH')
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
          networkName
        }

        setWalletState(newWalletState)
        console.log('🎉 钱包连接完成:', newWalletState)

        // 检查是否在Monad网络
        if (chainId !== MONAD_NETWORK.chainId) {
          console.log('⚠️ 不在Monad网络，尝试切换...')
          await switchToMonadNetwork()
        }

        // 连接成功后进入红包页面
        setStep('discover')
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
        networkName: ''
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
      networkName: ''
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
      amount: amounts[Math.floor(Math.random() * amounts.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      sender: senders[Math.floor(Math.random() * senders.length)],
      timestamp: new Date().toLocaleTimeString('zh-CN'),
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
    setStep('discover')
    setRedPacket(null)
    setParticles([])
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
          <div className={`step-container ${isAnimating ? 'animate-out' : 'animate-in'}`}>
            <div className='floating-icon'>
              <div className='red-packet-icon'>🔗</div>
            </div>

            <h1 className='title gradient-text'>
              CONNECT WALLET
            </h1>

            <p className='subtitle'>
              CONNECT TO ACCESS MONAD RED PACKETS
            </p>

            {walletError && (
              <div className='wallet-error'>
                ⚠️ {walletError}
              </div>
            )}

            <button
              className='primary-button pulse-animation'
              onClick={connectWallet}
              disabled={isConnecting}
            >
              <span>{isConnecting ? 'CONNECTING...' : 'CONNECT METAMASK'}</span>
              <div className='button-glow'></div>
            </button>

            <div className='wallet-info'>
              <p>需要MetaMask钱包来使用红包功能</p>
              <p>将自动切换到Monad测试网</p>
            </div>
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
                  <span className='value'>{walletState.address.slice(0, 6)}...{walletState.address.slice(-4)}</span>
                </div>
                <div className='wallet-info-item'>
                  <span className='label'>NETWORK:</span>
                  <span className='value'>{walletState.networkName}</span>
                </div>
                <div className='wallet-info-item'>
                  <span className='label'>BALANCE:</span>
                  <span className='value'>{walletState.balance} ETH</span>
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
              <div className='success-icon'>💰</div>
              <h1 className='congratulations'>JACKPOT!</h1>
            </div>

            <div className='amount-display'>
              <div className='currency-symbol'>$</div>
              <div className='amount-value'>{redPacket.amount}</div>
            </div>

            <div className='result-details'>
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
            </div>

            <div className='action-buttons'>
              <button
                className='primary-button'
                onClick={restart}>
                CLAIM ANOTHER
              </button>
              <button className='outline-button'>SHARE LUCK</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
