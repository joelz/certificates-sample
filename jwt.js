// [auth0/node-jsonwebtoken: JsonWebToken implementation for node.js]
// (https://github.com/auth0/node-jsonwebtoken)
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { v4: uuid } = require('uuid');

const tenantId = 'f074dbeb-1cc3-4857-a3ba-17253091f5d3';
const clientId = '438b462a-c179-4575-8ef1-87ea35f42e59';

const privateKey = fs.readFileSync('pdms-kpltest-certificate.key');
const passphrase = fs.readFileSync('pdms-kpltest-certificate.key.txt').toString();
const cert = fs.readFileSync('pdms-kpltest-certificate.crt');
// 使用命令 openssl x509 -in pdms-kpltest-certificate.crt -fingerprint -noout 获取 SHA1 fingerprint
// 然后转换为 base64url
const x5t = Buffer.from('C109AFD00452A2CED5307B9C739ADEA1DE2BF6E6', 'hex').toString('base64');
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
  });

// 然后就可以用这个 jwt 去换取 access_token
// https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow#second-case-access-token-request-with-a-certificate
