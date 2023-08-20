
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

function canvasCollectTextLines(ppp_ctx, p_intext, p_maxlen, out_lines) {

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


export function calcNonTextRowHeight(p_row, p_boxwidth, p_imgpadding, p_leftpad, p_rightpad) {

	const tc_maximgheight = GlobalConst.INFO_MAPTIPS_BOXSTYLE["thumbcoll_maximgheight"]
	const si_maximgheight = GlobalConst.INFO_MAPTIPS_BOXSTYLE["singleimg_maximgheight"]
	const normv = GlobalConst.INFO_MAPTIPS_BOXSTYLE["thumbcoll_normwidth"];
	const usable_width = p_boxwidth - p_leftpad - p_rightpad;
	const maximgwidth = Math.min((usable_width - p_imgpadding) / 2.0, GlobalConst.INFO_MAPTIPS_BOXSTYLE["thumbcoll_maximgwidth"]);
	let w, h, fillh = 0;

	// console.log("maximgwidth:", maximgwidth);

	if (p_row["err"] !== undefined && p_row["err"]) {
		return fillh;
	}

	if (p_row["thumbcoll"] !== undefined) {

		p_row["dims_pos"] = [];
		let r, currfillh = 0, fillw = 0, rowi=0, coli=0, usedrowi=-1;

		for (let imge of p_row["thumbcoll"]) {

			if (imge.complete) {
				r = 1.0 * imge.width / imge.height;
				if (r > 1.2) {
					w = maximgwidth;
					h = w / r;
				} else if (r < 0.8) {
					h = tc_maximgheight;
					w = r * h;
				} else {
					if (r > 1.0) {
						h = normv;
						w = r * h;
					} else {
						w = normv;
						h = w / r;
					}
				}
				w = parseInt(w);
				h = parseInt(h);

				if (coli==0) {
					fillw = w;
				} else {
					fillw = fillw + w + p_imgpadding;
				}
				// console.log(imge.src, "wid:", imge.width, "w:", w, "h:", h, "fillw:", fillw, "usable_width:", usable_width);
				if (fillw > usable_width) {
					fillw = w;
					fillh += currfillh;
					// console.log("   added to  fillh:", fillh, "currfillh:", currfillh);
					currfillh = h;
					// console.log("         set currfillh B:", currfillh);
					coli = 0;
					rowi++;
				} else {
					if (h > currfillh) {
						currfillh = h;
						// console.log("         set currfillh A:", currfillh);
					}	
				}
				p_row["dims_pos"].push([w, h, rowi, coli]);
				usedrowi = rowi;
				coli++;
			} else {
				console.error(`[WARN] calcNonTextRowHeight, image '${imge.src}' not complete`);
			}
		}

		if (currfillh > 0) {
			// console.log("    residual height:", currfillh, "fillh:", fillh);
			fillh += currfillh;
			currfillh = 0;
		}

		if (usedrowi > 0) {
			//console.log("   acr padds:", usedrowi, p_imgpadding);
			fillh += (usedrowi * p_imgpadding);
		}

	} else if (p_row["singleimg"] !== undefined) {

		let r;

		const imge = p_row["singleimg"];
		if (imge) {
			if (imge.complete) {
				r = 1.0 * imge.width / imge.height;
				if (r > 1.0) {
					w = usable_width;
					h = w / r;
				} else {
					h = si_maximgheight;
					w = r * h;
				}
				w = parseInt(w);
				h = parseInt(h);

				fillh = h;

				p_row["dims"] = [w, h];
			} else {
				console.error(`[WARN] calcNonTextRowHeight, single image '${imge.src}' not complete`);
			}
		} else {
			console.error("[WARN] calcNonTextRowHeight, missing single image");
		}

	}

	// console.log("   dimpos:", p_row["dims_pos"], "fillh:", fillh);

	return fillh;
}


// writes in data structure in p_rows, not in graphics canvas, but uses canvas functions to measure text dimensions
// returns height of field in textline count
export async function canvasWrtField(p_this, pp_ctx, p_attrs, p_fld, p_lang, p_msgsdict, max_captwidth, max_valuewidth, o_rows, o_urls) {
			
	let caption, ret = 0;

	if (p_attrs[p_fld] === undefined) {
		return ret;
	}

	if (Object.keys(p_msgsdict[p_lang]).indexOf(p_fld) >= 0) {
		caption = I18n.capitalize(p_msgsdict[p_lang][p_fld]);
	} else {
		caption = I18n.capitalize(p_fld);
	}

	let pretext, tmp, captionlines=[], valuelines = [];
	const lang = p_lang;

	if (p_this.layer.infocfg.fields["formats"] !== undefined && p_this.layer.infocfg.fields["formats"][p_fld] !== undefined) {
		if (p_this.layer.infocfg.fields["formats"][p_fld]["type"] !== undefined) {

			pretext = null;
			switch(p_this.layer.infocfg.fields["formats"][p_fld]["type"]) {

				case "date":
					tmp = new Date(p_attrs[p_fld]);
					pretext = tmp.toLocaleDateString(lang);
					break;

				case "tolocale":
					pretext = p_attrs[p_fld].toLocaleString(lang);
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

				case "URL":
					if (o_urls != null) {
						const urlfunc = p_this.layer.infocfg.fields["formats"][p_fld]["urlbuild"];
						o_urls[p_fld] = urlfunc(p_attrs[p_fld]);
						if (p_this.layer.infocfg.fields["formats"][p_fld]["format"] !== undefined) {
							pretext = p_this.layer.infocfg.fields["formats"][p_fld]["format"](p_attrs, p_fld);
						}
						if (pretext == null) {
							pretext = p_attrs[p_fld];
						}
					}
					break;


			}
		} else {
			if (p_this.layer.infocfg.fields["formats"][p_fld]["format"] !== undefined) {
				pretext = p_this.layer.infocfg.fields["formats"][p_fld]["format"](p_attrs, p_fld, lang);
			}					
		}
	} else {
		pretext = p_attrs[p_fld];
	}

	if (caption.length > 0) {
		pp_ctx.font = `${p_this.normalszPX}px ${p_this.captionfontfamily}`;
		canvasCollectTextLines(pp_ctx, caption, max_captwidth, captionlines);
	} else {
		captionlines.push('');
	}

	if (pretext) {	

		if (typeof pretext != 'number') {

			if (pretext.length > 0) {
				pp_ctx.font = `${p_this.normalszPX}px ${p_this.fontfamily}`;
				canvasCollectTextLines(pp_ctx, pretext, max_valuewidth, valuelines);
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

		// prepend empty value lines, to justify text vertically to bottom
		if (captionlines.length > valuelines.length) {
			for (let i=0; i<(captionlines.length - valuelines.length); i++) {
				valuelines.unshift('');
			}
		}

		o_rows.push({ "c": [captionlines, valuelines], "f": p_fld });
		ret = Math.max(captionlines.length, valuelines.length);	
	
	} else {

		let imge, src, thumbcoll=[], re, newrow = null;
		if (p_this.layer.infocfg.fields["formats"][p_fld] !== undefined && p_this.layer.infocfg.fields["formats"][p_fld]["type"] !== undefined) {
			
			switch(p_this.layer.infocfg.fields["formats"][p_fld]["type"]) {

				case "thumbcoll":

					tmp = p_attrs[p_fld];
					if (tmp == null) {
						newrow = { "thumbcoll": [], "err": true, "cap": caption, "f": p_fld };
					} else {
						re = new RegExp(`${p_this.layer.infocfg.fields["formats"][p_fld]["splitpatt"]}`);
						for (let spl of tmp.split(re)) {
							
							src = p_this.layer.infocfg.fields["formats"][p_fld]["srcfunc"](spl);
	
							imge = await p_this.imgbuffer.syncFetchImage(src, spl);
							if (imge) {
								thumbcoll.push(imge);
							}
						}
	
						newrow = { "thumbcoll": thumbcoll, "cap": caption, "f": p_fld };	
					}
					break;


				case "singleimg":

					tmp = p_attrs[p_fld];
					src = p_this.layer.infocfg.fields["formats"][p_fld]["srcfunc"](tmp);
					imge = await p_this.imgbuffer.syncFetchImage(src, tmp);

					if (imge) {
						newrow = { "singleimg": imge, "cap": caption, "f": p_fld };
					} else {
						newrow = { "singleimg": null, "err": true, "cap": caption, "f": p_fld };
					}
					break;

			}

			if (p_this.layer.infocfg.fields["formats"][p_fld]["hidecaption"] !== undefined) {
				newrow["hidecaption"] = p_this.layer.infocfg.fields["formats"][p_fld]["hidecaption"];
			}

			if (newrow) {
				o_rows.push(newrow);
			}
		}
	}

	return ret;
}

// based on Odinho - Velmont - https://stackoverflow.com/a/46432113
export class ImgLRUCache {

	buffer;
	bufferkeys;
	size;
	timeout;
	constructor(p_size) {
		this.size = p_size;
		this.cache = new Map();
	}

	has(p_name) {
		return this.cache.has(p_name.toLowerCase());
	}

    get(p_name) {
		const name = p_name.toLowerCase();
        let item = this.cache.get(name);
        if (item) {
            // refresh key
            this.cache.delete(name);
            this.cache.set(name, item);
        }
        return item;
    }

    set(p_name, val) {
        // refresh key
		const name = p_name.toLowerCase();
        if (this.cache.has(name)) {
			this.cache.delete(name);
		} else if (this.cache.size == this.size) {
			// evict oldest
			this.cache.delete(this.first()) 
		};
        this.cache.set(name, val);
    }

    first() {
        return this.cache.keys().next().value;
    }	

	async syncFetchImage(p_imgpath, p_name) {

		// console.log("-- A a pedir:", p_name, "buffer len:", this.cache.size, Array.from(this.cache.keys()));
		const name = p_name.toLowerCase();
		let ret = null;
		if (this.has(name)) {
			ret = this.get(name);
		} else {

			const img = new Image();
			img.decoding = "sync";
			img.src = p_imgpath;

			try {
				await img.decode();
				if (img.complete) {
					this.set(name, img);
				} else {
					console.error(`[WARN] ImgLRUCache syncFetchImage: img ${p_imgpath} NOT complete.`, p_imgpath)
				}
				ret = img;		
	
			} catch(e) {
				console.error(`[WARN] ImgLRUCache syncFetchImage on '${p_name}': error '${e}'.`);
			}
		}

		return ret;
	}
}

export function genRainbowColor(p_max, p_value) {

	const h = Math.round(360 * (p_value / p_max));
	
	return `hsl(${h} 100% 50%)`;
}

export function symmetricDifference(setA, setB) {
	const _difference = new Set(setA);
	for (const elem of setB) {
	  if (_difference.has(elem)) {
		_difference.delete(elem);
	  } else {
		_difference.add(elem);
	  }
	}
	return _difference;
}

export function isSuperset(set, subset) {
	for (const elem of subset) {
		if (!set.has(elem)) {
			return false;
		}
	}
	return true;
}

export function setEquality(setA, setB) {
	let ret = true;
	for (const el of setA) {
		if (!setB.has(el)) {
			ret = false;
			break;
		}
	}
	if (ret) {
		for (const el of setB) {
			if (!setA.has(el)) {
				ret = false;
				break;
			}
		}
	}
	return ret;
}

export function portuguese_syllables(p_input_text) {

	const vogais = ['a', 'e', 'i', 'o', 'u'];

	const input = p_input_text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

	const result = [];
	let oc, done, testsyl = '';

	function isVog(p_char) {
		return vogais.indexOf(p_char) >= 0;
	}

	function isVocalic(p_test_str, p_char) {
		let ret = false;
		if (['i', 'u'].indexOf(p_char) >= 0) {
			ret = lastIsVog(p_test_str);
		}
		return ret;
	}	

	function isEq2Last(p_test_str, p_char) {
		return p_test_str[p_test_str.length-1] == p_char;
	}	

	function lastIsVog(p_test_str) {
		return isVog(p_test_str[p_test_str.length-1]);
	}	

	function lastIsVocalic(p_test_str) {
		return isVocalic(p_test_str[p_test_str.length-1]);
	}	

		// next is end of string
	function nextIsEOL(p_test_str, p_char_idx) {
		return p_test_str.length == (p_char_idx+1);
	}

	function onlyCons(p_octest_str) {
		let ret = 0;
		for (let i=0; i<p_octest_str.length; i++) {
			if (isVog(p_octest_str[i])) {
				ret = 0;
				break;
			} else {
				ret++;
			}
		}
		return ret;
	}

	// let startcv, endcv;	
	for (let i=0; i<input.length; i++) {

		if (testsyl.length == 0) {

			testsyl = testsyl+input[i];
			
		} else {

			oc = onlyCons(testsyl);
			if (oc > 0) {
				testsyl = testsyl+input[i];
			} else {
				if (!isVog(input[i])) {
					if (nextIsEOL(input, i)) {
						result.push(testsyl+input[i]);
						testsyl = "";
					} else {
						if (i==1 && input.length > 2 && !isVog(input[2])) {
							testsyl = testsyl+input[i];
							result.push(testsyl);
							testsyl = '';	
						} else {
							result.push(testsyl);
							testsyl = input[i];
						}
					}
				} else {
					done = false;
					if (isVocalic(testsyl, input[i])) {
						if (result.length == 0) {
							result.push(testsyl);
							testsyl = input[i];								
							done = true;
						}
					} else {
						if (lastIsVocalic(testsyl)) {
							result.push(testsyl);
							testsyl = input[i];								
							done = true;
						}
					}
					if (!done) {
						if (isEq2Last(testsyl, input[i])) {
							result.push(testsyl);
							testsyl = input[i];								
							done = true;
						}
					}					
					if (!done) {
						testsyl = testsyl+input[i];
					}
				}
			}
		}
	}

	if (testsyl.length > 0) {
		result.push(testsyl);
	}

	let completeresult = [];
	let startidx = 0;
	for (let r of result) {
		completeresult.push(p_input_text.slice(startidx, startidx+r.length));
		startidx += r.length;
	}

	return completeresult;
}

export function canvas_text_wrap(p_input_txt, p_canvas_ctx, p_width) {
	
	let tm, pretest, teststr, result=[], all = [];
	
	const words = p_input_txt.split(/[\s\-\,\.]+/g);
	for (let w of words) {
		if (w.length > 0) {
			all.push(portuguese_syllables(w));
		}
	}

	pretest='';
	teststr = '';
	for (let word of all) {
		for (let syl, s=0; s<word.length; s++) {
			syl = word[s];
			teststr += syl;
			tm = p_canvas_ctx.measureText(teststr);
			if (tm.width > p_width) {
				if (word.length > 1 && s >0 && s <= word.length-1) {
					result.push(pretest+'-');
				} else {
					result.push(pretest);
				}
				teststr = syl;
			}

			pretest = teststr;
		}
		if (teststr.length > 0) {
			teststr += " ";
		}		
	}
	if (teststr.length > 0) {
		result.push(teststr);
	}

	return result;
}

function arrayEquals(a, b) {
    return Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index]);
}

let testl = [
	["saguão", ['sa', 'guão']],
	["sabão", ['sa', 'bão']],
	["Álcool", ['Ál', 'co', 'ol']],
	["Saída", ['Sa', 'í', 'da']],
	["Patrocínio", ['Pa', 'tro', 'cí', 'nio']],
	["Navio", ['Na', 'vio']],
	["Iguais", ['I', 'guais']],
	["Uruguaio", ['U', 'ru', 'guaio']],
	["Algo", ['Al', 'go']]	
]

let s;
for (let t of testl) {
	s = portuguese_syllables(t[0]);
	if (!arrayEquals(s, t[1])) {
		console.log("Erro:", t[0], t[1], s)
	}
}


