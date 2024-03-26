const fs = require('fs');
const path = require('path');
// const fse = require('fs-extra');
const userHome = require('user-home');
const {log, npm, Package} = require('@demo-cli-pnpm/utils');
const commander = require('commander');
const { program } = commander; 
const packageConfig = require('../package');
const {
  LOWEST_NODE_VERSION,
  DEFAULT_CLI_HOME,
  NPM_NAME,
  DEPENDENCIES_PATH,
} = require('./const');
let args;
let config;
// 总启动函数
async function cli(){
  try{
    await prepare();
    registerCommand();
  }catch(e){
    log.error(e.message)
  }
}
// 检查当前版本
function checkPkgVersion() {
  log.notice('cli', packageConfig.version);
  log.success('welcome,Dude!');
}
// 检查环境变量
function checkEnv() {
  log.verbose('开始检查环境变量');
  const dotenv = require('dotenv');
  dotenv.config({
    path: path.resolve(userHome, '.env'),
  });
  config = createCliConfig(); // 准备基础配置
  log.verbose('环境变量', config);
}
function createCliConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME);
  }
  return cliConfig;
}
function checkArgs(args) {
  if (args.debug) {
    process.env.LOG_LEVEL = 'verbose';
  } else {
    process.env.LOG_LEVEL = 'info';
  }
  log.level = process.env.LOG_LEVEL;
}
function checkInputArgs() {
  log.verbose('开始校验输入参数');
  const minimist = require('minimist');
  args = minimist(process.argv.slice(2)); // 解析查询参数
  checkArgs(args); // 校验参数
  log.verbose('输入参数', args);
}
function checkNodeVersion() {
  const semver = require('semver');
  if (!semver.gte(process.version, LOWEST_NODE_VERSION)) {
    throw new Error(colors.red(`demo-cli-pnpm 需要安装 v${LOWEST_NODE_VERSION} 以上版本的 Node.js`));
  }
}
async function checkGlobalUpdate() {
  log.verbose('检查 demo-cli-pnpm 最新版本');
  const currentVersion = packageConfig.version;
  const lastVersion = await npm.getNpmLatestSemverVersion(NPM_NAME, currentVersion);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(colors.yellow(`请手动更新 ${NPM_NAME}，当前版本：${packageConfig.version}，最新版本：${lastVersion}
                更新命令： npm install -g ${NPM_NAME}`));
  }
}
// 
function checkUserHome() {
  if (!userHome || !fs.existsSync(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在！'));
  }
}

// 检测
async function prepare() {
  checkPkgVersion(); // 检查当前运行版本
  checkNodeVersion(); // 检查 node 版本
  checkUserHome(); // 检查用户主目录
  checkInputArgs(); // 检查用户输入参数
  checkEnv(); // 检查环境变量
  await checkGlobalUpdate(); // 检查工具是否需要更新
}
// 注册Commander命令
function registerCommand(){
  program.version(packageConfig.version).usage('<command> [options]');
  program
    .command('info')
    .description('访问课程链接')
    .action(() => {
      log.success('欢迎学习', '我的学习记录');
      log.success('课程链接', 'https://xxx.xx');
      log.success('课程介绍', '我爱学习');
      log.success('作者介绍', '嘻嘻');
    });
  program
    .command('init [type]')
    .description('项目初始化')
    .option('--packagePath <packagePath>', '手动指定init包路径')
    .option('--force', '覆盖当前路径文件（谨慎使用）')
    .action(async (type, { packagePath, force }) => {
      const packageName = '@demo-cli-pnpm/init';
      const packageVersion = '1.0.0';
      await execCommand({ packagePath, packageName, packageVersion }, { type, force });
    });

  program
    .option('--debug', '打开调试模式')
    .parse(process.argv);
    
  if (args._.length < 1) {
    program.outputHelp();
    console.log();
  }
}
// 
async function execCommand({ packagePath, packageName, packageVersion }, extraOptions){
  console.log('{ packagePath, packageName, packageVersion }, extraOptions: ', packagePath, packageName, packageVersion, extraOptions);
  try{
    let rootFile;
  if (packagePath) {
    const execPackage = new Package({
      targetPath: packagePath,
      storePath: packagePath,
      name: packageName,
      version: packageVersion,
    });
    rootFile = execPackage.getRootFilePath(true);
  } else {
    const { cliHome } = config;
    const packageDir = `${DEPENDENCIES_PATH}`;
    const targetPath = path.resolve(cliHome, packageDir);
    const storePath = path.resolve(targetPath, 'node_modules');
    const initPackage = new Package({
      targetPath,
      storePath,
      name: packageName,
      version: packageVersion,
    });
    if (await initPackage.exists()) {
      await initPackage.update();
    } else {
      await initPackage.install();
    }
    rootFile = initPackage.getRootFilePath();
  }
  const _config = Object.assign({}, config, extraOptions, {
    debug: args.debug,
  });
  if (fs.existsSync(rootFile)) {
    const code = `require('${rootFile}')(${JSON.stringify(_config)})`;
    const p = exec('node', ['-e', code], { 'stdio': 'inherit' });
    p.on('error', e => {
      log.verbose('命令执行失败:', e);
      handleError(e);
      process.exit(1);
    });
    p.on('exit', c => {
      log.verbose('命令执行成功:', c);
      process.exit(c);
    });
  } else {
    throw new Error('入口文件不存在，请重试！');
  }
  } catch (e) {
    log.error(e.message);
  }

}
// 
function handleError(e) {
  if (args.debug) {
    log.error('Error:', e.stack);
  } else {
    log.error('Error:', e.message);
  }
  process.exit(1);
}

module.exports = cli;