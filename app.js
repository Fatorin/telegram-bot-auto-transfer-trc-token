const express = require('express');
const helmet = require('helmet');
const fs = require('fs');
const https = require('https');
const app = express();
const port = 8443;
const { setWebHook, createSerect, sendMessage } = require('./utility');
const BlockChainService = require('./blockchain');
const secretHeader = 'X-Telegram-Bot-Api-Secret-Token';
const secret = createSerect();
const progressing = { ok: true, message: "現在正在執行清單相關的操作，請等待執行完再試一次。" };
const blockChainService = new BlockChainService();
const options = {
    key: fs.readFileSync(__dirname + '/server.key', 'utf8'),
    cert: fs.readFileSync(__dirname + '/server.crt', 'utf8'),
    admin: [1234567890],
};

if (options.admin.length < 1) {
    console.log("Failed to read admin list.");
    return;
}

async function main() {
    let setWebhookResult = await setWebHook("YOUR-BACKEND-URL", secret);

    if (!setWebhookResult) {
        console.log("Failed to set webhook");
        return;
    }

    app.use(express.json());
    app.use(helmet());
    app.use((req, res, next) => {
        req.blockChainService = blockChainService;
        next();
    });

    app.post('/telegramhook', async (req, res) => {
        var secret_token = req.header(secretHeader);
        if (secret_token == undefined) {
            console.log("not found target header");
            return res.sendStatus(200);
        }

        if (secret_token != secret) {
            console.log("secret token invalid");
            return res.sendStatus(200);
        }

        let message = "已收到指令，正在處理中。";
        const id = req.body.message.chat.id;

        if (req.blockChainService.isStatusError()) {
            message = "區塊鏈交互發生異常，請洽管理員。";
            await sendMessage(id, message);
            return res.sendStatus(200);
        }

        if (!options.admin.includes(id)) {
            console.log("非核准帳號，請洽管理員。");
            message = `您的ID是[${id}]，請通知管理員獲得權限。`;
            await sendMessage(id, message);
            return res.sendStatus(200);
        }

        if (req.body.message.document != undefined) {
            req.blockChainService.startRequest("/uploadList", id, req.body.message.document);
            await sendMessage(id, message);
            return res.sendStatus(200);
        }

        const command = req.body.message.text;
        req.blockChainService.startRequest(command, id);
        await sendMessage(id, message);
        return res.sendStatus(200);
    });

    https.createServer(options, app).listen(port, () => {
        console.log(`Here is your secret token ${secret}`);
        console.log(`App listening on port ${port}`);
    });
}

main();