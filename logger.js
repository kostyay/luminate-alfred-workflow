const fs = require("fs");

const output = fs.createWriteStream('./luminate.log', {
    flags: "a"
});
const logger = new console.Console({
    stdout: output,
    stderr: output
});

module.exports = logger;