import * as ALI from 'aliyun-sdk';
import * as os from 'os'
import { env, on } from 'process'
import TSYLog from '@ctsy/server-log'
import * as moment from 'moment'
let hostname = env.HOSTNAME || os.hostname();
let logCache = [];
let sls = {

};
export default function slsdefault(conf) {
    return new AliSLS(conf);
}
export class AliSLS {
    config: any = {}
    sls: any;
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
        this.config = config;
        this.sls = sls;
        if (config.hostname) {
            hostname = config.hostname;
        }
        on('beforeExit', () => {
            this.sync()
        })
        setInterval(() => {
            this.sync()
        }, config.interval || 3000);
    }
    sync() {
        if (logCache.length > 0) {
            let lc = [...logCache]
            this.sls.putLogs({
                projectName: this.config.projectName,
                logStoreName: this.config.logStoreName,
                logGroup: {
                    logs: logCache,
                    topic: this.config.topic || 'apilog',
                    // server: hostname,
                    source: hostname
                }
            }, (err, data) => {
                if (err) {
                    console.error(err);
                    console.log(JSON.stringify(lc));
                }
                // console.log(data, err);
            })
            logCache = [];
        }
    }

    async write(datas: TSYLog.ClassEventLog[]) {
        for (let data of datas) {
            data.Time = Math.floor(Date.now() / 1000);
            let d = {
                contents: Object.keys(data).map((v: string) => {
                    return {
                        key: v,
                        value: 'object' == typeof data[v] ? JSON.stringify(data[v]) : (['number', 'boolean'].includes(typeof data[v]) ? data[v].toString() : (undefined === data[v] ? '' : data[v].toString()))
                    }
                }),
                time: (Date.now() / 1000).toFixed(0)
            }
            logCache.push(d);
        }
    }

    async read(data: TSYLog.SearchWhere): Promise<TSYLog.SearchResult<TSYLog.ClassEventLog>> {
        let stime = Number(moment(data.W.STime || '2020-05-01 00:00:00').unix().toFixed(0));
        let etime = Number(moment(data.W.ETime || Date.now()).unix().toFixed(0));
        let rs: any = await new Promise((s, j) => {
            this.sls.getLogs({
                //必选字段 
                projectName: this.config.projectName,
                logStoreName: this.config.logStoreName,
                from: stime, //开始时间(精度为秒,从 1970-1-1 00:00:00 UTC 计算起的秒数)
                to: etime,    //结束时间(精度为秒,从 1970-1-1 00:00:00 UTC 计算起的秒数)

                //以下为可选字段
                topic: this.config.topic || 'apilog',      //指定日志主题(用户所有主题可以通过listTopics获得)
                reverse: false,//是否反向读取,只能为 true 或者 false,不区分大小写(默认 false,为正向读取,即从 from 开始到 to 之间读取 Line 条)
                query: (data.Keyword || '') + '*',    //查询的关键词,不输入关键词,则查询全部日志数据
                line: data.N || 100,   //读取的行数,默认值为 100,取值范围为 0-100
                offset: (data.P - 1) * data.N   //读取起始位置,默认值为 0,取值范围>0
            }, (err, data) => {
                if (err) {
                    j(err);
                    return;
                }
                s(data);
            })
        })

        let p = new TSYLog.SearchResult<TSYLog.ClassEventLog>()
        p.P = data.P || 0;
        p.N = data.N || 100;
        p.L = Object.values(rs.data);

        return p;

        // throw new Error('未实现')
    }

    async query(sql: string): Promise<any> {
        return await this.sls
        throw new Error('未实现')
    }

}