let html2Escape = (strText) => {
	if(!strText){
		return ''
	}
	return strText.replace(/[<>&"]/g, function (c) {
		return {
			'<': '&lt;',
			'>': '&gt;',
			'&': '&amp;',
			'"': '&quot;'
		}[c];
	});
}

export default {
	html2Escape
}