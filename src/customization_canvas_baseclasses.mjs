
import {GlobalConst} from './constants.js';
import {MaptipBox} from './canvas_maptip.mjs';
import {InfoBox} from './canvas_info.mjs';
import {I18n} from './i18n.mjs';

class MapPrintInRect {

	left;
	boxh;
	boxw;
	top;
	fillStyleBack; 
	fillStyleFront; 
	font;
	canvaslayer = 'service_canvas';

	print(p_mapctx, p_x, py) {
		// To be implemented
	}

	remove(p_mapctx) {
		const canvas_dims = [];
		const gfctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

		gfctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
	}	
	
}

export class PermanentMessaging extends MapPrintInRect {
	constructor() {
		super();
		this.fillStyleBack = GlobalConst.MESSAGING_STYLES.PERMANENT_BCKGRD; 
		this.fillStyleFront = GlobalConst.MESSAGING_STYLES.PERMANENT_COLOR;
		this.font = GlobalConst.MESSAGING_STYLES.PERMANENT_FONT;
	}	
}

export class LoadingMessaging extends MapPrintInRect {
	constructor() {
		super();
		this.fillStyleBack = GlobalConst.MESSAGING_STYLES.LOADING_BCKGRD; 
		this.fillStyleFront = GlobalConst.MESSAGING_STYLES.LOADING_COLOR;
		this.font = GlobalConst.MESSAGING_STYLES.LOADING_FONT;
	}	
}

export class ControlsBox extends MapPrintInRect {

	orientation = "HORIZONTAL";
	controls_keys = [];
	controls_funcs = {};
	controls_status = { }; 
	controls_prevgaps = {};	
	tool_manager = null;
	controls_boxes = {};

	constructor() {
		super();
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.BCKGRD; 
		this.strokeStyleFront = GlobalConst.CONTROLS_STYLES.COLOR;
		this.fillStyleBackOn = GlobalConst.CONTROLS_STYLES.BCKGRDON; 
		this.strokeStyleFrontOn = GlobalConst.CONTROLS_STYLES.COLORON;

		this.strokeWidth = GlobalConst.CONTROLS_STYLES.STROKEWIDTH;
		this.sz = GlobalConst.CONTROLS_STYLES.SIZE;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;

		this.dimensioning();
	}

	getOrientation() {
		return this.orientation;
	}

	dimensioning() {

		let offset = 0;
		if (navigator.userAgent.toLowerCase().includes("mobile") || navigator.userAgent.toLowerCase().includes("android")) {
			offset = GlobalConst.CONTROLS_STYLES.MOBILE_DEFGAP;
		}

		this.left = this.margin_offset;
		this.top = this.margin_offset;
		this.boxh = this.sz + offset;
		this.boxw = this.sz + offset;
	
	}

	getWidth() {
		let w = 0;
		if (this.orientation == "HORIZONTAL") {
			w = this.controls_keys.length * this.boxw;
		} else {
			w = this.boxw;
		}
		return w;
	}

	getHeight() {
		let h = 0;
		if (this.orientation == "HORIZONTAL") {
			h = this.controls_keys.length * this.boxh;
		} else {
			h = this.boxh;
		}
		return h;
	}	

	addControl(p_key, p_togglable, p_drawface_func, p_endevent_func, p_mmove_func, opt_gap_to_prev) {
		this.controls_keys.push(p_key);
		this.controls_funcs[p_key] = {
			"drawface": p_drawface_func,
			"endevent": p_endevent_func,
			"mmoveevent": p_mmove_func
		}
		if (opt_gap_to_prev) {
			this.controls_prevgaps[p_key] = opt_gap_to_prev;
		}

		this.controls_status[p_key] = { "togglable": false, "togglestatus": false, "disabled": false };

		if (p_togglable) {
			this.controls_status[p_key].togglable = true;
		}
	}

	changeToggleFlag(p_key, p_toggle_status) {
		let has_changed = false;
		if (this.controls_status[p_key].togglable && !this.controls_status[p_key].disabled && this.controls_status[p_key].togglestatus != p_toggle_status) {
			has_changed = true;
			this.controls_status[p_key].togglestatus = p_toggle_status;
		}
		return has_changed;
	}

	print(p_mapctx) {

		// const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			// p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			let left, top, accum=0;

			for (let ci=0;  ci<this.controls_keys.length; ci++) {

				if (this.controls_prevgaps[this.controls_keys[ci]] !== undefined) {
					accum += this.controls_prevgaps[this.controls_keys[ci]];
				} 

				console.log(navigator.userAgent.toLowerCase());
				if (ci>0 && (navigator.userAgent.toLowerCase().includes("mobile") || navigator.userAgent.toLowerCase().includes("android"))) {
					accum += GlobalConst.CONTROLS_STYLES.MOBILE_DEFGAP;
				}

				if (this.orientation == "HORIZONTAL") {
					left = accum + ci * this.boxw + this.left;
					top = this.top;
				} else {
					left = this.left;
					top = accum + ci * this.boxh + this.top;
				}

				this.controls_boxes[this.controls_keys[ci]] = [left, top, this.boxw, this.boxh];			
				ctx.lineWidth = this.strokeWidth;

				this.drawControlFace(ctx, this.controls_keys[ci], left, top, this.boxw, this.boxh, p_mapctx.cfgvar["basic"], GlobalConst);

			}

			// console.log('>> MapScalePrint print scale', ctx, [this.left, this.top, this.boxw, this.boxh]);


		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	setToolmgr(p_toolmgr) {
		console.trace("setToolmgr:", p_toolmgr)
		this.tool_manager = p_toolmgr;
	}

	interact(p_mapctx, p_evt) {

		let cb, key = null;
		for (let _key in this.controls_boxes) {

			cb = this.controls_boxes[_key];
			if (p_evt.clientX >= cb[0] && p_evt.clientX <= cb[0]+cb[2] && p_evt.clientY >= cb[1] && p_evt.clientY <= cb[1]+cb[3]) {
				key = _key;
			}
		}
		return key;
	}

	
}

function drawTOCSymb(p_mapctx, p_lyr, p_ctx, p_symbxcenter, p_cota, p_vert_step, opt_varstlesymb) {

	p_ctx.save();

	try {

		const symb = (opt_varstlesymb ? opt_varstlesymb : p_lyr["default_symbol"]);

		if (symb == null) {
			throw new Error(`Missing symb for ${p_lyr.key}`);
		}
		if (symb['drawfreeSymb'] === undefined) {
			console.trace(`[WARN] No 'drawfreeSymb' method in ${JSON.stringify(symb)}`);
		} else {
			symb.setStyle(p_ctx);
			symb.drawfreeSymb(p_mapctx, p_ctx, [p_symbxcenter, p_cota], p_vert_step);
		}

		//console.log("p_lyr:", p_lyr);

	} catch(e) {
		console.error(e);
	} finally {
		p_ctx.restore();
	}


}

export class TOC  extends MapPrintInRect {

	left;
	boxh;
	boxw;
	top;
	fillStyleBack; 
	fillStyleFront; 
	font;
	tocmgr;
	leftcol_width;
	print_attempts;

	constructor() {

		super();

		// ** - can be overrriden in basic config, at 'style_override' group, 
		//      creating a key with same property name in CONTROLS_STYLES, but in lower case

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.TOC_BCKGRD;  // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.TOC_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.TOC_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.leftcol_width = GlobalConst.CONTROLS_STYLES.TOC_LEFTCOL_WIDTH;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.TOC_NORMALSZ_PX;
		this.varstylePX = GlobalConst.CONTROLS_STYLES.TOC_VARSTYLESZ_PX;
		this.fontfamily = GlobalConst.CONTROLS_STYLES.TOC_FONTFAMILY;
		this.canvaslayer = 'service_canvas'; 

		this.left = 600;
		this.top = this.margin_offset;
		this.boxh = 300;
		this.boxw = 300;

		this.print_attempts = 0;
	}

	setTOCMgr(p_tocmgr) {
		this.tocmgr = p_tocmgr;
	}

	_print(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		ctx.clearRect(this.left-2, this.top-2, this.boxw+4, this.boxh+4); 

		// cal width
		let lbl, lyr_labels={}, lyr_fc = {}, lyr_vs_captions={}, lyr_vs_fc={}, varstyle_caption, lang, max_lbl_w = 0, varstyles_fc;


		for (const lyr of this.tocmgr.layers) {

			if (lyr["label"] !== undefined && lyr["label"] != "none") {

				lang = (new I18n(lyr.msgsdict)).getLang();

				if (lyr["label"] !== undefined && lyr["label"] != "none") {
					if (lyr['msgsdict'] !== undefined && lyr.msgsdict[lang] !== undefined && Object.keys(lyr.msgsdict[lang]).indexOf(lyr["label"]) >= 0) {
						lbl = I18n.capitalize(lyr.msgsdict[lang][lyr["label"]]);
					} else {
						lbl = I18n.capitalize(lyr["label"]);
					}	
				} else {
					lbl = "(sem etiqueta)";	
				}

				lyr_fc[lyr.key] = lyr.featCount();
				if (lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {
					lyr_vs_captions[lyr.key] = {};
					lyr_labels[lyr.key] = lbl; 
					lyr_vs_fc[lyr.key] = {};
				} else {
					lyr_labels[lyr.key] = `${lbl} [${lyr_fc[lyr.key]}]`; 
				}

				varstyles_fc = 0;

				ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
				if (lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {
					max_lbl_w = Math.max(max_lbl_w, ctx.measureText(lyr_labels[lyr.key]).width);
				} else {
					max_lbl_w = Math.max(max_lbl_w, this.leftcol_width + ctx.measureText(lyr_labels[lyr.key]).width);
				}

				for (const vs of lyr["varstyles_symbols"]) {

					lyr_vs_fc[lyr.key][vs.key] = lyr.filteredFeatCount(vs.func);
					varstyles_fc += lyr_vs_fc[lyr.key][vs.key];

					if (Object.keys(lyr.msgsdict[lang]).indexOf(vs.key) >= 0) {
						varstyle_caption = `${I18n.capitalize(lyr.msgsdict[lang][vs.key])} [${lyr_vs_fc[lyr.key][vs.key]}]`;
					} else {
						varstyle_caption = `${I18n.capitalize(vs.key)} [${lyr_vs_fc[lyr.key][vs.key]}]`;
					}
					lyr_vs_captions[lyr.key][vs.key] = varstyle_caption;

					ctx.font = `${this.varstylePX}px ${this.fontfamily}`;
					max_lbl_w = Math.max(max_lbl_w, this.leftcol_width + ctx.measureText(varstyle_caption).width);
				}

				if (varstyles_fc > 0 && lyr_fc[lyr.key] > varstyles_fc) {
					console.warn(`[WARN] layer ${lyr.key} varstyles dont apply to all fetures - all f.count:${lyr_fc[lyr.key]},  vstyles f.count:${varstyles_fc}`);
				}
			}
		}

		// this.leftcol_width is merged when necessary, in max_lbl_w
		this.boxw = max_lbl_w + 2 * this.margin_offset;

		let grcota, cota, maxcota, count, lyr, txleft, indent_txleft, step, mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		this.left = mapdims[0] - (this.boxw + this.margin_offset);
		let symbxcenter = this.left + this.margin_offset + 0.5 * this.leftcol_width;

		// const canvas_dims = [];
		// console.log("::229:: this.canvaslayer, maxw:", this.canvaslayer, max_lbl_w);

		try {
			ctx.textAlign = "left";
			indent_txleft = this.left + this.margin_offset + this.leftcol_width;
			txleft = this.left + this.margin_offset;

			// Measure height
			count = 0;
			maxcota = 0;
			cota = 0;
			for (let li=this.tocmgr.layers.length-1; li>=0; li--) {

				lyr = this.tocmgr.layers[li]; 
				if (lyr["label"] !== undefined && lyr["label"] != "none") {
					
					count++;

					if (count == 1) {
						cota = 2* this.margin_offset + this.normalszPX;
					} else {
						cota += GlobalConst.CONTROLS_STYLES.TOC_SEPARATION_FACTOR * this.normalszPX;
					}

					if (lyr["varstyles_symbols"] !== undefined) {
						
						ctx.font = `${this.varstylePX}px ${this.fontfamily}`;
						for (const vs of lyr["varstyles_symbols"]) {
							cota += GlobalConst.CONTROLS_STYLES.TOC_VARSTYLE_SEPARATION_FACTOR * this.varstylePX;
						}
					}					
				}

			}
			maxcota = cota;
			this.boxh = maxcota + this.margin_offset;

			// background
			
			// ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc_bckgrd"] !== undefined) {
				ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["toc_bckgrd"];
			} else {
				ctx.fillStyle = this.fillStyleBack;
			}
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);
			
			ctx.strokeStyle = this.activeStyleFront;
			ctx.lineWidth = this.strokeWidth;
			ctx.strokeRect(this.left, this.top, this.boxw, this.boxh);
			
			count = 0;
			cota = 0;
			step = GlobalConst.CONTROLS_STYLES.TOC_SEPARATION_FACTOR * this.normalszPX;

			for (let li=this.tocmgr.layers.length-1; li>=0; li--) {

				lyr = this.tocmgr.layers[li]; 

				if (lyr["label"] !== undefined && lyr["label"] != "none") {
					
					count++;

					lbl = lyr_labels[lyr.key];					

					if (count == 1) {
						cota = 2* this.margin_offset + this.normalszPX;
					} else {
						cota += step;
					}

					if (lyr_fc[lyr.key] == 0) {
						ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_INACTIVECOLOR;
					}else {
						ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_ACTIVECOLOR;
					}
					ctx.font = `${this.normalszPX}px ${this.fontfamily}`;

					if (lyr["varstyles_symbols"] === undefined || lyr["varstyles_symbols"].length == 0) {
						grcota = 2 + cota - 0.5 * this.varstylePX;
						drawTOCSymb(p_mapctx, lyr, ctx, symbxcenter, grcota, step);	
						ctx.fillText(lbl, indent_txleft, cota);	
					} else {
						ctx.fillText(lbl, txleft, cota);	
					}

					//console.log(lyr["label"], ">> _currFeatures <<", lyr.featCount());

					if (lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {

						// console.log("334:", lyr["varstyles_symbols"] )
						ctx.font = `${this.varstylePX}px ${this.fontfamily}`;
						for (const vs of lyr["varstyles_symbols"]) {

							varstyle_caption = lyr_vs_captions[lyr.key][vs.key]

							if (lyr.filteredFeatCount(vs.func) > 0) {
								ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_ACTIVECOLOR;
							} else {
								ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_INACTIVECOLOR;
							}
		
							grcota = 4 + cota + 0.5 * GlobalConst.CONTROLS_STYLES.TOC_VARSTYLE_SEPARATION_FACTOR * this.varstylePX;
							drawTOCSymb(p_mapctx, lyr, ctx, symbxcenter, grcota, step, vs);							
							cota += GlobalConst.CONTROLS_STYLES.TOC_VARSTYLE_SEPARATION_FACTOR * this.varstylePX;
							ctx.fillText(varstyle_caption, indent_txleft, cota);
						}

					}

				}

			}

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	print(p_mapctx) {
		const that = this;
		while (!document.fonts.check("10px "+this.fontfamily) && this.print_attempts < 10) {
			setTimeout(() => {
				that.print(p_mapctx);
			}, 200);
			that.print_attempts++;
			return;
		}
		this.print_attempts = 0;
		return this._print(p_mapctx)
	}


	interact(p_mapctx, p_evt) {

		const SHOWROWS = false;

		/*
						ctx.beginPath();
						ctx.moveTo(this.left, cota);
						ctx.lineTo(this.left+this.boxw, cota);
						ctx.stroke();


		*/

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');


		const step = GlobalConst.CONTROLS_STYLES.TOC_SEPARATION_FACTOR * this.normalszPX;
		let next, prev = this.top + this.margin_offset;

		ctx.save();
		ctx.strokeStyle = "cyan";

		let i=0, ret = false;
		if (p_evt.clientX >= this.left && p_evt.clientX <= this.left+this.boxw && p_evt.clientY >= this.top && p_evt.clientY <= this.top+this.boxh) {

			for (const lyr of this.tocmgr.layers) {
				if (lyr["label"] !== undefined && lyr["label"] != "none") {
					next = prev + step;

					if (i % 2 == 0) {
						ctx.strokeRect(this.left, prev, 70, step);
					} else {
						ctx.strokeRect(this.left+20, prev, 70, step);
					}

					prev = next;
					i++;
				}
			}
	
			ret = true;
		}

		ctx.restore();

		return ret;
	}	
}


export class Info {
	// curr_layerkey;
	// curr_featid;
	callout;
	ibox;
	canvaslayer = 'interactive_viz';
	styles;

	constructor(p_styles) {
		this.styles = p_styles;
		this.callout = null;
		this.ibox = null;
	}
	hover(p_mapctx, p_layerkey, p_featid, p_feature, p_scrx, p_scry) {
		// this.curr_layerkey = p_layerkey;
		// this.curr_featid = p_featid;
		//console.log("Maptip, layer:", p_layerkey, " feat:", p_featid);
		const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
		this.callout = new MaptipBox(p_mapctx, currlayer, p_featid, p_feature, this.styles, p_scrx, p_scry, true);
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		this.callout.clear(ctx);
		this.callout.draw(ctx);
	}
	pick(p_mapctx, p_layerkey, p_featid, p_feature, p_scrx, p_scry) {
		this.clear(p_mapctx, p_layerkey, p_featid, p_scrx, p_scry)
		// this.curr_layerkey = p_layerkey;
		// this.curr_featid = p_featid;

		const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
		if (currlayer["infocfg"] === undefined) {
			throw new Error(`Missing 'infocfg' config for layer '${p_layerkey}, cannot 'pick' features`);
		}
		if (currlayer["infocfg"]["keyfield"] === undefined) {
			throw new Error(`Missing 'infocfg.keyfield' config for layer '${p_layerkey}, cannot 'pick' features`);
		}

		if (p_feature.a[currlayer["infocfg"]["keyfield"]] === undefined) {
			console.warn(`[WARN] layer '${p_layerkey}' has no attribute corresponding to INFO key field '${currlayer["infocfg"]["keyfield"]}'`);
			return;
		}

		let keyval;
		const _keyval = p_feature.a[currlayer["infocfg"]["keyfield"]];

		if (currlayer["infocfg"]["keyisstring"] === undefined || !currlayer["infocfg"]["keyisstring"])
			keyval = _keyval;
		else
			keyval = _keyval.toString();


		const that = this;
		const lyr = p_mapctx.tocmgr.getLayer(p_layerkey);

		// done - [MissingFeat 0002] - Obter este URL de configs
		fetch(currlayer.url + "/doget", {
			method: "POST",
			body: JSON.stringify({"alias":lyr.infocfg.qrykey,"filtervals":[keyval],"pbuffer":0,"lang":"pt"})
		})
		.then(response => response.json())
		.then(
			function(responsejson) {
				const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
				that.ibox = new InfoBox(p_mapctx, currlayer, responsejson, that.styles, p_scrx, p_scry, that.infobox_pick, false);
				const ctx = p_mapctx.renderingsmgr.getDrwCtx(that.canvaslayer, '2d');
				that.ibox.clear(ctx);
				that.ibox.draw(ctx);				
			}
		).catch((error) => {
			console.error(`Impossible to fetch attributes on '${p_layerkey}'`, error);
		});	
	} 
	// mouse pick inside info box and over any of its items
	infobox_pick(p_info_box, p_data_rec, p_fldname, p_column_idx) {
		
		//console.log(p_info_box, p_data_rec, p_fldname, p_column_idx);
		navigator.clipboard.writeText(p_data_rec[p_fldname]).then(function() {
		   // console.log('infobox_pick: Copying to clipboard was successful!');
		}, function(err) {
		  	console.warn('[WARN] infobox_pick: Could not copy text: ', err);
		});	

		// open a new tab with URL, if it exists
		if (p_column_idx == 1 && p_info_box.urls[p_fldname] !== undefined) {
			window.open(p_info_box.urls[p_fldname], "_blank");
		}
	}
	clear(p_mapctx, p_layerkey, p_featid, p_scrx, p_scry) {
		//console.log("info/tip clear, prev layer:", p_layerkey, " feat:", p_featid);
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		if (this.ibox) {
			this.ibox.clear(ctx);
		}
		if (this.callout) {
			this.callout.clear(ctx);
		}
	}
	interact(p_mapctx, p_evt) {
		if (this.ibox) {
			const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
			this.ibox.interact(ctx, p_evt);
		}

	}
}

