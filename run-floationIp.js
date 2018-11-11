const ips = require('./modules/floatingIp');
const LOG = require('logger').createLogger();
const settings = require('./settings');

// ips.generate().then(r => LOG.info(r)).catch(err => {
//     LOG.error(err);
//     process.exit(1);
// });

ips.write().then(r => LOG.info(r)).catch(err => {
    LOG.error(err);
    process.exit(1);
});
