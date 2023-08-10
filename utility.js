const crypto = require("crypto");
const axios = require('axios');
const baseURL = 'https://api.telegram.org/';
const botToken = "YOUR-TELEGRAM-BOT-TOKEN";

function createSerect() {
    return 'telegramtoken2023_' + crypto.randomUUID();
}

async function setWebHook(server_url, token) {
    if (typeof server_url === 'string' && server_url.length === 0) {
        return false;
    }

    try {
        const response = await axios.post(baseURL + botToken + '/setwebhook', {
            url: server_url,
            secret_token: token
        });

        if (response.data.ok === true && response.data.result === true) {
            return true;
        }
        return false;
    } catch (error) {
        console.error(`setWebHook failed. error_code:${error.response.data.error_code}, reason:${error.response.data.description}`);
        return false;
    }
}

async function getFilePath(fileId) {
    try {
        const response = await axios.post(baseURL + botToken + '/getFile', { "file_id": fileId });

        const fileData = response.data;
        if (fileData.ok != true) {
            return false;
        }
        const fileUrl = `${baseURL}/file/${botToken}/${fileData.result.file_path}`;
        return fileUrl;
    } catch (error) {
        console.error('Error:', error.message);
        return false;
    }
}

async function getFile(fileUrl) {
    try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(response.data, 'binary');
        return fileBuffer;
    } catch (error) {
        console.error('Error:', error.message);
        return false;
    }
}

async function sendMessage(id, message) {
    try {
        const response = await axios.post(baseURL + botToken + '/sendMessage', { "chat_id": id, "text": message });

        if (response.data.ok === true) {
            console.log(`回傳訊息成功。ID:${id}、Message:${message}`);
            return;
        }

        console.log(`系統異常，回傳訊息失敗。ID:${id}、Message:${message}`);
    } catch (error) {
        console.error(`系統異常，回傳訊息失敗。error_code:${error.response.data.error_code}, reason:${error.response.data.description}`);
        return;
    }
}

module.exports = { createSerect, setWebHook, sendMessage, getFilePath, getFile };