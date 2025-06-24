# Azure AD Change Notifications 订阅管理器

这个 Node.js 脚本实现了 Azure AD Change Notifications 的订阅管理功能，支持创建、续订、查询和删除订阅。

## 前置条件

### 1. Azure AD 应用注册

在 Azure Portal 中注册一个应用程序：

1. 访问 [Azure Portal](https://portal.azure.com)
2. 导航到 **Azure Active Directory** > **应用注册**
3. 点击 **新注册**，填写应用名称
4. 注册完成后，记录 **应用程序(客户端)ID** 和 **目录(租户)ID**
5. 转到 **证书和密码**，创建新的客户端密码
6. 转到 **API权限**，添加以下 Microsoft Graph 权限：
   - `User.Read.All` (应用程序权限)
   - `Group.Read.All` (应用程序权限) - 如果要监听组变更
7. 点击 **授予管理员同意**

### 2. 配置设置

有两种方式配置应用：

#### 方式一：环境变量（推荐）

```bash
export AZURE_CLIENT_ID="your-azure-ad-app-client-id"
export AZURE_CLIENT_SECRET="your-azure-ad-app-client-secret"
export AZURE_TENANT_ID="your-azure-ad-tenant-id"
export NOTIFICATION_URL="https://your-app.azurewebsites.net/api/receive-notification"
export CLIENT_STATE="your-secret-client-state-token"
```

#### 方式二：修改配置文件

直接编辑 `subscription-config.js` 文件中的默认值（不推荐用于生产环境）。

### 3. 安装依赖

```bash
npm install
```

## 使用方法

### 创建新订阅

```bash
npm run manage-subscription create
```

### 续订现有订阅

```bash
npm run manage-subscription renew <subscription-id>
```

### 获取订阅详情

```bash
npm run manage-subscription get <subscription-id>
```

### 删除订阅

```bash
npm run manage-subscription delete <subscription-id>
```

### 列出所有订阅

```bash
npm run manage-subscription list
```

## 配置管理

### 统一配置文件

所有配置现在统一在 `subscription-config.js` 文件中管理，包括：

- **Azure AD 应用配置**: clientId, clientSecret, tenantId
- **通知配置**: notificationUrl, clientState

## 重要注意事项

1. **通知URL要求**:
   - 必须使用 HTTPS
   - 必须公网可访问
   - 必须能正确响应验证请求

2. **权限要求**:
   - 应用需要适当的 Microsoft Graph 权限
   - 需要管理员同意

3. **订阅限制**:
   - 每个租户最多1000个订阅
   - 订阅有生命周期，需要定期续订
   - 用户资源暂不支持 `includeResourceData`

## 故障排除

### 常见错误

1. **权限不足**: 确保应用有正确的 Graph API 权限并已获得管理员同意
2. **通知URL验证失败**: 确保 URL 是 HTTPS 且可公网访问
3. **认证失败**: 检查客户端ID、密钥和租户ID是否正确

### 调试建议

- 检查控制台输出的详细错误信息
- 确认环境变量配置正确
- 验证 Azure AD 应用权限设置

## 通知接收功能

应用已经在 `app.js` 中实现了通知接收和验证功能：

### 端点

- **GET `/api/receive-notification`**: 处理 Azure AD 的订阅验证请求
- **POST `/api/receive-notification`**: 接收和处理变更通知

### 功能特点

1. **订阅验证**: 自动处理 Azure AD 发送的验证请求
2. **通知验证**: 验证 clientState 和通知格式
3. **错误处理**: 即使发生错误也返回 200 状态码避免重复发送
4. **详细日志**: 输出详细的处理日志便于调试

### 测试通知接收

#### 1. 启动应用

```bash
npm start
```

#### 2. 使用 ngrok 创建公网隧道（开发环境）

```bash
# 安装 ngrok
npm install -g ngrok

# 创建隧道（假设应用运行在 3000 端口）
ngrok http 3000
```

记录 ngrok 提供的 HTTPS URL，例如：`https://abc123.ngrok.io`

#### 3. 更新环境变量

```bash
export NOTIFICATION_URL="https://abc123.ngrok.io/api/receive-notification"
```

#### 4. 创建订阅

```bash
npm run manage-subscription create
```

#### 5. 触发变更测试

在 Azure AD 中创建、更新或删除用户，观察应用控制台输出。

### 当前实现状态

✅ **已实现**:
- 验证通知的有效性
- 确认收到通知（发送响应给 Azure AD）

🔄 **TODO (待实现)**:
- 转发事件到业务逻辑函数
- 发送通知摘要邮件
