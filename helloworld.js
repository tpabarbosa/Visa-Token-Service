console.log('Hello World!!!!!');

require('dotenv').config();

const fs = require('fs');
const https = require('https');
const path = require('path');

const hostname = process.env.HOSTNAME;
const resource = "/vdp/helloworld";
const userId = process.env.USER_ID;
const password = process.env.PASSWORD;
const pfx = getFileContent(process.env.CERTIFICATE_BUNDLE_FILE);
const passphrase = process.env.CERTIFICATE_BUNDLE_PASSPHRASE;

function getFileContent(filename) {
    const cert_path = process.env.CERTIFICATES_PATH;
    const file = path.join(path.resolve(''), cert_path, filename);
    return fs.readFileSync(file);
}

async function HelloWorld() {
    var options = {
        hostname,
        port: 443,
        path: resource,
        method: 'GET',
        pfx,
        passphrase,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(userId + ':' + password).toString('base64'),
        },
    };

    let req = https.request(options, (res) => {
        res.on('data', async (data) => {
            console.log(data.toString());
            console.log(`Status: ${res.statusCode}`);
        });

    });

    req.on('error', (err) => {
        console.log(`ERROR: ${err}`);
    });
    req.end();
}

HelloWorld();
