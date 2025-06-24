const { ConfidentialClientApplication } = require('@azure/msal-node');
const axios = require('axios');
const { config, displayConfig } = require('./subscription-config');

// Azure AD 应用认证配置
const clientConfig = {
  auth: {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authority: `https://login.microsoftonline.com/${config.tenantId}`
  }
};

const cca = new ConfidentialClientApplication(clientConfig);

// 获取访问令牌
async function getAccessToken() {
  try {
    const clientCredentialRequest = {
      scopes: ['https://graph.microsoft.com/.default']
    };

    const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
    return response.accessToken;
  } catch (error) {
    console.error('获取访问令牌失败:', error);
    throw error;
  }
}

// 创建变更通知订阅
async function createSubscription() {
  try {
    const accessToken = await getAccessToken();

    // 订阅配置
    const subscription = {
      changeType: 'created,updated,deleted',
      notificationUrl: config.notificationUrl,
      resource: '/users/Joel.BH.Zhang@kpltest.onmicrosoft.com',  // 监听用户变更，也可以改为 '/groups' 监听组变更
      expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3天后过期
      clientState: config.clientState
    };

    console.log(subscription);

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/subscriptions',
      subscription,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ 订阅创建成功:');
    console.log(`订阅ID: ${response.data.id}`);
    console.log(`过期时间: ${response.data.expirationDateTime}`);
    console.log(`监听资源: ${response.data.resource}`);
    console.log(`变更类型: ${response.data.changeType}`);
    console.log(`通知URL: ${response.data.notificationUrl}`);

    return response.data;
  } catch (error) {
    console.error('❌ 创建订阅失败:', error.response?.data || error.message);
    throw error;
  }
}

// 续订现有订阅
async function renewSubscription(subscriptionId) {
  try {
    const accessToken = await getAccessToken();

    // 延长3天
    const newExpirationDateTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const updateData = {
      expirationDateTime: newExpirationDateTime
    };

    const response = await axios.patch(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ 订阅续订成功:');
    console.log(`订阅ID: ${response.data.id}`);
    console.log(`新过期时间: ${response.data.expirationDateTime}`);

    return response.data;
  } catch (error) {
    console.error('❌ 续订订阅失败:', error.response?.data || error.message);
    throw error;
  }
}

// 获取订阅详情
async function getSubscription(subscriptionId) {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log('📋 订阅详情:');
    console.log(`订阅ID: ${response.data.id}`);
    console.log(`过期时间: ${response.data.expirationDateTime}`);
    console.log(`监听资源: ${response.data.resource}`);
    console.log(`变更类型: ${response.data.changeType}`);
    console.log(`通知URL: ${response.data.notificationUrl}`);
    console.log(`客户端状态: ${response.data.clientState}`);

    return response.data;
  } catch (error) {
    console.error('❌ 获取订阅详情失败:', error.response?.data || error.message);
    throw error;
  }
}

// 删除订阅
async function deleteSubscription(subscriptionId) {
  try {
    const accessToken = await getAccessToken();

    await axios.delete(
      `https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log('✅ 订阅删除成功');
    console.log(`已删除订阅ID: ${subscriptionId}`);

  } catch (error) {
    console.error('❌ 删除订阅失败:', error.response?.data || error.message);
    throw error;
  }
}

// 列出所有订阅
async function listSubscriptions() {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/subscriptions',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    console.log(`📋 当前共有 ${response.data.value.length} 个订阅:`);
    response.data.value.forEach((sub, index) => {
      console.log(`\n${index + 1}. 订阅ID: ${sub.id}`);
      console.log(`   资源: ${sub.resource}`);
      console.log(`   变更类型: ${sub.changeType}`);
      console.log(`   过期时间: ${sub.expirationDateTime}`);
      console.log(`   通知URL: ${sub.notificationUrl}`);
    });

    return response.data.value;
  } catch (error) {
    console.error('❌ 获取订阅列表失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主函数 - 处理命令行参数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🚀 Azure AD Change Notifications 订阅管理器\n');

  displayConfig();

  try {
    switch (command) {
      case 'create':
        await createSubscription();
        break;

      case 'renew':
        const subscriptionId = args[1];
        if (!subscriptionId) {
          console.error('❌ 请提供订阅ID: npm run manage-subscription renew <subscription-id>');
          return;
        }
        await renewSubscription(subscriptionId);
        break;

      case 'get':
        const getSubscriptionId = args[1];
        if (!getSubscriptionId) {
          console.error('❌ 请提供订阅ID: npm run manage-subscription get <subscription-id>');
          return;
        }
        await getSubscription(getSubscriptionId);
        break;

      case 'delete':
        const deleteSubscriptionId = args[1];
        if (!deleteSubscriptionId) {
          console.error('❌ 请提供订阅ID: npm run manage-subscription delete <subscription-id>');
          return;
        }
        await deleteSubscription(deleteSubscriptionId);
        break;

      case 'list':
        await listSubscriptions();
        break;

      default:
        console.log('用法:');
        console.log('  npm run manage-subscription create           # 创建新订阅');
        console.log('  npm run manage-subscription renew <id>       # 续订指定订阅');
        console.log('  npm run manage-subscription get <id>         # 获取订阅详情');
        console.log('  npm run manage-subscription delete <id>      # 删除指定订阅');
        console.log('  npm run manage-subscription list             # 列出所有订阅');
        console.log('\n环境变量:');
        console.log('  AZURE_CLIENT_ID       # Azure AD 应用程序ID');
        console.log('  AZURE_CLIENT_SECRET   # Azure AD 应用程序密钥');
        console.log('  AZURE_TENANT_ID       # Azure AD 租户ID');
        console.log('  NOTIFICATION_URL      # 接收通知的URL');
        console.log('  CLIENT_STATE          # 客户端状态密钥');
    }
  } catch (error) {
    console.error('\n💥 操作失败:', error.message);
    process.exit(1);
  }
}

// 导出函数供其他模块使用
module.exports = {
  createSubscription,
  renewSubscription,
  getSubscription,
  deleteSubscription,
  listSubscriptions
};

// 如果直接运行此脚本
if (require.main === module) {
  main();
}
