

import {GlobalConst} from './constants.js';
import {drawTOCSymb, ctrToolTip, MapPrintInRect} from './customization_canvas_baseclasses.mjs';
import {I18n} from './i18n.mjs';

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
		this.name = "TOC";

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.TOC_BCKGRD;  // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.TOC_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.TOC_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.leftcol_width = GlobalConst.CONTROLS_STYLES.TOC_LEFTCOL_WIDTH;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.NORMALSZ_PX;
		this.varstylePX = GlobalConst.CONTROLS_STYLES.TOC_VARSTYLESZ_PX;
		this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
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

		this.expandenv = 1;

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
					lbl = "(void label)";	
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

	tocinteract(p_mapctx, p_evt) {

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
	
						ctrToolTip(p_mapctx, p_evt, msg, [250,30]);	
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