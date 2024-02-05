
import {GlobalConst} from './constants.js';
import {MaptipBox} from './canvas_maptip.mjs';
import {InfoBox} from './canvas_info.mjs';


export function ctrToolTip(p_mapctx, p_evt, p_text, opt_deltas) {

	if (p_text == null || p_text === 'undefined') {
		return;
	}
	
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

		if (p_evt.offsetX < (canvas_dims[0]/2)) {
			dx = deltax;
		} else {
			dx = -deltax;
		}

		if (p_evt.offsetY < (canvas_dims[1]/2)) {
			dy = deltay;
		} else {
			dy = -deltay;
		}		
		const x = p_evt.offsetX + dx;
		const y = p_evt.offsetY + dy;
		const h = 2*slack + tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent;

		gfctx.fillStyle = "#8080807f";
		const ritems = [x - tm.actualBoundingBoxLeft - slack, y + tm.actualBoundingBoxDescent + slack, tm.width+2*slack, -h];
		gfctx.fillRect(...ritems);
		gfctx.strokeRect(...ritems);

		gfctx.fillStyle = "white";
		gfctx.fillText(p_text, x, y);

	} catch(e) {
		throw e;
	} finally {
		gfctx.restore();
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

	getHeight() {
		return this.boxh;
	}

	getWidth() {
		return this.boxw;
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
	controls_state = { }; 
	controls_rounded_face = [];
	controls_prevgaps = {};	
	controls_boxes = {};
	anchoring = "UL";
	other_widgets;
	horiz_layout;

	setManyControlsHidden(p_do_hide, opt_exceptionkeys_list) {
		for (const k of this.controls_keys) {
			if (!opt_exceptionkeys_list || opt_exceptionkeys_list.indexOf(k) < 0) {
				this.controls_state[k].hidden = p_do_hide;
			}
		}
	}

	constructor(p_mapctx, p_orientation, p_anchoring_twoletter, p_other_widgets, p_config_namespaceroot) {
		super();

		this._initParameters(p_config_namespaceroot);

		if (p_anchoring_twoletter) {
			this.anchoring = p_anchoring_twoletter;
		}

		this.other_widgets = p_other_widgets;
		this.orientation = p_orientation;

		this.setdims(p_mapctx);
	}

	_initParameters(p_config_namespaceroot) {
		
		// to be extended, to be called in derived class constructor

	}

	isOrientationVertical() {
		return (this.orientation == "VERTICAL");
	}

	setdims(p_mapctx) {

		let offset = 0;
		if (navigator.userAgent.toLowerCase().includes("mobile") || navigator.userAgent.toLowerCase().includes("android")) {
			offset = GlobalConst.CONTROLS_STYLES.MOBILE_DEFGAP;
		}

		let otherboxesoffset = 0;
		const canvas_dims = [];	
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);	

		if (this.other_widgets) {
			for (let ow of this.other_widgets) {
				if (ow['setdims'] !== undefined) {
					ow.setdims(p_mapctx, canvas_dims);
				}		
				if (!this.isOrientationVertical()) {
					otherboxesoffset += ow.getWidth();
				} else {
					otherboxesoffset += ow.getHeight();
				}
				otherboxesoffset += this.margin_offset;
				// console.warn("AM boxesheight:", otherboxesheight, this.other_widgets.length);
			}				
		}

		this.boxh = this.sz + offset;
		this.boxw = this.sz + offset;	

		switch (this.anchoring) {

			case "UL":
				this.left = this.margin_offset;
				this.top = this.margin_offset + otherboxesoffset;
				break;

			case "UR":
				this.left = canvas_dims[0] - this.boxw - this.margin_offset;
				this.top = this.margin_offset + otherboxesoffset;
				break;

			default:
				throw new Error(`ControlsBox unsupported anchoring ${this.anchoring}`);

		}

	}

	getWidth() {
		let w = 0;
		if (!this.isOrientationVertical()) {
			w = this.controls_keys.length * this.boxw;
		} else {
			w = this.boxw;
		}
		return w;
	}

	getHeight() {
		let h = 0;
		if (!this.isOrientationVertical()) {
			h = this.controls_keys.length * this.boxh;
		} else {
			h = this.boxh;
		}
		return h;
	}	

	addControl(p_key, p_togglable, p_is_round, p_drawface_func, p_endevent_func, p_mmove_func, opt_gap_to_prev, opt_hidden_by_default) {

		this.controls_keys.push(p_key);
		this.controls_funcs[p_key] = {
			"drawface": p_drawface_func,
			"endevent": p_endevent_func,
			"mmoveevent": p_mmove_func
		}
		if (opt_gap_to_prev) {
			this.controls_prevgaps[p_key] = opt_gap_to_prev;
		}

		this.controls_state[p_key] = { "togglable": !!p_togglable, "togglestatus": false, "disabled": false, "hidden": !!opt_hidden_by_default  };

		if (p_is_round && !this.controls_rounded_face.includes(p_key)) {
			this.controls_rounded_face.push(p_key);
		}
	}

	changeToggleFlag(p_key, p_toggle_status) {
		let has_changed = false;
		if (this.controls_state[p_key].togglable && !this.controls_state[p_key].disabled && this.controls_state[p_key].togglestatus != p_toggle_status) {
			has_changed = true;
			this.controls_state[p_key].togglestatus = p_toggle_status;
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
			this.setdims(p_mapctx);

			for (let ci=0;  ci<this.controls_keys.length; ci++) {

				if (this.controls_prevgaps[this.controls_keys[ci]] !== undefined) {
					accum += this.controls_prevgaps[this.controls_keys[ci]];
				} 

				// console.log(navigator.userAgent.toLowerCase());
				if (ci>0 && (navigator.userAgent.toLowerCase().includes("mobile") || navigator.userAgent.toLowerCase().includes("android"))) {
					accum += GlobalConst.CONTROLS_STYLES.MOBILE_DEFGAP;
				}

				if (!this.isOrientationVertical()) {
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

			if (!this.controls_boxes.hasOwnProperty(_key)) {
				continue;
			}

			cb = this.controls_boxes[_key];
			if (p_evt.offsetX >= cb[0] && p_evt.offsetX <= cb[0]+cb[2] && p_evt.offsetY >= cb[1] && p_evt.offsetY <= cb[1]+cb[3]) {
				key = _key;
			}
		}

		return key;
	}

	
}

export async function drawTOCSymb(p_mapctx, p_lyr, p_ctx, p_symbxcenter, p_cota, p_vert_step, opt_varstlesymb) {

	p_ctx.save();

	try {

		const symb = (opt_varstlesymb ? opt_varstlesymb : p_lyr["default_symbol"]);

		if (symb == null) {
			throw new Error(`Missing symb for ${p_lyr.key}`);
		}
		if (symb['drawFreeSymb'] === undefined && symb['drawfreeSymbAsync'] === undefined) {
			console.trace(`[WARN] No 'drawFreeSymb' method in ${JSON.stringify(symb)}`);
		} else {
			symb.setStyle(p_ctx);
			if (symb['drawfreeSymbAsync'] !== undefined) {
				await symb.drawfreeSymbAsync(p_mapctx, p_ctx, [p_symbxcenter, p_cota], p_vert_step, p_lyr);
			} else {
				symb.drawFreeSymb(p_mapctx, p_ctx, [p_symbxcenter, p_cota], p_vert_step, p_lyr);
			}
		}

	} catch(e) {
		console.error(e);
	} finally {
		p_ctx.restore();
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

	_showCallout(p_feature_dict, p_scrx, p_scry, b_noline) {

		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		this.callout = new MaptipBox(this.mapctx, this.mapctx.imgbuffer, p_feature_dict, this.styles, p_scrx, p_scry, ctx);
		this.callout.tipclear();
		this.callout.tipdraw(b_noline);

		return true;
	}

	hover(p_mapctx, p_feature_dict, p_scrx, p_scry) {

		const layerklist = Object.keys(p_feature_dict);
		const ret = this._showCallout(p_feature_dict, p_scrx, p_scry, true);

		if (ret) {
			p_mapctx.drawFeatureAsMouseSelected(layerklist[0], p_feature_dict[layerklist[0]][0].id, "NORMAL", {'normal': 'temporary', 'label': 'temporary' })
		}

		return ret;
	}

	pick(p_mapctx, p_feature_dict, p_scrx, p_scry) {

		let ret = false, opentippanel = false, layerklist = Object.keys(p_feature_dict);

		if (layerklist.length > 1) {
			opentippanel = true;
		} else {
			opentippanel = p_feature_dict[layerklist[0]].length > 1;
		}

		if (opentippanel) {

			if (this._showCallout(p_feature_dict, p_scrx, p_scry, false)) {
		
				const ci = p_mapctx.getCustomizationObject();
				if (ci == null) {
					throw new Error("Info.pick, map context customization instance is missing")
				}
	
				const itool = p_mapctx.toolmgr.findTool("InfoTool");
				if (itool) {
					itool.setFixedtipPanelActive(true);					
				}

				ret = true;

			}

		} else {
			ret = this.pickfeature(p_mapctx, layerklist[0], p_feature_dict[layerklist[0]][0].feat, p_scrx, p_scry)
		}

		if (ret) {
			p_mapctx.drawFeatureAsMouseSelected(layerklist[0], p_feature_dict[layerklist[0]][0].id, "NORMAL", {'normal': 'temporary', 'label': 'temporary' })
		}

		return ret;
	}

	pickfeature(p_mapctx, p_layerkey, p_feature, p_scrx, p_scry) {

		const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
		if (currlayer["infocfg"] === undefined) {
			throw new Error(`Missing 'infocfg' config for layer '${p_layerkey}, cannot 'pick' features`);
		}

		let mode = "NONE";

		if (currlayer["infocfg"]["function"] !== undefined) {
			mode = "INFOFUNC";
		} else if (currlayer["infocfg"]["keyfields"] !== undefined || currlayer["infocfg"]["keyfield"] !== undefined) {
			mode = "INFOQRY";
		} else if (currlayer["infocfg"]["fields"] !== undefined && currlayer["infocfg"]["fields"]["add"] !== undefined) {
			mode = "INFODIRECT";
		}

		if (mode == "NONE") {
			console.warn(`missing either 'infocfg.function' config OR 'infocfg.keyfields' and 'infocfg.keyfield' configs or any info field configured for layer '${p_layerkey}, cannot 'pick' features`);
			return;
		}

		const keyfields = [];
		let ret;

		if (mode == "INFOFUNC") {

			const ic = p_mapctx.getCustomizationObject().interoperability_ctrlr;

			ret = currlayer["infocfg"]["function"](ic, currlayer, p_feature);

		} 

		if (mode == "INFOQRY") {
		
			if (currlayer["infocfg"]["keyfield"] !== undefined) {

				if (p_feature.a[currlayer["infocfg"]["keyfield"]] === undefined) {
					console.warn(`[WARN] layer '${p_layerkey}' has no attribute corresponding to INFO key field '${currlayer["infocfg"]["keyfield"]}'`);
					return;
				}

				if (typeof currlayer["infocfg"]["keyfield"] !== 'string') {
					console.warn(`[WARN] layer '${p_layerkey}' infocfg->keyfield configuration MUST be of type 'string'`);
					return;
				}

				keyfields.push(currlayer["infocfg"]["keyfield"]);

			} else if (currlayer["infocfg"]["keyfields"] !== undefined) {

				if (typeof currlayer["infocfg"]["keyfields"] == 'string') {
					console.warn(`[WARN] layer '${p_layerkey}' infocfg->keyfields configuration cannot be of type 'string', must be array`);
					return;
				}

				if (Array.isArray(currlayer["infocfg"]["keyfields"])) {

					let warned = false;
					for (let kf of currlayer["infocfg"]["keyfields"]) {
						if (typeof kf != 'string') {
							console.warn(`[WARN] layer '${p_layerkey}' has no attribute corresponding to INFO key field '${kf}'`);
							warned = true;
							break;
						}
					}
					if (warned) {
						return;
					}	

					for (let kf of currlayer["infocfg"]["keyfields"]) {
						if (p_feature.a[kf] === undefined) {
							console.warn(`[WARN] layer '${p_layerkey}' has no attribute corresponding to INFO key field '${kf}'`);
							warned = true;
							break;
						}
					}
					if (warned) {
						return;
					}	

					for (let kf of currlayer["infocfg"]["keyfields"]) {
						keyfields.push(kf);
					}

				} else {

					console.warn(`[WARN] layer '${p_layerkey}' infocfg->keyfields configuration is not an array`);
					return;

				}

			}  // pickfunction

			const keyvals = [];		
			for (let kf of keyfields) {
				keyvals.push(p_feature.a[kf].toString());
			}

			ret = false;
			if (keyvals.length > 0) {

				ret = true;

				const that = this;
				const lyr = p_mapctx.tocmgr.getLayer(p_layerkey);
		
				// done - [MissingFeat 0002] - Obter este URL de configs
				fetch(currlayer.url + "/doget", {
					method: "POST",
					body: JSON.stringify({ "alias":lyr.infocfg.qrykey, "filtervals":keyvals, "pbuffer":0, "lang":"pt" })
				})
				.then(response => response.json())
				.then(
					function(responsejson) {
						// console.log("cust_canvas_baseclasses:828 - antes criação InfoBox");
						const ctx = p_mapctx.renderingsmgr.getDrwCtx(that.canvaslayer, '2d');
						const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
						that.ibox = new InfoBox(p_mapctx, p_mapctx.imgbuffer, currlayer, responsejson, that.styles, p_scrx, p_scry, Info.infobox_pick, Info.expand_image, ctx, that.max_textlines_height);
						that.ibox.infoclear();
						that.ibox.infodraw();	

						const ci = p_mapctx.getCustomizationObject();
						if (ci == null) {
							throw new Error("Info.pickfeature, map context customization instance is missing")
						}
				
						const toc = ci.instances["toc"];
						const itool = p_mapctx.toolmgr.findTool("InfoTool");
						if (itool) {
							itool.setPickPanelActive(true);					
							itool.setTocCollapsed(toc.collapse(p_mapctx, 'INFO'));
							for (let wdgk of ci.mapcustom_controlsmgrs_keys) {
								if ( ci.instances[wdgk] !== undefined && ci.instances[wdgk]['collapse'] !== undefined) {
									ci.instances[wdgk].collapse(p_mapctx);
								}
							}
						}

						// console.log("cust_canvas_baseclasses:836 - ibox:", that.ibox);
						
					}
				).catch((error) => {
					console.error(`Impossible to fetch attributes on '${p_layerkey}'`);
					throw new Error(error);
				});	

			}

		}

		if (mode == "INFODIRECT") {

			ret = true;

			const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
			const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);

			const data = {};
			data[p_layerkey] = [p_feature.a];
			this.ibox = new InfoBox(p_mapctx, p_mapctx.imgbuffer, currlayer, data, this.styles, p_scrx, p_scry, Info.infobox_pick, Info.expand_image, ctx, this.max_textlines_height);
			this.ibox.infoclear();
			this.ibox.infodraw();	

			const ci = p_mapctx.getCustomizationObject();
			if (ci == null) {
				throw new Error("Info.pickfeature, map context customization instance is missing")
			}
	
			const toc = ci.instances["toc"];
			const itool = p_mapctx.toolmgr.findTool("InfoTool");
			if (itool) {
				itool.setPickPanelActive(true);					
				itool.setTocCollapsed(toc.collapse(p_mapctx, 'INFO'));
				for (let wdgk of ci.mapcustom_controlsmgrs_keys) {
					if ( ci.instances[wdgk] !== undefined && ci.instances[wdgk]['collapse'] !== undefined) {
						ci.instances[wdgk].collapse(p_mapctx);
					}
				}
			}

		}

		return ret;

	} 

	clearinfo(p_mapctx, p_source_id) {

		if (p_source_id == 'TOC' || p_source_id == 'TOCMGR') {
			return;
		}

		if (GlobalConst.getDebug("INTERACTIONCLEAR")) {
			console.log(`[DBG:INTERACTIONCLEAR] clearinfo, source:'${p_source_id}', this.callout:${this.callout}, this.ibox:${this.ibox}`);
		}	

		let panels_exist = false;

		if (this.callout) {

			// reset feature preselection for tablet SIMPLE mode (if ective) (on clearing its tooltip, etc. except when changing from INFO to other tool) 
			if (p_source_id != "INFOTOOLCLEANUP") {
				p_mapctx.tabletFeatPreSelection.reset();
			}

			this.callout.tipclear();
			panels_exist = true;
			
		} else if (this.ibox) {

			this.ibox.infoclear();
			panels_exist = true;

		}

		if (panels_exist) {

			const ci = p_mapctx.getCustomizationObject();
			if (ci == null) {
				throw new Error("Info.pick, map context customization instance is missing");
			}
	
			const toc = ci.instances["toc"];
			const itool = p_mapctx.toolmgr.findTool("InfoTool");
			if (itool) {
				if (itool.getAnyPanelActive()) {
					itool.setAllPanelsInactive();					
				}
				if (toc.isCollapsed()) {
					itool.setTocCollapsed(toc.inflate(p_mapctx, 'INFO'));
					for (let wdgk of ci.mapcustom_controlsmgrs_keys) {
						if ( ci.instances[wdgk] !== undefined && ci.instances[wdgk]['inflate'] !== undefined) {
							ci.instances[wdgk].inflate(p_mapctx);
						}
					}					
				}
			}
			//console.trace("clear all temporary");
			p_mapctx.renderingsmgr.clearAll(['transientmap', 'transientviz', 'temporary']);


		}

		// console.log("clear:", this.ibox!=null, this.callout!=null);

	}

	// To be called from map context 'clearInteractions' method
	customizClearInteractions(p_mapctx) {
		this.clearinfo(p_mapctx, "FROM_CLEARINTERACTIONS");
	}

	interactFixedtip(p_evt) {
		if (this.callout) {
			this.callout.interact_fixedtip(this, p_evt);
		}

	}

	interactInfobox(p_evt) {
		if (this.ibox) {
			this.ibox.interact_infobox(p_evt);
		}

	}
}

export class OverlayMgr {

	canvaslayer = 'overlay_canvas';
	is_active = false;
	box = null;

	clear(p_mapctx) {

		this.is_active = false;

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		const mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		ctx.clearRect(0, 0, ...mapdims); 

		this.box = null;
	}

	// To be called from map context 'clearInteractions' method
	customizClearInteractions(p_mapctx) {
		this.clear(p_mapctx);
	}

	drawImage(p_mapctx, p_imageobj) {

		this.is_active = true;
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();

		const mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

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
		ctx.fillText(p_mapctx.i18n.msg('CLKIMG2CLOSE', false), mapdims[0]/2.0, oy+h-20);

		ctx.restore();
	}

	interact(p_mapctx, p_evt) {

		let ret = false;
		if (this.is_active) {

			const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
			topcnv.style.cursor = "default";

			ret = true;
			if (this.box != null && p_evt.offsetX >= this.box[0] && p_evt.offsetX <= this.box[0]+this.box[2] && p_evt.offsetY >= this.box[1] && p_evt.offsetY <= this.box[1]+this.box[3]) {
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
