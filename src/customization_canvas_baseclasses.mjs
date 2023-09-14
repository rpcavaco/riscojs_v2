
import {GlobalConst} from './constants.js';
import {MaptipBox} from './canvas_maptip.mjs';
import {InfoBox} from './canvas_info.mjs';


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
	name;

	print(p_mapctx) {     // p_mapctx, ...
		// To be implemented
	}

	getHeight() {
		return this.boxh;
	}

	remove(p_mapctx) {
		const gfctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		gfctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
	}	
	
}

export class PermanentMessaging extends MapPrintInRect {
	constructor() {
		super();
		this.name = "PermanentMessaging";
		this.fillStyleBack = GlobalConst.MESSAGING_STYLES.PERMANENT_BCKGRD; 
		this.fillStyleFront = GlobalConst.MESSAGING_STYLES.PERMANENT_COLOR;
		this.font = GlobalConst.MESSAGING_STYLES.PERMANENT_FONT;
	}	
}

export class LoadingMessaging extends MapPrintInRect {
	constructor() {
		super();
		this.name = "LoadingMessaging";
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
		this.name = "ControlsBox";
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

export function drawTOCSymb(p_mapctx, p_lyr, p_ctx, p_symbxcenter, p_cota, p_vert_step, opt_varstlesymb) {

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
			symb.drawfreeSymb(p_mapctx, p_ctx, [p_symbxcenter, p_cota], p_vert_step, p_lyr);
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

		this.callout = new MaptipBox(this.mapctx, this.mapctx.imgbuffer, p_feature_dict, this.styles, p_scrx, p_scry, true);
		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		this.callout.clear(ctx);
		this.callout.tipdraw(ctx, b_noline);

		return true;
	}

	hover(p_feature_dict, p_scrx, p_scry) {
		return this._showCallout(p_feature_dict, p_scrx, p_scry);
	}

	pick(p_feature_dict, p_scrx, p_scry) {

		// setFixedtipPanelActive

		let ret = false, opentippanel = false, layerklist = Object.keys(p_feature_dict);

		if (layerklist.length > 1) {
			opentippanel = true;
		} else {
			opentippanel = p_feature_dict[layerklist[0]].length > 1;
		}

		if (opentippanel) {

			if (this._showCallout(p_feature_dict, p_scrx, p_scry, true)) {
		
				const ci = this.mapctx.getCustomizationObject();
				if (ci == null) {
					throw new Error("Info.pick, map context customization instance is missing")
				}
	
				const itool = this.mapctx.toolmgr.findTool("InfoTool");
				if (itool) {
					itool.setFixedtipPanelActive(true);					
				}

				ret = true;

			}

		} else {
			ret = this.pickfeature(layerklist[0], p_feature_dict[layerklist[0]][0], p_scrx, p_scry)
		}

		return ret;

	}

	pickfeature(p_layerkey, p_feature, p_scrx, p_scry) {

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
					that.ibox = new InfoBox(that.mapctx, that.mapctx.imgbuffer, currlayer, responsejson, that.styles, p_scrx, p_scry, Info.infobox_pick, Info.expand_image, false, that.max_textlines_height);
					const ctx = that.mapctx.renderingsmgr.getDrwCtx(that.canvaslayer, '2d');
					that.ibox.clear(ctx);
					that.ibox.draw(ctx);	

					const ci = that.mapctx.getCustomizationObject();
					if (ci == null) {
						throw new Error("Info.pickfeature, map context customization instance is missing")
					}
			
					const toc = ci.instances["toc"];
					const itool = that.mapctx.toolmgr.findTool("InfoTool");
					if (itool) {
						itool.setPickPanelActive(true);					
						itool.setTocCollapsed(toc.collapse(that.mapctx));
						for (let wdgk of ci.mapcustom_controlsmgrs_keys) {
							if ( ci.instances[wdgk] !== undefined && ci.instances[wdgk]['collapse'] !== undefined) {
								ci.instances[wdgk].collapse(that.mapctx);
							}
						}
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
				if (itool.getAnyPanelActive()) {
					itool.setAllPanelsInactive();					
				}
				if (toc.isCollapsed()) {
					itool.setTocCollapsed(toc.inflate(this.mapctx));
					for (let wdgk of ci.mapcustom_controlsmgrs_keys) {
						if ( ci.instances[wdgk] !== undefined && ci.instances[wdgk]['inflate'] !== undefined) {
							ci.instances[wdgk].inflate(this.mapctx);
						}
					}					
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
