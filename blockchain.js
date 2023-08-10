const TronWeb = require('tronweb');
const selfAccount = "YOUR-BLOCKCHIAN-ADDRESS";
const privateKey = "YOUR-BLOCKCHIAN-PRIVATE-KEY-DONT-LEAK";
const mainNode = 'https://api.trongrid.io';
const tronWeb = new TronWeb(mainNode, mainNode, mainNode, privateKey)
const contractAddress = "YOUR-BLOCKCHIAN-CONTRACT-ADDRESS";
tronWeb.setHeader({ "TRON-PRO-API-KEY": 'YOUR-TRON-API-KEY' });
const { getFilePath, getFile } = require('./utility');
const readXlsxFile = require('read-excel-file/node')
const tronAddressPrefix = "YOUR-ADDRESS-PREFIX";

class BlochChainService {
    constructor() {
        this.datas = [];
        this.contract = null;
        this.loading = true;
        this.getContract();
    }

    async checkBalance() {
        try {
            let trxBalance = await tronWeb.trx.getBalance(selfAccount);
            let tokenBalance = await this.contract.methods.balanceOf(selfAccount).call();
            return `讀取成功，您的餘額如下。TRX:${tronWeb.fromSun(trxBalance).toString()}、TOKEN:${tokenBalance.toString()}`;
        } catch (e) {
            console.log(e);
            return "讀取餘額異常，請聯繫機器人開發者。";
        }
    }

    async uploadList(document) {
        if (this.progressing) {
            return "系統清單正在鎖定中，可能正在發送或是仍在新增清單，請收到確認消息後再嘗試。";
        }

        if (!this.isAllowMineType(document.mime_type)) {
            return "檔案格式不正確，只支援Excel(XLSX)的類型。";
        }

        if (!this.isAllowSize(document.file_size)) {
            return "檔案大小不正確，只支援50KB以下的檔案。";
        }

        const filePath = await getFilePath(document.file_id);
        if (!filePath) {
            return "無法從Telegram伺服器找到該檔案，請洽管理員。";
        }

        const file = await getFile(filePath);
        if (!file) {
            return "無法從Telegram伺服器下載檔案，請洽管理員。";
        }

        const analzyeResult = await this.analzyeXslx(file);
        if (!analzyeResult.ok) {
            return analzyeResult.message;
        }

        this.datas = this.datas.concat(analzyeResult.datas);
        const checkListResult = this.checkList();
        return "讀取資料成功。" + checkListResult;
    }

    async getContract() {
        this.contract = await tronWeb.contract().at(contractAddress);
        if (this.contract === undefined || this.contract === null) {
            console.log("讀取合約失敗，請檢查合約地址。");
            return;
        }

        console.log("讀取合約成功，現在可交易。");
        this.loading = false;
    }

    async sendToken() {
        if (this.datas.length == 0) {
            return "清單裡面沒有任何資料，請使用上傳清單來更新。";
        }

        let lastIndex = 0;
        let hasError = false;
        try {
            for (let index = 0; index < datas.length; index++) {
                lastIndex = index;
                let address = datas[index].address;
                let amonut = new BigNumber(datas[index].amount);
                let transferCount = new BigNumber(1000000000000000000n).multipliedBy(amonut).toFixed();
                await this.delay(200);
                const resp = await this.contract.methods.transfer(address, transferCount).send();
                if (resp === true) {
                    console.log("轉給「" + data[0] + "」的" + data[1] + "個代幣傳輸成功");
                } else {
                    console.log("轉給「" + data[0] + "」的" + data[1] + "個代幣已廣播");
                }
            }
        } catch (error) {
            hasError = true;
            console.log("合約執行異常" + error);
        }

        if (!hasError) {
            let totalAmount = this.datas.reduce((total, amount) => total + amount, 0);
            this.datas = [];
            return `資料 ${this.datas.length} 筆、共計 ${totalAmount} 枚代幣已發送成功，將自動清除清單。`;
        }

        if (lastIndex > 0) {
            this.datas = this.datas.slice(lastIndex);
        }

        return `${this.datas[0].address} 發送失敗，可能是TRX或是TOKEN不足，請查詢後再發送。在此之前的項目均已發送完畢。`;
    }

    async analzyeXslx(file) {
        let result = {
            ok: false,
            message: '',
            datas: [],
        }

        let rows = await readXlsxFile(file);

        for (let index = 0; index < rows.length; index++) {
            const info = this.tryGetTransferInfo(rows[index]);

            if (info.address == null && info.amount == null) {
                result.message = `表格檔案第[${index + 1}]有問題。`;
                return result;
            }

            if (info.address == null && info.amount != null) {
                continue;
            }

            if (!tronWeb.isAddress(info.address)) {
                result.message = `表格檔案第[${index + 1}]的地址${info.address}有問題。`;
                return result;
            }

            result.datas.push({
                address: info.address,
                amount: info.amount
            });
        }

        result.ok = true;
        return result;
    }

    checkList() {
        let totalAmount = this.datas.reduce((total, data) => total + data.amount, 0);
        return `清單內共有資料 ${this.datas.length} 筆、共計需要 ${totalAmount} 枚代幣。`;
    }

    tryGetTransferInfo(row) {
        let result = {
            address: null,
            amount: null,
        }

        row.forEach(cell => {
            if (cell == null) {
                return;
            }

            if (!isNaN(cell)) {
                result.amount = Math.abs(cell);
                return;
            }

            if (typeof cell === 'string' && cell.length === 0) {
                return;
            }

            if (cell.charAt(0) === 'T') {
                result.address = cell;
                return;
            }

            if (cell.startsWith(tronAddressPrefix)) {
                result.address = cell.substring(tronAddressPrefix.length);
            }
        });

        return result;
    }

    tryGetAmount(data) {

        return null;
    }

    removeList() {
        this.datas = [];
        return "清單內容已清除。";
    }

    isStatusError() {
        return this.loading;
    }

    isAllowMineType(mineType) {
        return mineType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    isAllowSize(fileSize) {
        return fileSize <= 50 * 1000;
    }

    delay(n) {
        return new Promise(function (resolve) {
            setTimeout(resolve, n);
        });
    }
}

module.exports = BlochChainService;