
import {GlobalConst} from './constants.js';

export class I18n {
	msgs;
	constructor(opt_msgs_source) {
		if (opt_msgs_source) {
			this.msgs = opt_msgs_source;		
		} else {
			this.msgs = {
				"pt": {
					"ESCL": "escala",
					"LDNG": "a carregar"
				}, 
				"en": {
					"ESCL": "scale",
					"LDNG": "loading"
				}
			};					
		}
	}
	msg(p_msgkey, b_capitalize) {
		let langstr = navigator.language || navigator.userLanguage;
		let ret = "", lang = langstr.substring(0,2);		

		if (this.msgs[lang] === undefined) {
			if (GlobalConst.getDebug("I18N"))
				console.info(`browser lang not found ${lang}, defaulting to 'en'`);
			lang = "en";
		} else {
			if (GlobalConst.getDebug("I18N"))
				console.info("[DBG:I18N] using browser lang:", lang);
		}
		
		if (this.msgs[lang] !== undefined && this.msgs[lang][p_msgkey] !== undefined) {
			
			ret = this.msgs[lang][p_msgkey];

			if (b_capitalize) {
				ret = ret.charAt(0).toUpperCase() + ret.slice(1);
			}	
		}

		return ret;
	}
}

