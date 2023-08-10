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
};

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

        if (req.blockChainService.isStatusError()) {
            console.log("區塊鏈交互發生異常，請洽管理員。");
            return res.sendStatus(200);
        }

        const id = req.body.message.chat.id;
        if (id != 'YOU-ALLOW-TELEGRAM-ID') {
            console.log("非核准帳號，請洽管理員。");
            return res.sendStatus(200);
        }

        if (req.body.message.document != undefined) {
            if (!progressing.ok) {
                await sendMessage(id, progressing.message);
                return res.sendStatus(200);
            }
            progressing.ok = false;
            const message = await req.blockChainService.uploadList(req.body.message.document);
            progressing.ok = true;
            await sendMessage(id, message);
            return res.sendStatus(200);
        }

        const command = req.body.message.text;
        const isProgressCommand = command == "/checklist" || command == "/sendtoken" || command == "/removelist";
        if (isProgressCommand && !progressing.ok) {
            await sendMessage(id, progressing.message);
            return res.sendStatus(200);
        }

        let message = "";
        switch (command) {
            case "/checkbalance":
                message = await req.blockChainService.checkBalance();
                break;
            case "/checklist":
                progressing.ok = false;
                message = req.blockChainService.checkList();
                progressing.ok = true;
                break;
            case "/sendtoken":
                progressing.ok = false;
                message = await req.blockChainService.sendToken();
                progressing.ok = true;
                break;
            case "/removelist":
                progressing.ok = false;
                message = req.blockChainService.removeList();
                progressing.ok = true;
                break;
            case "/checkmyid":
                message = `您的ID是[${id}]，請通知管理員獲得權限。`;
                break;
            default:
                message = "不支援的指令。";
        }
        await sendMessage(id, message);
        return res.sendStatus(200);
    });

    https.createServer(options, app).listen(port, () => {
        console.log(`Here is your secret token ${secret}`);
        console.log(`App listening on port ${port}`);
    });
}

main();