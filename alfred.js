const alfy = require('alfy');
const luminate = require("./luminate");
const logger = require("./logger");

const maxResults = 10;


function getSshAccount(app) {
    if (!app || !app.effectiveSecurityRole || !app.effectiveSecurityRole.customSshUserAccounts || !app.effectiveSecurityRole.customSshUserAccounts[0]) {
        return "";
    }

    return app.effectiveSecurityRole.customSshUserAccounts[0].name;
}

function formatApplicationForAlfred(app) {
    let arg = "";
    let text = app.url;
    let valid = false;

    switch (app.type) {
        case "HTTP": {
            arg = app.url;
            text = app.url;
            valid = true;
            break;
        }
        case "SSH": {
            arg = `ssh://${getSshAccount(app)}@${app.name}@${app.url}`;
            text = `ssh ${arg}`;
            valid = true;
            break;
        }
    }

    return {
        "uid": app.id,
        "type": "file",
        "title": app.name,
        "valid": valid,
        "subtitle": `[${app.type}] ${app.url}`,
        "arg": arg,
        "match": app.name,
        "autocomplete": app.name,
        "text": {
            "copy": text,        
        },
        "icon": {
            //"type": "fileicon",
            "path": app.icon,
        }
    }
}

function formatAppsForAlfred(apps) {
    return apps.map((app) => formatApplicationForAlfred(app));
}

const filter = process.argv[2];
//alfy.log("Filter: " + filter)
(async () => {
    try {
        await luminate.authenticateToLuminate();
    }
    catch(e) {
        alfy.error("Failed authenticating to luminate: " + JSON.stringify(e));
        process.exit(1);
    }

    try {
        let apps = await luminate.getApplications();
        if (filter && apps) {
            apps = apps.filter((a) => a.type.toLowerCase() === filter);
        }

        let formattedApps = formatAppsForAlfred(apps);
        alfy.output(formattedApps);
    } catch (e) {
        alfy.error("Failed fetching applications. Error: " + JSON.stringify(e));
    }
})();

