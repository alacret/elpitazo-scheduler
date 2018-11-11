require('dotenv').config();

module.exports = {
    DIGITAL_OCEAN_OAUTH_TOKEN: process.env.DIGITAL_OCEAN_OAUTH_TOKEN,
    SECRET: process.env.SECRET,
    API_URL: process.env.API_URL,
    DROPLET_NAME: process.env.DROPLET_NAME,
    GITHUB_API_URL: process.env.GITHUB_API_URL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
};
