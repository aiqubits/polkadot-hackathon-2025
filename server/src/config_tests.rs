use crate::config::{Config, AppState};
use crate::database::DbPool;

// 这个测试文件用于验证配置功能是否正常工作
// 注意：这只是一个示例，实际测试需要数据库连接

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_config_from_file() {
        // 测试配置文件读取
        let config = Config::from_file();
        assert!(config.is_ok());
        
        let config = config.unwrap();
        assert_eq!(config.password.salt, "openpick");
        assert_eq!(config.jwt.secret, "your-secret-key");
        assert_eq!(config.pending_registration.cleanup_minutes, 10);
    }
    
    #[test]
    fn test_app_state_with_config() {
        // 这个测试需要数据库连接，仅用于演示AppState如何使用配置
        // 在实际测试中，我们需要mock数据库连接
        /*
        let db_pool = DbPool::new_in_memory(); // 假设有这样的方法
        let app_state = AppState::new(db_pool);
        
        assert_eq!(app_state.password_salt, "openpick");
        assert_eq!(app_state.jwt_secret, "your-secret-key");
        assert_eq!(app_state.pending_registration_cleanup_minutes, 10);
        */
    }
}