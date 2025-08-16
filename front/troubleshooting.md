# Monad 红包 - 故障排除指南

## JSON-RPC 错误解决方案

### 错误代码 -32603: Internal JSON-RPC error

这是最常见的错误，通常由以下原因引起：

#### 1. 网络连接问题
- **症状**: 交易发送失败，显示 "Internal JSON-RPC error"
- **解决方案**:
  - 检查网络连接
  - 切换到稳定的网络
  - 重新连接钱包

#### 2. RPC节点问题
- **症状**: 间歇性连接失败
- **解决方案**:
  - 在MetaMask中切换RPC节点
  - 使用官方RPC: `https://testnet-rpc.monad.xyz`
  - 等待几分钟后重试

#### 3. 交易参数错误
- **症状**: 交易立即失败
- **解决方案**:
  - 检查接收者地址格式 (42字符，以0x开头)
  - 确认金额大于0
  - 检查余额是否充足

#### 4. Gas估算失败
- **症状**: 交易在Gas估算阶段失败
- **解决方案**:
  - 手动设置Gas限制
  - 增加Gas价格
  - 简化交易逻辑

### 其他常见错误

#### 错误代码 4001: User rejected the request
- **原因**: 用户在MetaMask中取消了交易
- **解决方案**: 重新发起交易并确认

#### 错误代码 -32602: Invalid params
- **原因**: 传递给RPC方法的参数无效
- **解决方案**: 检查参数格式和类型

#### 错误代码 -32601: Method not found
- **原因**: 调用了不存在的RPC方法
- **解决方案**: 检查方法名称拼写

### 网络配置

#### Monad 测试网配置
```javascript
{
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
```

### 调试步骤

#### 1. 检查钱包连接
```javascript
// 检查MetaMask是否安装
if (typeof window.ethereum === 'undefined') {
  console.error('MetaMask not installed');
}

// 检查账户连接
const accounts = await window.ethereum.request({
  method: 'eth_accounts'
});
console.log('Connected accounts:', accounts);
```

#### 2. 检查网络
```javascript
// 获取当前网络
const chainId = await window.ethereum.request({
  method: 'eth_chainId'
});
console.log('Current network:', chainId);

// 检查是否为Monad测试网
if (chainId !== '0x15B3') {
  console.warn('Not on Monad testnet');
}
```

#### 3. 检查余额
```javascript
// 获取账户余额
const balance = await window.ethereum.request({
  method: 'eth_getBalance',
  params: [userAddress, 'latest']
});
const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
console.log('Balance:', balanceInEth, 'MON');
```

#### 4. 简化交易测试
```javascript
// 发送简单的原生代币转账
const txParams = {
  to: recipientAddress,
  from: userAddress,
  value: '0x' + amountInWei.toString(16),
  gas: '0x5208' // 21000 gas
};

const txHash = await window.ethereum.request({
  method: 'eth_sendTransaction',
  params: [txParams]
});
```

### 最佳实践

#### 1. 错误处理
```javascript
try {
  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams]
  });
} catch (error) {
  console.error('Transaction failed:', error);
  
  // 根据错误代码提供具体建议
  switch (error.code) {
    case 4001:
      alert('用户取消了交易');
      break;
    case -32603:
      alert('网络错误，请检查连接');
      break;
    default:
      alert(`交易失败: ${error.message}`);
  }
}
```

#### 2. 重试机制
```javascript
async function sendTransactionWithRetry(txParams, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams]
      });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      console.log(`Retry ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

#### 3. Gas估算
```javascript
// 先估算Gas
try {
  const gasEstimate = await window.ethereum.request({
    method: 'eth_estimateGas',
    params: [txParams]
  });
  
  // 添加20%的缓冲
  const gasLimit = Math.floor(parseInt(gasEstimate, 16) * 1.2);
  txParams.gas = '0x' + gasLimit.toString(16);
} catch (gasError) {
  console.warn('Gas estimation failed, using default');
  txParams.gas = '0x5208'; // 默认值
}
```

### 测试文件

#### 1. 简化测试页面
- `front/simple-contract-test.html` - 基础功能测试
- 只发送原生代币转账
- 避免复杂的合约调用

#### 2. 完整功能测试
- `front/src/App.tsx` - 完整应用
- 包含智能合约集成
- 完整的错误处理

### 联系支持

如果问题仍然存在：

1. 检查Monad测试网状态
2. 在Discord或Telegram寻求帮助
3. 提供详细的错误日志
4. 包含网络配置信息

### 常用命令

```bash
# 检查网络连接
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://testnet-rpc.monad.xyz

# 检查账户余额
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xYourAddress","latest"],"id":1}' \
  https://testnet-rpc.monad.xyz
```

记住：大多数JSON-RPC错误都是临时性的，重试通常可以解决问题。
