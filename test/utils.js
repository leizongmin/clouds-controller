// 生成一个不冲突的端口号
var port = 6480;
exports.genPort = function () {
  return port++;
};
