
import {GlobalConst} from './constants.js';

export class I18n {
	msgs;

	static capitalize(p_str) {
		return p_str.charAt(0).toUpperCase() + p_str.slice(1);
	}

	constructor(opt_msgs_source) {

		this.msgs = {
			"deflang": "pt",
			"pt": {
			}, 
			"en": {
			}
		};	
		
		if (opt_msgs_source) {
			let langelem;
			for (let langk in opt_msgs_source) {
				if (langk == "deflang") {
					continue;
				}
				langelem = opt_msgs_source[langk];
				for (let k in langelem) {
					this.msgs[langk][k] = langelem[k];		
				}
			}
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

		let ret = p_msgkey;		
		let reallang = this.getLang();

		if (this.msgs[reallang] !== undefined && this.msgs[reallang][p_msgkey] !== undefined) {

			ret = this.msgs[reallang][p_msgkey];

			if (b_capitalize) {
				ret = this.constructor.capitalize(ret);
			}	
		} else {
			if (b_capitalize) {
				ret = this.constructor.capitalize(p_msgkey);
			}
		}

		return ret;
	}
}

