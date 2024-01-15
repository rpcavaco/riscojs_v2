
import {GlobalConst} from './constants.js';
import {RasterLayer, VectorLayer, RemoteVectorLayer} from './layers.mjs';
import {layerClassAdapter, symbClassAdapter} from './layers_and_symbols_adapter.mjs'

class DynamicLayer {
	// p_mode: only 'canvas' for now
    constructor (p_mode, p_classkey, opts) {
		if (layerClassAdapter[p_mode][p_classkey] === undefined) {
			throw new Error(`DynamicLayer, layer type '${p_classkey}' not recognized`);
		}
		return new layerClassAdapter[p_mode][p_classkey](opts);
   }
}

export class DynamicSymbol {
	// p_mode: only 'canvas' for now
    constructor (p_mode, p_classkey, opt_variablesymb_idx, opts) {

		if (symbClassAdapter[p_mode] === undefined) {
			throw new Error(`DynamicSymbol, no symbol classes for mode ${p_mode}`);
		}
		if (symbClassAdapter[p_mode][p_classkey] === undefined) {
			throw new Error(`DynamicSymbol, no symbol class for mode '${p_mode}', class '${p_classkey}'`);
		}		

		try {
			return new symbClassAdapter[p_mode][p_classkey](opt_variablesymb_idx, opts);
		} catch (e) {
			console.error("DynamicSymbol error, mode:", p_mode, "class key:", p_classkey, "opts:", opts);
			console.error(e);
		}
    }
}

export class TOCManager {

	layers;
	mode;  // 'canvas', para já
	mapctx;
	drawlist;
	_refreshing;
	after_refresh_procedure_list;
	toccontrol;
	//prev_tocontrol_interaction_result;
	current_maplorder;
	forced_lorder;
	#base_raster_layer_key;
	name = "TOCManager";
	
	constructor(p_mapctx, p_mode) {
		this.layers = [];
		this.mode = p_mode;  // 'canvas', para já
		this.mapctx = p_mapctx;
		this.drawlist = [];
		this._refreshing = false;
		this.after_refresh_procedure_list = [];
		//this.prev_tocontrol_interaction_result = null;
		this.#base_raster_layer_key = null;
		this.current_maplorder = [];
		this.forced_lorder = [];

		this.initLayersFromConfig();
	}

	set basekey(p_key) {
		this.#base_raster_layer_key = p_key;
	}
	get basekey() {
		return this.#base_raster_layer_key;
	}

	resetBasekey() {
		this.#base_raster_layer_key = null;
	}

	setTOCControl(p_tocctrl_inst) {
		this.toccontrol = p_tocctrl_inst;
		p_tocctrl_inst.setTOCMgr(this);
	}

	isRefreshing() {
		return this._refreshing;
	}

	startedRefreshing() {
		this._refreshing = true;
	}	

	addAfterRefreshProcedure(p_paramless_func) {
		this.after_refresh_procedure_list.push(p_paramless_func);
	}

	finishedRefreshing() {
		const l = this.after_refresh_procedure_list.length;
		for (let p, i=0; i<l; i++) {
			p = this.after_refresh_procedure_list.pop();
			p();
		}
		this._refreshing = false;
	}

	getLayer(p_layerkey) {
		let lidx = 0;
		let ret = null;
		while (lidx < this.layers.length && this.layers[lidx].key != p_layerkey) {
			lidx++;
		}
		if (lidx < this.layers.length && this.layers[lidx].key == p_layerkey) {
			ret = this.layers[lidx];
		}
		return ret;
	}

	getAllVectorLayerKeys(o_lkey_list, opt_exclusion_keylist) {
		o_lkey_list.length = 0;
		for (let lyr of this.layers) {
			if (lyr instanceof VectorLayer) {
				if (opt_exclusion_keylist==null || opt_exclusion_keylist.indexOf(lyr.key) < 0) {
					o_lkey_list.push(lyr.key);
				}
			}
		}
	}

	setLayerVisibility(p_layerkey, p_visible) {
		let ret = false;
		for (let lyr of this.layers) {
			if (lyr.key == p_layerkey) {
				lyr.layervisible = p_visible;
				ret = true;
				break;
			}
		}
		return ret;
	}

	getBaseRasterLayer() {
		let ret = null;
		if (this.basekey) {
			ret = this.getLayer(this.basekey);
		}
		return ret;
	}

	// Does not refresh
	// Simply nullifies layer[0], rendering map now will result in error.
	// Meant to be called from setBaseRasterLayer
	_removeBaseRasterLayerIfExists(p_new_layerkey_to_replace) {
		let ret = false;
		if (this.basekey!=null && this.layers.length > 0) {
			if (!(this.layers[0] instanceof RasterLayer)) {
				console.info(`[INFO] _removeBaseRasterLayerIfExists, layer zero '${this.layers[0].key}' is not raster`);
			}
			if (p_new_layerkey_to_replace == null || p_new_layerkey_to_replace != this.layers[0].key) {
				this.layers.shift();
				this.resetBasekey();
				ret = true;
			}
		}
		return ret;
	}

	addLayer(p_layerkey, p_layercfg_entry, opt_crafted_layerclass, opt_exclude_from_redraw, b_to_start) {

		let lidx;
		let currentLayer;

		if (b_to_start) {
			this.layers.unshift(null);
			lidx = 0;
		} else {
			lidx = this.layers.push(null) - 1;
		}

		const missing_configs_to_letgo = ["layernames"]; 

		try {

			if (opt_crafted_layerclass) {

				this.layers[lidx] = new opt_crafted_layerclass();
				
			} else {

				if (p_layercfg_entry["type"] === undefined) {
					throw new Error(`TOCManager, layer with key '${p_layerkey}' has no type, cannot be read.`);
				}


		
				this.layers[lidx] = new DynamicLayer(this.mode, p_layercfg_entry["type"]);
			}

			currentLayer = this.layers[lidx];

			if (currentLayer._geomtype != null) {
				currentLayer.geomtype = currentLayer._geomtype;
				if (p_layercfg_entry["geomtype"] !== undefined) {
					console.warn(`[WARN] layer '${p_layerkey}' 'geomtype' property is not configurable in that layer type`);
				}
			} else {
				if (p_layercfg_entry["geomtype"] !== undefined) {
					currentLayer.geomtype = p_layercfg_entry["geomtype"];
				}
			}

			if (p_layercfg_entry["fields"] !== undefined) {
				currentLayer.fields = p_layercfg_entry["fields"];
			}
			if (p_layercfg_entry["marker"] !== undefined) {
				currentLayer.marker = p_layercfg_entry["marker"];
				// ATTENTION - geomtype 'point' forced at this location!
				currentLayer.geomtype = "point";
			}

			if (currentLayer.oidfldname == null && p_layercfg_entry["oidfldname"] !== undefined) {
				currentLayer.oidfldname = p_layercfg_entry["oidfldname"];
			}

			// if exists oidfldname, addit  to 'fields' string, in case the user hasn't already done it
			if (currentLayer.oidfldname != null) {
				if (currentLayer.fields == null || currentLayer.fields.length == 0) {
					currentLayer.fields = currentLayer.oidfldname;
				} else {
					if (currentLayer.fields.indexOf(currentLayer.oidfldname) < 0) {
						currentLayer.fields = currentLayer.oidfldname + "," + currentLayer.fields;
					}
				}
			}

			currentLayer.selectionsymbol = {};

			const scaneables = [currentLayer];
			currentLayer.key = p_layerkey;

			if (!(currentLayer instanceof RasterLayer)) {
							
				if (currentLayer.geomtype === undefined && currentLayer.marker === undefined) { 
					
					/* if (opt_crafted_layerclass) {
						console.warn(`[WARN] Crafted layer ${p_layerkey} has no 'geomtype' or 'marker' defined. Is this OK ?`);
					} else { */
					throw new Error(`Layer ${p_layerkey} has no 'geomtype' or 'marker' defined`);
					//}

				} else {

					let classkey, subclasskey;
					if (currentLayer.marker !== undefined && currentLayer.marker != "none") { 
						classkey = currentLayer.marker;
					} else {
						classkey = currentLayer.geomtype;
					}
					if (GlobalConst.getDebug("DYNSYMBOLOGY")) {
						console.log(`[DBG:DYNSYMBOLOGY] Default symbol '${p_layerkey}' mode:'${this.mode}' classkey:'${classkey}'  currlyr_mrkr:'${currentLayer.marker}'`);
					}
					currentLayer.default_symbol = new DynamicSymbol(this.mode, classkey);
					scaneables.push(currentLayer.default_symbol);	

					if (p_layercfg_entry.varstyles) {
						for (let vi=0; vi<p_layercfg_entry.varstyles.length; vi++) {	
							if (GlobalConst.getDebug("DYNSYMBOLOGY")) {
								console.log(`[DBG:DYNSYMBOLOGY] Varstyle symbol '${p_layerkey}' varstyle:${vi} mode:'${this.mode}' classkey:'${classkey}'`);
							}
							currentLayer.varstyles_symbols[vi] = new DynamicSymbol(this.mode, classkey, vi);
							scaneables.push(currentLayer.varstyles_symbols[vi]);
						}
					}

					if (p_layercfg_entry["selectionsymbol"] !== undefined) {

						if (p_layercfg_entry["selectionsymbol"]["marker"] !== undefined && p_layercfg_entry["selectionsymbol"]["marker"] != "none") { 
							subclasskey = p_layercfg_entry["selectionsymbol"]["marker"];
						} else {
							subclasskey = currentLayer.geomtype;
						}

						if (subclasskey == "point") {
							subclasskey  = classkey;
						}

						if (GlobalConst.getDebug("DYNSYMBOLOGY")) {
							console.log(`[DBG:DYNSYMBOLOGY] Default SEL symbol '${p_layerkey}' mode:'${this.mode}' classkey:'${classkey}'  subclasskey:'${subclasskey}'`);
						}
						currentLayer.default_sel_symbol = new DynamicSymbol(this.mode, subclasskey);
						if (GlobalConst.getDebug("DYNSYMBOLOGY")) {
							console.log(currentLayer.default_sel_symbol);
						}						
						scaneables.push(currentLayer.selectionsymbol);		
					}
				}
			} else {
				if (this.basekey) {
					throw new Error(`Base raster already defined, cannot include '${currentLayer.key}' in current workable config`);
				} else {
					this.basekey = currentLayer.key;
				}
			}

			for (let si=0; si < scaneables.length; si++) {

				const items = Object.keys(scaneables[si]);
				for (let ii=0; ii < items.length; ii++) {

					// class fields starting with '_' are the ones being public but not related to configurable items
					if (items[ii].startsWith('_')) { 
						continue;
					}

					if (scaneables[si].variablesymb_idx >= 0 && p_layercfg_entry.varstyles[scaneables[si].variablesymb_idx][items[ii]] !== undefined) {

						scaneables[si][items[ii]] = p_layercfg_entry.varstyles[scaneables[si].variablesymb_idx][items[ii]];

					} else if (p_layercfg_entry[items[ii]] !== undefined) {

						scaneables[si][items[ii]] = p_layercfg_entry[items[ii]];

					} else {

						// item is missing if has no default value
						if (scaneables[si][items[ii]] == null) {

							// if config named items[ii] is in skipconfigs names list, let's skip it
							if (scaneables[si]["skipconfigs"] !== undefined && scaneables[si]["skipconfigs"].indexOf(items[ii]) >= 0) {
								console.info(`[INFO] FROM 'skipconfigs', skipping cfg '${items[ii]}' on layer: ${p_layerkey}`);
								continue;
							}

							switch (items[ii]) {

								case "lineWidth":
									if (scaneables[si]["strokeStyle"] != "none") {
										currentLayer.missing_mandatory_configs.push(items[ii]);
									}
									break;

								default:
									currentLayer.missing_mandatory_configs.push(items[ii]);
							}
						}							
					}
				}	
				
				// missing items such as layernames must be handled in other place
				if (currentLayer.missing_mandatory_configs.length > 0) {
					let cnt = 0;
					for (const mc of currentLayer.missing_mandatory_configs) {
						if (missing_configs_to_letgo.indexOf(mc) < 0) {
							cnt++;
						}
					}
					if (cnt>0) {
						throw new Error(`TOCManager, layer '${p_layerkey}' config is missing mandatory items: '${currentLayer.missing_mandatory_configs}'`);
					}
				}
				
			}

			if (currentLayer.initLayer !== undefined) {
				currentLayer.initLayer(this.mapctx, lidx);
			}

			// connects feature collection to this layer, if applicable
			// (if it implements featureLayersMixin)
			if (currentLayer.setCurrFeatures !== undefined) {
				currentLayer.setCurrFeatures(this.mapctx.featureCollection, p_layerkey, currentLayer, opt_exclude_from_redraw);
			}

			console.info(`[init RISCO] TOCManager, layer '${p_layerkey}' (${currentLayer.constructor.name}) prepared`);


		} catch(e) {
			console.error(e);
			this.layers.pop();
		}
	}

	setBaseRasterLayer(p_key) {

		if (p_key!=null && this._removeBaseRasterLayerIfExists(p_key)) {

			const cfgvar = this.mapctx.cfgvar;
			const layerscfg = cfgvar["layers"];

			if (layerscfg.layers[p_key] !== undefined) {

				this.addLayer(p_key, layerscfg.layers[p_key], null, false, true);

				this.layers[0].refresh(this.mapctx);

			} else {
				console.error(`TOCManager, no layer with key '${p_key}' found in config.`);
			}	
			
		}
	}

	initLayersFromConfig() {

		const selectable_feat_layer_types = [
			"ptgrid",	
			"areagrid",			
			"ags_qry",
			"riscofeats"
		];

		let addedtospidx = [];
		let exclude_from_redraw = false;

		const cfgvar = this.mapctx.cfgvar;
		const layerscfg = cfgvar["layers"];

		if (layerscfg["toclorder"] !== undefined) {
			this.forced_lorder = layerscfg["toclorder"]
		}

		if (layerscfg["basemaps"] !== undefined && layerscfg["basemaps"].length > 0) {
			this.current_maplorder.push(layerscfg["basemaps"][0]);
		}	
		
		for (const lyk of layerscfg.lorder) {
			this.current_maplorder.push(lyk);
		}

		if (layerscfg["relations"] === undefined) {
			layerscfg["relations"] = [];
		}
		let relcfgvar = layerscfg["relations"];

		this.layers.length = 0;

		for (let lyentry, lyk, i=0; i <= this.current_maplorder.length; i++) {

			if (i == this.current_maplorder.length) {
				
				// loading spatial grid layer as overlay over all others
				lyk = "SPATIALIDX_GRID";
				lyentry = GlobalConst.SPATIALIDX_GRID;
				exclude_from_redraw = true;

			} else {

				exclude_from_redraw = false;
				lyk = this.current_maplorder[i];

				if (layerscfg.layers[lyk] === undefined) {
					throw new Error(`layerscfg config has no '${lyk}' entry`);
				}

				lyentry = layerscfg.layers[lyk];
				if (lyentry["mouseinteraction"]) {

					if (selectable_feat_layer_types.indexOf(lyentry["type"]) >= 0) {
						relcfgvar.push({
							"from": "SPATIALIDX_GRID",
							"to": lyk,
							"op": "bbtouch"
						});
						addedtospidx.push(lyk);
					}

				}
			}

			if (lyentry !== undefined) {

				this.addLayer(lyk, lyentry, null, exclude_from_redraw);

			} else {
				console.error(`TOCManager, no layer with key '${lyk}' found in config.`);
			}
		}

		if (addedtospidx.length > 0) {
			console.info(`[init RISCO] TOCManager, added these to spatial index (mouse selection): ${addedtospidx}`);
		}

		console.info("[init RISCO] TOCManager, layers init finished");
	}

	tocMgrRefresh(p_scaleval) {

		console.info(`[INFO TOCREFRESH] attempt refresh ${this.layers.length} layers at scale 1:${p_scaleval}`);
		//this.mapctx.printLoadingMsg(`${this.layers.length} layers`);

		this.startedRefreshing();

		const ckeys = new Set();

		for (let li=0; li < this.layers.length; li++) {
			ckeys.add(this.layers[li].canvasKey);
		}
		ckeys.add('label');
		ckeys.add('transientmap');
		ckeys.add('temporary');
		ckeys.add('interactive_viz');
		ckeys.add('data_viz');
		ckeys.add('transientviz');

		this.mapctx.renderingsmgr.clearAll(ckeys);

		this.drawlist.length = 0;

		// Find single raster, send it to bottom of list
		//  and discard others
		let the_raster_layer_i = -1;
		for (let li=0; li < this.layers.length; li++) {
			if (this.layers[li] instanceof RasterLayer) {
				if (the_raster_layer_i >= 0) {
					console.error(`[WARN] Only one raster layer is allowed, ignoring '${this.layers[li].key}'`);
				} else {
					the_raster_layer_i = li;
				}
			}
		}

		// Drawing first the single raster, draw in self canvas, can render at anytime
		let canceled;
		if (the_raster_layer_i >= 0) {
			canceled = this.layers[the_raster_layer_i].refresh(this.mapctx);
		}

		//console.error(`[!!!] Canceled flag: ${canceled}, after raster base`);

		if (canceled) {
			console.error(`[WARN] Drawing canceled after raster base`);
			return;
		}

		function fillDrawlist(pp_this) {

			let ret = true, isloading = false;
			
			for (let li=0; li < pp_this.layers.length; li++) {

				if (pp_this.mapctx.getScale() >= pp_this.layers[li]["maxscale"]) {
					console.info(`[INFO] layer '${pp_this.layers[li].key}' out of max display scale of 1:${pp_this.layers[li]["maxscale"]}`);
					continue;
				} else {
					if (GlobalConst.getDebug("VECTLOAD")) {
						console.log(`[DBG:VECTLOAD] layer '${pp_this.layers[li].key}' IN of max display scale of 1:${pp_this.layers[li]["maxscale"]}`);
					}
				}
					
				if (!(pp_this.layers[li] instanceof RasterLayer)) {

					if (pp_this.layers[li].isLoading !== undefined) {
						isloading = pp_this.layers[li].isLoading();
					}

					if (isloading) {
						pp_this.layers[li].doCancel()
						if (GlobalConst.getDebug("VECTLOAD")) {
							console.log("[DBG:VECTLOAD] fillDrawlist, ", pp_this.layers[li].key, " is loading, canceling and out ...");
						}
						ret = false;
						break;
					} else  {
						pp_this.layers[li].resetCanceled();
					}

					if (GlobalConst.getDebug("VECTLOAD")) {
						console.log("[DBG:VECTLOAD] fillDrawlist, added to dlist:", pp_this.layers[li].key, "loading:", isloading, "canceled:", pp_this.layers[li].isCanceled(), pp_this.layers[li].isCanceled());
					}
					pp_this.drawlist.push(li);
				}
			}	

			return ret;
		}

		fillDrawlist(this);

		// this.mapctx.removePrint("loadingmsgprint");

		if (GlobalConst.getDebug("VECTLOAD")) {
			console.log("[DBG:VECTLOAD] refresh final, initial drawlist:", this.drawlist);
		}

		this.nextdraw();
	}

	genAdvancedTabletmodeEvent(b_is_hover_or_pick) {

		const mapdims = [];
		this.mapctx.renderingsmgr.getCanvasDims(mapdims);					
		const center_pt = this.mapctx.getCenterPoint(mapdims);
		const topcnv = this.mapctx.renderingsmgr.getTopCanvas();

		let tp;
		if (b_is_hover_or_pick) {
			tp = "adv_hover";
		} else {
			tp = "adv_pick";
		}

		const evt = new Event(tp, {
			bubbles: true,
			cancelable: true,
			view: window
		  });
		  evt.offsetX = center_pt[0];
		  evt.offsetY = center_pt[1];
		  topcnv.dispatchEvent(evt);		
	}

	// getStats and draw2D will launch processes that terminate by calling signalVectorLoadFinished
	nextdraw() {

		let canceled, lbl;
		const bounds = [];
		let isloading = false;

		// Finish drawing layers from drawlist
		if (this.drawlist.length < 1) {

			this.finishedRefreshing();

			this.mapctx.removePrint("loadingmsgprint");

			this.mapctx.drawControls();

			// apply configured relations between feature layers
			this.mapctx.featureCollection.relateall();

			if (this.mapctx.tabletmode.toLowerCase() == "advanced") {
				this.genAdvancedTabletmodeEvent(true);
			}

			return;

		}

		const li = this.drawlist[0];
		try {

			isloading = false;
			if (this.layers[li].isLoading !== undefined) {
				isloading = this.layers[li].isLoading();
			}
	
			if (isloading) {
				this.layers[li].doCancel();
				return;
			}

			if (this.layers[li].label !== undefined && this.layers[li].label != "none")
				lbl = this.mapctx.i18n.msg(this.layers[li].label);
			else
				lbl = this.layers[li].key;
			
			if (this.layers[li]['is_internal'] === undefined || !this.layers[li].is_internal) {
				this.mapctx.printLoadingMsg(lbl);
			}

			if (this.layers[li] instanceof RemoteVectorLayer) {

				try {
					if (GlobalConst.getDebug("VECTLOAD")) {
						console.log("[DBG:VECTLOAD] nextdraw, before pre-refreshing", li, this.layers[li].key, "loading:", this.layers[li].isLoading());
					}
					if (this.layers[li].preRefresh(this.mapctx)) {
						if (GlobalConst.getDebug("VECTLOAD")) {
							console.log("[DBG:VECTLOAD] nextdraw, after pre-refreshing", li, this.layers[li].key, "loading:", this.layers[li].isLoading());
						}
						this.mapctx.getMapBounds(bounds);			
						this.layers[li].getStats(this.mapctx, bounds);
						if (GlobalConst.getDebug("VECTLOAD")) {
							console.log("[DBG:VECTLOAD] nextdraw, after getStats", li, this.layers[li].key, "loading:", this.layers[li].isLoading());
						}
					} else {
						if (GlobalConst.getDebug("VECTLOAD")) {
							console.log("[DBG:VECTLOAD] nextdraw, pre-refresh returned FALSE", li, this.layers[li].key, "loading:", this.layers[li].isLoading());
						}
						this.signalVectorLoadFinished(this.layers[li].key);
					}
				} catch(e) {
					this.layers[li].doCancel();
				}
				//this.mapctx.removePrint("loadingmsgprint");
			} else {

				if (GlobalConst.getDebug("VECTLOAD")) {
					console.log("[DBG:VECTLOAD] nextdraw, refreshing", li, this.layers[li].key);
				}
		
				try {
					canceled = this.layers[li].refresh(this.mapctx, null);
					if (canceled) {
						this.drawlist.length = 0;
					}
				} catch(e) {
					this.signalVectorLoadFinished(this.layers[li].key);
					console.error(e);
					return;
				}
			}

		} catch(e) {
			
			console.error(e);
		}
	}

	signalVectorLoadFinished(p_finished_key) {

		//Clear all prerefreshed flags found true
		for (let l of this.layers) {
			if (l._prerefreshed !== undefined && l._prerefreshed) {
				l._prerefreshed = false;
			}
		}

		const li = 0;

		let dlistnames = [];

		for (let di of this.drawlist) {
			dlistnames.push(this.layers[di].key);
		}

		if (GlobalConst.getDebug("VECTLOAD")) {
			console.log(`[DBG:VECTLOAD] finished:${p_finished_key}, dlistnames:${dlistnames}`);
		}

		if (this.drawlist.length == 0) {
			return;
		}

		try {
			if (this.layers[this.drawlist[li]].key != p_finished_key) {
				throw new Error(`Layer just finished, '${p_finished_key}', is not in drawing list drawing position (zero), occupied by '${this.layers[this.drawlist[li]].key}'`)
			}
		} catch(e) {
			console.warn(e.message);
			if (GlobalConst.getDebug("VECTLOAD")) {
				console.log("[DBG:VECTLOAD] ... error details - li:", li, ", this.drawlist[li]:", this.drawlist[li], ", this.drawlist.len:", this.drawlist.length, this.drawlist);
			}
			return;
		}

		this.drawlist.shift();

		dlistnames.length = 0;
		for (let di of this.drawlist) {
			dlistnames.push(this.layers[di].key);
		}

		if (this.mapctx.featureCollection.lyrkeys_exclude_from_redraw.indexOf(p_finished_key) < 0) {
			
			this.mapctx.featureCollection.featuresdraw(p_finished_key).then(
				() => { 
					this.nextdraw(); 
				}
			).catch((e) => {
				//console.log(p_finished_key)
				console.error(e);
			});

		} else {
			this.nextdraw(); 
		}

	}

	tocmOnEvent(p_mapctx, p_evt) {

		// console.trace("INT TOC");

		/*const ret =  this.toccontrol.tocinteract(p_mapctx, p_evt);

		If (this.prev_tocontrol_interaction_result !== null && this.prev_tocontrol_interaction_result != ret && !ret) {

			// emulating mouseout

			const topcnv = p_mapctx.renderingsmgr.getTopCanvas();
			topcnv.style.cursor = "default";

			p_mapctx.clearInteractions('TOCMGR');
			
		}

		this.prev_tocontrol_interaction_result = ret; */
		
		return this.toccontrol.tocinteract(p_mapctx, p_evt);

	}


}