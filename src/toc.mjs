
import {GlobalConst} from './constants.js';
import {RasterLayer, RemoteVectorLayer} from './layers.mjs';
import {layerClassAdapter, symbClassAdapter} from './layers_and_symbols_adapter.mjs'

class DynamicLayer {
	// p_mode: only 'canvas' for now
    constructor (p_mode, p_classkey, opts) {
		try {
			return new layerClassAdapter[p_mode][p_classkey](opts);
		} catch (e) {
			console.log("class key:", p_classkey);
			console.error(e);
		}
    }
}

class DynamicSymbol {
	// p_mode: only 'canvas' for now
    constructor (p_mode, p_classkey, opt_variablesymb_idx, opts) {
		try {
			return new symbClassAdapter[p_mode][p_classkey](opt_variablesymb_idx, opts);
		} catch (e) {
			console.error("DynamicSymbol error, mode:", p_mode, "class key:", p_classkey, "opts:", opts);
			console.error(e);
		}
    }
}

export class TOCManager {

	after_refresh_procedure_list;
	
	constructor(p_mapctx, p_mode) {
		this.layers = [];
		this.mode = p_mode;  // 'canvas', para já
		this.mapctx = p_mapctx;
		this.initLayersFromConfig();
		this.drawlist = [];
		this._refreshing = false;
		this.after_refresh_procedure_list = [];
	}

	static readLayerConfigItem(p_lyrob, p_configvar, p_layerkey, p_itemname) {
		if (p_configvar.lorder[p_layerkey][p_itemname] !== undefined) {	
			p_lyrob[p_itemname]	= p_configvar.lorder[p_layerkey][p_itemname];
		}
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
		this._refreshing = false;
		const l = this.after_refresh_procedure_list.length;
		for (let p, i=0; i<l; i++) {
			p = this.after_refresh_procedure_list.pop();
			p();
		}
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

	initLayersFromConfig() {

		const selectable_feat_layer_types = [
			"ptgrid",	
			"areagrid",			
			"ags_qry",
			"riscofeats"
		];

		let currentLayer = [], addedtospidx = [];
		let items;

		const cfgvar = this.mapctx.cfgvar;
		const layerscfg = cfgvar["layers"];
		
		if (layerscfg["relations"] === undefined) {
			layerscfg["relations"] = [];
		}
		let relcfgvar = layerscfg["relations"];

		// mandatory configs whose absence must be provisionally accepted at this stage, and be properly handled further ahead in initialization 
		const missing_configs_to_letgo = ["layernames"]; 

		this.layers.length = 0;

		for (let lyentry, lyk, i=0; i <= layerscfg.lorder.length; i++) {

			if (i == layerscfg.lorder.length) {
				
				// loading spatial grid layer as overlay over all others
				lyk = "SPATIALIDX_GRID";
				lyentry = GlobalConst.SPATIALIDX_GRID;

			} else {

				lyk = layerscfg.lorder[i];
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

				if (lyentry["type"] !== undefined) {

					currentLayer.length = 0;

					try {

						currentLayer.push(new DynamicLayer(this.mode, lyentry["type"]));

						if (currentLayer.length == 0) {
							console.error(`TOCManager, layer '${lyk}' type not known: '${lyentry["type"]}'`);
							continue;
						}

						// 'geomtype',  'fields', 'oidfldname', 'marker' processed separatedly, they are special properties
						
						if (currentLayer[0]._geomtype != null) {
							currentLayer[0].geomtype = currentLayer[0]._geomtype;
							if (lyentry["geomtype"] !== undefined) {
								console.error(`[WARN] layer '${lyk}' 'geomtype' property is not configurable in that layer type`);
							}
						} else {
							if (lyentry["geomtype"] !== undefined) {
								currentLayer[0].geomtype = lyentry["geomtype"];
							}
						}

						if (lyentry["fields"] !== undefined) {
							currentLayer[0].fields = lyentry["fields"];
						}
						if (lyentry["marker"] !== undefined) {
							currentLayer[0].marker = lyentry["marker"];
							// ATTENTION - geomtype 'point' forced at this location!
							currentLayer[0].geomtype = "point";
						}

						if (currentLayer[0].oidfldname == null && lyentry["oidfldname"] !== undefined) {
							currentLayer[0].oidfldname = lyentry["oidfldname"];
						}

						// if exists oidfldname, addit  to 'fields' string, in case the user hasn't already done it
						if (currentLayer[0].oidfldname != null) {
							if (currentLayer[0].fields == null || currentLayer[0].fields.length == 0) {
								currentLayer[0].fields = currentLayer[0].oidfldname;
							} else {
								if (currentLayer[0].fields.indexOf(currentLayer[0].oidfldname) < 0) {
									currentLayer[0].fields = currentLayer[0].oidfldname + "," + currentLayer[0].fields;
								}
							}
						}					
						const scaneables = [currentLayer[0]];
						currentLayer[0].key = lyk;

						if (!(currentLayer[0] instanceof RasterLayer)) {
							
							if (currentLayer[0].geomtype === undefined && currentLayer[0].marker === undefined) { 
								
								throw new Error(`Layer ${lyk} has no 'geomtype' or 'marker' defined`);

							} else {

								let classkey;
								if (currentLayer[0].marker !== undefined && currentLayer[0].marker != "none") { 
									classkey = currentLayer[0].marker;
								} else {
									classkey = currentLayer[0].geomtype;
								}
								currentLayer[0].default_symbol = new DynamicSymbol(this.mode, classkey);
								scaneables.push(currentLayer[0].default_symbol);	
								
								if (lyentry.varstyles) {
									for (let vi=0; vi<lyentry.varstyles.length; vi++) {										
										currentLayer[0].varstyles_symbols[vi] = new DynamicSymbol(this.mode, classkey, vi);
										scaneables.push(currentLayer[0].varstyles_symbols[vi]);
									}
								}
							}
						}

					// console.log(currentLayer[0].default_symbol);
					// console.log(scaneables);
						for (let si=0; si < scaneables.length; si++) {

							items = Object.keys(scaneables[si]);
							for (let ii=0; ii < items.length; ii++) {

								// class fields starting with '_' are the ones being public but not related to configurable items
								if (items[ii].startsWith('_')) { 
									continue;
								}

								if (scaneables[si].variablesymb_idx >= 0 && lyentry.varstyles[scaneables[si].variablesymb_idx][items[ii]] !== undefined) {

									scaneables[si][items[ii]] = lyentry.varstyles[scaneables[si].variablesymb_idx][items[ii]];

								} else if (lyentry[items[ii]] !== undefined) {

									scaneables[si][items[ii]] = lyentry[items[ii]];
		
								} else {

									// item is missing if has no default value
									if (scaneables[si][items[ii]] == null) {
										
										switch (items[ii]) {

											case "lineWidth":
												if (scaneables[si]["strokeStyle"] != "none") {
													currentLayer[0].missing_mandatory_configs.push(items[ii]);
												}
												break;

											default:
												currentLayer[0].missing_mandatory_configs.push(items[ii]);
										}
									}							
								}
							}	
							
							// missing items such as layernames must be handled in other place
							if (currentLayer[0].missing_mandatory_configs.length > 0) {
								let cnt = 0;
								for (const mc of currentLayer[0].missing_mandatory_configs) {
									if (missing_configs_to_letgo.indexOf(mc) < 0) {
										cnt++;
									}
								}
								if (cnt>0) {
									throw new Error(`TOCManager, layer '${lyk}' config is missing mandatory items: '${currentLayer[0].missing_mandatory_configs}'`);
								} else {
									console.log(`missing mand.config on layer '${lyk}'` + currentLayer[0].missing_mandatory_configs);
								}
							}

							//console.log(Object.keys(currentLayer[0]));
	
						}

						// console.log("aft", lyk, scaneables);

					} catch(e) {
						console.error(e);
						continue;
					}
					
					try {
						if (currentLayer[0].initLayer !== undefined) {
							currentLayer[0].initLayer(this.mapctx, i);
						}
					} catch(e) {
						console.error(e);
					}

					// connects feature collection to this layer, if applicable
					// (if it implements featureLayersMixin)
					if (currentLayer[0].setCurrFeatures !== undefined) {
						currentLayer[0].setCurrFeatures(this.mapctx.featureCollection, lyk, currentLayer[0]);
					}

					this.layers.push(currentLayer[0]);
					console.info(`[init RISCO] TOCManager, layer '${lyk}' (${currentLayer[0].constructor.name}) prepared`);

				} else {
					console.error(`TOCManager, layer with key '${lyk}' has no type, cannot be read.`);
				}

			} else {
				console.error(`TOCManager, no layer with key '${lyk}' found in config.`);
			}
		}

		if (addedtospidx.length > 0) {
			console.info(`[init RISCO] TOCManager, added these to spatial index (mouse selection): ${addedtospidx}`);
		}

		console.info("[init RISCO] TOCManager, layers init finished");
	}

	tocrefresh(p_scaleval) {

		console.info(`[INFO TOCREFRESH] attempt refresh ${this.layers.length} layers at scale 1:${p_scaleval}`);
		//this.mapctx.printLoadingMsg(`${this.layers.length} layers`);

		this.startedRefreshing();

		const ckeys = new Set();
		for (let li=0; li < this.layers.length; li++) {
			ckeys.add(this.layers[li].canvasKey);
		}
		ckeys.add('labels');
		ckeys.add('transient');
		ckeys.add('temporary');
		ckeys.add('interactive_viz');
		ckeys.add('calculated_viz');

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

	// getStats and draw2D will launch processes that terminate by calling signalVectorLoadFinished
	nextdraw() {

		let canceled, lbl;
		const bounds = [];
		let isloading = false;

		// Finish drawing layers from drawlist
		if (this.drawlist.length < 1) {

			this.finishedRefreshing();

			this.mapctx.removePrint("loadingmsgprint");

			// apply configured relations between feature layers
			this.mapctx.featureCollection.relateall();
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
				lbl = this.layers[li].label;
			else
				lbl = this.layers[li].key;
			this.mapctx.printLoadingMsg(lbl);

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
					}
				} catch(e) {
					this.layers[li].doCancel();
				}
				//this.mapctx.removePrint("loadingmsgprint");
			} else {

				if (GlobalConst.getDebug("VECTLOAD")) {
					console.log("[DBG:VECTLOAD] nextdraw, refreshing", li, this.layers[li].key);
				}
		
				canceled = this.layers[li].refresh(this.mapctx, null);
				if (canceled) {
					this.drawlist.length = 0;
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

		this.nextdraw();
	}
}