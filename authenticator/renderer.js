// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var ById = function (id) {
    return document.getElementById(id);
}
var path = require('path');
var uuid = require('uuid');
var { session } = require('electron').remote;
var fs = require("fs");
const { ipcRenderer } = require('electron');
var view = ById('view');
const {SESSION_ID_FILE} = require('../constants');

view.setAttribute("src", process.env.LUMINATE_URL);


function updateNav (event) {
    const cookies = session.defaultSession.cookies;

    cookies.get(
        {},
        (error, result) => {
            result.forEach((c) => {
                if (c.name === 'ACCEZZIOCOOKIE') {
                    console.log(`Saved session id to ${SESSION_ID_FILE}`);
                    fs.writeFileSync(SESSION_ID_FILE, c.value);
                    ipcRenderer.sendSync('login-success', true);
                    return;
                }
            });
        }
    )
}

view.addEventListener('dom-ready', updateNav);
