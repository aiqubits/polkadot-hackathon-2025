import { ethers } from 'ethers'
import dotenv from 'dotenv'

dotenv.config()

// Oracle 服務類
export class OracleService {
  private provider: ethers.JsonRpcProvider
  private wallet: ethers.Wallet | ethers.HDNodeWallet
  private contract: ethers.Contract
  private isRunning: boolean = false

  constructor() {
    // 初始化 provider
    this.provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'https://passet-hub-testnet.polkadot.io'
    )

    // 初始化 wallet（需要私鑰）
    const privateKey = process.env.ORACLE_PRIVATE_KEY
    if (!privateKey) {
      console.warn('⚠️  Oracle private key not configured')
      // 使用臨時錢包進行開發測試
  // createRandom 在 ethers v6 會回傳 HDNodeWallet，因此保留與 Wallet 的聯集型別
  this.wallet = ethers.Wallet.createRandom().connect(this.provider)
    } else {
      this.wallet = new ethers.Wallet(privateKey, this.provider)
    }

    // 初始化合約（需要 ABI 和地址）
    const contractAddress = process.env.CONTRACT_ADDRESS || ethers.ZeroAddress
    // TODO: 載入實際的合約 ABI
    const contractABI = [
      'function submitResultByOracle(uint256 matchId, address winner) external',
      'function getMatch(uint256 matchId) external view returns (tuple)',
      'event MatchCreated(uint256 indexed matchId, address indexed creator, uint8 mode)',
      'event MatchStarted(uint256 indexed matchId)',
    ]
    
    this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet)

    console.log('🔮 Oracle Service initialized')
    console.log('📍 Oracle address:', this.wallet.address)
  }

  // 啟動 Oracle 服務
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Oracle service is already running')
      return
    }

    this.isRunning = true
    console.log('🔮 Oracle Service started')

    // 監聽區塊鏈事件
    this.listenToEvents()

    // 啟動定時任務
    this.startScheduledTasks()
  }

  // 停止 Oracle 服務
  async stop() {
    this.isRunning = false
    console.log('🔮 Oracle Service stopped')
  }

  // 監聽區塊鏈事件
  private listenToEvents() {
    try {
      // 監聽比賽創建事件（Oracle 模式）
      this.contract.on('MatchCreated', async (matchId, creator, mode) => {
        if (mode === 1) { // Oracle 模式
          console.log(`📢 New Oracle match created: ${matchId}`)
          // TODO: 處理新的 Oracle 模式比賽
        }
      })

      // 監聽比賽開始事件
      this.contract.on('MatchStarted', async (matchId) => {
        console.log(`📢 Match started: ${matchId}`)
        // TODO: 開始監控比賽結果
      })

      console.log('👂 Listening to blockchain events...')
    } catch (error) {
      console.error('Error setting up event listeners:', error)
    }
  }

  // 定時任務
  private startScheduledTasks() {
    // 每5分鐘檢查一次需要結算的比賽
    setInterval(() => {
      if (this.isRunning) {
        this.checkPendingMatches()
      }
    }, 5 * 60 * 1000) // 5分鐘

    console.log('⏰ Scheduled tasks started')
  }

  // 檢查待結算的比賽
  private async checkPendingMatches() {
    try {
      console.log('🔍 Checking pending matches...')
      
      // TODO: 從數據庫或區塊鏈獲取待結算的比賽列表
      // TODO: 對每個比賽調用 fetchMatchResult
      
    } catch (error) {
      console.error('Error checking pending matches:', error)
    }
  }

  // 從 mydupr API 獲取比賽結果
  private async fetchMatchResult(externalMatchId: string): Promise<string | null> {
    try {
      const apiUrl = process.env.MYDUPR_API_URL || 'https://api.mydupr.com'
      
      // TODO: 實際調用 mydupr API
      console.log(`🔍 Fetching result for external match: ${externalMatchId}`)
      
      // 模擬 API 響應
      // const response = await fetch(`${apiUrl}/matches/${externalMatchId}`)
      // const data = await response.json()
      // return data.winner
      
      return null
    } catch (error) {
      console.error('Error fetching match result:', error)
      return null
    }
  }

  // 提交結果到區塊鏈
  async submitResult(matchId: number, winner: string): Promise<boolean> {
    try {
      console.log(`📤 Submitting result for match ${matchId}`)
      console.log(`🏆 Winner: ${winner}`)

      // 發送交易
      const tx = await this.contract.submitResultByOracle(matchId, winner)
      console.log(`⏳ Transaction sent: ${tx.hash}`)

      // 等待確認
      const receipt = await tx.wait()
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)

      return true
    } catch (error: any) {
      console.error('Error submitting result:', error)
      return false
    }
  }

  // 手動觸發結算（用於測試）
  async manualSettle(matchId: number, externalMatchId: string) {
    console.log(`🔧 Manual settle triggered for match ${matchId}`)
    
    // 獲取結果
    const winner = await this.fetchMatchResult(externalMatchId)
    
    if (!winner) {
      console.log('❌ No winner found')
      return false
    }

    // 提交結果
    return await this.submitResult(matchId, winner)
  }

  // 獲取 Oracle 狀態
  getStatus() {
    return {
      isRunning: this.isRunning,
      oracleAddress: this.wallet.address,
      contractAddress: this.contract.target,
      network: process.env.RPC_URL || 'https://passet-hub-testnet.polkadot.io'
    }
  }
}

// 創建單例
let oracleInstance: OracleService | null = null

export function getOracleService(): OracleService {
  if (!oracleInstance) {
    oracleInstance = new OracleService()
  }
  return oracleInstance
}

console.log('🔮 Oracle Service Module Loaded - v0.5.0-mvp')

