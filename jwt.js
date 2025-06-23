// [auth0/node-jsonwebtoken: JsonWebToken implementation for node.js]
// (https://github.com/auth0/node-jsonwebtoken)
const jwt = require('jsonwebtoken');
const fs = require('fs');
const request = require('request');
const { v4: uuid } = require('uuid');
const { getConfig, getAvailableApps } = require('./config');

// 设置要使用的应用名称（可以通过环境变量或参数传递）
const appName = process.env.APP_NAME || process.argv[2] || 'keytop';

console.log(`使用应用配置: ${appName}`);
console.log(`可用的应用: ${getAvailableApps().join(', ')}`);

try {
  // 获取应用配置
  const config = getConfig(appName);

  const { tenantId, clientId, privateKeyFile, certificateFile, passphrase, x5tFingerprint } = config;

  const privateKey = fs.readFileSync(privateKeyFile);
  const cert = fs.readFileSync(certificateFile);
  // 将 hex 格式的 fingerprint 转换为 base64url
  const x5t = Buffer.from(x5tFingerprint, 'hex').toString('base64');
  console.log('x5tFingerprint', x5tFingerprint);
  console.log('x5t', x5t);
  const notBeforeInSeconds = 2;

  // 生成 Azure AD 可用的 jwt
  // [Microsoft identity platform certificate credentials - Microsoft Entra | Microsoft Docs]
  // (https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-certificate-credentials)
  jwt.sign(
    {
      "aud": `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      "iss": clientId,
      "jti": uuid(),
      "sub": clientId
    },
    {
      key: privateKey,
      passphrase,
    },
    {
      algorithm: 'RS256',
      expiresIn: '10h',
      notBefore: notBeforeInSeconds,
      header: {
        "alg": "RS256",
        "typ": "JWT",
        x5t
      }
    }, function (err, token) {
      if (err) {
        console.log(err);
        return;
      }
      console.log(token);

      // verify
      setTimeout(() => {
        jwt.verify(token, cert, function (err2, decoded) {
          if (err2) {
            console.log(err2);
            return;
          }
          console.log(decoded);
        });
      }, (notBeforeInSeconds + 1) * 1000);

      // use token to get access_token
      setTimeout(() => {
        console.log('****use token to get access_token===>');
        // 然后就可以用这个 jwt 去换取 access_token
        // https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow#second-case-access-token-request-with-a-certificate
        let options = {
          'method': 'POST',
          'url': `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
          'headers': {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          form: {
            'client_id': clientId,
            'scope': 'https://graph.microsoft.com/.default',
            'grant_type': 'client_credentials',
            'client_assertion_type': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            'client_assertion': token
          }
        };
        request(options, function (error, response) {
          if (error) throw new Error(error);
          const res = JSON.parse(response.body);
          console.log('access_token', res.access_token);
        });

      }, (notBeforeInSeconds + 3) * 1000);
    });
} catch (error) {
  console.error('配置错误:', error.message);
  process.exit(1);
}
