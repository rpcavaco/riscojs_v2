
import {GlobalConst} from './constants.js';

export class I18n {
	msgs;

	static capitalize(p_str) {
		return p_str.charAt(0).toUpperCase() + p_str.slice(1);
	}

	constructor(opt_msgs_source) {
		if (opt_msgs_source) {
			this.msgs = opt_msgs_source;		
		} else {
			this.msgs = {
				"deflang": "pt",
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
	getLang() {
		let langstr = navigator.language || navigator.userLanguage;
		let reallang, lang = langstr.substring(0,2);

		if (this.msgs[lang] === undefined) {
			if (this.msgs["deflang"] === undefined) {
				reallang = "en";
			} else {
				reallang = this.msgs["deflang"];
			}
			if (GlobalConst.getDebug("I18N"))
				console.info(`browser lang not found '${lang}', defaulting to '${reallang}'`);
			lang = "en";
		} else {
			reallang = lang;
			if (GlobalConst.getDebug("I18N"))
				console.info("[DBG:I18N] using browser lang:", reallang);
		}
		
		return reallang;
	}

	msg(p_msgkey, b_capitalize) {

		let ret = "";		
		let reallang = this.getLang();

		if (this.msgs[reallang] !== undefined && this.msgs[reallang][p_msgkey] !== undefined) {
			
			ret = this.msgs[reallang][p_msgkey];

			if (b_capitalize) {
				ret = this.constructor.capitalize(ret);
			}	
		}

		return ret;
	}
}

