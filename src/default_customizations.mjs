

import {GlobalConst} from './constants.js';
import {MaptipBox} from './canvas_maptip.mjs';
import {InfoBox} from './canvas_info.mjs';

import {PermanentMessaging, LoadingMessaging, ControlsBox} from './customization_canvas_baseclasses.mjs';

class MousecoordsPrint extends PermanentMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_x, py) {

		const terr_pt = [], canvas_dims = [];
		p_mapctx.transformmgr.getTerrainPt([p_x, py], terr_pt);

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.boxw = 130;
			this.boxh = 20;
			this.left = canvas_dims[0]-this.boxw;
			this.top = canvas_dims[1]-(3*this.boxh)-2;

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			const bottom = this.top + this.boxh;

			ctx.fillText(terr_pt[0].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.left+8, bottom-6);		
			ctx.fillText(terr_pt[1].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.left+66, bottom-6);	
			
		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}

	}	

	
}

class MapScalePrint extends PermanentMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_scaleval) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.boxh = 20;
			this.boxw = 130;
			this.left = canvas_dims[0]-this.boxw;
			this.top = canvas_dims[1]-(2*this.boxh);

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			const bottom = this.top + this.boxh;

			ctx.fillText(this.i18n.msg('ESCL', true) + " 1:"+p_scaleval, this.left+GlobalConst.MESSAGING_STYLES.TEXT_OFFSET, bottom-6);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	
}

class LoadingPrint extends LoadingMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_msg) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			const msg = `${this.i18n.msg('LDNG', false)} ${p_msg}`;
			// const tm = ctx.measureText(msg);
			this.boxw =  GlobalConst.MESSAGING_STYLES.LOADING_WIDTH;

			this.left = 0;
			this.boxh = GlobalConst.MESSAGING_STYLES.LOADING_HEIGHT;
			this.top = canvas_dims[1]-(2*this.boxh);

			ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;
			ctx.textAlign = "center";

			const bottom = this.top + this.boxh;

			ctx.fillText(msg, this.boxw/2, bottom-6, this.boxw - 2 * GlobalConst.MESSAGING_STYLES.TEXT_OFFSET);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	
}

class Info {
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


class BasicCtrlBox extends ControlsBox {

	constructor() {
		super();

		this.orientation = "VERTICAL";
		this.controls_keys = [
			"zoomout",
			"home",
			"zoomin",
			"gps"
		];

		this.gap = GlobalConst.CONTROLS_STYLES.GAP;

		this.imgh = new Image();
		this.imgh.decoding = "sync";
		this.imgh.src = GlobalConst.CONTROLS_STYLES.HOMESYMB;


		this.imgg = new Image();
		this.imgg.decoding = "sync";
		this.imgg.src = GlobalConst.CONTROLS_STYLES.GPSSYMB;

	}

	drawControlFace(p_ctx, p_control_key, p_left, p_top, p_width, p_height) {

		switch(p_control_key) {

			case "zoomout":
				p_ctx.beginPath();
				p_ctx.moveTo(p_left+p_width*0.2, p_top+p_height*0.5);
				p_ctx.lineTo(p_left+p_width*0.8, p_top+p_height*0.5);
				p_ctx.stroke();
				break;

			case "zoomin":
				p_ctx.beginPath();
				p_ctx.moveTo(p_left+p_width*0.2, p_top+p_height*0.5);
				p_ctx.lineTo(p_left+p_width*0.8, p_top+p_height*0.5);
				p_ctx.moveTo(p_left+p_width*0.5, p_top+p_height*0.2);
				p_ctx.lineTo(p_left+p_width*0.5, p_top+p_height*0.8);
				p_ctx.stroke();
				break;

			case "gps":

				// homing zoom button decorated from SVG image data URL configured in Globals	
				this.imgg.decode()
							.then(() => {
								p_ctx.drawImage(this.imgg, p_left + ((GlobalConst.CONTROLS_STYLES.SIZE - GlobalConst.CONTROLS_STYLES.GPSSYMBWID) / 2), p_top);
							});
				break;

			default:

				// homing zoom button decorated from SVG image data URL configured in Globals	
				this.imgh.decode()
							.then(() => {
								p_ctx.drawImage(this.imgh, p_left + ((GlobalConst.CONTROLS_STYLES.SIZE - GlobalConst.CONTROLS_STYLES.HOMESYMBWID) / 2), p_top);
							});
		}
	}

	interact(p_mapctx, p_evt) {

		let basic_config, ret = false;
		const ctrl_key = super.interact(p_mapctx, p_evt);

		const topcnv = p_mapctx.renderingsmgr.getTopCanvas();

		if (GlobalConst.getDebug("INTERACTION")) {
			console.log("[DBG:INTERACTION] BASICCTRLBX, event, control key:", p_evt, ctrl_key);
		}

		if (ctrl_key) {
			//console.trace("285:", ctrl_key, p_evt);
			basic_config = this.tool_manager.basic_config;
			switch(p_evt.type) {

				case 'touchend':
				case 'mouseup':

					switch(ctrl_key) {

						case "home":
							p_mapctx.transformmgr.setScaleCenteredAtPoint(basic_config.scale, [basic_config.terrain_center[0], basic_config.terrain_center[1]], true);
							break;

						case "zoomout":
							p_mapctx.transformmgr.zoomOut(basic_config.maxscaleview.scale, GlobalConst.SCALEINOUT_STEP, true);
							break;

						case "zoomin":
							p_mapctx.transformmgr.zoomIn(GlobalConst.MINSCALE, GlobalConst.SCALEINOUT_STEP, true);
							break;

						case "gps":
							p_mapctx.transformmgr.toggleGeolocWatch();
							break;

						default:
							throw new Error(`BasicCtrlBox, interact, wrong key:${ctrl_key}`);
	
							

					}
					topcnv.style.cursor = "default";
					break;

				case "mousemove":

					//console.log(">>>", ctrl_key)
					topcnv.style.cursor = "pointer";
					break;

			}

			ret = true;
				
		} else {
			topcnv.style.cursor = "default";				
		}

		return ret;
	}

}

export class MapCustomizations {

	mapctx;
	messaging_ctrlr; // object with info, warn and error methods

	constructor(p_messaging_ctrlr) {

		this.messaging_ctrlr = p_messaging_ctrlr;
		this.instances = {
			"basiccontrolsbox": new BasicCtrlBox(),
			"mousecoordsprint": new MousecoordsPrint(),
			"mapscaleprint": new MapScalePrint(),
			"loadingmsgprint": new LoadingPrint(),
			"infoclass": new Info(GlobalConst.INFO_MAPTIPS_BOXSTYLE)
		}
	}

	/* setMapCtx(p_mapctx) {
		const basic_config = p_mapctx.toolmgr.basic_config;
		// SUBSTITUIR: LocQuery passa para custcmização da CMP, aqui fica algo de mais básico
		this.instances["querying"] = new LocQuery(p_mapctx, this.messaging_ctrlr, basic_config["locquery"], basic_config["crs"])
		console.info("[init RISCO] MapCustomizations, query box adapter launched");
	} */

}


