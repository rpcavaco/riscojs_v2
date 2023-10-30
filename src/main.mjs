import {HTML5CanvasMgr} from './html5canvas.mjs';
import {Transform2DMgr} from './transformations.mjs';
import {ToolManager} from './interactions.mjs';
import {TOCManager} from './tocmanager.mjs';
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
		this.imgbuffer = new ImgLRUCache(GlobalConst.IMAGE_LRUCACHE_SZ);

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
		p_setmapctx_func(p_object);

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

		const clickendevents = ["touchstart", "touchend", "mousedown", "mouseup", "mouseleave", "mouseout"];

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

			this.printAttributionMsg();


		}
	}

	drawSingleFeature(p_layer_key, p_obj_id, p_geomtype_keyed_symbdict, b_is_sel, opt_alt_canvaskeys_dict) {

		// opt_alt_canvaskeys_dict  example: {'normal': 'temporary', 'label': 'temporary' }

		// SUPENSO
		let symb = new GrSymbol();
		let lsymb = new GrSymbol();
		let ret = null;

		const ly = this.tocmgr.getLayer(p_layer_key);

		if (ly != null && ly.layervisible) {

			let thissymb;
			if (b_is_sel && ly.default_sel_symbol!='none') {
				thissymb = ly.default_sel_symbol;
			} else {
				thissymb = ly.default_symbol;
			}
			if (thissymb != null && thissymb != "none") {
				Object.assign(symb, thissymb);
			}

			Object.assign(symb, p_geomtype_keyed_symbdict[ly.geomtype]);

			if (ly.default_symbol['drawsymb'] !== undefined) {
				if (b_is_sel && ly.default_sel_symbol != "none") {
					symb.drawsymb = ly.default_sel_symbol.drawsymb;
				} else {
					symb.drawsymb = ly.default_symbol.drawsymb;
				}				
			}

			Object.assign(lsymb, ly.default_symbol);
			if (p_geomtype_keyed_symbdict['label'] !== undefined) {
				Object.assign(lsymb, p_geomtype_keyed_symbdict['label']);
			}

			return new Promise((resolve,reject) => {
				const env = [];
				this.getMapBounds(env);
				this.featureCollection.featuredraw(p_layer_key, p_obj_id, opt_alt_canvaskeys_dict, { "graphic": symb, 'label': lsymb }, null, env ).then(
					(feat) => { resolve(feat); }
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

	// opt_alt_canvaskeys_dict: {'normal': 'temporary', 'label': 'temporary' }
	drawFeatureAsMouseSelected(p_layer_key, p_obj_id, opt_alt_canvaskeys_dict) {

		let hlStyles;
		if (this.cfgvar['basic']['featmousesel_highlight'] !== undefined) {
			hlStyles = mergeDeep(GlobalConst.FEATMOUSESEL_HIGHLIGHT, this.cfgvar['basic']['featmousesel_highlight']);
		} else {
			hlStyles = GlobalConst.FEATMOUSESEL_HIGHLIGHT;
		}

		const ly = this.tocmgr.getLayer(p_layer_key);

		if (ly["selectionsymbol"] !== undefined) {
			const d = {};
			d[ly.geomtype] = ly.selectionsymbol;
			hlStyles = mergeDeep(hlStyles, d);
		}

		return this.drawSingleFeature(p_layer_key, p_obj_id, hlStyles, true, opt_alt_canvaskeys_dict);
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
					this.drawFeatureAsMouseSelected(k, id, opt_alt_canvaskeys_dict);
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
					ic.pickfeature(lastk, the_feat, ...spt);
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

	
	clearInteractions(opt_source_id, opt_clear_temp_also) { 

		const ci = this.getCustomizationObject();
		if (ci == null) {
			throw new Error("clearInteractions, no customization object found")
		}

		const ic = ci.instances["infoclass"];
		if (ic) {
			ic.clearinfo(opt_source_id);
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










}

