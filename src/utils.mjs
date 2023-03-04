
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';

export function uuidv4() {
    const hex = [...Array(256).keys()]
      .map(index => (index).toString(16).padStart(2, '0'));
  
    const r = crypto.getRandomValues(new Uint8Array(16));
  
    r[6] = (r[6] & 0x0f) | 0x40;
    r[8] = (r[8] & 0x3f) | 0x80;
    
    return [...r.entries()]
      .map(([index, int]) => [4, 6, 8, 10].includes(index) ? `-${hex[int]}` : hex[int])
      .join('');
}

export function getCookie(cname) {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(';');
	for(var i = 0; i <ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		} 
	}
	return "";
}

export function setCookie(p_name, p_value) {
	document.cookie = `${p_name}=${p_value};  SameSite=None; Secure`;
}

function collectTextLines(ppp_ctx, p_intext, p_maxlen, out_lines) {

	let test, tm, currline = '', slack;
	out_lines.length = 0;

	const infotipsbox_slack = GlobalConst.INFO_MAPTIPS_BOXSTYLE["infotipsbox_slack"];

	let tmp, pos, cnt=0, ready = false, words = p_intext.split(/\s+/);

	slack = infotipsbox_slack;
	while(!ready) {

		if (words.length == 1) {

			test = words[0].trim();
			tm = ppp_ctx.measureText(test);
			if (cnt > 0 ) {
				pos = Math.floor(p_maxlen / (tm.width + slack)) * test.length;
				if (pos < 2) {
					pos = 2;
				}
				tmp = test.substring(0, pos) + ' ' + test.substring(pos, test.length);
				words = tmp.split(/\s+/);
			} else {
				if (tm.width + slack <= p_maxlen) {
					out_lines.push((' ' + test).slice(1).trim());
					ready = true;
				} else {
					words.length = 0;
					tmp = test.replace(/([\._\-])([a-z0-9])/, "$1 $2");
					tmp = tmp.replace(/([a-z])([A-Z])/, "$1 $2");
					words = tmp.split(/\s+/);
				}
			}

			cnt++;

		} else {
			ready = true;
		}
	}

	if (out_lines.length == 0) {

		for (let word of words) {
			test = (currline + ' ' + word).trim();
			tm = ppp_ctx.measureText(test);
			if (tm.width + slack <= p_maxlen) {
				currline = test;
			} else {
				if (currline.length > 0) {
					out_lines.push((' ' + currline).slice(1).trim());
				}
				currline = word.trim();
			}
		}
		if (currline.length > 0) {
			out_lines.push((' ' + currline).slice(1).trim());
		}
	}
	/*if (flag) {
		console.log("out_lines:", JSON.stringify(out_lines));
	}*/
}

export function canvasWrtField(p_this, pp_ctx, p_rows, p_attrs, p_fld, p_msgsdict, max_captwidth, max_valuewidth) {
			
	let caption;

	if (Object.keys(p_msgsdict).indexOf(p_fld) >= 0) {
		caption = I18n.capitalize(p_msgsdict[p_fld]);
	} else {
		caption = I18n.capitalize(p_fld);
	}

	let pretext, tmp, captionlines=[], valuelines = [];
	const lang = (new I18n(p_this.layer.msgsdict)).getLang();

	if (p_this.layer.infocfg.fields["formats"] !== undefined && p_this.layer.infocfg.fields["formats"][p_fld] !== undefined) {
		if (p_this.layer.infocfg.fields["formats"][p_fld]["type"] !== undefined) {
			switch(p_this.layer.infocfg.fields["formats"][p_fld]["type"]) {

				case "date":
					tmp = new Date(p_attrs[p_fld]);
					pretext = tmp.toLocaleDateString(lang);
					break;

				case "time":
					tmp = new Date(p_attrs[p_fld]);
					pretext = tmp.toLocaleTimeString(lang);
					break;

				case "datetime":
				case "timeanddate":
				case "dateandtime":
					tmp = new Date(p_attrs[p_fld]);
					pretext = tmp.toLocaleString(lang);
					break;

			}
		}
	} else {
		pretext = p_attrs[p_fld];
	}

	if (caption.length > 0) {
		pp_ctx.font = `${p_this.normalszPX}px ${p_this.captionfontfamily}`;
		collectTextLines(pp_ctx, caption, max_captwidth, captionlines);
	} else {
		captionlines.push('');
	}

	if (typeof pretext != 'number') {
		if (pretext.length > 0) {
			pp_ctx.font = `${p_this.normalszPX}px ${p_this.fontfamily}`;
			collectTextLines(pp_ctx, pretext, max_valuewidth, valuelines);
		} else {
			valuelines.push('');
		}
	} else {
		if (captionlines.length == 1) {
			valuelines = [pretext.toString()];
		} else {
			valuelines = [];
			for (let i=0; i<(captionlines.length-1); i++) {
				valuelines.push('');
			}
			valuelines.push(pretext.toString());
		}
	}

	p_rows.push([captionlines, valuelines]);
}

