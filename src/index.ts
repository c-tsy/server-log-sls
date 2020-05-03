import * as ALI from 'aliyun-sdk';
import * as os from 'os'
import { env } from 'process'
let hostname = env.HOSTNAME || os.hostname();
let logCache = [];
let sls = {

};
export default function slsdefault(conf) {
    return new AliSLS(conf);
}
export class AliSLS {
    constructor(config: any) {
        if (
            !config.accessKeyId
            || !config.secretAccessKey
        ) {
            throw new Error('Error accessKeyId or secretAccessKey,looking for https://github.com/aliyun-UED/aliyun-sdk-js/blob/master/samples/sls/sls.js')
        }
        if (!config.projectName) {
            throw new Error('Error projectName')
        }
        if (!config.logStoreName) {
            throw new Error('Error logStoreName')
        }
        if (!config.topic) {
            throw new Error('Error topic')
        }
        var sls = new ALI.SLS({
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            // "securityToken": "tokens",
            endpoint: config.endpoint || 'https://cn-hangzhou-intranet.log.aliyuncs.com',

            // 这是 sls sdk 目前支持最新的 api 版本, 不需要修改
            apiVersion: '2015-06-01'

            , httpOptions: {
                timeout: 1000  //1sec, 默认没有timeout
            }
        });
        if (config.hostname) {
            hostname = config.hostname;
        }
        setInterval(() => {
            if (logCache.length > 0) {
                sls.putLogs({
                    projectName: config.projectName,
                    logStoreName: config.logStoreName,
                    logGroup: {
                        logs: logCache,
                        topic: config.topic || 'apilog',
                        // server: hostname,
                        source: hostname
                    }
                }, (err, data) => {
                    if (err) {
                        console.error(err);
                    }
                    // console.log(data, err);
                })
                logCache = [];
            }
        }, config.interval || 3000);
    }
    put(data: any) {
        let d = {
            contents: Object.keys(data).map((v: string) => {
                return {
                    key: v,
                    value: 'object' == typeof data[v] ? JSON.stringify(data[v]) : ('number' == typeof data[v] ? data[v].toString() : (undefined === data[v] ? '' : data[v]))
                }
            }),
            time: Math.floor(data.etime / 1000),
        }
        logCache.push(d);
    }
}