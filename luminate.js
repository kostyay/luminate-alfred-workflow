const { spawn } = require('child_process');
const request = require('request-promise-native');
const fs = require('fs');
const path = require('path');
const {SESSION_ID_FILE} = require('./constants');

const appsCacheFile = "apps.json";
const iconFolder = "icons";
const logger = require("./logger");
const perPage = 50;
const refreshEveryXSeconds = 60*60;

async function checkSessionValid() {
    const sessionId = getSessionCookieValue();
    if (!sessionId) {
        return false;
    }

    const appsUrl = `${getLuminateUrl()}/accezz-userinfo`;
    const options = {
        method: 'GET',
        uri: appsUrl,
        followAllRedirects: false,
        followRedirect: () => false,
        resolveWithFullResponse: true,
        json: true,
        headers: {
            'Cookie': `ACCEZZIOCOOKIE=${sessionId}`,
            'Accept': 'application/json',
        }
    }

    try {
        let result = await request(options);
        return true;
    } catch (e) {
        return false;
    }
}

function saveIcon(appId, encodedIcon) {
    if (!encodedIcon) {
        return null;
    }

    let imageBuffer = new Buffer.from(encodedIcon, 'base64');
    let strippedImageBuffer = imageBuffer.toString().replace("data:image/png;base64,", "");
    let strippedImage = new Buffer.from(strippedImageBuffer, "base64");

    if (!fs.existsSync(iconFolder)) {
        fs.mkdirSync(iconFolder);
    }

    const basePath = path.resolve(__dirname);
    const targetFilename = path.join(basePath, iconFolder, `${appId}.png`);
    try { 
        fs.writeFileSync(targetFilename, strippedImage);
        return targetFilename;
    } catch (e) {
        logger.error("Failed savin icon", e);
        return null;
    }
}

function shouldFetchAppsAgain() {
    if (!fs.existsSync(appsCacheFile)) {
        return true;
    }

    let stats = fs.statSync(appsCacheFile);
    let seconds = (new Date().getTime() - stats.mtime) / 1000;
    logger.log(`shouldFetchAgain: ${seconds} > ${refreshEveryXSeconds}`);
    return (seconds > refreshEveryXSeconds);
}

async function getApplications(forceRefresh) {
    const shouldFetch = shouldFetchAppsAgain() || forceRefresh == true;

    if (!shouldFetch) {
        return JSON.parse(fs.readFileSync(appsCacheFile));
    }

    const sessionId = getSessionCookieValue();
    if (sessionId === null) {
        logger.warn("No session id is set");
        return null;
    }

    let currentPage = 0;
    let done = false;
    let applications = [];
    while (!done) {
        let result = await getApplicationPage(currentPage);

        if (!result) {
            logger.warn("Got no results");
            return applications;
        }

        applications = applications.concat(result.apps);

        if (result.totalPages > currentPage + 1) {
            currentPage++;
        } else {
            logger.log("Reached last page")
            done = true;
        }
    }

    logger.log(`Fetched all applications, len=${applications.length}`);

    fs.writeFileSync(appsCacheFile, JSON.stringify(applications));

    return applications;
}

async function getApplicationPage(page) {
    const sessionId = getSessionCookieValue();

    if (!page) {
        page = 0;
    }

    const appsUrl = `${getLuminateUrl()}/v1/user-settings/folders/home/applications?sort=name%2Casc&size=${perPage}&page=${page}`;
    const options = {
        method: 'GET',
        uri: appsUrl,
        json: true,
        headers: {
            'Cookie': `ACCEZZIOCOOKIE=${sessionId}`
        }
    }

    try {
        logger.debug(`Fetching ${appsUrl}; page=${page}`);
        let result = await request(options);
        logger.debug(`Got response, contentLength=${result.content.length}`);

        let allApps = result.content.map((app) => {
            const appIcon = saveIcon(app.application.id, app.application.icon);

            return {
                id: app.application.id,
                name: app.application.name,
                icon: appIcon,
                url: app.application.url,
                type: app.application.type,
                description: app.application.description,
                effectiveSecurityRole: app.effectiveSecurityRole,
            }
        });

        return { apps: allApps, totalPages: result.totalPages }
    } catch (e) {
        logger.error("Failed fetching applications, statusCode: " + e);
        
        return null;
    }
}

function getLuminateUrl() {
    return process.env.LUMINATE_URL;
}

function isSessionValid() {
    const sessionId = getSessionCookieValue();
    if (sessionId === null) {
        return false;
    }
}

function getSessionCookieValue() {
    try {
        return fs.readFileSync(SESSION_ID_FILE).toString().trim();
    } 
    catch {
        return null;
    }
}

async function startLuminateAuthenticator() {
    return new Promise((resolve, reject) => {
        let electronPath = path.resolve(__dirname, 'node_modules/.bin/electron');
        let authenticatorPath = path.resolve(__dirname, "./authenticator/luminate-authenticator.js");
        logger.log(`Launching electron: ${electronPath} ${authenticatorPath}`);
        let authenticator = spawn("/usr/local/bin/node", [electronPath, authenticatorPath], {
                    cwd: path.resolve(__dirname),
                    env: { LUMINATE_URL: process.env.LUMINATE_URL }
                });
        authenticator.on('error', (err) => {
            logger.error("Failed launching authenticator", err);
        })
        authenticator.on('close', (code) => {
            if (code == 0) {
                resolve();
            } else {
                reject(`Invalid status code: ${code}`);
            }
        })
    });
}
async function authenticateToLuminate() {
    const isValidSession = await checkSessionValid();
    if (isValidSession) {
        return true;
    }

    logger.log("Going to authenticate to luminate");

    return startLuminateAuthenticator();
}

module.exports = {
    getApplications,
    authenticateToLuminate,
    SESSION_ID_FILE,
};