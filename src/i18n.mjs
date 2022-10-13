
import {GlobalConst} from './constants.js';

export class I18n {
	constructor() {
		this.msgs = {
			"pt": {
				"ESCL": "escala"
			}, 
			"en": {
				"ESCL": "scale"
			}
		};		
	}
	msg(p_msgkey, b_capitalize) {
		let langstr = navigator.language || navigator.userLanguage;
		let ret, lang = langstr.substring(0,2);		
		if (this.msgs[lang] === undefined) {
			if (GlobalConst.getDebug("I18N"))
				console.info(`browser lang not found ${lang}, defaulting to 'en'`);
			lang = "en";
		} else {
			if (GlobalConst.getDebug("I18N"))
				console.info("using browser lang:", lang);
		}
		
		ret = this.msgs[lang][p_msgkey];

		if (b_capitalize) {
			ret = ret.charAt(0).toUpperCase() + ret.slice(1);
		}

		return ret;
	}
}

