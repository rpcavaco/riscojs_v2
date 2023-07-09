
import {GlobalConst} from './constants.js';
import {MaptipBox} from './canvas_maptip.mjs';
import {InfoBox} from './canvas_info.mjs';
import {I18n} from './i18n.mjs';

export function ctrToolTip(p_mapctx, p_evt, p_text, opt_deltas) {
	
	const gfctx = p_mapctx.renderingsmgr.getDrwCtx("transientviz", '2d');
	gfctx.save();
	const slack = 6;

	const canvas_dims = [];		
	try {
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
		gfctx.clearRect(0, 0, ...canvas_dims); 

		gfctx.font = "16px Helvetica";
		gfctx.strokeStyle = "white";
		gfctx.lineWidth = 2;

		const tm = gfctx.measureText(p_text);

		let dx, dy, deltax, deltay;

		if (opt_deltas) {
			deltax = opt_deltas[0];
			deltay = opt_deltas[1];
		} else {
			deltax = 50;
			deltay = 50;
		}

		if (p_evt.clientX < (canvas_dims[0]/2)) {
			dx = deltax;
		} else {
			dx = -deltax;
		}

		if (p_evt.clientY < (canvas_dims[1]/2)) {
			dy = deltay;
		} else {
			dy = -deltay;
		}		
		const x = p_evt.clientX + dx;
		const y = p_evt.clientY + dy;
		const h = 2*slack + tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent;

		gfctx.fillStyle = "#8080807f";
		gfctx.fillRect(x - tm.actualBoundingBoxLeft - slack, y + tm.actualBoundingBoxDescent + slack, tm.width+2*slack, -h);
		gfctx.strokeRect(x - tm.actualBoundingBoxLeft - slack, y + tm.actualBoundingBoxDescent + slack, tm.width+2*slack, -h);

		gfctx.fillStyle = "white";
		gfctx.fillText(p_text, x, y);

	} catch(e) {
		throw e;
	} finally {
		gfctx.restore();
	}	
}


// based on Odinho - Velmont - https://stackoverflow.com/a/46432113
class ImgLRUCache {

	buffer;
	bufferkeys;
	size;
	timeout;
	constructor(p_size) {
		this.size = p_size;
		this.cache = new Map();
	}

	has(p_name) {
		return this.cache.has(p_name);
	}

    get(p_name) {
        let item = this.cache.get(p_name);
        if (item) {
            // refresh key
            this.cache.delete(p_name);
            this.cache.set(p_name, item);
        }
        return item;
    }

    set(p_name, val) {
        // refresh key
        if (this.cache.has(p_name)) {
			this.cache.delete(p_name);
		} else if (this.cache.size == this.size) {
			// evict oldest
			this.cache.delete(this.first()) 
		};
        this.cache.set(p_name, val);
    }

    first() {
        return this.cache.keys().next().value;
    }	

	async syncFetchImage(p_imgpath, p_name) {

		// console.log("-- A a pedir:", p_name, "buffer len:", this.cache.size, Array.from(this.cache.keys()));

		let ret = null;
		if (this.has(p_name)) {

			ret = this.get(p_name);
			//console.log("-- A fetchImage get", p_name, "complete:", ret.complete);

		} else {

			const img = new Image();
			img.decoding = "sync";
			img.src = p_imgpath;

			try {
				await img.decode();
				if (img.complete) {
					this.set(p_name, img);
				} else {
					console.error(`[WARN] ImgLRUCache syncFetchImage: img ${p_imgpath} NOT complete.`, p_imgpath)
				}
				ret = img;		
	
			} catch(e) {
				console.error(`[WARN] ImgLRUCache syncFetchImage: error '${e}'.`);
			}


			// console.log("-- B fetchImage decode", p_name, "complete:", img.complete);

		}

		// console.log("-- C a entregar:", p_name, "buffer len:", this.cache.size);

		return ret;
	}
}

export class MapPrintInRect {

	left;
	boxh;
	boxw;
	top;
	fillStyleBack; 
	fillStyleFront; 
	font;
	canvaslayer = 'service_canvas';

	print(p_mapctx) {     // p_mapctx, ...
		// To be implemented
	}

	remove(p_mapctx) {
		const gfctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
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
	controls_rounded_face = [];
	controls_prevgaps = {};	
	//tool_manager = null;
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

	addControl(p_key, p_togglable, p_is_round, p_drawface_func, p_endevent_func, p_mmove_func, opt_gap_to_prev) {
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

		if (p_is_round && !this.controls_rounded_face.includes(p_key)) {
			this.controls_rounded_face.push(p_key);
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

				// console.log(navigator.userAgent.toLowerCase());
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

	// setToolmgr(p_toolmgr) {
	// 	console.trace("setToolmgr:", p_toolmgr)
	// 	this.tool_manager = p_toolmgr;
	// }

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
	had_prev_interaction;
	collapsedstate;
	prevboxenv;

	constructor(p_mapctx) {

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
		this.boxh = {
			"OPEN": 300,
			"COLLAPSED": 60
		};
		this.boxw = {
			"OPEN": 300,
			"COLLAPSED": 60
		};

		this.print_attempts = 0;
		this.had_prev_interaction = false;

		this.expandenv = 8;

		this.prevboxenv = null;

		let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		if (mapdims[0] <  GlobalConst.CONTROLS_STYLES.TOC_START_COLLAPSED_CANVAS_MAXWIDTH) {
			this.collapsedstate = "COLLAPSED";

		} else {
			this.collapsedstate = "OPEN";
		}
	}

	setTOCMgr(p_tocmgr) {
		this.tocmgr = p_tocmgr;
	}

	_print(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		if (this.prevboxenv) {
			ctx.clearRect(...this.prevboxenv); 	
			this.prevboxenv = null;
		} else {
			const dee = 2 * this.expandenv;
			ctx.clearRect(this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee); 	
		}

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
		this.boxw["OPEN"] = max_lbl_w + 2 * this.margin_offset;

		let grcota, cota, maxcota, count, lyr, txleft, indent_txleft, step, mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		this.left = mapdims[0] - (this.boxw[this.collapsedstate] + this.margin_offset);
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
			this.boxh["OPEN"] = maxcota + this.margin_offset;

			// background
			
			// ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc_bckgrd"] !== undefined) {
				ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["toc_bckgrd"];
			} else {
				ctx.fillStyle = this.fillStyleBack;
			}
			//console.log(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);
			ctx.fillRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);
			
			ctx.strokeStyle = this.activeStyleFront;
			ctx.lineWidth = this.strokeWidth;
			ctx.strokeRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);

			if (this.collapsedstate == "OPEN") {
						
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

							if (!lyr.layervisible) {
								ctx.save();
								ctx.strokeStyle = GlobalConst.CONTROLS_STYLES.TOC_STRIKETHROUGH_FILL;
								ctx.lineWidth = 12;
								ctx.beginPath();
								ctx.moveTo(txleft,cota-5);
								ctx.lineTo(this.left + this.boxw[this.collapsedstate] - this.margin_offset, cota-4);
								ctx.stroke();
								ctx.restore();
							}
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

								if (vs['hide'] !== undefined && vs['hide']) {
									ctx.save();
									ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
									ctx.lineWidth = 8;
									ctx.beginPath();
									ctx.moveTo(txleft,cota-4);
									ctx.lineTo(this.left + this.boxw[this.collapsedstate] - this.margin_offset, cota-4);
									ctx.stroke();
									ctx.restore();
								}
		
							}

						}

					}

				}

			} else {
				// collapsed TOC
				const leftx = this.left + this.margin_offset;
				const rightx = this.left + this.boxw["COLLAPSED"] - this.margin_offset;

				const ynsteps = 4;
				const ystep = this.boxh["COLLAPSED"] / (ynsteps+1);
				let cota;

				ctx.save();
				for (let ri=0; ri<ynsteps; ri++) {

					cota = this.top + (ri+1) * ystep;

					ctx.strokeStyle = GlobalConst.CONTROLS_STYLES.TOC_COLLAPSED_STRIPES_FILL;
					ctx.lineWidth = 6;
					ctx.lineCap = "round";
					ctx.beginPath();
					ctx.moveTo(leftx, cota);
					ctx.lineTo(rightx, cota);
					ctx.stroke();
				}
				ctx.restore();
			}

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	print(p_mapctx) {
		const that = this;
		// prevent drawing before configured fonts are available
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

		let ctx = null;
		if (SHOWROWS) {
			ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
			ctx.save();
			ctx.strokeStyle = "cyan";	
		}

		const stepEntry = GlobalConst.CONTROLS_STYLES.TOC_SEPARATION_FACTOR * this.normalszPX - 2;
		const stepSubEntry = GlobalConst.CONTROLS_STYLES.TOC_VARSTYLE_SEPARATION_FACTOR * this.normalszPX - 2;
		let next, prev = this.top + this.margin_offset;

		const width = this.boxw[this.collapsedstate] - 2* this.margin_offset;
		const left = this.left + this.margin_offset

		let i=-1, ret = false, step;
		let changed=false, found = null, topcnv;

		if (p_evt.clientX >= this.left && p_evt.clientX <= this.left+this.boxw[this.collapsedstate] && p_evt.clientY >= this.top && p_evt.clientY <= this.top+this.boxh[this.collapsedstate]) {

			if (this.collapsedstate == "OPEN") {

				for (let lyr, li=this.tocmgr.layers.length-1; li>=0; li--) {

					lyr = this.tocmgr.layers[li];
					if (lyr["label"] !== undefined && lyr["label"] != "none") {
						
						i++;
						if (lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {
							step = stepSubEntry;
						} else {
							step = stepEntry;
						}
						next = prev + step;

						// use prev, next
						if (ctx) {
							ctx.strokeRect(left, prev, width, step);
						}
						if (p_evt.clientX >= left && p_evt.clientX <= this.left+width && p_evt.clientY >= prev && p_evt.clientY <= next) {
							found = {
								"key": lyr.key,
								"subkey": null
							};
							break;
						}

						prev = next;
						
						if (lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {
							for (let vs, vi=0; vi<lyr["varstyles_symbols"].length; vi++) {

								vs = lyr["varstyles_symbols"][vi];

								i++;
								if (vi < (lyr["varstyles_symbols"].length-1)) {
									step = stepSubEntry;
								} else {
									step = stepEntry;
								}
								next = prev + step;

								// use prev, next
								if (ctx) {
									ctx.strokeRect(left, prev, width, step);
								}
								if (p_evt.clientX >= left && p_evt.clientX <= this.left+width && p_evt.clientY >= prev && p_evt.clientY <= next) {
									found = {
										"key": lyr.key,
										"subkey": vs.key
									};
									break;
								}				
								prev = next;	
							}

							if (found) {
								break;
							}
						} // if lyr["varstyles_symbols"] exist
					} // if lyr["label"] exists
				} // for lyr
			} // this.collapsedstate == "OPEN"

			ret = true;
		}

		// is over TOC box area
		if (ret) {

			if (found) {
	
				switch(p_evt.type) {
	
					case 'touchend':
					case 'mouseup':
	
						for (let lyr of this.tocmgr.layers) {
							if (lyr.key == found.key) {
								if (found.subkey === null) {
									lyr.layervisible = !lyr.layervisible;
									changed = true;
								} else {
									if (lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {
	
										for (const vs of lyr["varstyles_symbols"]) {			
											if (vs.key == found.subkey) {
												if (vs['hide'] !== undefined) {
													vs.hide = !vs.hide;
												} else {
													vs['hide'] = true;
												}
												changed = true;
												break;
											}
										}
									}
								}
								break;
							}
						};
	
						if (changed) {
							p_mapctx.maprefresh();
						}
	
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "default";
	
						break;
	
					case 'mousemove':
	
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "pointer";
						let msg;

						if (this.collapsedstate == "OPEN") {
							msg = p_mapctx.i18n.msg('ALTVIZ', true);
						} else {
							msg = p_mapctx.i18n.msg('SHOWTOC', true);
						}
	
						ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('ALTVIZ', true), [250,30]);	
						break;
	
					default:
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "default";
	
				}
	
			} else {
	
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();

				if (this.collapsedstate == "OPEN") {

					topcnv.style.cursor = "default";
					p_mapctx.renderingsmgr.clearAll(['transientmap', 'transientviz']);

				} else {

					switch(p_evt.type) {
	
						case 'touchend':
						case 'mouseup':
							this.inflate(p_mapctx);
							break;
							
						case 'mousemove':
							topcnv.style.cursor = "pointer";
							ctrToolTip(p_mapctx, p_evt, p_mapctx.i18n.msg('SHOWTOC', true), [250,30]);	
							break;

					}
				}
			}

			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('TOC');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('TOC');

				this.had_prev_interaction = false;
			}
		}

		if (ctx) {
			ctx.restore();
		}

		return ret;
	}	

	collapse(p_mapctx) {

		if (this.collapsedstate != "COLLAPSED") {

			const dee = 2 * this.expandenv;

			this.prevboxenv = [this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee];
			this.collapsedstate = "COLLAPSED";
			this.print(p_mapctx);

		}

		return (this.collapsedstate == "COLLAPSED");
	}

	isCollapsed() {
		return (this.collapsedstate == "COLLAPSED");
	}

	inflate(p_mapctx) {
		this.collapsedstate = "OPEN";
		this.print(p_mapctx);

		return (this.collapsedstate == "OPEN");
	}	
}


export class Info {
	// curr_layerkey;
	// curr_featid;
	callout;
	ibox;
	canvaslayer = 'interactive_viz';
	styles;
	mapctx;
	max_textlines_height;
	imgbuffer = new ImgLRUCache(128);

	constructor(p_mapctx, p_styles, opt_max_textlines_height) {
		this.styles = p_styles;
		this.callout = null;
		this.ibox = null;
		this.mapctx = p_mapctx;
		this.max_textlines_height = opt_max_textlines_height;
	}

	// mouse pick inside info box and over any of its items
	static infobox_pick(p_info_box, p_data_rec, p_fldname, p_column_idx) {
		
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

	static expand_image(p_image_obj) {
		this.mapctx.showImageOnOverlay(p_image_obj);
	}

	hover(p_layerkey, p_feature, p_scrx, p_scry) {

		// this.curr_layerkey = p_layerkey;
		// this.curr_featid = p_featid;
		//console.log("Maptip, layer:", p_layerkey, " feat:", p_featid);
		const currlayer = this.mapctx.tocmgr.getLayer(p_layerkey);
		//console.trace(currlayer, p_featid, p_feature);
		this.callout = new MaptipBox(this.mapctx, this.imgbuffer, currlayer, p_feature, this.styles, p_scrx, p_scry, true);
		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		this.callout.clear(ctx);
		this.callout.draw(ctx);

		return true;
	}
	pick(p_layerkey, p_feature, p_scrx, p_scry) {

		const currlayer = this.mapctx.tocmgr.getLayer(p_layerkey);
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

		let keyval, ret = false;
		const _keyval = p_feature.a[currlayer["infocfg"]["keyfield"]];

		if (currlayer["infocfg"]["keyisstring"] === undefined || !currlayer["infocfg"]["keyisstring"])
			keyval = _keyval;
		else
			keyval = _keyval.toString();

		if (keyval) {

			ret = true;

			const that = this;
			const lyr = this.mapctx.tocmgr.getLayer(p_layerkey);
	
			// done - [MissingFeat 0002] - Obter este URL de configs
			fetch(currlayer.url + "/doget", {
				method: "POST",
				body: JSON.stringify({"alias":lyr.infocfg.qrykey,"filtervals":[keyval],"pbuffer":0,"lang":"pt"})
			})
			.then(response => response.json())
			.then(
				function(responsejson) {
					// console.log("cust_canvas_baseclasses:828 - antes criação InfoBox");
					const currlayer = that.mapctx.tocmgr.getLayer(p_layerkey);
					that.ibox = new InfoBox(that.mapctx, that.imgbuffer, currlayer, responsejson, that.styles, p_scrx, p_scry, Info.infobox_pick, Info.expand_image, false, that.max_textlines_height);
					const ctx = that.mapctx.renderingsmgr.getDrwCtx(that.canvaslayer, '2d');
					that.ibox.clear(ctx);
					that.ibox.draw(ctx);	

					const ci = that.mapctx.getCustomizationObject();
					if (ci == null) {
						throw new Error("Info.pick, map context customization instance is missing")
					}
			
					const toc = ci.instances["toc"];
					const itool = that.mapctx.toolmgr.findTool("InfoTool");
					if (itool) {
						itool.setPanelActive(true);					
						itool.setTocCollapsed(toc.collapse(that.mapctx));
					}

					// console.log("cust_canvas_baseclasses:836 - ibox:", that.ibox);
					
				}
			).catch((error) => {
				console.error(`Impossible to fetch attributes on '${p_layerkey}'`, error);
			});	

		}

		return ret;

	} 

	clear(p_source_id) {

		if (p_source_id == 'TOC' || p_source_id == 'TOCMGR') {
			return;
		}

		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		if (this.ibox) {

			this.ibox.clear(ctx);

			const ci = this.mapctx.getCustomizationObject();
			if (ci == null) {
				throw new Error("Info.pick, map context customization instance is missing");
			}
	
			const toc = ci.instances["toc"];
			const itool = this.mapctx.toolmgr.findTool("InfoTool");
			if (itool) {
				if (itool.getPanelActive()) {
					itool.setPanelActive(false);					
				}
				if (toc.isCollapsed()) {
					itool.setTocCollapsed(toc.inflate(this.mapctx));
				}
			}
			//console.trace("clear all temporary");
			this.mapctx.renderingsmgr.clearAll(['temporary']);

		}

		// console.log("clear:", this.ibox!=null, this.callout!=null);

		if (this.callout) {
			this.callout.clear(ctx);
			this.mapctx.renderingsmgr.clearAll(['transientmap']);
		}

	}
	interact(p_evt) {
		if (this.ibox) {
			const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
			this.ibox.interact(ctx, p_evt);
		}

	}
}

export class OverlayMgr {

	canvaslayer = 'overlay_canvas';
	mapctx;
	is_active = false;
	box = null;
	constructor (p_mapctx) {
		this.mapctx = p_mapctx;
	}

	clear() {

		this.is_active = false;

		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		const mapdims = [];
		this.mapctx.renderingsmgr.getCanvasDims(mapdims);

		ctx.clearRect(0, 0, ...mapdims); 

		this.box = null;
	}

	drawImage(p_imageobj) {

		this.is_active = true;
		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();

		const mapdims = [];
		this.mapctx.renderingsmgr.getCanvasDims(mapdims);

		const rm = mapdims[0] / mapdims[1];
		const ri = p_imageobj.width / p_imageobj.height;

		let h, w;
		
		if (ri > rm) {
			w = Math.min(p_imageobj.width, 0.9 * mapdims[0]);
			h = w / ri;
		} else {
			h = Math.min(p_imageobj.height, 0.9 * mapdims[1]);
			w = h * ri;
		}

		const ox = (mapdims[0]-w)/2.0;
		const oy = (mapdims[1]-h)/2.0;
		this.box = [ox, oy, w, h];

		ctx.drawImage(p_imageobj, ox, oy, w, h);
		ctx.strokeStyle = "white";
		ctx.lineWidth = 1;
		ctx.strokeRect(ox, oy, w, h);

		ctx.fillStyle = "white";
		ctx.textAlign = "center";
		ctx.font = "14px sans-serif";

		ctx.shadowColor = "black" // string
		ctx.shadowOffsetX = 2; // integer
		ctx.shadowOffsetY = 2; // integer
		ctx.shadowBlur = 2; 
		ctx.fillText(this.mapctx.i18n.msg('CLKIMG2CLOSE', false), mapdims[0]/2.0, oy+h-20);


		ctx.restore();

	}

	interact(p_mapctx, p_evt) {

		let ret = false;
		if (this.is_active) {

			const topcnv = this.mapctx.renderingsmgr.getTopCanvas();
			topcnv.style.cursor = "default";
	
			ret = true;
			if (this.box != null && p_evt.clientX >= this.box[0] && p_evt.clientX <= this.box[0]+this.box[2] && p_evt.clientY >= this.box[1] && p_evt.clientY <= this.box[1]+this.box[3]) {
				if (['touchend', 'mouseup', 'mouseout', 'mouseleave'].indexOf(p_evt.type) >= 0) {
					this.clear();	
				} else if (p_evt.type == "mousemove") {
					topcnv.style.cursor = "pointer";
				}
			}
		}
		return ret;
	}
}

