import i18n from '@/i18n';

const COMPLAINT_TYPE = [{
	val: 1,
	name: 'complaint.harassment'
}, {
	val: 2,
	name: 'complaint.fraud'
}, {
	val: 3,
	name: 'complaint.badContent'
}, {
	val: 99,
	name: 'complaint.other'
}]


const toI18n = (dictType) => {
	// 对字典进行语言翻译，结构保持不变
	return dictType.map(item => ({
		val: item.val,
		name: i18n.t(item.name)
	}));
};

const covertToName = (dictType, val, defName) => {
	let dictItem = dictType.find(item => item.val == val);
	return dictItem ? i18n.t(dictItem.name) : defName;
}

export {
	COMPLAINT_TYPE,
	covertToName,
	toI18n
}