import {HTML5CanvasMgr} from './html5canvas.mjs';
import {Transform2DMgr} from './transformations.mjs';
import {ToolManager} from './interactions.mjs';
import {TOCManager} from './toc.mjs';
import {FeatureCollection} from './feature_collection.mjs';
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {TouchController} from './touchevents.mjs';
import {GrSymbol} from './canvas_symbols.mjs';
import {getFeatureCenterPoint} from './geom.mjs';

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
	 * @returns - the context just created
	 */
	newMapCtx(p_config_var, p_ctx_id, p_mode, b_wait_for_customization_avail) {

		if (p_config_var == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null config_var");
		}
		if (p_ctx_id == null) {
			throw new Error("Class RiscoMapOverlay, newMapCtx, null context id");
		}	

		this.mapcontexts[p_ctx_id] = new RiscoMapCtx(p_config_var, this.panelwidget, p_mode, b_wait_for_customization_avail);

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

/**
 * Class RiscoMapCtx
 * 
 * Risco Map Context controller, main class to use in case of a simple one map web client
 * 
 * @param {object} p_config_var - Variable object containing configuration JSON dictionary
 * @param {object} p_paneldiv 	- String Id or object reference to HTML DIV element to act as RiscoJS map panel
 * 
 */
export class RiscoMapCtx {

	#customization_object;
	classname = "RiscoMapCtx";

	// p_mode -- just 'canvas' for now
	constructor(p_config_var, p_paneldiv, p_mode, b_wait_for_customization_avail) {

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

		switch(p_mode) {

			case 'canvas':
				this.renderingsmgr = new HTML5CanvasMgr(this);
				break;

		}
		this.featureCollection = new FeatureCollection(this);
		this.transformmgr = new Transform2DMgr(this, p_config_var["basic"]);	
		this.toolmgr = new ToolManager(p_config_var["basic"]);
		this.tocmgr = new TOCManager(this, p_mode);
		this.i18n = new I18n(p_config_var["text"]);
		this.touchevtctrlr = new TouchController();

		this.query_box = new I18n(p_config_var["text"]);

		this._refresh_timeout_id = null;

		// Attach event listeners to this map context panel
		(function(p_mapctx) {
			const evttypes = ["mouseup", "mousedown", "mousemove", "mouseover", "mouseout", "mouseleave", "wheel", "touchstart", "touchmove", "touchend", "touchcancel"];
			for (let i=0; i<evttypes.length; i++) {
				p_mapctx.panelwidget.addEventListener(evttypes[i], function(e) { 
					p_mapctx.mxOnEvent(e);
				}); 
			}
		})(this);	

		if (!this.wait_for_customization_avail) {
			this.maprefresh();
		}

		let f;
		for (let fkey in GlobalConst.FONTS) {
			f = new FontFace(fkey, `url(${GlobalConst.FONTS[fkey]})`);
			f.load().then(() => {
				console.info(`[init RISCO] ${fkey} font loaded`);
			}, (err) => {
				console.error(err);
			});
			document.fonts.add(f);			
		}

		console.info(`[init RISCO] ==  End of map context init for '${this.panelwidget.id}'  ==`);
	}

	setCurrentUser(p_username) {
		this.toolmgr.setCurrentUser(p_username);
	}

	/**
	 * @param {any} p_cclass
	 */
	setCustomizationObj(p_object, p_setmapctx_func) {

		this.#customization_object = p_object;
		p_setmapctx_func(p_object, this);

		for (let objid of ["basiccontrolsbox", "basemapctrl"]) {
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
	 * Method onEvent
	 * Fired on every listened event 
	 * @param {object} p_mapctx - Map context for which interactions managing is needed
s 	 * @param {object} p_evt - Event (user event expected)
	 */
	mxOnEvent(p_evt) {
		if (p_evt.target.tagName.toLowerCase() == "canvas") {
			const evt = this.touchevtctrlr.adapt(p_evt);
			if (evt) {

				if (GlobalConst.getDebug("INTERACTION")) {
					console.log("[DBG:INTERACTION] MAIN - event adapted from touch - original, adapted:", p_evt, evt);
				}

				// if event interacts with TOC, it will not interact with tools and controls
				if (!this.tocmgr.tocmOnEvent(this, evt)) {
					this.toolmgr.tmOnEvent(this, evt);
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
		for (let k of ci.controls_keys) {
			if (ci && ci.instances[k] !== undefined) {
				const bcb = ci.instances[k];
				if (bcb.print !== undefined) {
					bcb.print(this);
				}
			}	
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
			// print decorated map scale widget 
			this.printScale(sv);

			this.featureCollection.invalidate();
			// maplayers refresh
			this.tocmgr.tocMgrRefresh(sv);


		}
	}

	drawSingleFeature(p_layer_key, p_obj_id, p_geomtype_keyed_symbdict, opt_alt_canvaskeys_dict) {

		// opt_alt_canvaskeys_dict  example: {'normal': 'temporary', 'label': 'temporary' }

		let symb = new GrSymbol();
		let lsymb = new GrSymbol();
		let ret = null;

		const ly = this.tocmgr.getLayer(p_layer_key);

		if (ly) {

			// TODO falta tratar da simbologia de labels

			Object.assign(symb, ly.default_symbol);
			Object.assign(symb, p_geomtype_keyed_symbdict[ly.geomtype]);
			if (ly.default_symbol['drawsymb'] !== undefined) {
				symb.drawsymb = ly.default_symbol.drawsymb;
			}

			Object.assign(lsymb, ly.default_symbol);
			if (p_geomtype_keyed_symbdict['label'] !== undefined) {
				Object.assign(lsymb, p_geomtype_keyed_symbdict['label']);
			}

			// console.log('lsymb:', lsymb);

			ret = this.featureCollection.draw(p_layer_key, p_obj_id, opt_alt_canvaskeys_dict, { "graphic": symb, 'label': lsymb } );
			
		} else {
			console.error(`[WARN] drawSingleFeature: no layer found for id ${p_layer_key}`);
		}

		return ret;
	}

	// opt_alt_canvaskeys_dict: {'normal': 'temporary', 'label': 'temporary' }
	drawFeatureAsMouseSelected(p_layer_key, p_obj_id, opt_alt_canvaskeys_dict) {

		let hlStyles;
		if (this.cfgvar['basic']['featmousesel_highlight'] !== undefined) {
			hlStyles = mergeDeep(GlobalConst.FEATMOUSESEL_HIGHLIGHT, this.cfgvar['basic']['featmousesel_highlight']);
		} else {
			hlStyles = GlobalConst.FEATMOUSESEL_HIGHLIGHT;
		}

		return this.drawSingleFeature(p_layer_key, p_obj_id, hlStyles, opt_alt_canvaskeys_dict);
	}

	transformsChanged(b_dodraw) {
		// console.info(">>>>>     transformsChanged     <<<<<");

		// invalidate spatial index - aqui ou em draw
		
		if (b_dodraw) {
			this.maprefresh();
		}
	}

	printMouseCoords(p_x, py) {
		const ci = this.getCustomizationObject();
		if (ci) {
			const mpc = ci.instances["mousecoordsprint"];
			if (mpc.print !== undefined) {
				mpc.print(this, p_x, py);
			}			
		}
	}

	printScale(p_scaleval) {
		const ci = this.getCustomizationObject();
		if (ci) {
			const mpc = ci.instances["mapscaleprint"];
			if (mpc.print !== undefined) {
				mpc.print(this, p_scaleval);
			} else {
				console.error(`mapscaleprint customization unavailable, cannot print scale value of ${p_scaleval}`);

			}	
		} else {
			console.error("printScale, no map customizations available");
		}
	}

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
					this.drawFeatureAsMouseSelected(k, id, opt_alt_canvaskeys_dict);
					lastid = id;
				}
				lastk = k;
			}

			//NUP/13736/2020/CMP
			if (lastk !== null && lastid != null) {

				const ci = this.getCustomizationObject();
				if (ci == null) {
					throw new Error("zoomToFeatAndOpenInfo, getting infotool, customization instance is missing")
				}

				const minarea = this.getScale() / 100.0;
				const the_feat = this.featureCollection.get(lastk, lastid);
				
				let itool, spt = [];
				const lpt = getFeatureCenterPoint(the_feat.gt, the_feat.l, the_feat.g, minarea);
				this.transformmgr.getScrPt(lpt, spt);
			
				// abrir info
				const ic = ci.instances["infoclass"];
				if (ic) {
					ic.pick(lastk, the_feat, ...spt);

					itool = this.toolmgr.findTool("InfoTool");
					if (itool) {
						itool.setPanelActive(true);
					}
				}
		
			}

			if (opt_adic_callback) {
				opt_adic_callback();
			}
		});

		this.transformmgr.zoomToRect(...p_env);		
	}

	clearInteractions() {

		const ci = this.getCustomizationObject();
		if (ci == null) {
			throw new Error("clearInteractions, no customization object found")
		}

		const ic = ci.instances["infoclass"];
		if (ic) {
			ic.clear();
		}

		this.renderingsmgr.clearAll(['temporary', 'transient']);


	}










}

