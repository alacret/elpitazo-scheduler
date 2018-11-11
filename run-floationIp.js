const ips = require('./modules/floatingIp');
const LOG = require('logger').createLogger();

ips.generate().then(r => LOG.info(r)).catch(err => {
    LOG.error(err);
    process.exit(1);
});
