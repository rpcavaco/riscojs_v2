
import {GlobalConst} from './constants.js';
import {MaptipBox} from './canvas_maptip.mjs';
import {InfoBox} from './canvas_info.mjs';

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
	controls_prevgaps = {};	
	tool_manager = null;
	controls_boxes = {};

	constructor() {
		super();
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.BCKGRD; 
		this.strokeStyleFront = GlobalConst.CONTROLS_STYLES.COLOR;
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

	addControl(p_key, p_drawface_func, p_endevent_func, p_mmove_func, opt_gap_to_prev) {
		this.controls_keys.push(p_key);
		this.controls_funcs[p_key] = {
			"drawface": p_drawface_func,
			"endevent": p_endevent_func,
			"mmoveevent": p_mmove_func
		}
		if (opt_gap_to_prev) {
			this.controls_prevgaps[p_key] = opt_gap_to_prev;
		}
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

				ctx.clearRect(left, top, this.boxw, this.boxh); 
				this.controls_boxes[this.controls_keys[ci]] = [left, top, this.boxw, this.boxh];
				
				ctx.fillStyle = this.fillStyleBack;
				ctx.fillRect(left, top, this.boxw, this.boxh);
				
				ctx.strokeStyle = this.strokeStyleFront;
				ctx.lineWidth = this.strokeWidth;
				ctx.strokeRect(left, top, this.boxw, this.boxh);

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


export class TOC  extends MapPrintInRect {

	/*left;
	boxh;
	boxw;
	top;
	fillStyleBack; 
	fillStyleFront; 
	font;
	canvaslayer = 'service_canvas'; */
	tocmgr;

	constructor() {

		super();
		this.fillStyleBack = GlobalConst.MESSAGING_STYLES.PERMANENT_BCKGRD; 
		this.fillStyleFront = GlobalConst.MESSAGING_STYLES.PERMANENT_COLOR;
		this.font = GlobalConst.MESSAGING_STYLES.PERMANENT_FONT;

		this.left = 600;
		this.top = 30;
		this.boxh = 300;
		this.boxw = 300;


	}

	setTOCMgr(p_tocmgr) {
		this.tocmgr = p_tocmgr;
	}

	print(p_mapctx) {

		// const canvas_dims = [];
		console.log("::229:: this.canvaslayer", this.canvaslayer);
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			// p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			// background
			
			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);
			
			ctx.strokeStyle = this.strokeStyleFront;
			ctx.lineWidth = this.strokeWidth;
			ctx.strokeRect(this.left, this.top, this.boxw, this.boxh);
			/*
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

				ctx.clearRect(left, top, this.boxw, this.boxh); 
				this.controls_boxes[this.controls_keys[ci]] = [left, top, this.boxw, this.boxh];
				
				ctx.fillStyle = this.fillStyleBack;
				ctx.fillRect(left, top, this.boxw, this.boxh);
				
				ctx.strokeStyle = this.strokeStyleFront;
				ctx.lineWidth = this.strokeWidth;
				ctx.strokeRect(left, top, this.boxw, this.boxh);

				this.drawControlFace(ctx, this.controls_keys[ci], left, top, this.boxw, this.boxh, p_mapctx.cfgvar["basic"], GlobalConst);

			}
			*/

			// console.log('>> MapScalePrint print scale', ctx, [this.left, this.top, this.boxw, this.boxh]);


		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	interact(p_mapctx, p_evt) {

		let ret = false;
		if (p_evt.clientX >= this.left && p_evt.clientX <= this.left+this.boxw && p_evt.clientY >= this.top && p_evt.clientY <= this.top+this.boxh) {
			ret = true;
		}
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
			throw new Error(`Missing 'infocfg' config for layer '${this.layer.key}, cannot 'pick' features`);
		}
		if (currlayer["infocfg"]["keyfield"] === undefined) {
			throw new Error(`Missing 'infocfg.keyfield' config for layer '${this.layer.key}, cannot 'pick' features`);
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

