/**
 * 校验字符串是否为空
 * @param {Object} str
 */
export function isBlank(data) {
	return data == null || "" == data.toString().replace(/^\s*|\s*$/g, "") || typeof data == undefined;
}

function isDate(value) {
	return Object.prototype.toString.call(value) === '[object Date]'
}