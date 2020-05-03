```typescript
import TSYLog from '@ctsy/server-log';
server.use(TSYLog.use('@ctsy/server-log-sls', {
    "accessKeyId": "",
    "secretAccessKey": "",
    projectName: '',
    logStoreName: '',
    endpoint: 'https://cn-hangzhou.log.aliyuncs.com',
    topic: 'reqlog',
}))
```