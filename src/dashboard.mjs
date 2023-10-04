import {GlobalConst} from './constants.js';
import {I18n} from './i18n.mjs';
import {thickTickedCircunference} from './canvas_geometries.mjs';

export class DashboardPanel {

	top;
	left;
	width;
	height;
	had_prev_interaction;
	
	canvaslayer = 'data_viz';

	fillStyleBack;
	activeStyleFront;
	navFillStyle;
	inactiveStyleFront;
	is_active;

	interaction_boxes = {};
	activepageidx;
	graphbox;
	ctrlarea_box;
	is_maprefresh_pending;
	data;
	// iconfuncs;

	constructor() {

		this.fillTextStyle = GlobalConst.CONTROLS_STYLES.SEG_TEXTFILL;  
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.SEG_BCKGRD; 
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.navFillStyle = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;

		this.normalszPX = GlobalConst.CONTROLS_STYLES.NORMALSZ_PX;
		this.captionszPX = GlobalConst.CONTROLS_STYLES.CAPTIONSZ_PX;

		this.counterszPX = GlobalConst.CONTROLS_STYLES.DASH_COUNTERFONTSIZE_PX;
		this.counterFontFamily = GlobalConst.CONTROLS_STYLES.DASH_COUNTERFONTFAMILY;
		this.counterTxtszPX = GlobalConst.CONTROLS_STYLES.DASH_COUNTERTXTFONTSIZE_PX;
		this.counterTxtFontFamily = GlobalConst.CONTROLS_STYLES.DASH_COUNTERTXTFONTFAMILY;
		this.counterGaugeStyle = GlobalConst.CONTROLS_STYLES.DASH_COUNTERGAUGESTYLE;

		this.captionfontfamily = GlobalConst.CONTROLS_STYLES.CAPTIONFONTFAMILY;
		this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		// this.datafontfamily = GlobalConst.CONTROLS_STYLES.SEG_DATAFONTFAMILY;
		// this.datacaptionfontsz = GlobalConst.CONTROLS_STYLES.SEG_DATACAPTIONFONTSIZE_PX;
		// this.datafontsz = GlobalConst.CONTROLS_STYLES.SEG_DATAFONTSIZE_PX;

		this.is_active = false;
		this.had_prev_interaction = false;

		this.activepageidx = null;
		//this.iconfuncs = {};

		this.graphbox = null;

		this.is_maprefresh_pending = false;
		this.total_count = 0;

		this.data = {}
	}

	static widgetBox(p_box, p_layout_division_list, p_size_list, p_upperleft_list) {

		const unitwidth = p_box[2] / p_layout_division_list[0];
		const unitheight = p_box[3] / p_layout_division_list[1];
	
		const upperleftx = p_box[0] + unitwidth * p_upperleft_list[0];
		const upperlefty = p_box[1] + unitheight * p_upperleft_list[1];
	
		const width = p_size_list[0] * unitwidth;
		const height = p_size_list[1] * unitheight;
	
		return [upperleftx, upperlefty, width, height];
	
	
	}

	calcDims(p_mapctx) {

		const dims=[];
		p_mapctx.getCanvasDims(dims);

		const r = dims[0] / dims[1];

		this.width = Math.min(GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[1], Math.max(GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]));
		// console.log("------- width ---------");
		// console.log("dim width:", dims[0]);
		// console.log("max:", GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]);
		// console.log("min:", GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[1], Math.max(GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]));
		// console.log("calc width:", this.width);
		// console.log("-----------------------");
		this.height = this.width / r;

		this.top = Math.round((dims[1] - this.height) / 2.0);
		this.left = Math.round((dims[0] - this.width) / 2.0);

	}

	drawPagenavItems(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();

		const pagekeys = [];
		for (let k in this.interaction_boxes) {
			if (k.startsWith("dashpage_")) {
				pagekeys.push(k);
			}
		}
		for (let k of pagekeys) {
			delete this.interaction_boxes[k];
		}

		const ost = 2;
		const size = 16;
		const sep = 6;
		const texthoffset = 1;
		const textvoffset = 4;
		//const rightmost = this.left + this.width - this.margin_offset; 
		const rs = this.graphbox;
		const rightmost = rs[0] + rs[2];

		let origx;
		let origy = rs[1] - size - sep;

		ctx.strokeStyle = this.navFillStyle;
		ctx.lineWidth = 1;

		ctx.font = '10px sans-serif';
		ctx.textAlign = "left";

		if (this.activepageidx > (this.sorted_pairs_collection.length-1)) {
			this.activepageidx = 0;
		}

		for (let tx, ox, i = (this.sorted_pairs_collection.length-1); i>=0; i--) {

			if (this.activepageidx == null) {
				this.activepageidx = 0;
			}
			
			// console.log(i, (1 + (p_sorted_pairs_collection.length-1-i)), (p_sorted_pairs_collection.length-1-i));
			
			origx = rightmost - (1 + (this.sorted_pairs_collection.length-1-i)) * size - (this.sorted_pairs_collection.length-1-i) * sep - ost;

			// console.log(p_rightmost, "==", origx+size);


			this.interaction_boxes[`dashpage_${(i+1)}`] = [origx, origy, size, size];
			tx = (i+1).toString();
			ox = Math.round(origx+texthoffset+(size/4));

			ctx.clearRect(origx, origy, size, size);
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(origx, origy, size, size);

			if (i==this.activepageidx) {
				ctx.fillStyle = this.navFillStyle;
				ctx.fillRect(origx, origy, size, size);
				ctx.fillStyle = "black";
				ctx.fillText(tx, ox, origy+size-textvoffset);	
			} else {
				ctx.fillStyle = this.navFillStyle;
				ctx.fillText(tx, ox, origy+size-textvoffset);	
			}
			ctx.strokeRect(origx, origy, size, size);

		}

		ctx.restore();

	}

	drawCtrlButtons(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		try {
			ctx.save();

			const msgskeys = ["REFRESH", "CLOSE"];
			const msgs = [];
			const tms = [];

			for (let mk of msgskeys) {
				msgs.push(p_mapctx.i18n.msg(mk, true));
			}

			let w, h, msg, tm, asc = 0, desc = 0, boxindent=null, selbox, cmdisactive;

			ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
			for (msg of msgs) {
				tms.push(ctx.measureText(msg));
			}

			for (tm of tms) {
				asc = Math.max(asc, tm.actualBoundingBoxAscent);
				desc = Math.max(desc, tm.actualBoundingBoxDescent);
			}

			ctx.clearRect(...this.ctrlarea_box); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(...this.ctrlarea_box);

			ctx.fillStyle = this.fillTextStyle;
			ctx.strokeStyle = this.fillTextStyle;
			ctx.lineWidth = 1;

			let slack = GlobalConst.CONTROLS_STYLES.TEXTBOXSLACK;
			const cota = this.ctrlarea_box[1] + 2*this.normalszPX;

			let msgidx = msgskeys.length - 1;
			cmdisactive = true;
			while (msgs.length > 0) {

				msg = msgs.pop();
				tm = tms.pop();

				w = tm.width+2*slack;
				h = 2*slack + asc + desc;

				if (boxindent) {
					boxindent = boxindent - w - this.margin_offset;
				} else {
					boxindent = this.ctrlarea_box[0] + this.ctrlarea_box[2] - w;
				}

				/*if (msgskeys[msgidx] == "CLEAN") {
					cmdisactive = this.temp_selected_classes.size > 0;
				} else if (msgskeys[msgidx] == "SLICINGACT") {
					cmdisactive = this.classesSelectionHasChanged();
				} */
				cmdisactive = true;

				if (!cmdisactive) {
					ctx.save();
					ctx.fillStyle = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;
				}
				ctx.fillText(msg, boxindent+slack, cota);
				if (!cmdisactive) {
					ctx.restore();
				}

				selbox = [boxindent, cota - slack - asc, w, h];
				ctx.strokeRect(...selbox);
					
				if (cmdisactive) {
					this.interaction_boxes[`cmd_${msgskeys[msgidx]}`] = selbox;
				}

				msgidx--;
			}
				
		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}		
	
	}	

	fetchChartData(p_mapctx, p_cota) {

		const url = p_mapctx.cfgvar["basic"]["dashboard"]["url"];
		const layoutdivision = p_mapctx.cfgvar["basic"]["dashboard"]["layoutdivision"];
		const cfgkeyorder = [];

		const cfgkeydata = {};
		for (let k in p_mapctx.cfgvar["basic"]["dashboard"]["keys"]) {
			cfgkeydata[k] = p_mapctx.cfgvar["basic"]["dashboard"]["keys"][k];
			cfgkeyorder.push(k);
		}

		const stable_cfgkeyorder = [...cfgkeyorder];

		this.fetchChartDataNext(p_mapctx, stable_cfgkeyorder, cfgkeyorder, cfgkeydata, url, layoutdivision, p_cota);

	}

	drawWidgets(p_mapctx, p_keys, p_layoutdivision, p_cota) {

		let ctx, centerx, centery, current_data, value, txtdims, lbl, lblsz, r, iniang, finalang;

		if (p_keys.length < 1) {
			return;
		}

		const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();

		const indent = this.left+2*this.margin_offset;
		const ctrlbox_height = 3*this.normalszPX;

		let counterfont, countersize, txtfont, txtsize, gaugeStyle, cota = p_cota + 3 * this.normalszPX - this.margin_offset;
		let graphbox = [indent, cota, this.width-4*this.margin_offset, this.height+this.top-cota - 2*this.margin_offset - ctrlbox_height]; 

		ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();
		
		ctx.lineWidth = 1;
		ctx.strokeStyle = "red";

		ctx.strokeRect(...graphbox);
		ctx.restore();

		for (let key of p_keys) {

			current_data = this.data[key];

			switch (current_data["type"]) {

				case "counter":

					if (current_data["mode"] !== undefined) {

						switch(current_data["mode"]) {

							case "total":
								value = current_data["remoteitems"]["sumofclasscounts"];
								break;

							case "classes": 
								value = current_data["remoteitems"]["classescount"];
								break;

							default:
								console.error(`invalid 'mode': ${current_data["mode"]}`);
								value = 0;

						}

					} else {
						value = current_data["remoteitems"]["sumofclasscounts"];
					}


					const [left, top, width, height] = this.constructor.widgetBox(graphbox, p_layoutdivision, current_data["layout"]["size"], current_data["layout"]["upperleft"]);

					centerx = left + width / 2.0;
					centery = top + height / 2.0;

					ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
					ctx.save();

					if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_counterfont"] !== undefined) {
						counterfont = p_mapctx.cfgvar["basic"]["style_override"]["dash_counterfont"];
					} else {
						counterfont = this.counterFontFamily;
					}

					if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_countersize"] !== undefined) {
						countersize = p_mapctx.cfgvar["basic"]["style_override"]["dash_countersize"];
					} else {
						countersize = this.counterszPX;
					}

					if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_countertextfont"] !== undefined) {
						txtfont = p_mapctx.cfgvar["basic"]["style_override"]["dash_countertextfont"];
					} else {
						txtfont = this.counterTxtFontFamily;
					}

					if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_countertextsize"] !== undefined) {
						txtsize = p_mapctx.cfgvar["basic"]["style_override"]["dash_countertextsize"];
					} else {
						txtsize = this.counterTxtszPX;
					}

					if (current_data["gauge"] !== undefined) {

						if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_countergaugestyle"] !== undefined) {
							gaugeStyle = p_mapctx.cfgvar["basic"]["style_override"]["dash_countergaugestyle"];
						} else {
							gaugeStyle = this.counterGaugeStyle;
						}		
						
						if (current_data["gauge"]["style"] !== undefined) {
							gaugeStyle = current_data["gauge"]["style"];
						}

					}

					// paint gauge stroke
					if (current_data["gauge"] !== undefined) {
					
						r = parseInt(value) / 22000;
						iniang = 5 * Math.PI / 6.0;
						finalang = iniang + (r * 8 * Math.PI / 6.0);

						ctx.save();

						ctx.beginPath();
						ctx.lineWidth = 10;
						ctx.strokeStyle = gaugeStyle;
						ctx.arc(centerx, centery, 104, iniang, finalang);
						ctx.stroke();

						ctx.restore();
					}

					ctx.lineWidth = 1;
					ctx.strokeStyle = this.activeStyleFront;
					ctx.fillStyle = this.activeStyleFront;

					ctx.textAlign = "center";
					lblsz = 12;
					ctx.font = `${lblsz}px sans-serif`;
					//ctx.strokeRect(centerx - 50, centery - 50, 100, 100);

					if (current_data["gauge"] !== undefined) {

						thickTickedCircunference(ctx, [centerx, centery], 120, 18, {
							"max": current_data["gauge"]["max"],
							"divisor": current_data["gauge"]["divisor"],
							"unitdivision": current_data["gauge"]["unitdivision"],
							"unitticks": current_data["gauge"]["unitticks"],
							"unitgroupcnt": current_data["gauge"]["unitgroupcnt"] 
						}, true, true);

					} else {
	
						thickTickedCircunference(ctx, [centerx, centery], 120, 18);
						
					}

					// ctx.beginPath();
					// ctx.moveTo(centerx - 50, centery);
					// ctx.lineTo(centerx + 50, centery);
					// ctx.stroke();

					ctx.strokeStyle = this.activeStyleFront;

					ctx.font = `${countersize}px ${counterfont}`;

					txtdims = ctx.measureText(value);				
					ctx.fillText(value, centerx, centery);

					ctx.font = `${txtsize}px ${txtfont}`;

					if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(current_data["layout"]["text"]) >= 0) {
						lbl = I18n.capitalize(p_mapctx.cfgvar["basic"]["msgs"][lang][current_data["layout"]["text"]]);
					} else {
						lbl = I18n.capitalize(current_data["layout"]["text"]);
					}
					txtdims = ctx.measureText(lbl);				
					ctx.fillText(lbl, centerx, centery + (1.4 * txtsize));

											
					ctx.restore();
				
					break;
			}


		}

	}

	fetchChartDataNext(p_mapctx, p_keys, p_keys_worklist, p_keycfgdata, p_url, p_layoutdivision, p_cota) {

		const that  = this;

//		console.log("265:", JSON.stringify(p_keys), JSON.stringify(p_keycfgdata));

		let key = p_keys_worklist[0];

		console.assert(Array.isArray(p_keycfgdata[key]), `dashboard config for ${key} is not an array: ${p_keycfgdata[key]}`);

//		console.log("p_keydata::", JSON.stringify(p_keycfgdata));

		let ctrlcnt = 100;
		while (p_keycfgdata[key].length == 0 && ctrlcnt > 0) {
			ctrlcnt--;
			p_keys_worklist.shift();
			if (p_keys_worklist.length == 0) {
				break;
			}
			key = p_keys_worklist[0];
		}

		if (p_keys_worklist.length == 0 || p_keycfgdata[key].length == 0) {
			this.drawWidgets(p_mapctx, p_keys, p_layoutdivision, p_cota);
			return;
		}

		let keycfgdata = p_keycfgdata[key].shift();
		let fieldname = keycfgdata["fieldname"];

		fetch(p_url + "/astats", {
			method: "POST",
			body: JSON.stringify({"key":key,"options":{"col": fieldname, "clustersize": -1}})
		})
		.then(response => response.json())
		.then(
			function(responsejson) {
				//console.log(responsejson);

				const fields = Object.keys(responsejson);
				console.assert(fields.indexOf(fieldname) >= 0, "field not found in dashboard data config, key '%s', column '%s'", key, fieldname) 

				if (that.data[key] === undefined) {
					that.data[key] = {
						"layout": {
							"upperleft": keycfgdata["upperleft"],
							"size": keycfgdata["size"],
							"text": keycfgdata["text"]
						},
						"type": keycfgdata["type"],
						"remoteitems":{}
					};
				}

				that.data[key]["remoteitems"] = responsejson[fieldname];

				if (keycfgdata["gauge"] !== undefined) {
					that.data[key]["gauge"] = keycfgdata["gauge"];
				}
				if (keycfgdata["mode"] !== undefined) {
					that.data[key]["mode"] = keycfgdata["mode"];
				}
				// Create items array
				/*
				const varvalues = Object.keys(dict['classes']);
				const items = varvalues.map(function(key) {
					return [key, dict['classes'][key].cnt];
				});

				// Sort the array based on the second element
				items.sort(function(first, second) {
					let ret;
					if (second[1] == first[1]) {
						// force second[0] to string
						ret = ('' + first[0]).localeCompare(second[0]);
					} else {
						ret = second[1] - first[1];
					}
					return ret;
				});

				console.assert(items[0][1] > items[items.length-1][1], "slicing: classes sort impossible, all classes have same counts");

				that.classes_data = dict['classes'];
				*/

				that.fetchChartDataNext(p_mapctx, p_keys, p_keys_worklist, p_keycfgdata, p_url, p_layoutdivision, p_cota);
				
			}
		).catch((error) => {
			console.error(`Impossible to fetch stats on key '${key}'`, error);
		});	

	}

	print(p_mapctx) {

		if (!this.is_active) {
			return;
		}

		this.clear(p_mapctx);
		this.calcDims(p_mapctx);

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();
		
		ctx.fillStyle = this.fillStyleBack;
		ctx.fillRect(this.left, this.top, this.width, this.height);

		ctx.lineWidth = 1;
		ctx.strokeStyle = this.activeStyleFront;
		ctx.strokeRect(this.left, this.top, this.width, this.height);

		let msg = p_mapctx.i18n.msg('DASH', true);
		ctx.fillStyle = this.fillTextStyle;
		ctx.textAlign = "left";

		let cota  = this.top+this.margin_offset+this.captionszPX;
		let indent = this.left+2*this.margin_offset;
		ctx.font = `${this.captionszPX}px ${this.captionfontfamily}`;
		ctx.fillText(msg, indent, cota);
		
		ctx.restore();

		this.fetchChartData(p_mapctx, cota);


	}

	clear(p_mapctx) {
		// data_viz layer intended for 'singletons',lets clear the whole lot
		const dims=[];

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		p_mapctx.getCanvasDims(dims);
		ctx.clearRect(0, 0, ...dims); 
	}

	setState(p_mapctx, p_activeflag) {

		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			throw new Error("Dashboard, map context customization instance is missing")
		}
		const toc = ci.instances["toc"];

		this.is_active = p_activeflag;
		if (this.is_active) {
			this.print(p_mapctx);

			// collapse TOC
			if (toc) {
				toc.collapse(p_mapctx, 'DASHBOARD');
			}

		} else {

			// console.log("INFLATING TOC")

			// inflate TOC
			if (toc) {
				toc.inflate(p_mapctx);
			}
			this.clear(p_mapctx);
		}
	}

	closeAction(p_mapctx, p_env) {
		this.setState(p_mapctx, false);		
		if (this.is_maprefresh_pending) {
			this.is_maprefresh_pending = false;
			if (p_env) {
				p_mapctx.transformmgr.zoomToRect(...p_env);		
			} else {
				p_mapctx.maprefresh();
			}
		}						
	}

	interact(p_mapctx, p_evt) {

		let topcnv, ret = false, interact_box_key = null;

		if (!this.is_active) {
			return ret;
		}

		if (p_evt.clientX >= this.left && 
			p_evt.clientX <= this.left+this.width && 
			p_evt.clientY >= this.top && 
			p_evt.clientY <= this.top+this.height) {

			ret = true;
		}

		if (ret) {

			for (let k in this.interaction_boxes) {

				if (p_evt.clientX >= this.interaction_boxes[k][0] && 
					p_evt.clientX <= this.interaction_boxes[k][0]+this.interaction_boxes[k][2] && 
					p_evt.clientY >= this.interaction_boxes[k][1] && 
					p_evt.clientY <= this.interaction_boxes[k][1]+this.interaction_boxes[k][3]) {
						interact_box_key = k;
						break;
				}
			}

			switch(p_evt.type) {

				case "touchend":
				case "mouseup":

					if (interact_box_key) {

						if (interact_box_key == "slicingattr") {

							let lbl, constraintitems=null, that = this;
							const seldict = {};
							const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();
	
							for (let k of this.itemkeys) {
								if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(this.itemdict[k].label) >= 0) {
									lbl = p_mapctx.cfgvar["basic"]["msgs"][lang][this.itemdict[k].label];
								} else {
									lbl = this.itemdict[k].label;
								}	
								seldict[k] = lbl;	
							}
	
							if (this.active_item) {
								constraintitems = {'selected': `${this.active_item[0]}#${this.active_item[1]}` };
							}
							p_mapctx.getCustomizationObject().messaging_ctrlr.selectInputMessage(
								p_mapctx.i18n.msg('SELSLICINGMBY', true), 
								seldict,
								(evt, p_result, p_value) => { 
									if (p_value) {
										that.active_key = p_value;
										that.print(p_mapctx);
									}
								},
								constraintitems
							);

						} else if (interact_box_key.startsWith("dashpage_")) {

							let page = parseInt(interact_box_key.replace("dashpage_", ""));

							// console.log(page, this.activepageidx, this.sorted_pairs_collection.length);

							if (page-1 != this.activepageidx) {

								console.assert((page-1) >= 0 && page <= this.sorted_pairs_collection.length, `invalid page ${page-1}, should be in interval [0, ${this.sorted_pairs_collection.length}[`)

								this.activepageidx = page-1;

								// QQ Coisa 
							}

						} else if (interact_box_key.startsWith("widgetbox_")) {

							let keyvalue = interact_box_key.replace("widgetbox_", "");


						} else if (interact_box_key.startsWith("cmd_")) {

							let cmdvalue = interact_box_key.replace("cmd_", "");

							let refill = false;
							switch (cmdvalue) {
									
								case "CLOSE":
									const ci = p_mapctx.getCustomizationObject();
									if (ci == null) {
										throw new Error("Dashboard, CLOSE interaction, map context customization instance is missing")
									}
									const analysispanel = ci.instances["analysis"];
									if (analysispanel) {
										analysispanel.deactivateSlicingPanelOpenedSign(p_mapctx);
									}
									this.closeAction(p_mapctx);					
	
									break;
	
							}

							if (refill) {
								
								// refill

							}

						}
						

					}

					break;

				case "mousemove":

					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					if (interact_box_key) {
						topcnv.style.cursor = "pointer";						
					} else {
						topcnv.style.cursor = "default";
					}
					break;

			}
	
		}

		if (ret) {

			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('SEG');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('SEG');

				this.had_prev_interaction = false;
			}
		}

		return ret;
	}

}