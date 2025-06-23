const configs = {
  pdms: {
    tenantId: 'f074dbeb-1cc3-4857-a3ba-17253091f5d3',
    clientId: '438b462a-c179-4575-8ef1-87ea35f42e59',
    privateKeyFile: 'pdms-kpltest-certificate.key',
    certificateFile: 'pdms-kpltest-certificate.crt',
    passphrase: 'xxxxxx', // 需要替换为 pdms 的实际密码
    x5tFingerprint: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' // SHA1 fingerprint (去掉冒号)
  }
};

// 获取指定应用的配置
function getConfig(appName) {
  if (!configs[appName]) {
    throw new Error(`未找到应用 "${appName}" 的配置。可用的应用: ${Object.keys(configs).join(', ')}`);
  }
  return configs[appName];
}

// 获取所有可用的应用名称
function getAvailableApps() {
  return Object.keys(configs);
}

module.exports = {
  getConfig,
  getAvailableApps,
  configs
};
