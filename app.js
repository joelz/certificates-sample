var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var passport = require('passport');
var session = require('express-session');
var fs = require('fs');

var SamlStrategy = require('passport-saml').Strategy;
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});
passport.use(new SamlStrategy(
  {
    // 部署到了 https://aad-saml.glitch.me/
    // 需要加上这句 protocol
    // protocol: 'https',
    path: '/pdms-saml',
    // 登录多个账号时，不加 prompt=select_account 会报 AADSTS16000 错误
    // 只登录了一个账号时，加 prompt=select_account 也没用
    entryPoint: 'https://login.microsoftonline.com/f074dbeb-1cc3-4857-a3ba-17253091f5d3/saml2?prompt=select_account',
    // forceAuthn: false, // 这个参数有用
    // IsPassive: false, // 没用
    // passive: false, // 没有用
    issuer: 'pdms-saml',
    cert: fs.readFileSync('PDMS-SAML.cer', 'utf-8'),
    // additionalParams: {'IsPassive':'true'}, // 这个是加到 entryPoint 的 query string 里面
    signatureAlgorithm: 'sha256'
  },
  function (profile, done) {
    return done(null,
      {
        id: profile['nameID'],
        email: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        displayName: profile['http://schemas.microsoft.com/identity/claims/displayname'],
        firstName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
        lastName: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
      });
  })
);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session(
  {
    resave: true,
    saveUninitialized: true,
    secret: 'this shit hits'
  }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/login',
  passport.authenticate('saml', {
    successRedirect: '/',
    failureRedirect: '/login'
  })
);
app.post('/pdms-saml',
  passport.authenticate('saml', {
    failureRedirect: '/',
    failureFlash: true
  }),
  function (req, res) {
    // console.log(req);
    res.redirect('/');
  }
);

// ==========================================
// Azure AD Change Notifications 接收和验证
// ==========================================

// 从统一配置文件读取配置
const { config } = require('./subscription-config');

app.post('/api/receive-notification', function (req, res) {
  console.log('\n🔔 接收到 Azure AD Change Notification @' + new Date().toISOString());

  // 处理订阅验证请求
  // Azure AD 在创建订阅时会发送 GET 请求进行验证
  const validationToken = req.query.validationToken;

  if (validationToken) {
    console.log('📋 接收到订阅验证请求');
    console.log(`验证令牌: ${validationToken}`);

    // 返回验证令牌以确认订阅
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(validationToken);
    console.log('✅ 订阅验证成功');
    return;
  }

  try {
    // 获取通知数据
    const notifications = req.body.value;

    // 将 notifications 写入文件，文件名上加上时间戳
    fs.writeFileSync(`notifications-${new Date().toISOString()}.json`, JSON.stringify(notifications, null, 2));

    if (!notifications || !Array.isArray(notifications)) {
      console.log('❌ 无效的通知格式');
      return res.status(400).json({ error: 'Invalid notification format' });
    }

    console.log(`📨 收到 ${notifications.length} 个通知`);

    // 处理每个通知
    const validNotifications = [];
    const invalidNotifications = [];

    notifications.forEach((notification, index) => {
      console.log(`\n处理通知 ${index + 1}:`);
      console.log(`- 订阅ID: ${notification.subscriptionId}`);
      console.log(`- 资源: ${notification.resource}`);
      console.log(`- 变更类型: ${notification.changeType}`);
      console.log(`- 客户端状态: ${notification.clientState}`);

      // 验证通知的有效性
      if (validateNotification(notification)) {
        validNotifications.push(notification);
        console.log('✅ 通知验证成功');
      } else {
        invalidNotifications.push(notification);
        console.log('❌ 通知验证失败');
      }
    });

    // 记录验证结果
    console.log(`\n📊 验证结果: ${validNotifications.length} 个有效, ${invalidNotifications.length} 个无效`);

    // 处理有效通知
    if (validNotifications.length > 0) {
      processValidNotifications(validNotifications);
    }

    // 确认收到通知 - 必须返回 200 状态码
    res.status(200).json({
      message: 'Notifications received and processed',
      processed: validNotifications.length,
      skipped: invalidNotifications.length
    });

    console.log('✅ 通知处理完成，已确认收到');

  } catch (error) {
    console.error('💥 处理通知时发生错误:', error);
    // 即使发生错误，也应该返回 200 避免 Azure AD 重复发送
    res.status(200).json({ error: 'Internal processing error' });
  }
});

// 验证通知的有效性
function validateNotification(notification) {
  try {
    // 1. 检查必需字段
    if (!notification.subscriptionId || !notification.resource || !notification.changeType) {
      console.log('❌ 缺少必需字段');
      return false;
    }

    // 2. 验证客户端状态
    if (notification.clientState !== config.clientState) {
      console.log(`❌ 客户端状态不匹配. 期望: ${config.clientState}, 实际: ${notification.clientState}`);
      return false;
    }

    // 3. 检查变更类型是否有效
    const validChangeTypes = ['created', 'updated', 'deleted'];
    if (!validChangeTypes.includes(notification.changeType)) {
      console.log(`❌ 无效的变更类型: ${notification.changeType}`);
      return false;
    }

    console.log('✅ 通知格式验证通过');
    return true;

  } catch (error) {
    console.error('❌ 验证通知时发生错误:', error);
    return false;
  }
}

// 处理有效的通知
function processValidNotifications(notifications) {
  console.log('\n🔄 开始处理有效通知...');

  notifications.forEach((notification, index) => {
    console.log(`\n处理通知 ${index + 1}/${notifications.length}:`);
    console.log(`- 订阅ID: ${notification.subscriptionId}`);
    console.log(`- 资源: ${notification.resource}`);
    console.log(`- 变更类型: ${notification.changeType}`);

    // TODO: 转发事件到业务逻辑函数
    console.log('TODO: 转发事件到业务逻辑函数');

    // TODO: 发送通知摘要邮件
    console.log('TODO: 发送通知摘要邮件');

    // 这里可以添加具体的业务逻辑处理
    // 例如：
    // - 解析资源ID
    // - 调用其他API获取详细信息
    // - 触发业务流程
    // - 记录到数据库
    // - 发送邮件或其他通知
  });

  console.log('✅ 所有有效通知处理完成');
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
