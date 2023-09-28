import {GlobalConst} from './constants.js';
import {I18n} from './i18n.mjs';
import {genRainbowColor, canvas_text_wrap, symmetricDifference} from './utils.mjs';
import {addEnv, genOrigEnv, envArea, envInteriorOverlap, ensureMinDimEnv, distSquared2D} from './geom.mjs';

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

		this.captionfontfamily = GlobalConst.CONTROLS_STYLES.CAPTIONFONTFAMILY;
		this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		this.datafontfamily = GlobalConst.CONTROLS_STYLES.SEG_DATAFONTFAMILY;
		this.datacaptionfontsz = GlobalConst.CONTROLS_STYLES.SEG_DATACAPTIONFONTSIZE_PX;
		this.datafontsz = GlobalConst.CONTROLS_STYLES.SEG_DATAFONTSIZE_PX;

		this.is_active = false;
		this.had_prev_interaction = false;

		this.activepageidx = null;
		//this.iconfuncs = {};

		this.graphbox = null;

		this.is_maprefresh_pending = false;
		this.total_count = 0;

		this.data = {}
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

	fetchChartData(p_mapctx) {

		const url = p_mapctx.cfgvar["basic"]["dashboard"]["url"];

		const keyorder = [];
		const keys = {};
		for (let k in p_mapctx.cfgvar["basic"]["dashboard"]["keys"]) {
			keyorder.push(k);
			keys[k] = p_mapctx.cfgvar["basic"]["dashboard"]["keys"][k];
		}

		this.fetchChartDataNext(p_mapctx, keyorder, keys, url) 

	}

	fetchChartDataNext(p_mapctx, p_keyorder, p_keys, p_url) {

		const that  = this;

		let key = p_keyorder[0];

		console.assert(Array.isArray(p_keys[key]), `dashboard config for ${key} is not an array: ${p_keys[key]}`);

		let ctrlcnt = 100;
		while (p_keys[key].length == 0 && ctrlcnt > 0) {
			ctrlcnt--;
			p_keyorder.shift();
			key = p_keyorder[0];
		}

		if (p_keyorder.length == 0 || p_keys[key].length == 0) {
			console.log(this.data);
			return;
		}

		let fieldname = p_keys[key].shift();

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

				if (this.data[key] === undefined) {
					this.data[key] = {};
				}

				this.data[key][fieldname] = responsejson[fieldname];

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

				that.fetchChartDataNext(p_mapctx, p_keyorder, p_keys, p_url)
				
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

		let txtlinecota, cota  = this.top+this.margin_offset+this.captionszPX;
		let indent = this.left+2*this.margin_offset;
		ctx.font = `${this.captionszPX}px ${this.captionfontfamily}`;
		ctx.fillText(msg, indent, cota);
		
		ctx.restore();


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
			throw new Error("Slicing, map context customization instance is missing")
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
										throw new Error("Slicing, CLOSE interaction, map context customization instance is missing")
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