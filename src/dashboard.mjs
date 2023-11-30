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

	constructor(p_mapctx) {

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

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["captionfontfamily"] !== undefined) {		
			this.fontfamily = p_mapctx.cfgvar["basic"]["style_override"]["captionfontfamily"];
		} else {
			this.fontfamily = GlobalConst.CONTROLS_STYLES.CAPTIONFONTFAMILY;
		}

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"] !== undefined) {		
			this.fontfamily = p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"];
		} else {
			this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		}

		this.counterMaxRadius = GlobalConst.CONTROLS_STYLES.DASH_COUNTERMAXRADIUS;
		this.counterGaugeLineWidth = GlobalConst.CONTROLS_STYLES.DASH_COUNTERGAUGELINEWIDTH;
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

		this.data = [];
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

			//const msgskeys = ["REFRESH", "CLOSE"];
			const msgskeys = ["CLOSE"];
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

		const widgets_workorder = [...p_mapctx.cfgvar["basic"]["dashboard"]["widgets"]];

		this.data.length = 0;

		this.fetchChartDataNext(p_mapctx, widgets_workorder, url, layoutdivision, p_cota);

	}

	drawWidgets(p_mapctx, p_layoutdivision) {

		let ctx, centerx, centery, value, txtdims, lbl, lblsz, r, iniang, finalang;

		if (this.data.length < 1) {
			return;
		}

		const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();

		let counterfont, counterfntsize, txtfont, txtsize, gaugeStyle, gaugelinewidth;

		ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		for (let current_data of this.data) {

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

					const [left, top, width, height] = this.constructor.widgetBox(this.graphbox, p_layoutdivision, current_data["layout"]["size"], current_data["layout"]["upperleft"]);

					centerx = left + width / 2.0;
					centery = top + height / 2.0;

					ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
					ctx.save();

					if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_counterfont"] !== undefined) {
						counterfont = p_mapctx.cfgvar["basic"]["style_override"]["dash_counterfont"];
					} else {
						counterfont = this.counterFontFamily;
					}

					if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_counterfontsize"] !== undefined) {
						counterfntsize = p_mapctx.cfgvar["basic"]["style_override"]["dash_counterfontsize"];
					} else {
						counterfntsize = this.counterszPX;
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

					if (current_data["gauge"] !== undefined && current_data["gauge"]["linewidth"] !== undefined) {
						gaugelinewidth = current_data["gauge"]["linewidth"];
					} else {
						gaugelinewidth = this.counterGaugeLineWidth;
					}

					const ext_radius = Math.min(0.4 * Math.min(height, width), GlobalConst.CONTROLS_STYLES.DASH_COUNTERMAXRADIUS);
					const k = Math.min(ext_radius / GlobalConst.CONTROLS_STYLES.DASH_COUNTERMAXRADIUS, 1);

					const realtextsize = Math.round(k * txtsize);
					const realcounterfntsize = Math.round(k * counterfntsize);

					if (current_data["gauge"] !== undefined) {

						if (current_data["gauge"]["style"] !== undefined) {
							gaugeStyle = current_data["gauge"]["style"];
						} else {
							if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["dash_countergaugestyle"] !== undefined) {
								gaugeStyle = p_mapctx.cfgvar["basic"]["style_override"]["dash_countergaugestyle"];
							} else {
								gaugeStyle = this.counterGaugeStyle;
							}			
						}
						
						// paint gauge stroke
					
						r = k * parseInt(value) / current_data["gauge"]["max"];
						iniang = 5 * Math.PI / 6.0;
						finalang = iniang + (r * 8 * Math.PI / 6.0);

						ctx.save();

						ctx.beginPath();
						ctx.lineWidth = Math.round(k * gaugelinewidth);
						ctx.strokeStyle = gaugeStyle;
						ctx.arc(centerx, centery, 0.87 * ext_radius, iniang, finalang);
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

						thickTickedCircunference(ctx, [centerx, centery], ext_radius, 0.12 * ext_radius, { // 15% 9%
							"max": current_data["gauge"]["max"],
							"divisor": current_data["gauge"]["divisor"],
							"unitdivision": current_data["gauge"]["unitdivision"],
							"unitticks": current_data["gauge"]["unitticks"],
							"unitgroupcnt": current_data["gauge"]["unitgroupcnt"] 
						}, true, true);

					} else {
	
						thickTickedCircunference(ctx, [centerx, centery], ext_radius, 0.12 * ext_radius);
						
					}

					if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(current_data["layout"]["text"]) >= 0) {
						lbl = I18n.capitalize(p_mapctx.cfgvar["basic"]["msgs"][lang][current_data["layout"]["text"]]);
					} else {
						lbl = I18n.capitalize(current_data["layout"]["text"]);
					}

					const lblsplits = lbl.split("\n");
					let maxlnheight = 0;

					ctx.font = `${realtextsize}px ${txtfont}`;

					for (let lblsplit of lblsplits) {
						txtdims = ctx.measureText(lblsplit);	
						maxlnheight = Math.max(maxlnheight, txtdims.actualBoundingBoxAscent + txtdims.actualBoundingBoxDescent);
					}

					ctx.strokeStyle = this.activeStyleFront;
					ctx.font = `${realcounterfntsize}px ${counterfont}`;

					// central line for reference
					/* ctx.beginPath();
					ctx.moveTo(centerx - 50, centery);
					ctx.lineTo(centerx + 50, centery);
					ctx.stroke();
					*/
					
					if (lblsplits.length > 2) {
						ctx.fillText(value, centerx, centery - (lblsplits.length-2) * maxlnheight);
					} else {
						ctx.fillText(value, centerx, centery);
					}

					ctx.font = `${realtextsize}px ${txtfont}`;

					for (let cota=0, tli=0; tli < lblsplits.length; tli++) {
						if (tli == 0) {
							if (lblsplits.length > 2) {
								cota = centery;
							} else if (lblsplits.length > 1) {
								cota = centery + maxlnheight;
							} else {
								cota = centery + 1.8 * maxlnheight;
							}
						} else {
							cota += maxlnheight;
						}
						ctx.fillText(lblsplits[tli], centerx, cota);
	
					}

											
					ctx.restore();
				
					break;
			}


		}

	}

	fetchChartDataNext(p_mapctx, p_widgets_workorder, p_url, p_layoutdivision) {

		const that  = this;

		let current_widget_cfg = p_widgets_workorder.shift();
		if (current_widget_cfg === undefined) {
			if (that.data.length > 0) {
				this.drawWidgets(p_mapctx, p_layoutdivision);
			}
			return;			
		}

		let fieldname = current_widget_cfg["fieldname"];

		fetch(p_url + "/astats", {
			method: "POST",
			body: JSON.stringify({"key":current_widget_cfg["alphastatskey"],"options":{"col": fieldname, "clustersize": -1}})
		})
		.then(response => response.json())
		.then(
			function(responsejson) {
				//console.log(responsejson);

				const fields = Object.keys(responsejson);
				console.assert(fields.indexOf(fieldname) >= 0, "field not found in dashboard data config, key '%s', column '%s'", current_widget_cfg["alphastatskey"], fieldname) 

				that.data.push({
					"layout": {
						"upperleft": current_widget_cfg["upperleft"],
						"size": current_widget_cfg["size"],
						"text": current_widget_cfg["text"]
					},
					"alphastatskey": current_widget_cfg["alphastatskey"],
					"type": current_widget_cfg["type"],
					"remoteitems":{}
				});

				that.data[that.data.length-1]["remoteitems"] = responsejson[fieldname];

				if (current_widget_cfg["gauge"] !== undefined) {
					that.data[that.data.length-1]["gauge"] = current_widget_cfg["gauge"];
				}
				if (current_widget_cfg["mode"] !== undefined) {
					that.data[that.data.length-1]["mode"] = current_widget_cfg["mode"];
				}

				that.fetchChartDataNext(p_mapctx, p_widgets_workorder, p_url, p_layoutdivision);
				
			}
		).catch((error) => {
			console.error(`Impossible to fetch stats on key '${current_widget_cfg["alphastatskey"]}', ${error}`);
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

		// let cota  = this.top+this.margin_offset+this.captionszPX;

		// cota  = this.top+this.margin_offset+this.captionszPX;
		// 		cota += 2 * this.normalszPX;
		// cota += 3 * this.normalszPX - this.margin_offset;

		let cota = this.top + 3 * this.normalszPX;

		//, cota = p_cota + 3 * this.normalszPX - this.margin_offset

		const indent = this.left+2*this.margin_offset;
		const ctrlbox_height = 3*this.normalszPX;

		ctx.font = `${this.captionszPX}px ${this.captionfontfamily}`;
		ctx.fillText(msg, indent, cota);

		cota = cota + 2 * this.normalszPX;

		this.graphbox = [indent, cota, this.width-4*this.margin_offset, this.height+this.top-cota - 2*this.margin_offset - ctrlbox_height]; 
		this.ctrlarea_box = [indent, Math.round(this.height+this.top - 2*this.margin_offset -ctrlbox_height), this.width-4*this.margin_offset, ctrlbox_height];


		// ctx.save();
		
		// ctx.lineWidth = 1;
		// ctx.strokeStyle = "purple";

		// //console.log(">>>", this.width, this.height);

		// //console.log(">> gb >>", this.graphbox);


		// ctx.strokeRect(...this.graphbox);
		
		// ctx.restore();

		this.drawCtrlButtons(p_mapctx);

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

		if (p_evt.offsetX >= this.left && 
			p_evt.offsetX <= this.left+this.width && 
			p_evt.offsetY >= this.top && 
			p_evt.offsetY <= this.top+this.height) {

			ret = true;
		}

		if (ret) {

			for (let k in this.interaction_boxes) {

				if (p_evt.offsetX >= this.interaction_boxes[k][0] && 
					p_evt.offsetX <= this.interaction_boxes[k][0]+this.interaction_boxes[k][2] && 
					p_evt.offsetY >= this.interaction_boxes[k][1] && 
					p_evt.offsetY <= this.interaction_boxes[k][1]+this.interaction_boxes[k][3]) {
						interact_box_key = k;
						break;
				}
			}

			switch(p_evt.type) {

				case "touchend":
				case "mouseup":

					if (interact_box_key) {

						if (interact_box_key.startsWith("dashpage_")) {

							let page = parseInt(interact_box_key.replace("dashpage_", ""));

							// console.log(page, this.activepageidx, this.sorted_pairs_collection.length);

							if (page-1 != this.activepageidx) {

								console.assert((page-1) >= 0 && page <= this.sorted_pairs_collection.length, `invalid page ${page-1}, should be in interval [0, ${this.sorted_pairs_collection.length}[`)

								this.activepageidx = page-1;

								// QQ Coisa 
							}

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
										analysispanel.deactivateDashboardPanelOpenedSign(p_mapctx);
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