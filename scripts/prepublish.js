const readFileSync = require('fs').readFileSync;
const execSync = require('child_process').execSync;
const inInstall = require('in-publish').inInstall;
const prettyBytes = require('pretty-bytes');
const gzipSize = require('gzip-size');
const packageJson = require('../package.json');

const bowerRepo = 'https://github.com/featureflow/featureflow-client-bower.git';
const bowerTempPath = '_bower';

if (inInstall()) {
  process.exit(0);
}

function exec(command) {
  execSync(command, { stdio: 'inherit' });
}

exec('npm run build');

exec('rm -rf '+bowerTempPath);
exec('git clone '+bowerRepo+' '+bowerTempPath);
exec('cp dist/* '+bowerTempPath);
exec('cd '+bowerTempPath+' ' +
  '&& git add . ' +
  '&& git commit -m \"v'+packageJson.version+'" ' +
  '&& git tag '+packageJson.version+' ' +
  '&& git push origin master' +
  '&& rm -rf '+bowerTempPath);

