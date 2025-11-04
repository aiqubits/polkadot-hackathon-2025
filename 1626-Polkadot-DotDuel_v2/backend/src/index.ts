import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import matchesRouter from './routes/matches.js'
import statsRouter from './routes/stats.js'
import usersRouter from './routes/users.js'
import oracleRouter from './routes/oracle.js'

// 加載環境變量
dotenv.config()

// 版本號
const VERSION = 'v1.0.0-mvp'

const app = express()
const PORT = process.env.PORT || 3000

// 中間件
const defaultOrigins = ['http://localhost:5173', 'http://localhost:5174']
const allowedOrigins = (process.env.ALLOWED_ORIGINS?.split(',') || defaultOrigins)
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, origin)
    }
    console.warn(`🚫 Blocked CORS request from ${origin}. Set ALLOWED_ORIGINS to permit it.`)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 日誌中間件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// 健康檢查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString()
  })
})

// API 路由
app.use('/api/matches', matchesRouter)
app.use('/api/stats', statsRouter)
app.use('/api/users', usersRouter)
app.use('/api/oracle', oracleRouter)

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  })
})

// 錯誤處理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 啟動服務器
app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🚀 Polkadot Duel Platform API - ${VERSION}`)
  console.log(`📡 Server running on port ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Health check: http://localhost:${PORT}/health`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})

export default app

