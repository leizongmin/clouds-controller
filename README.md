# clouds-controller

[![Greenkeeper badge](https://badges.greenkeeper.io/leizongmin/clouds-controller.svg)](https://greenkeeper.io/)
clouds模块（https://github.com/leizongmin/clouds ）的可选控制器

## 安装

```bash
$ npm install clouds-controller --save
```


## 使用

### 1、配置`clouds`客户端

```javascript
var clouds = require('clouds');
var cloudsController = require('clouds-controller');


var client = new clouds.Client({
  // 配置clouds-controller的connection
  connection: cloudsController.createConnection({
    port: 6480,
    host: '127.0.0.1'
  }),
  // 调用超时时间，如果服务器超过指定时间没有响应结果，则认为调用失败，单位：秒
  timeout: 2
});


var server = new clouds.Server({
  // 配置clouds-controller的connection
  connection: cloudsController.createConnection({
    port: 6480,
    host: '127.0.0.1'
  }),
  // 心跳周期，如果服务器端异常下线，超过指定时间将自动从服务器端删除，单位：秒
  heartbeat: 2
});
```

主要是在初始化客户端时传递一个`connection`参数来指定`clouds-controller`的连接，详细使用方法可参考`clouds`模块的文档。

### 2、启动`clouds-controller`服务器

可以编写以下代码来启动：

```javascript
var cloudsController = require('clouds-controller');

var server = cloudsController.createServer();
server.listen(6480, '127.0.0.1');
```

也可以通过安装`clouds-controller`命令来启动：

```bash
$ npm install clouds-controller -g
```

```bash
$ clouds-controller -h 127.0.0.1 -p 6480
```


## Coverage

```bash
$ ./run_coverage
```

91% coverage, 442 SLOC


## Tests

```bash
$ ./run_test
```


## License

```
The MIT License (MIT)

Copyright (c) 2015 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
