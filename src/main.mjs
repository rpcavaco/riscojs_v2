import {HTML5CanvasMgr} from './html5canvas.mjs';
import {Transform2DMgr} from './transformations.mjs';
import {ToolManager} from './tools.mjs';
import {TOCManager, DynamicSymbol} from './tocmanager.mjs';
import {FeatureCollection} from './feature_collection.mjs';
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {TouchController} from './touchevents.mjs';
import {GrSymbol} from './canvas_symbols.mjs';
import {getFeatureCenterPoint} from './geom.mjs';
import {ImgLRUCache} from './utils.mjs';

function isObject(item) {
	return (item && typeof item === 'object' && !Array.isArray(item));
}
  
  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   * 
   * https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge 
   */
function mergeDeep(target, ...sources) {

	if (!sources.length) return target;

	const source = sources.shift();
  
	if (isObject(target) && isObject(source)) {
	  for (const key in source) {
		if (isObject(source[key])) {
		  if (!target[key]) Object.assign(target, { [key]: {} });
		  mergeDeep(target[key], source[key]);
		} else {
		  Object.assign(target, { [key]: source[key] });
		}
	  }
	}
  
	return mergeDeep(target, ...sources);
}

/**
 * Class RiscoMapOverlay
 * 
 * Overlaying or stacking of more than one RiscoMap context
 * 
 * @param {string} p_paneldiv_id 	- Id of HTML DIV element to act as RiscoJS map panel
 * 
 */
export class RiscoMapOverlay {

	constructor(p_paneldiv_id) {

		if (p_paneldiv_id == null) {
			throw new Error("Class RiscoMapOverlay, null paneldiv_id");
		}		

		this.panelwidget = document.getElementById(p_paneldiv_id);
		if (this.panelwidget == null) {
			throw new Error(`Class RiscoMapOverlay, panel widget search, no div found with for id ${p_paneldiv_id}`);
		}		
		if (this.panelwidget.tagName.toLowerCase() != 'div') {
			throw new Error(`Class RiscoMapOverlay, panel widget must be DIV, not ${this.panelwidget.tagName}`);
		}	

		this.mapcontexts = {};
		// Attach resizing method to window resize event
		(function(p_mapovrly) {
			addEventListener("resize", function(e) { 
				let mapctx;
				for (let key in p_mapovrly.mapcontexts) { 
					if (p_mapovrly.mapcontexts.hasOwnProperty(key)) {
						mapctx = p_mapovrly.mapcontexts[key];
						mapctx.resize();
					}
				}
			 }); 
		})(this);			
	}


	/**
	 * Method newMapCtx
	 * Create new map context attached to this overlay
	 * @param {object} p_config_var - Variable object containing configuration JSON dictionary
	 * @param {string} p_ctx_id - Identification of this context eg: 'left', 'right', 'single', 'base', etc.
	 * @param {string} p_mode - Just 'canvas' for now
	 * @param {boolean} b_wait_for_customization_avail - Flag - if true, customizations must be completely inited before first refresh of map
	 * @param {string} p_tabletmode - Activate 'tablet mode': 'NONE' or null,  'SIMPLE', 'ADVANCED'
	 * @returns - the context just created
	 */
	newMapCtx(p_config_var, p_ctx_id, p_mode, b_wait_for_customization_avail, p_tabletmode) {

		if (p_config_var == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null config_var");
		}
		if (p_ctx_id == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null context id");
		}	

		this.mapcontexts[p_ctx_id] = new RiscoMapCtx(p_config_var, this.panelwidget, p_mode, b_wait_for_customization_avail, p_tabletmode);

		return this.mapcontexts[p_ctx_id];
	}

	/**
	 * Method getMapCtx
	 * Return exisitng map context attached to this overlay
	 * @param {string} p_ctx_id - Identification of this context
	 * @returns - The context for the given id
	 */
	 getMapCtx(p_ctx_id) {
		if (p_ctx_id == null) {
			throw new Error("Class RiscoMapOverlay, getMapCtx, null context id");
		}	
		let ret = null;
		if (this.mapcontexts[p_ctx_id] !== undefined) {
			ret = this.mapcontexts[p_ctx_id];
		} else {
			console.error(`context with id '${p_ctx_id}' not in this map overlay mgr (widget id:'${this.panelwidget.id}'`);
		}
		return ret;
	}	
	
}

class tabletFeatPreSelectionMgr {
	//selection ids per layer key
	#feats_dict = null;
	#active = false;

	activate(p_do_activate) {
		if (p_do_activate) {
			this.#active = true;
		} else {
			this.#active = false;
		}
	}

	get isActive() {
		return this.#active;
	}

	reset() {
		this.#feats_dict = null;
	}

	set(p_feats_dict) {
		if (this.#active) {
			this.#feats_dict = p_feats_dict;
		}
	}

	get() {
		if (this.#active) {
			return this.#feats_dict;
		} else {
			return null;
		}
	}

	/*
	featsAreEqualtoSetFeat(p_feats_dict) {

		let objks, res = true;

		if (this.#active) {
			res = true;
			objks = Object.keys(this.#feats_dict);
			for (let k in p_feats_dict) {
				if (p_feats_dict.hasOwnProperty(k)) {
					if (objks.indexOf(k) < 0) {
						res = false;
						break;
					}
					for (const from_feat of p_feats_dict[k]) {
						for (const to_feat of this.#feats_dict[k]) {
							if (from_feat.id != to_feat.id) {
								res = false;
								break;								
							}
						}
						if (!res) {
							break;
						}
					}
				}

			}
		}

		return res;
	}
	*/

	get isSet() {
		let ret = false;
		if (this.#active) {
			ret = (this.#feats_dict != null);
		}

		return ret;
	}

}

/**
 * Class RiscoMapCtx
 * 
 * Risco Map Context controller, main class to use in case of a simple one map web client
 * 
 * @param {object} p_config_var - Variable object containing configuration JSON dictionary
 * @param {object} p_paneldiv 	- String Id or object reference to HTML DIV element to act as RiscoJS map panel
 * @param {string} p_mode - Just 'canvas' for now
 * @param {boolean} b_wait_for_customization_avail - Flag - if true, customizations must be completely inited before first refresh of map
 * @param {string} p_tabletmode - Activate 'tablet mode': 'NONE', 'SIMPLE' OR 'ADVANCED'
 */
export class RiscoMapCtx {

	#customization_object;
	graphicsmode;
	tabletmode; 
	tabletFeatPreSelection;
	//_refresh_timeout_id;
	//_setscaleatcenter_timeout_id;

	_timeout_ids = {};

	// p_mode -- just 'canvas' for now
	constructor(p_config_var, p_paneldiv, p_mode, b_wait_for_customization_avail, p_tabletmode) {

		this.wait_for_customization_avail = b_wait_for_customization_avail;

		if (p_config_var == null) {
			throw new Error("Class RiscoMapCtx, null config_var");
		}
		if (typeof p_config_var != 'object') {
			throw new Error(`Class RiscoMapCtx, config_var must be 'object' not '${typeof p_config_var}'`);
		}		
		if (p_paneldiv == null) {
			throw new Error("Class RiscoMapCtx, null paneldiv");
		}		

		if (typeof p_paneldiv == 'string') {
			this.panelwidget = document.getElementById(p_paneldiv);
		} else if (typeof p_paneldiv == 'object') {
			this.panelwidget = p_paneldiv;
		} else 	{
			throw new Error('invalid type for paneldiv parameter');
		}

		if (this.panelwidget == null) {
			throw new Error("Class RiscoMapCtx, no panel widget");
		}		
		if (this.panelwidget.tagName.toLowerCase() != 'div') {
			throw new Error(`Class RiscoMapCtx, panel widget must be DIV, not ${this.panelwidget.tagName}`);
		}	

		this.cfgvar = p_config_var;

		this.graphicsmode = p_mode;

		// Tablet mode SIMPLE/ADVANCED (tabletFeatPreSelection activated): changes mouse and touch interaction with features
		// Keeps selected layer key and associated selected feature id
		this.tabletmode = p_tabletmode;
		this.tabletFeatPreSelection = new tabletFeatPreSelectionMgr();
		if (this.tabletmode.trim().toLowerCase() == "simple") {
			this.tabletFeatPreSelection.activate(true);
		}

		switch(p_mode) {

			case 'canvas':
				this.renderingsmgr = new HTML5CanvasMgr(this);
				break;

		}

		this.featureCollection = new FeatureCollection(this);
		this.transformmgr = new Transform2DMgr(this, p_config_var["basic"]);	
		this.toolmgr = new ToolManager(this, p_config_var["basic"]);
		this.tocmgr = new TOCManager(this, p_mode);
		this.i18n = new I18n(p_config_var["text"]);
		this.touchevtctrlr = new TouchController();
		this.imgbuffer = new ImgLRUCache(GlobalConst.IMAGE_LRUCACHE_SZ);

		this._refresh_timeout_id = null;
		this._setscaleatcenter_timeout_id = null;

		// Attach event listeners to this map context panel
		(function(p_mapctx) {
			const evttypes = ["mouseup", "mousedown", "mousemove", "mouseover", "mouseout", "mouseleave", "wheel", "touchstart", "touchmove", "touchend", "touchcancel", "adv_hover"];
			for (let i=0; i<evttypes.length; i++) {
				p_mapctx.panelwidget.addEventListener(evttypes[i], function(e) { 
					if (evttypes[i].startsWith("adv")) { console.log("-->", e.type, e.offsetX, e.offsetY); }
					p_mapctx.mxOnEvent(e);
				}); 
			}
		})(this);	

		if (!this.wait_for_customization_avail) {
			this.maprefresh();
		}

		if (p_config_var["basic"]["skipdefaultfonts"] === undefined || !p_config_var["basic"]["skipdefaultfonts"]) {
			let f;
			for (let fkey in GlobalConst.FONTS) {
				f = new FontFace(fkey, `url(${GlobalConst.FONTS[fkey]})`);
				f.load().then(() => {
					console.info(`[init RISCO] ${fkey} font loaded`);
				}, (err) => {
					console.warn(`[init RISCO] no font '${fkey}' available`);
				});
				document.fonts.add(f);			
			}
		}

		if (p_config_var["basic"]["adicfonts"] !== undefined) {
			let f;
			for (let fkey in p_config_var["basic"]["adicfonts"]) {
				f = new FontFace(fkey, `url(${p_config_var["basic"]["adicfonts"][fkey]})`);
				f.load().then(() => {
					console.info(`[init RISCO] ${fkey} adic font loaded`);
				}, (err) => {
					console.warn(`[init RISCO] no adic font '${fkey}' available`);
				});
				document.fonts.add(f);			
			}			
		}


		console.info(`[init RISCO] ==  End of map context init for '${this.panelwidget.id}'  ==`);
	}

	/**
	 * @param {any} p_cclass
	 */
	setCustomizationObj(p_object, p_setmapctx_func) {

		this.#customization_object = p_object;
		p_setmapctx_func(this, p_object);

		for (let objid of this.#customization_object.mapcustom_controlsmgrs_keys) {
			if (p_object.instances[objid] !== undefined) {
				this.toolmgr.addControlsMgr(objid, p_object.instances[objid]);
				if (p_object.instances[objid]['setTOCMgr'] !== undefined) {
					p_object.instances[objid].setTOCMgr(this.tocmgr);
				}
			}	
		}

		if (p_object.instances["toc"] !== undefined) {
			this.tocmgr.setTOCControl(p_object.instances["toc"]);
		}	

		if (this.wait_for_customization_avail) {
			this.maprefresh();
		}		
	}

	getCustomizationObject() {
		return this.#customization_object;
	}
	/**
	 * Method resize - to be automatically fired on window resize
	 */	
	resize() {
		this.renderingsmgr.init();
		this.maprefresh();
		this.onAfterResize(this);
	}

	/**
	 * Method onAfterResize - Abstract, must be implemented to execute customized tasks on fired on window resize
 	 * @param {object} p_this_mapctx - This map context
 	 */	
	onAfterResize(p_this_mapctx) {
		// To be implemented 
	}

	/**
	 * Method mxOnEvent
	 * Fired on every listened event 
	 * @param {object} p_mapctx - Map context for which interactions managing is needed
s 	 * @param {object} p_evt - Event (user event expected)
	 */
	mxOnEvent(p_evt) {

		const clickendevents = ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout", "adv_pick"];

		if (p_evt.target.tagName.toLowerCase() == "canvas") {
			const evt = this.touchevtctrlr.adapt(p_evt);
			if (evt) {

				if (GlobalConst.getDebug("INTERACTIONCLICKEND") && clickendevents.indexOf(p_evt.type) >= 0) {
					console.log("[DBG:INTERACTIONCLICKEND] MAIN - mxOnEvent event adapted from touch - original, adapted:", p_evt, evt);
				}
		
				if (GlobalConst.getDebug("INTERACTION")) {
					console.log("[DBG:INTERACTION] MAIN - mxOnEvent event adapted from touch - original, adapted:", p_evt, evt);
				}

				let overlay_responded = false;

				const ci = this.getCustomizationObject();
				for (let k of ci.overlay_keys) {
					if (ci && ci.instances[k] !== undefined) {
						const ciitem = ci.instances[k];
						if (ciitem.interact !== undefined) {
							overlay_responded = ciitem.interact(this, p_evt);
							// console.trace("INT overlay_responded:", k, overlay_responded);
							if (overlay_responded) {
								// if more than one overlay, only one interaction allowed
								break;
							}
						}
					}	
				}

				if (GlobalConst.getDebug("INTERACTIONCLICKEND") && clickendevents.indexOf(p_evt.type) >= 0) {
					console.log("[DBG:INTERACTIONCLICKEND] MAIN - mxOnEvent overlay_responded:", overlay_responded);
				}
		
				if (!overlay_responded) {
					// if event interacts with TOC, it will not interact with tools and controls
					if (!this.tocmgr.tocmOnEvent(this, evt)) {
						this.toolmgr.toolmgrOnEvent(this, evt);
					}
				}

				p_evt.stopPropagation();
			} else {
				if (GlobalConst.getDebug("INTERACTION")) {
					console.log("[DBG:INTERACTION] MAIN - event NOT adapted from touch - evt.type:", p_evt.type);
				}
			}
		}
	}	

	getCanvasDims(out_dims) {
		this.renderingsmgr.getCanvasDims(out_dims);
	}

	getMapBounds(out_env) {
		const canvasDims = [];
		this.renderingsmgr.getCanvasDims(canvasDims);
		this.transformmgr.getMapBounds(canvasDims, out_env)
	}

	getCenter(out_pt) {
		this.transformmgr.getCenter(out_pt);
	}

	getScale() {
		return this.transformmgr.getReadableCartoScale();
	}

	getPixSize() {
		return this.transformmgr.getPixSize();
	}

	drawControls() {
		const ci = this.getCustomizationObject();

		for (let k of ci.mapcustom_controls_keys) {
			if (ci && ci.instances[k] !== undefined) {
				const bcb = ci.instances[k];
				if (bcb.print !== undefined) {
					bcb.print(this);
				}
			}	
		}	
	}

	getCenterPoint(p_mapdims) {

		let mapdims;

		if (!p_mapdims) {
			mapdims = [];
			this.renderingsmgr.getCanvasDims(mapdims);
		} else {
			mapdims = p_mapdims;
		}

		return [parseInt(Math.round(mapdims[0]/2.0)), parseInt(Math.round(mapdims[1]/2.0))];

	}

	drawAdvancedTabletmodeTarget() {

		const canvaslayer = "service_canvas";

		let mapdims = [];
		this.renderingsmgr.getCanvasDims(mapdims);

		const center_pt = this.getCenterPoint(mapdims);
		const gfctx = this.renderingsmgr.getDrwCtx(canvaslayer, '2d');

		gfctx.save();
		gfctx.strokeStyle = "white";
		gfctx.lineWidth = GlobalConst.CENTER_TARGET_WIDTH;

		const sz = 0.3 * GlobalConst.CENTER_TARGET_SIZE;
		const sz2 = 1.5 * GlobalConst.CENTER_TARGET_SIZE;

		try {
			gfctx.clearRect(0, 0, ...mapdims); 

			gfctx.beginPath();
			gfctx.moveTo(center_pt[0] - sz2, center_pt[1]);
			gfctx.lineTo(center_pt[0] - sz, center_pt[1]);
			gfctx.stroke();
			
			gfctx.beginPath();
			gfctx.moveTo(center_pt[0] + sz, center_pt[1]);
			gfctx.lineTo(center_pt[0] + sz2, center_pt[1]);
			gfctx.stroke();

			gfctx.beginPath();
			gfctx.moveTo(center_pt[0], center_pt[1] - sz2);
			gfctx.lineTo(center_pt[0], center_pt[1] - sz);
			gfctx.stroke();
			
			gfctx.beginPath();
			gfctx.moveTo(center_pt[0], center_pt[1] + sz);
			gfctx.lineTo(center_pt[0], center_pt[1] + sz2);
			gfctx.stroke();

		} finally {
			gfctx.restore();
		}

	}

	maprefresh() {

		if (this.tocmgr.isRefreshing()) {

			// Prevent effective re-refreshing calls while refresh process is still in progress
			// A single refresh call is delayed to happen after previous refresh process is finished
			
			if (this._refresh_timeout_id) {
				clearTimeout(this._refresh_timeout_id);
			}

			(function(p_this, p_delay_msecs) {
				p_this._refresh_timeout_id = setTimeout(function() {
					p_this.maprefresh();
				}, p_delay_msecs);
			})(this, 700);

		} else {

			// Removed to TOCManager nextdraw (draws when all features finished loading)
			//this.drawControls();

			const sv = this.transformmgr.getReadableCartoScale();
			
			this.featureCollection.invalidate();
			// maplayers refresh
			this.tocmgr.tocMgrRefresh(sv);

			if (this.tabletmode.toLowerCase() == "advanced") {
				this.drawAdvancedTabletmodeTarget();
			}

		}
	}

	drawSingleFeature(p_layer_key, p_obj_id, b_is_sel, opt_geomtype_keyed_symbdict, opt_alt_canvaskeys_dict) {

		// opt_alt_canvaskeys_dict  example: {'normal': 'temporary', 'label': 'temporary' }

		let symb, classkey;
		let lsymb = new GrSymbol();

		const ly = this.tocmgr.getLayer(p_layer_key);

		if (ly != null && ly.layervisible) {

			if (opt_geomtype_keyed_symbdict!=null && opt_geomtype_keyed_symbdict[ly.geomtype] === undefined) {
				console.error("==== opt_geomtype_keyed_symbdict ====");
				console.error(opt_geomtype_keyed_symbdict);
				throw new Error(`opt_geomtype_keyed_symbdict has no ${ly.geomtype} content`);
			}

			if (b_is_sel && ly.default_sel_symbol!='none') {
				Object.assign(lsymb, ly.default_sel_symbol);
			} else {
				Object.assign(lsymb, ly.default_symbol);
			}

			if (ly.geomtype == "point") {
				if (opt_geomtype_keyed_symbdict != null && opt_geomtype_keyed_symbdict[ly.geomtype].marker !== undefined) {
					// opt_geomtype_keyed_symbdict[ly.geomtype] is symbol config dictionary
					classkey = opt_geomtype_keyed_symbdict[ly.geomtype].marker;					
				} else {
					// symb is symbol object
					if (b_is_sel && ly.default_sel_symbol!='none') {
						symb = ly.default_sel_symbol;
					} else {
						symb = ly.default_symbol;
					}
					classkey = symb.marker;					
				}
			} else {
				classkey = ly.geomtype;
			}
			
			if (opt_geomtype_keyed_symbdict != null) {

				symb = new DynamicSymbol(this.tocmgr.mode, classkey);
				Object.assign(symb, opt_geomtype_keyed_symbdict[ly.geomtype]);
				if (opt_geomtype_keyed_symbdict['label'] !== undefined) {
					Object.assign(lsymb, opt_geomtype_keyed_symbdict['label']);
				}
			}

			console.assert(symb != null, `drawSingleFeature, no 'symb' defined for ${p_layer_key}, on selections:${b_is_sel}`);

			if (GlobalConst.getDebug("DRAWASSELECTED")) {
				console.log(`[DBG:DRAWASSELECTED] drawSingleFeature graphicsymb: ${JSON.stringify(symb)}, label: ${JSON.stringify(lsymb)}`);
				console.log(`[DBG:DRAWASSELECTED] drawSingleFeature lkey:${p_layer_key}, oid:${p_obj_id}, canvaskeys:${JSON.stringify(opt_alt_canvaskeys_dict)}`);
			}

			return new Promise((resolve,reject) => {
				const env = [];
				this.getMapBounds(env);
				this.featureCollection.featuredraw(p_layer_key, p_obj_id, opt_alt_canvaskeys_dict, { "graphic": symb, 'label': lsymb }, null, env ).then(
					(feat) => { 

						if (GlobalConst.getDebug("DRAWASSELECTED")) {
							console.log(`[DBG:DRAWASSELECTED] drawSingleFeature featuredraw, feat!=null: ${feat!=null}`);
						}

						resolve(feat); 
					}
				).catch((e) => {
					reject(e);
				});
			})

		} else {
			if (ly == null) {
				return Promise.reject(new Error(`[WARN] drawSingleFeature: no layer found for id ${p_layer_key}`));
			} else {
				return Promise.reject(new Error(`[WARN] drawSingleFeature: layer found but not visible for id ${p_layer_key}`));
			}
		}
	}

	drawVertex(p_vertex_type, p_scrx, p_scry, p_canvaslayer) {

		let styles;
		const canvas_dims = [];		

		switch(p_vertex_type) {

			case "MOVE":
				styles = GlobalConst.FEATUREEDIT_VERTEX_MOVE;
				break;

			case "NEW":
				styles = GlobalConst.FEATUREEDIT_VERTEX_NEW;
				break;

		}
		
		let ctx, usestylecfg, ret_promise = null;
		if (this.cfgvar['basic']['featureedit_vertex_move'] !== undefined) {
			usestylecfg = mergeDeep(styles, this.cfgvar['basic']['featureedit_vertex_move']);
		} else {
			usestylecfg = styles;
		}

		try {

			ctx = this.renderingsmgr.getDrwCtx(p_canvaslayer, '2d');
			this.renderingsmgr.getCanvasDims(canvas_dims);
			ctx.clearRect(0, 0, ...canvas_dims); 	

			ctx.save();

			for (let symbol, currstyle, ci=0; ci<usestylecfg.length; ci++) {

				currstyle = usestylecfg[ci];

				if (currstyle.marker === undefined || currstyle.marker == "none") { 
					throw new Error(`mapctxt drawVertex, 'featureedit_vertex_move' config ${ci} has no 'marker' attribute`);
				}

				symbol = new DynamicSymbol(this.graphicsmode, currstyle.marker);
				mergeDeep(symbol, currstyle)
				console.assert(symbol != null, `mapctxt drawVertex, config ${ci}, null symbol for mode ${this.graphicsmode} and marker ${currstyle.marker}`);

				if (symbol['drawSimpleSymbAsync'] !== undefined) {

					console.assert(currstyle['imgname'] === undefined, `mapctxt drawVertex, config ${ci}, null 'imgname' cfg attrib for vertex marker ${currstyle.marker}`);
					console.assert(currstyle['imgurl'] === undefined, `mapctxt drawVertex, config ${ci}, null 'imgurl' cfg attrib for vertex marker ${currstyle.marker}`);

					ret_promise = new Promise((resolve, reject) =>  {
						symbol.drawSimpleSymbAsync(ctx, this.imgbuffer, [p_scrx, p_scry], currstyle['imgname'], currstyle['imgurl']).then(
							() => {
								resolve();
							}
						).catch((e) => {
							reject(e);
						});
					});

				} else {

					symbol.setStyle(ctx);
					symbol.drawSimpleSymb(ctx, [p_scrx, p_scry]);
					ret_promise = Promise.resolve();
				}

			}

		} finally {
			ctx.restore();
		}

		if (ret_promise) {
			return ret_promise;
		} else {
			return Promise.reject(new Error("internal error, drawVertex, no promise received"));
		}
	}

	// opt_alt_canvaskeys_dict: {'normal': 'temporary', 'label': 'temporary' }
	drawFeatureAsMouseSelected(p_layer_key, p_obj_id, p_mode, opt_alt_canvaskeys_dict) {

		let hlStyles, basestyle, layercfgkey;

		if (GlobalConst.getDebug("DRAWASSELECTED")) {
			console.trace(`[DBG:DRAWASSELECTED]`);
		}

		switch (p_mode) {

			case "NORMAL":
				layercfgkey = "selectionsymbol"
				basestyle = GlobalConst.FEATMOUSESEL_HIGHLIGHT
				break;

			case "EDITSEL":
				layercfgkey = "editsymbol_selected"				
				basestyle = GlobalConst.FEATMOUSESEL_HIGHLIGHT_EDIT["selected"]
				break;

			case "EDITENGAGE":
				layercfgkey = "editsymbol_engaged"	
				basestyle = {}			
				mergeDeep(basestyle, GlobalConst.FEATMOUSESEL_HIGHLIGHT_EDIT["selected"], GlobalConst.FEATMOUSESEL_HIGHLIGHT_EDIT["engaged"]);
				break;
		
			default:
				throw new Error(`drawFeatureAsMouseSelected, invalid mode: ${p_mode}`);

		}

		if (layercfgkey != "vertexmove") {
			if (this.cfgvar['basic']['featmousesel_highlight'] !== undefined) {
				hlStyles = mergeDeep(basestyle, this.cfgvar['basic']['featmousesel_highlight']);
			} else {
				hlStyles = basestyle;
			}
		} else {
			if (this.cfgvar['basic']['featureedit_vertex_move'] !== undefined) {
				hlStyles = mergeDeep(basestyle, this.cfgvar['basic']['featureedit_vertex_move']);
			} else {
				hlStyles = basestyle;
			}
		}

		const ly = this.tocmgr.getLayer(p_layer_key);

		if (!ly) {
			throw new Error(`drawFeatureAsMouseSelected: layer '${p_layer_key}' is missing in TOC Manager`);
		}

		if (ly[layercfgkey] !== undefined) {
			const d = {};
			d[ly.geomtype] = ly.selectionsymbol;
			mergeDeep(hlStyles[ly.geomtype], d);
		}

		if (GlobalConst.getDebug("DRAWASSELECTED")) {
			console.log(`[DBG:DRAWASSELECTED] drawFeatureAsMouseSelected hstyles: ${JSON.stringify(hlStyles)}`);
		}

		//drawSingleFeature(p_layer_key, p_obj_id, b_is_sel, opt_geomtype_keyed_symbdict, opt_alt_canvaskeys_dict) {

		return this.drawSingleFeature(p_layer_key, p_obj_id, true, hlStyles, opt_alt_canvaskeys_dict);
	}

	transformsChanged(b_dodraw) {
		// console.info(">>>>>     transformsChanged     <<<<<");

		// invalidate spatial index - aqui ou em draw
		
		if (b_dodraw) {
			this.maprefresh();
		}
	}


	printMouseCoords(px, py) {
		const ci = this.getCustomizationObject();
		if (ci) {
			const mpc = ci.instances["mousecoordsprint"];
			if (mpc.print !== undefined) {
				mpc.print(this, px, py);
			}			
		}
	}

		/*

	printScale(p_scaleval) {
		const ci = this.getCustomizationObject();
		if (ci) {
			const mpc = ci.instances["mapscaleprint"];
			const apc = ci.instances["attributionprint"];

			if (mpc.print !== undefined) {

				let sep=0, right_offset = null, vert_offset = null;

				if (apc) {

					let loa = false;

					if (this.cfgvar["basic"]["mapscale"] !== undefined && this.cfgvar["basic"]["mapscale"]["left_of_attribution"] !== undefined) {
						loa = this.cfgvar["basic"]["mapscale"]["left_of_attribution"];
					} else {
						loa = GlobalConst.MESSAGING_STYLES.MAPSCALE_LEFTOF_ATTRIBUTION;
					}
					if (this.cfgvar["basic"]["mapscale"] !== undefined && this.cfgvar["basic"]["mapscale"]["sep_from_attribution"] !== undefined) {
						sep = this.cfgvar["basic"]["mapscale"]["sep_from_attribution"];
					} else {
						sep = GlobalConst.MESSAGING_STYLES.MAPSCALE_SEPFROM_ATTRIBUTION;
					}

					if (loa) {						
						if (apc['setdims'] !== undefined) {
							apc.setdims(this);
							right_offset = apc.boxw + sep;	
						}
					} else {
						if (apc['setdims'] !== undefined) {
							apc.setdims(this);
							vert_offset = apc.boxh + sep;	
						}
					}
				}
				mpc.print(this, p_scaleval, right_offset, vert_offset);
			} else {
				console.error(`mapscaleprint customization unavailable, cannot print scale value of ${p_scaleval}`);
			}	
		} else {
			console.error("printScale, no map customizations available");
		}
	}*/

	printLoadingMsg(p_layername) {
		const ci = this.getCustomizationObject();
		if (ci) {
			const mpc = ci.instances["loadingmsgprint"];
			if (mpc.print !== undefined) {
				mpc.print(this, p_layername);
			} else {
				console.error(`loadingmsgprint customization unavailable, cannot print message '${p_layername}'`);

			}	
		} else {
			console.error("printLoadingMsg, no map customizations available");
		}
	}

	printAttributionMsg() {
		const ci = this.getCustomizationObject();
		if (ci) {
			const apc = ci.instances["attributionprint"];
			if (apc.print !== undefined) {
				apc.print(this);
			} else {
				console.error(`attributionprint customization unavailable, cannot print attribution message`);

			}	
		} else {
			console.error("attributionMsg, no map customizations available");
		}
	}

	removePrint(p_type) {
		const ci = this.getCustomizationObject();
		if (ci) {
			const mpc = ci.instances[p_type];
			if (mpc.remove !== undefined) {
				mpc.remove(this);
			}			
		}
	}	

	// opt_alt_canvaskeys_dict: {'normal': 'temporary', 'label': 'temporary' }
	zoomToFeatsAndOpenInfoOnLast(p_featids_per_layerkey_dict, p_env, opt_alt_canvaskeys_dict, opt_adic_callback) {

		this.tocmgr.addAfterRefreshProcedure(() => {

			let lastk = null, lastid = null;
			for (let k in p_featids_per_layerkey_dict) {
				for (let id of p_featids_per_layerkey_dict[k]) {
					this.drawFeatureAsMouseSelected(k, id, "NORMAL", opt_alt_canvaskeys_dict);
					lastid = id;
				}
				lastk = k;
			}

			if (lastk !== null && lastid != null) {

				const ci = this.getCustomizationObject();
				if (ci == null) {
					throw new Error("zoomToFeatAndOpenInfo, getting infotool, customization instance is missing")
				}

				const minarea = this.getScale() / 100.0;
				const the_feat = this.featureCollection.get(lastk, lastid);
				if (the_feat == null) {
					throw new Error(`zoomToFeatAndOpenInfo, getting infotool, no feature, layer key:${lastk} id:${lastid}`)
				}

				let spt = [];
				const lpt = getFeatureCenterPoint(the_feat.gt, the_feat.l, the_feat.g, minarea);
				if (lpt.length == 1) {
					this.transformmgr.getScrPt(lpt[0], spt);
				} else {
					this.transformmgr.getScrPt(lpt, spt);
				}
			
				// abrir info
				const ic = ci.instances["infoclass"];
				if (ic) {
					ic.pickfeature(this, lastk, the_feat, ...spt);
				}
		
			}

			if (opt_adic_callback) {
				opt_adic_callback();
			}
		});

		for (let k in p_featids_per_layerkey_dict) {
			this.tocmgr.setLayerVisibility(k, true);
		}

		this.transformmgr.zoomToRect(...p_env);		
	}

	clearInteractions(opt_source_id, opt_clear_temp_also, opt_single_canvaslayer) { 

		if (GlobalConst.getDebug("INTERACTION") || GlobalConst.getDebug("INTERACTIONCLEAR")) {
			console.log(`[DBG:INTERACTIONCLEAR] Map context clearInteractions, source:'${opt_source_id}', also clear temp:${opt_clear_temp_also}', single layer:${opt_single_canvaslayer}'`);
		}		

		if (opt_single_canvaslayer) {
			this.renderingsmgr.clearAll([opt_single_canvaslayer]);
			return;
		}

		const ci = this.getCustomizationObject();
		if (ci == null) {
			throw new Error("clearInteractions, no customization object found")
		}

		for (let k in ci.instances) {
			if (ci.instances[k]["customizClearInteractions"] !== undefined) {
				ci.instances[k].customizClearInteractions(this);
			}
		}

		const ic = ci.instances["infoclass"];
		if (ic) {
			ic.clearinfo(this, opt_source_id);
		}

		// Clear up SIMPLE tablet mode preselected feature
		if (this.tabletFeatPreSelection.isActive) {
			this.tabletFeatPreSelection.reset();
		}

		if (opt_clear_temp_also) {
			this.renderingsmgr.clearAll(['transientmap', 'transientviz',  'temporary']);
		} else {
			this.renderingsmgr.clearAll(['transientmap', 'transientviz']);
		}

	}

	showImageOnOverlay(p_imageobj) {

		const ci = this.getCustomizationObject();
		if (ci == null) {
			throw new Error("showImgageOnOverlay, no customization object found")
		}

		const ic = ci.instances["overlay"];
		if (ic) {
			ic.drawImage(p_imageobj);
		}

	}

	setScaleCenteredAtPoint(p_scaleval, p_terrain_pt, do_store, opt_after_refresh_paramless_procedure, opt_prevseqattempts_or_null) {

		let seqattempts;

		if (opt_prevseqattempts_or_null) {
			seqattempts = opt_prevseqattempts_or_null + 1;
		} else {
			seqattempts = 1;
		}

		if (seqattempts > GlobalConst.GLOBAL_SEQATTEMPTS_MAXNR) {
			console.warn("[WARN] exceeded seq.attempts max on setScaleCenteredAtPoint");
			return;
		}
		
		if (this.tocmgr.isRefreshing()) {

			// Prevent effective re-refreshing calls while refresh process is still in progress
			// A single refresh call is delayed to happen after previous refresh process is finished
			
			if (this._timeout_ids["scaleatcenter"] !== undefined && this._timeout_ids["scaleatcenter"] != null) {
				clearTimeout(this._timeout_ids["scaleatcenter"]);
				this._timeout_ids["scaleatcenter"] = null;
			}

			(function(p_this, p_delay_msecs) {
				p_this._timeout_ids["scaleatcenter"] = setTimeout(function() {
					p_this.setScaleCenteredAtPoint(p_scaleval, p_terrain_pt, do_store, opt_after_refresh_paramless_procedure, seqattempts);
				}, p_delay_msecs);
			})(this, GlobalConst.GLOBAL_SEQATTEMPTS_DELAY_MS);

		} else {

			this.tocmgr.addAfterRefreshProcedure(opt_after_refresh_paramless_procedure);
			this.transformmgr.setScaleCenteredAtPoint(p_scaleval, p_terrain_pt, do_store);	
	
		}

	}

	enableEditUser(p_sessionid, p_logging_name, b_can_edit) {

		const ci = this.getCustomizationObject();
		if (ci == null) {
			throw new Error("enableEditUser, no customization object found")
		}

		const ic = ci.instances["editing"];
		if (ic) {
			ic.setCurrentUser(p_sessionid, p_logging_name, b_can_edit);
		}
	}

	setEditingEnabled(p_editing_is_enabled) {

		const ci = this.getCustomizationObject();
		if (ci == null) {
			throw new Error("Map context setEditingEnabled, no customization object found")
		}

		const ic = ci.instances["editing"];
		if (ic) {
			ic.setEditingEnabled(this, p_editing_is_enabled);
		}
	}

	getEditingManager() {

		let ret = null;

		const ci = this.getCustomizationObject();
		if (ci == null) {
			throw new Error("getEditingManager, no customization object found")
		}

		const ic = ci.instances["editing"];
		if (ic) {
			ret = ic;
		}

		return ret;
	}

}

