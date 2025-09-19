import type { PickerInfo } from '../types/index'
import './PickerCard.css'
import { clientAPI } from '../client/api'
import { useState, useRef } from 'react'
import { extractFileNameAndPath } from '../utils/utils';

interface PickerCardProps {
  picker: PickerInfo
}

const PickerCard = ({ picker }: PickerCardProps) => {
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogContent, setDialogContent] = useState({
    title: '',
    message: '',
    buttonText: 'OK',
    onConfirm: () => {},
    showProgress: false,
    progress: 0
  })
  const [paymentDialogVisible, setPaymentDialogVisible] = useState(false)
  const paymentMethodResolveRef = useRef<(value: string | null) => void>(() => {})
  
  const renderStars = (score: number) => {
    const stars = []
    // 根据score的十位数确定星星数量
    let starCount = 1; // 默认1颗星
    
    if (score >= 10 && score <= 20) {
      starCount = 2;
    } else if (score > 20 && score <= 30) {
      starCount = 3;
    } else if (score > 30 && score <= 40) {
      starCount = 4;
    } else if (score > 40) {
      starCount = 5;
    }

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= starCount ? 'star filled' : 'star'}>
          ★
        </span>
      )
    }
    return stars
  }

  // // 显示自定义对话框
  // const showCustomAlert = (title: string, message: string, buttonText = 'OK', onConfirm?: () => void) => {
  //   setDialogContent({
  //     title,
  //     message,
  //     buttonText,
  //     onConfirm: onConfirm || (() => {}),
  //     showProgress,
  //     progress
  //   })
  //   setDialogVisible(true)
  // }

  // // 关闭对话框
  // const closeDialog = () => {
  //   setDialogVisible(false)
  // }

  // // 确认对话框操作
  // const confirmDialog = () => {
  //   dialogContent.onConfirm()
  //   closeDialog()
  // }

  // 检查登录状态并处理购买流程
  const handlePurchase = async () => {
    try {
      // 检查用户登录状态
      const isLoggedIn = await clientAPI.checkLoginStatus()
      console.log('isLoggedIn', isLoggedIn)
      if (!isLoggedIn) {
        showCustomAlert('Login Required', 'Please log in to purchase items.')
        return
      }
      
      // 显示支付方式选择弹窗
      const payType = await showPaymentModal()
      
      if (payType) {
        // 调用创建订单API
        const downToken = await clientAPI.createOrder(picker.picker_id, payType)
        
        // 显示下载进度对话框，设置初始进度为0
        showCustomAlert('Download Progress', 'Downloading...', 'Cancel', () => {}, true, 0)
        
        // 模拟下载进度
        let progress = 0
        const progressInterval = setInterval(() => {
          progress += 5
          if (progress >= 100) {
            clearInterval(progressInterval)
            console.log('download progress', progress)
            console.log('downToken', downToken)
            // 调用 Picker 下载接口，获取真实的下载路径
            clientAPI.downloadFile(downToken).then(downloadResult => {
              console.log('downloadResult', downloadResult)
              // 下载完成后更新对话框内容，显示确认按钮
              if (downloadResult) {
                const { fileName, path } = extractFileNameAndPath(downloadResult);

                showCustomAlert('Download Complete', `File ${fileName} downloaded to:\n${path || 'Local storage'}`, 'OK', () => {
                  // 点击OK后关闭对话框并退出流程
                })
              } else {
                showCustomAlert('Download Complete', `File downloaded to:\n 'Local storage'}`, 'OK', () => {
                  // 点击OK后关闭对话框并退出流程
                })
              }
              
            }).catch(error => {
              // 显示下载错误信息
              const errorMessage = error instanceof Error ? 
                (error.message || 'Download failed.') : 
                'An unexpected error occurred during download.'
              showCustomAlert('Download Error', errorMessage)
            })
          } else {
            // 更新进度条
            setDialogContent(prev => ({
              ...prev,
              progress
            }))
          }
        }, 200) // 每200ms更新一次进度
      }
    } catch (error) {
      // 显示错误信息
      const errorMessage = error instanceof Error ? 
        (error.message || 'Purchase failed.') : 
        'An unexpected error occurred.'
      showCustomAlert('Error', errorMessage)
    }
  }
  
  // 更新showCustomAlert函数，添加进度条相关参数
  const showCustomAlert = (
    title: string, 
    message: string, 
    buttonText = 'OK', 
    onConfirm?: () => void, 
    showProgress = false, 
    progress = 0
  ) => {
    setDialogContent({
      title,
      message,
      buttonText,
      onConfirm: onConfirm || (() => {}),
      showProgress,
      progress
    })
    setDialogVisible(true)
  }

  // 关闭对话框
  const closeDialog = () => {
    setDialogVisible(false)
  }

  // 确认对话框操作
  const confirmDialog = () => {
    dialogContent.onConfirm()
    closeDialog()
  }

  // 支付方式选择弹窗 - 使用自定义对话框实现
  const showPaymentModal = (): Promise<string | null> => {
    return new Promise((resolve) => {
      paymentMethodResolveRef.current = resolve  // 使用ref存储resolve
      setPaymentDialogVisible(true)
    })
  }

  // 选择支付方式
  const selectPaymentMethod = (method: string) => {
    if (typeof paymentMethodResolveRef.current === 'function') {
      paymentMethodResolveRef.current(method)
    }
    setPaymentDialogVisible(false)
  }

  // 取消支付方式选择
  const cancelPaymentMethod = () => {
    if (typeof paymentMethodResolveRef.current === 'function') {
      paymentMethodResolveRef.current(null)
    }
    setPaymentDialogVisible(false)
  }

  return (
    <>
      <div className="picker-card">
        {/* Card Header */}
        <div className="picker-header">
          <div className="picker-category">{picker.version}</div>
          <div className="picker-actions">
            <button className="picker-menu" title="More options">
               ⋮
            </button>
          </div>
        </div>

        {/* Picker Info Container with Image */}
        <div className="picker-info-container">
          <div className="picker-info">
            <h3 className="picker-name">{picker.alias}</h3>
            <p className="picker-description">{picker.description}</p>
            <div className="picker-developer">Author ID: {picker.dev_user_id.slice(0,13)}</div>
            <div className="picker-developer">Created Time: {picker.created_at.slice(0,10)}</div>
            <div className="picker-developer">Updated Time: {picker.updated_at.slice(0,10)}</div>
            {/* Installation Info */}
            <div className="picker-installs">
              <span className="installs-text">Installed Times: {picker.download_count}</span>
            </div>
          </div>
          <div className="picker-image-container">
            {picker.image_path && (
              <img 
                src={picker.image_path} 
                alt={picker.alias} 
                className="picker-image" 
              />
            )}
          </div>
        </div>

        {/* Picker Details */}
        <div className="picker-details">
          <div className="picker-price">
            <span className="wallet-badge">Price: {picker.price}</span>
          </div>
          <div className="picker-rating">
            <div className="stars">
              {renderStars(Number(picker.download_count))} {/* 暂时使用固定评分 */}
            </div>
            {/* <span className="rating-count">({picker.download_count})</span> */}
          </div>
        </div>

        {/* Action Button */}
        <button 
          className={`action-button ${picker.status === 'active' ? 'active' : 'inactive'}`}
          onClick={handlePurchase}
          disabled={picker.status !== 'active'}
        >
          {picker.status === 'active' ? 'For Sale' : 'Discontinued'}
        </button>
      </div>
      
      {/* 自定义对话框组件，添加进度条显示 */}
      {dialogVisible && (
        <div className="custom-dialog-overlay" onClick={closeDialog}>
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title">{dialogContent.title}</h3>
            </div>
            <div className="custom-dialog-body">
              <p className="custom-dialog-message">{dialogContent.message}</p>
              
              {/* 下载进度条 */}
              {dialogContent.showProgress && (
                <div className="progress-container">
                  <div 
                    className="progress-bar"
                    style={{ width: `${dialogContent.progress}%` }}
                  ></div>
                  <span className="progress-text">{dialogContent.progress}%</span>
                </div>
              )}
            </div>
            <div className="custom-dialog-footer">
              <button 
                className="custom-dialog-button"
                onClick={confirmDialog}
              >
                {dialogContent.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 支付方式选择对话框保持不变 */}
      {paymentDialogVisible && (
        <div className="custom-dialog-overlay" onClick={cancelPaymentMethod}>
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title">Select Payment Method</h3>
            </div>
            <div className="custom-dialog-body">
              <p className="custom-dialog-message">Please choose your preferred payment method</p>
            </div>
            <div className="custom-dialog-footer" style={{ gap: '12px' }}>
              <button 
                className="custom-dialog-button"
                onClick={() => selectPaymentMethod('wallet')}
                style={{ backgroundColor: '#10b981', minWidth: '100px' }}
              >
                Wallet
              </button>
              <button 
                className="custom-dialog-button"
                onClick={() => selectPaymentMethod('premium')}
                style={{ backgroundColor: '#8b5cf6', minWidth: '100px' }}
              >
                Premium
              </button>
              <button 
                className="custom-dialog-button"
                onClick={cancelPaymentMethod}
                style={{ backgroundColor: '#6b7280', minWidth: '100px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PickerCard
