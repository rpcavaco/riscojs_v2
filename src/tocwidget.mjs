

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
	itemtypes_preventing_inflation;
	editing_layer_key;

	constructor(p_mapctx) {

		super();

		// BASIC_CONFIG_DEFAULTS_OVERRRIDE
		// ** - can be overrriden in basic config, at 'style_override' group, 
		//      creating a key with same property name in CONTROLS_STYLES, but in lower case

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.TOC_BCKGRD;  // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.TOC_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.TOC_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.leftcol_width = GlobalConst.CONTROLS_STYLES.TOC_LEFTCOL_WIDTH;

		this.varstylePX = null;

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined) {

			if (p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"] !== undefined) {		
				this.fontfamily = p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"];
			} else {
				this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
			}

			if (p_mapctx.cfgvar["basic"]["style_override"]["normalsz_px"] !== undefined) {		
				this.normalszPX = p_mapctx.cfgvar["basic"]["style_override"]["normalsz_px"];
			} else {
				this.normalszPX = GlobalConst.CONTROLS_STYLES.NORMALSZ_PX;
			}

			if (p_mapctx.cfgvar["basic"]["style_override"]["toc"] !== undefined) {
				if (p_mapctx.cfgvar["basic"]["style_override"]["toc"]["varstylesz_px"] !== undefined) {		
					this.varstylePX = p_mapctx.cfgvar["basic"]["style_override"]["toc"]["varstylesz_px"];
				}
			}

			if (this.varstylePX == null) {
				this.varstylePX = GlobalConst.CONTROLS_STYLES.TOC_VARSTYLESZ_PX;
			}			
		}

		this.canvaslayer = 'service_canvas'; 

		this.left = 300;
		this.top = this.margin_offset;
		this.boxh = {
			"OPEN": 300,
			"COLLAPSED": 60
		};
		this.boxw = {
			"OPEN": 100,
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

		this.itemtypes_preventing_inflation = new Set();
	}

	setTOCMgr(p_tocmgr) {
		this.tocmgr = p_tocmgr;
	}

	_print(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		// cal width
		let lbl, lyr_labels={}, lyr_fc = {}, lyr_vs_captions={}, lyr_vs_fc={}, varstyle_caption, lang, max_lbl_w = 0, varstyles_fc, cfgfont;

		let paint_order = [], temp_paint_order = [], forced_order_cnt = 0;
		temp_paint_order.length = this.tocmgr.forced_lorder.length;
		for (let ti, lyr, li=0; li<this.tocmgr.layers.length; li++) {
			
			lyr = this.tocmgr.layers[li];
			// skip raster basemap
			if (lyr['featCount'] === undefined) {
				continue;
			}

			ti = this.tocmgr.forced_lorder.indexOf(lyr.key);
			if (ti >= 0) {
				forced_order_cnt++;
				temp_paint_order[ti] = li;
			}
		}

		if (forced_order_cnt > 0) {
			if (forced_order_cnt != this.tocmgr.forced_lorder.length) {
				console.warn("toclorder invalid, contains non-existing layer keys");
			} else {
				paint_order = [...temp_paint_order.toReversed()];
			}
		}

		if (paint_order.length == 0) {
			for (let lyr, li=this.tocmgr.layers.length-1; li>=0; li--) {
				lyr = this.tocmgr.layers[li]; 
				// skip raster basemap
				if (lyr['featCount'] === undefined) {
					continue;
				}
				if (lyr["label"] !== undefined && lyr["label"] != "none") {
					paint_order.push(li);
				}
			}
		}

		for (const lyr of this.tocmgr.layers) {

			if (lyr["label"] !== undefined && lyr["label"] != "none") {

				// skip raster basemap
				if (lyr['featCount'] === undefined) {
					continue;
				}

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
					console.warn(`[WARN] layer ${lyr.key} varstyles dont apply to all features - all f.count:${lyr_fc[lyr.key]},  vstyles f.count:${varstyles_fc}`);
				}
			}
		}

		// this.leftcol_width is merged when necessary, in max_lbl_w
		this.boxw["OPEN"] = Math.max(this.boxw["OPEN"], max_lbl_w + 2 * this.margin_offset);

		let grcota, cota, maxcota, count, lyr, txleft, indent_txleft, step, substep, mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		this.left = mapdims[0] - (this.boxw[this.collapsedstate] + this.margin_offset);
		let symbxcenter = this.left + this.margin_offset + 0.5 * this.leftcol_width;

		// const canvas_dims = [];
		// console.log("::229:: this.canvaslayer, maxw:", this.canvaslayer, max_lbl_w);
		if (this.prevboxenv) {
			ctx.clearRect(...this.prevboxenv); 	
			this.prevboxenv = null;
		} else {
			const dee = 2 * this.expandenv;
			ctx.clearRect(this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee); 	
		}
		
		try {
			ctx.textAlign = "left";
			indent_txleft = this.left + this.margin_offset + this.leftcol_width;
			txleft = this.left + this.margin_offset;

			let toc_sep, vs_toc_sep;

			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"]["separation_factor"] !== undefined) {
				toc_sep = p_mapctx.cfgvar["basic"]["style_override"]["toc"]["separation_factor"];
			} else {
				toc_sep = GlobalConst.CONTROLS_STYLES.TOC_SEPARATION_FACTOR;
			}
	
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"]["varstyle_separation_factor"] !== undefined) {
				vs_toc_sep = p_mapctx.cfgvar["basic"]["style_override"]["toc"]["varstyle_separation_factor"];
			} else {
				vs_toc_sep = GlobalConst.CONTROLS_STYLES.TOC_VARSTYLE_SEPARATION_FACTOR;
			}	

			// Measure height
			count = 0;
			maxcota = 0;
			cota = 0;
			let varstyles_groups_found = [];
			for (let li of paint_order) {

				lyr = this.tocmgr.layers[li]; 
				if (lyr["label"] !== undefined && lyr["label"] != "none") {
					
					count++;

					if (count == 1) {
						cota = 2* this.margin_offset + this.normalszPX;
					} else {
						cota += toc_sep * this.normalszPX;
					}

					if (lyr["varstyles_symbols"] !== undefined) {
						ctx.font = `${this.varstylePX}px ${this.fontfamily}`;
						for (const vs of lyr["varstyles_symbols"]) {
							if (vs["vsgroup"] !== undefined && vs["vsgroup"] !== "none") {
								if (varstyles_groups_found.indexOf(vs["vsgroup"]) < 0) {
									varstyles_groups_found.push(vs["vsgroup"]);
									cota += this.margin_offset/4.0 + vs_toc_sep * this.varstylePX;
								}
							}
							cota += vs_toc_sep * this.varstylePX;
						}
					}				
				}

			}
			maxcota = cota;
			this.boxh["OPEN"] = maxcota + this.margin_offset;

			// background
			
			// BASIC_CONFIG_DEFAULTS_OVERRRIDE ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc_bckgrd"] !== undefined) {
				ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["toc_bckgrd"];
			} else {
				ctx.fillStyle = this.fillStyleBack;
			}
			ctx.fillRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);
			
			ctx.strokeStyle = this.activeStyleFront;
			ctx.lineWidth = this.strokeWidth;
			ctx.strokeRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);

			if (this.collapsedstate == "OPEN") {
						
				count = 0;
				cota = 0;
				step = toc_sep * this.normalszPX;
				substep = vs_toc_sep * this.varstylePX;
				varstyles_groups_found.length = 0;

				cfgfont = `${this.normalszPX}px ${this.fontfamily}`;

				for (let li of paint_order) {

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
							if (lyr.key == this.editing_layer_key) {
								ctx.save();
								ctx.font = `bold ${cfgfont}`;
								ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_EDITLAYER_ENTRY_COLOR;
							}
							ctx.fillText(lbl, indent_txleft, cota);	
							if (lyr.key == this.editing_layer_key) {
								ctx.restore();
							}	

						} else {

							if (lyr.key == this.editing_layer_key) {
								ctx.save();
								ctx.font = `bold ${cfgfont}`;
								ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_EDITLAYER_ENTRY_COLOR;
							}

							ctx.fillText(lbl, txleft, cota);	

							if (lyr.key == this.editing_layer_key) {
								ctx.restore();
							}							
						}

						// drawing 'strikethru' symbol indicating invisibility
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

						if (lyr.layervisible && lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {

							// console.log("334:", lyr["varstyles_symbols"] )
							ctx.font = `${this.varstylePX}px ${this.fontfamily}`;

							let vslbl;
							for (const vs of lyr["varstyles_symbols"]) {

								varstyle_caption = lyr_vs_captions[lyr.key][vs.key]

								if (vs["vsgroup"] !== undefined && vs["vsgroup"] !== "none") {
									if (varstyles_groups_found.indexOf(vs["vsgroup"]) < 0) {
										varstyles_groups_found.push(vs["vsgroup"]);
										
										cota += this.margin_offset/4.0 + substep;
										
										ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_ACTIVECOLOR;

										if (lyr['msgsdict'] !== undefined && lyr.msgsdict[lang] !== undefined && Object.keys(lyr.msgsdict[lang]).indexOf(vs["vsgroup"]) >= 0) {
											vslbl = I18n.capitalize(lyr.msgsdict[lang][vs["vsgroup"]]);
										} else {
											vslbl = I18n.capitalize(vs["vsgroup"]);
										}

										ctx.fillText(p_mapctx.i18n.msg(vslbl, true), txleft+this.margin_offset, cota);
									}
								}

								if (lyr.filteredFeatCount(vs.func) > 0) {
									ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_ACTIVECOLOR;
								} else {
									ctx.fillStyle = GlobalConst.CONTROLS_STYLES.TOC_INACTIVECOLOR;
								}
											
								grcota = 4 + cota + 0.5 * substep;

								drawTOCSymb(p_mapctx, lyr, ctx, symbxcenter, grcota, substep, vs);							
								cota += substep;
								ctx.fillText(varstyle_caption, indent_txleft, cota);

								if (vs['hide'] !== undefined && vs['hide']) {
									ctx.save();
									ctx.strokeStyle = GlobalConst.CONTROLS_STYLES.TOC_STRIKETHROUGH_FILL;
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

	getHeight() {
		return this.boxh[this.collapsedstate];
	}

	getWidth() {
		return this.boxw[this.collapsedstate];
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

		let ctx = null, varstyles_groups_found=[];
		if (SHOWROWS) {
			ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
			ctx.save();
			ctx.fillStyle = "cyan";	
			ctx.strokeStyle = "cyan";	
			ctx.font = '14px sans-serif';
		}

		let toc_sep, vs_toc_sep;

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"]["separation_factor"] !== undefined) {
			toc_sep = p_mapctx.cfgvar["basic"]["style_override"]["toc"]["separation_factor"];
		} else {
			toc_sep = GlobalConst.CONTROLS_STYLES.TOC_SEPARATION_FACTOR;
		}

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["toc"]["varstyle_separation_factor"] !== undefined) {
			vs_toc_sep = p_mapctx.cfgvar["basic"]["style_override"]["toc"]["varstyle_separation_factor"];
		} else {
			vs_toc_sep = GlobalConst.CONTROLS_STYLES.TOC_VARSTYLE_SEPARATION_FACTOR;
		}		

		const stepEntry = toc_sep * this.normalszPX - 2;
		const stepSubEntry = vs_toc_sep * this.normalszPX - 2;
		let next, prev = this.top + this.margin_offset;

		const width = this.boxw[this.collapsedstate] - 2* this.margin_offset;
		const left = this.left + this.margin_offset

		let i=-1, ret = false, step;
		let changed=false, found = null, topcnv;

		if (p_evt.offsetX >= this.left && p_evt.offsetX <= this.left+this.boxw[this.collapsedstate] && p_evt.offsetY >= this.top && p_evt.offsetY <= this.top+this.boxh[this.collapsedstate]) {

			if (this.collapsedstate == "OPEN") {

				for (let lyr, li=this.tocmgr.layers.length-1; li>0; li--) {

					lyr = this.tocmgr.layers[li];
					if (lyr["label"] !== undefined && lyr["label"] != "none") {
						
						i++;
						if (lyr.layervisible && lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {
							step = stepSubEntry;
						} else {
							step = stepEntry + 2;
						}
						next = prev + step;

						// use prev, next
						if (ctx) {
							ctx.fillText(li.toString(), left, prev+step);
							ctx.strokeRect(left, prev, width, step);
						}
						if (p_evt.offsetX >= left && p_evt.offsetX <= this.left+width && p_evt.offsetY >= prev && p_evt.offsetY <= next) {
							found = {
								"key": lyr.key,
								"subkey": null
							};
							break;
						}

						prev = next;
						
						if (lyr.layervisible && lyr["varstyles_symbols"] !== undefined && lyr["varstyles_symbols"].length > 0) {
							for (let vs, vi=0; vi<lyr["varstyles_symbols"].length; vi++) {

								vs = lyr["varstyles_symbols"][vi];

								i++;
								if (vi < (lyr["varstyles_symbols"].length-1)) {
									step = stepSubEntry;
								} else {
									step = stepEntry - 1;
								}

								if (vs["vsgroup"] !== undefined && vs["vsgroup"] !== "none") {
									if (varstyles_groups_found.indexOf(vs["vsgroup"]) < 0) {
										varstyles_groups_found.push(vs["vsgroup"]);
										
										prev += step;
									}
								}
								next = prev + step;

								// use prev, next
								if (ctx) {
									ctx.strokeRect(left, prev, width, step);
								}
								if (p_evt.offsetX >= left && p_evt.offsetX <= this.left+width && p_evt.offsetY >= prev && p_evt.offsetY <= next) {
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

	collapse(p_mapctx, p_from_itemtype) {

		if (this.collapsedstate != "COLLAPSED") {

			const dee = 2 * this.expandenv;

			this.prevboxenv = [this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee];
			this.collapsedstate = "COLLAPSED";
			this.print(p_mapctx);

		}

		if (p_from_itemtype === undefined || p_from_itemtype == 'undefined') {
			console.trace("TOC COLLAPSE ERROR, missing p_from_itemtype:", p_from_itemtype);
		}

		this.itemtypes_preventing_inflation.add(p_from_itemtype);

		return (this.collapsedstate == "COLLAPSED");
	}

	isCollapsed() {
		return (this.collapsedstate == "COLLAPSED");
	}

	inflate(p_mapctx, p_from_itemtype) {

		if (p_from_itemtype) {
			this.itemtypes_preventing_inflation.delete(p_from_itemtype);
		} else {
			this.itemtypes_preventing_inflation.clear();
		}

		if (this.itemtypes_preventing_inflation.size < 1) {

			this.collapsedstate = "OPEN";
			this.print(p_mapctx);
		}

		return (this.collapsedstate == "OPEN");
	}	

	setEditingLayerKey(p_editing_layer_key) {
		this.editing_layer_key = p_editing_layer_key;
	}

	clearEditingLayerKey() {
		this.editing_layer_key = null;
	}	
}
