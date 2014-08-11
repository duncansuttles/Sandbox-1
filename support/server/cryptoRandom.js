
exports.random = function()
{
	var buf = require('crypto').randomBytes(4);
	return buf.readUInt32LE(0)/4294967296;
}