const r = require('request-promise');
const settings = require('../settings');
const LOG = require('logger').createLogger();
const crypto = require('crypto'),
    algorithm = 'aes-256-ctr';

const msleep = (n) => {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
};

const sleep = (n) => {
    msleep(n * 1000);
};

const createHeaders = (method, url, body = null) => {
    const basic = {
        method: method,
        uri: url,
        headers: {
            'Authorization': `Bearer ${settings.DIGITAL_OCEAN_OAUTH_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };
    if (body !== null) {
        basic.body = body;
        basic.json = true;
    }
    return basic;
};

const createGithubHeaders = (method, url, body = null) => {
    const basic = {
        method: method,
        uri: url,
        headers: {
            'Authorization': `token ${settings.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'v1 Automated Buddy engine'
        }
    };
    if (body !== null) {
        basic.body = body;
        basic.json = true;
    }
    return basic;
};

const createGist = async () => {
    const data = {
        "description": "My BirthDay",
        "public": true,
        "files": {
            "my-birthday.md": {
                "content": "NOT POPULATED YET"
            }
        }
    };

    let newGist = await r(createGithubHeaders('POST', `${settings.GITHUB_API_URL}/lpitaso/gists`));
    return newGist;
};

const encrypt = (text) => {
    const cipher = crypto.createCipher(algorithm, settings.SECRET);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

const decrypt = (text) => {
    const decipher = crypto.createDecipher(algorithm, settings.SECRET);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
};

/**
 * Write some text on github
 * @return {Promise<*>}
 */
const write = async (data) => {
    let result = await r(createGithubHeaders('GET', `${settings.GITHUB_API_URL}/lpitaso/gists`));
    let gists = JSON.parse(result);
    LOG.info("GISTS", gists);

    let gist;
    if (gists.length === 0)
        try {
            gist = await createGist();
        } catch (e) {
            LOG.info(`Unavailable to create gist: ${e.message}`);
            throw e;
        }
    else
        gist = gists[0];

    LOG.info(gist);
    LOG.info(gist.id);
    LOG.info(gist.url);

    const dat = {
        "description": String(new Date()),
        "files": {
            "my-birthday.md": {
                "content": data,
                "filename": "my-birthday.md"
            }
        }
    };

    result = await r(createGithubHeaders('PATCH', `${gist.url}`, dat));

    LOG.info(result);

    return "successfully writen";
}

module.exports = {
    /**
     * Generate N new floating IPS
     * @return {Promise<*>}
     */
    generate: async () => {
        let result = await r(createHeaders('GET', `${settings.API_URL}/v2/droplets`));
        let jsonResult = JSON.parse(result);

        const droplets = jsonResult["droplets"];

        const droplet = droplets.find(droplet => droplet.name === settings.DROPLET_NAME);
        if (droplet === undefined)
            throw new Error(`droplet ${settings.DROPLET_NAME} not found`);

        LOG.info(`Droplet: ${droplet.name}`);
        const dropletId = droplet.id;

        result = await r(createHeaders('GET', `${settings.API_URL}/v2/floating_ips`));
        jsonResult = JSON.parse(result);
        LOG.info(`Current Floating Ips:`, jsonResult);
        const currentFloatingIps = jsonResult["floating_ips"];
        LOG.info(`Current Floating Ips:`, currentFloatingIps);

        // DELETE Original Floating IP
        let floatingIp = currentFloatingIps.find(floatingIp => String(floatingIp.droplet.id) === String(dropletId));
        if (floatingIp !== undefined) {
            LOG.info("Trying to Delete old Floating IP:", floatingIp.ip);
            let headers = createHeaders('DELETE', `${settings.API_URL}/v2/floating_ips/${floatingIp.ip}`);
            try {
                await r(headers);
            } catch (err) {
                LOG.info(`Unavailable to delete a Floating IP: ${err.message}`);
            }
        }
        LOG.info(`Floating IP: ${floatingIp.ip} deleted... Creating a new one`);
        sleep(60); // We sleep giving the chance to digital ocean to fullfill the task
        // Creating new floating IP
        let options = createHeaders('POST', `${settings.API_URL}/v2/floating_ips`, {"droplet_id": dropletId});
        try {
            floatingIp = await r(options);
        } catch (err) {
            LOG.info(`Unavailable to create a new Floating IP: ${err.message}`);
            throw new Error(`Unavailable to create a new Floating IP: ${err.message}`);
        }

        LOG.info(`floating IP created:`, floatingIp);

        const ip = floatingIp.floating_ip.ip;
        LOG.info(`encrypting: ${ip} ...`);
        const encryptedIp = encrypt(ip);
        LOG.info(`DONE: ${ip} ...`);

        //TEST
        const decryptedIp = decrypt(encryptedIp);
        LOG.info("Testing cipher");
        if (decryptedIp !== encryptedIp) {
            LOG.info(`Somehting went wrong ciphering: ${encryptedIp} !=== ${decryptedIp}`);
        }

        await write(encryptedIp);

        return "Floating Ips created succesfully";
    }
};

