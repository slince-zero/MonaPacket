import { useState, useEffect } from 'react'
import './App.css'

interface RedPacketData {
  amount: number
  message: string
  sender: string
  timestamp: string
}

function App() {
  const [step, setStep] = useState<'discover' | 'receive' | 'open' | 'result'>(
    'discover'
  )
  const [redPacket, setRedPacket] = useState<RedPacketData | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([])
  const [soundEnabled, setSoundEnabled] = useState(true)

  // 初始化音效
  useEffect(() => {
    initSoundEffects()
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

    // 生成随机红包数据
    const amounts = [8.88, 18.88, 66.66, 88.88, 168.88, 888.88]
    const messages = [
      '恭喜发财',
      '新年快乐',
      '万事如意',
      '心想事成',
      '财源滚滚',
    ]
    const senders = ['神秘好友', 'Monad社区', '区块链大佬', '加密朋友']

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
        {/* 步骤1: 发现红包 */}
        {step === 'discover' && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            <div className='floating-icon'>
              <div className='red-packet-icon'>🧧</div>
              <div className='glow-effect'></div>
            </div>

            <h1 className='title gradient-text'>发现红包！</h1>

            <p className='subtitle'>有人给你发了一个Monad红包</p>

            <button
              className='primary-button pulse-animation'
              onClick={discoverRedPacket}
              disabled={isAnimating}>
              <span>点击查看</span>
              <div className='button-glow'></div>
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
                <div className='sender-avatar'>👤</div>
                <div className='sender-info'>
                  <h3>神秘好友</h3>
                  <p>给你发了红包</p>
                </div>
              </div>

              <div className='red-packet-visual'>
                <div className='red-packet-3d'>
                  <div className='packet-front'>
                    <div className='golden-pattern'></div>
                    <div className='packet-symbol'>福</div>
                  </div>
                  <div className='packet-shadow'></div>
                </div>
              </div>

              <div className='packet-message'>恭喜发财，大吉大利！</div>
            </div>

            <button
              className='secondary-button'
              onClick={receiveRedPacket}
              disabled={isAnimating}>
              领取红包
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
              <h2>轻触红包拆开</h2>
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
                    <div className='packet-text'>开</div>
                    <div className='sparkles'>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div
                          key={i}
                          className={`sparkle sparkle-${i + 1}`}>
                          ✨
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className='hint-text'>点击红包即可拆开</p>
          </div>
        )}

        {/* 步骤4: 展示结果 */}
        {step === 'result' && redPacket && (
          <div
            className={`step-container ${
              isAnimating ? 'animate-out' : 'animate-in'
            }`}>
            <div className='result-celebration'>
              <div className='success-icon'>🎉</div>
              <h1 className='congratulations'>恭喜发财！</h1>
            </div>

            <div className='amount-display'>
              <div className='currency-symbol'>¥</div>
              <div className='amount-value'>{redPacket.amount}</div>
            </div>

            <div className='result-details'>
              <div className='detail-item'>
                <span className='label'>来自:</span>
                <span className='value'>{redPacket.sender}</span>
              </div>
              <div className='detail-item'>
                <span className='label'>祝福:</span>
                <span className='value'>{redPacket.message}</span>
              </div>
              <div className='detail-item'>
                <span className='label'>时间:</span>
                <span className='value'>{redPacket.timestamp}</span>
              </div>
            </div>

            <div className='action-buttons'>
              <button
                className='primary-button'
                onClick={restart}>
                再抢一个
              </button>
              <button className='outline-button'>分享好运</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
