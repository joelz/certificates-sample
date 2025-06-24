// Azure AD Change Notifications 统一配置文件

const config = {
  // Azure AD 应用配置
  clientId: process.env.AZURE_CLIENT_ID || 'ad295211-1306-4f9d-a859-22d6286703ce',
  clientSecret: process.env.AZURE_CLIENT_SECRET || 'xxxxxx',
  tenantId: process.env.AZURE_TENANT_ID || 'f074dbeb-1cc3-4857-a3ba-17253091f5d3',

  // 通知配置
  notificationUrl: process.env.NOTIFICATION_URL || 'https://3084-202-105-132-66.ngrok-free.app/api/receive-notification',
  clientState: process.env.CLIENT_STATE || 'subscription-secret-token',
};

// 验证必需的配置
function validateConfig() {
  const required = ['clientId', 'clientSecret', 'tenantId'];
  const missing = required.filter(key => !config[key] || config[key].startsWith('your-'));

  if (missing.length > 0) {
    console.warn(`⚠️  警告: 以下配置项需要设置: ${missing.join(', ')}`);
    console.warn('请设置相应的环境变量或修改 subscription-config.js');
  }

  return missing.length === 0;
}




// 输出当前配置（隐藏敏感信息）
function displayConfig() {
  console.log('📋 当前配置:');
  console.log(`- 租户ID: ${config.tenantId}`);
  console.log(`- 客户端ID: ${config.clientId}`);
  console.log(`- 客户端密钥: ${config.clientSecret ? '***已设置***' : '❌未设置'}`);
  console.log(`- 通知URL: ${config.notificationUrl}`);
  console.log(`- 客户端状态: ${config.clientState}`);
}

module.exports = {
  config,
  validateConfig,
  displayConfig
};
