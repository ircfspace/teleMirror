const path = require('path');
const packageJson = require('../package.json');

const appConfig = {
    app: {
        name: packageJson.name,
        title: packageJson.productName || packageJson.name,
        description: packageJson.description,
        version: packageJson.version
    },
    server: {
        port: 9876,
        host: 'localhost'
    },
    window: {
        width: 900,
        height: 600,
        resizable: false,
        icon: 'assets/teleMirror.png'
    },
    paths: {
        mainHtml: 'renderer/telegram-ui.html',
        preload: 'preload.js',
        icon: path.join(__dirname, '..', 'assets', 'teleMirror.png')
    },
    csp: {
        defaultSrc: "'self'",
        scriptSrc: "'self' 'unsafe-inline'",
        styleSrc: "'self' 'unsafe-inline' https://fonts.googleapis.com",
        fontSrc: 'https://fonts.gstatic.com',
        connectSrc: "'self' http://localhost:9876",
        imgSrc: "'self' data: https://cdn1.telesco.pe https://cdn2.telesco.pe https://cdn3.telesco.pe https://cdn.telesco.pe https://t.me"
    }
};

module.exports = appConfig;
