console.log('Hello World!!!!!');

require('dotenv').config();

const fs = require('fs');
const https = require('https');
const path = require('path');
const nodeJose = require('node-jose');

const hostname = process.env.HOSTNAME;
const resource = "/cofds-web/v1/datainfo"
const userId = process.env.USER_ID;
const password = process.env.PASSWORD;
const pfx = getFileContent(process.env.CERTIFICATE_BUNDLE_FILE, false);
const passphrase = process.env.CERTIFICATE_BUNDLE_PASSPHRASE;

const MLEserver = getFileContent(process.env.MLE_SERVER_CERT_FILE);
const MLEPrivateKey = getFileContent(process.env.MLE_PRIVATE_KEY_FILE);
const encryptionKey = process.env.ENCRYPTION_KEY;

function getFileContent(filename, utf8 = true) {
    const cert_path = process.env.CERTIFICATES_PATH;
    const file = path.join(path.resolve(''), cert_path, filename);
    return utf8 ? fs.readFileSync(file, 'utf8') : fs.readFileSync(file);
}

async function createEncryptedPayload(payload) {
    let payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let keystore = nodeJose.JWK.createKeyStore();
    let encProps = {
        kid: encryptionKey,
        alg: 'RSA-OAEP-256',
        enc: 'A128GCM'
    };
    let encryptionCert = MLEserver;
    return keystore.add(encryptionCert, 'pem', encProps)
        .then(async (key) => {
            return nodeJose.JWE.createEncrypt({
                format: 'compact',
                fields: {
                    'enc': 'A128GCM',
                    'iat': Date.now()
                }
            }, key)
                .update(payloadString)
                .final()
                .then((result) => {
                    return { encData: result };
                });
        });
}

async function fetchDecryptedPayload(encryptedPayloadString) {
    let encryptedPayload = typeof encryptedPayloadString == 'string' ? JSON.parse(encryptedPayloadString) : encryptedPayloadString;
    let keystore = nodeJose.JWK.createKeyStore();
    let decProps = {
        kid: encryptionKey,
        alg: 'RSA-OAEP-256',
        enc: 'A128GCM'
    };
    let decryptionKey = MLEPrivateKey;
    return keystore.add(decryptionKey, 'pem', decProps)
        .then(async (key) => {
            return nodeJose.JWE.createDecrypt(key)
                .decrypt(encryptedPayload.encData)
                .then((result) => {
                    return result;
                });
        });
}

const payload = {
    "requestHeader": {
        "requestMessageId": "6da6b8b024532a2e0eacb1af58581",
        "messageDateTime": "2020-04-17 14:08:45.546"
    },
    "requestData": {
        "pANs": [
            4072208010000000
        ],
        "group": "STANDARD"
    }
}

async function GetData() {
    const body = await createEncryptedPayload(payload);
    var options = {
        hostname,
        port: 443,
        path: resource,
        method: 'POST',
        pfx,
        passphrase,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + Buffer.from(userId + ':' + password).toString('base64'),
            'keyId': encryptionKey
        },
    };

    let req = https.request(options, async (res) => {
        let resp = '';
        res.on('data', (data) => {
            resp += data.toString();
        });
        res.on('end', async () => {
            console.log(`Status: ${res.statusCode}`);
            const decryptedPayload = await fetchDecryptedPayload(resp);
            console.log(JSON.parse(decryptedPayload.plaintext));
        })
    });

    req.write(JSON.stringify(body));

    req.on('error', (err) => {
        console.log(`ERROR: ${err}`);
    });
    req.end();
}

GetData();
