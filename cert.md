cert.md
====

## 背景
Azure AD 中 [OAuth 2.0 client credentials flow ](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow#second-case-access-token-request-with-a-certificate) 可以用证书来代替 secret。

## 证书相关

### 生成证书
```bash
# 3650 表示 365*10年
# 需要输入一个 passphrase，要记好这个 passphrase
openssl req -new -x509 -days 3650 -newkey rsa:4096 -keyout pdms-kpltest-certificate.key -out pdms-kpltest-certificate.crt

# 需要输入一些信息，示例如下：
# -----
# Country Name (2 letter code) []:CN
# State or Province Name (full name) []:SH
# Locality Name (eg, city) []:SH
# Oganization Name (eg, company) []:COM
# Organizational Unit Name (eg, section) []:TI
# Common Name (eg, fully qualified host name) []:pdms-internal.abdfd.com
# Email Address []:joel@abc.com
```

crt 文件内容是一串 base64 字符串，类似这样：
```
-----BEGIN CERTIFICATE-----
MIIFrjCCA5YCCQDMQ1ULxPWx5DANBgkqhkiG9w0BAQsFADCBmDELMAkGA1UEBhMC
.....
5Nj7IrHRvNG0ohmKDLgZY8ux
-----END CERTIFICATE-----
```

key 文件内容是一串 base64 字符串，类似这样：
```
-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIJnzBJBgkqhkiG9w0BBQ0wPDAbBgkqhkiG9w0BBQwwDgQIIMBtWJg9RJMCAggA
....
3seAIn6U5YdVygnGC6I2PTFoXQ==
-----END ENCRYPTED PRIVATE KEY-----

```

### 计算证书的 SHA1
[firefox - How to get SSL-Certificate sha1 fingerprint? - Stack Overflow](https://stackoverflow.com/questions/23371619/how-to-get-ssl-certificate-sha1-fingerprint)

```bash
openssl x509 -in pdms-kpltest-certificate.crt -fingerprint -noout
# SHA1 Fingerprint=C1:09:AF:D0:04:52:A2:CE:D5:30:7B:9C:73:9A:DE:A1:DE:2B:F6:E6
```

### 去除key的密码
```
openssl rsa -in pdms-kpltest-certificate.key -out pdms-kpltest-certificate.new.key
```

### 常用格式
| 格式          | 说明                  |
| ------------- | --------------- |
| `.crt` `.cer` | 证书(Certificate)          |
| `.key`        | 密钥/私钥(Private Key)   |
| `.csr`        | 证书认证签名请求(Certificate signing request)   |
| `*.pem`       | base64编码文本储存格式，可以单独放证书或密钥，也可以同时放两个；**base64编码**就是两条-------之间的那些莫名其妙的字符 |
| `*.der`       | 证书的二进制储存格式(不常用) |
