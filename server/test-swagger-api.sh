#!/bin/bash

# Swagger OpenAPI 测试脚本
# 用于测试所有12个API端点

echo "=== Pickers Server Swagger API 测试 ==="
echo

# 服务器地址
BASE_URL="http://127.0.0.1:3000"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    echo -e "${BLUE}测试: $description${NC}"
    echo "请求: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "HTTP_STATUS:%{http_code}")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -w "HTTP_STATUS:%{http_code}")
    fi
    
    http_status=$(echo "$response" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 400 ]; then
        echo -e "${GREEN}✓ 成功 (HTTP $http_status)${NC}"
    else
        echo -e "${RED}✗ 失败 (HTTP $http_status)${NC}"
    fi
    
    echo "响应: $body" | head -c 200
    echo
    echo "---"
    echo
}

echo "1. 检查服务器状态..."
test_endpoint "GET" "/" "健康检查"

echo "2. 测试用户注册..."
test_endpoint "POST" "/api/users/register" "用户注册" '{
    "email": "test@example.com",
    "user_name": "测试用户",
    "user_type": "free"
}'

echo "3. 测试邮箱验证..."
test_endpoint "POST" "/api/users/verify" "邮箱验证" '{
    "email": "test@example.com",
    "code": "123456"
}'

echo "4. 测试用户登录..."
test_endpoint "POST" "/api/users/login" "用户登录" '{
    "email": "test@example.com"
}'

echo "5. 测试获取Picker市场..."
test_endpoint "GET" "/api/pickers?page=1&size=10" "获取Picker市场"

echo "6. 测试获取Picker详情..."
test_endpoint "GET" "/api/pickers/550e8400-e29b-41d4-a716-446655440000" "获取Picker详情"

echo "7. 测试创建订单..."
test_endpoint "POST" "/api/orders" "创建订单" '{
    "picker_id": "550e8400-e29b-41d4-a716-446655440000",
    "pay_type": "wallet"
}'

echo "8. 测试获取用户订单..."
test_endpoint "GET" "/api/orders?page=1&size=10" "获取用户订单"

echo "9. 测试获取订单详情..."
test_endpoint "GET" "/api/orders/550e8400-e29b-41d4-a716-446655440001" "获取订单详情"

echo "10. 测试获取用户资料..."
test_endpoint "GET" "/api/users/profile" "获取用户资料"

echo "11. 测试上传Picker..."
echo -e "${BLUE}测试: 上传Picker${NC}"
echo "请求: POST /api/pickers (multipart/form-data)"
echo -e "${RED}✗ 需要文件上传，跳过自动测试${NC}"
echo "---"
echo

echo "12. 测试文件下载..."
test_endpoint "GET" "/download?token=test-token" "文件下载"

echo "=== API文档访问地址 ==="
echo -e "${GREEN}Swagger UI: $BASE_URL/swagger-ui/${NC}"
echo -e "${GREEN}OpenAPI JSON: $BASE_URL/api-docs/openapi.json${NC}"
echo

echo "=== 测试完成 ==="