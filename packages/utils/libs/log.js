const log = require('npmlog');

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

// 自定义头部
log.heading = 'demo-cli-pnpm';

log.addLevel('success', 2000, {fg: 'green', bold: true})
log.addLevel('notice', 2000, {fg: 'blue', bg: 'black'})

module.exports = log;