# 第三方组件声明

## SheetJS (xlsx.full.min.js)

| 项目 | 说明 |
| --- | --- |
| 文件 | `vendor/xlsx.full.min.js` |
| 版本 | 0.20.3 |
| 来源 | <https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js> |
| 许可 | Apache License 2.0，版权归 SheetJS LLC |
| 许可全文 | [`LICENSE.sheetjs.txt`](./LICENSE.sheetjs.txt) |
| 用途 | 用户点击「备份 / 恢复」时按需加载，在浏览器本地读写 Excel，不上传任何数据 |

该文件未经修改原样分发。页面优先加载此本地副本（完全离线可用）；仅在用户单独拷走 `index.html`、本地文件缺失时，回落到官方 CDN。
