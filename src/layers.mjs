
import {GlobalConst} from './constants.js';

function genSingleEnv(p_mapctxt) {

	const terrain_bounds = [], out_pt=[], dims=[], scr_bounds=[];
	p_mapctxt.getMapBounds(terrain_bounds);

	scr_bounds.length = 4;
	for (let i=0; i<2; i++) {
		p_mapctxt.transformmgr.getRenderingCoordsPt([terrain_bounds[2*i], terrain_bounds[2*i+1]], out_pt)
		scr_bounds[2*i] = out_pt[0];
		scr_bounds[2*i+1] = out_pt[1];
	}

	p_mapctxt.getCanvasDims(dims);

	const key = 0;

	return [terrain_bounds, scr_bounds, dims, key];
}

function* genMultipleEnv(p_mapctxt, p_envsplit_cfg, p_scale) {

	let envsplit_scales, found_gte_scale, the_splits, mult, v;

	if (Object.keys(p_envsplit_cfg).length !== 0) {

		envsplit_scales = Object.keys(p_envsplit_cfg); 
		envsplit_scales.sort();

		// find the scale in config which is immediately above current scale
		let v, gte_scale;
		for (gte_scale of envsplit_scales) {
			v = parseInt(gte_scale);
			if (v >=  p_scale) {
				found_gte_scale = v;
				break;
			}
		}

		the_splits = p_envsplit_cfg[found_gte_scale];
		mult = Math.max(...the_splits);

	} else {

		the_splits = [1,1];
		mult = 1;

	}

	const terrain_bounds = [], tx_ticks=[], ty_ticks=[], out_dims=[];
	const out_terr_bounds = [], out_scr_bounds=[], out_pt=[];
	let dx, dy, xi, yi;

	if (GlobalConst.getDebug("LAYERS")) {
		console.log(`[DBG:LAYERS] Greater-then-or-equal scale found: ${found_gte_scale}, with splits ${the_splits}`);
	}

	p_mapctxt.getMapBounds(terrain_bounds);

	if (the_splits[0] < 1) {
		throw new Error(`invalid value (x<1) for envelope X split (first in array) at scale ${found_gte_scale}: ${the_splits[0]}`);
	}
	if (the_splits[1] < 1) {
		throw new Error(`invalid value (x<1) for envelope Y split (last in array) at scale ${found_gte_scale}: ${the_splits[1]}`);
	}

	dx = (terrain_bounds[2] - terrain_bounds[0]) / the_splits[0];
	for (xi=0; xi<=the_splits[0]; xi++) {

		v = terrain_bounds[0] + (xi * dx);
		tx_ticks.push(v);
	}

	dy = (terrain_bounds[3] - terrain_bounds[1]) / the_splits[1];
	for (yi=0; yi<=the_splits[1]; yi++) {
		
		v = terrain_bounds[1] + (yi * dy);
		ty_ticks.push(v);
	}

	for (yi=0; yi<the_splits[1]; yi++) {

		for (xi=0; xi<the_splits[0]; xi++) {

			out_terr_bounds.length = 0;
			out_scr_bounds.length = 0;
			out_dims.length = 0;

			out_terr_bounds.push(tx_ticks[xi]);
			out_terr_bounds.push(ty_ticks[yi]);

			p_mapctxt.transformmgr.getRenderingCoordsPt([tx_ticks[xi], ty_ticks[yi]], out_pt);
			out_scr_bounds.push(...out_pt);

			out_terr_bounds.push(tx_ticks[xi+1]);
			out_terr_bounds.push(ty_ticks[yi+1]);

			p_mapctxt.transformmgr.getRenderingCoordsPt([tx_ticks[xi+1], ty_ticks[yi+1]], out_pt);
			out_scr_bounds.push(...out_pt);

			out_dims.push(...[out_scr_bounds[2] - out_scr_bounds[0], out_scr_bounds[1] - out_scr_bounds[3]]);

			yield [out_terr_bounds.slice(0), out_scr_bounds.slice(0), out_dims.slice(0), mult*yi+xi];
		}		
	}

}

export class Layer {

	minscale = GlobalConst.MINSCALE;
	maxscale = Number.MAX_SAFE_INTEGER;
	layervisible = true;
	layereditable = "none";
	mouseinteraction = false;
	label = "none";
	labelfield = "none";
	labelscaleinterval = "none";
	iconnamefield = "none";
	iconsrcfunc = "none";
	icondefsymb = "none";
	labelfunc = "none";

	// Unconfigurables
	//   If subclass has a non-null value in one of these fields,
	//   a config value (same name without '_') will be ignored, 
	//   fo thar subclass only.
	//
	_geomtype = null;         // if subclass has n

	_drawingcanceled = false;
	_key;

	_servmetadata_docollect = true;
	_servmetadata;
	_servmetadata_report;
	_servmetadata_report_completed = false;
	_metadata_or_root_url;
	_name = "<Layer base class>";

	constructor() {
		this.missing_mandatory_configs = [];
	}

	isInited () {
		// to be overridden by sub classes, when needed
		return !this._servmetadata_docollect || this._servmetadata_report_completed;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx) {
		// to be extended, if needed

		// if not finishing in error, must alter instance state in order fo method 'isInited' to return true
	}	

	checkScaleVisibility(p_scaleval) {
		if (p_scaleval == null) {
			throw new Error(`Layer '${this.key}', null scale val during scale interval visibility check`);	
		}
		return (p_scaleval >= this.minscale && p_scaleval <= this.maxscale);
	}

	set key(p_key) {
		this._key = p_key;
	}
	get key() {
		return this._key;
	}

	isCanceled() {
		//console.info(`[***] Checking layer ${this.key} is canceled: ${this._drawingcanceled}`);
		let ret =  this._drawingcanceled;
		return ret;
	}

	resetCanceled() {
		this._drawingcanceled = false;
	}

	doCancel() {
		console.info(`[INFO] Layer ${this.key} was canceled`);
		console.trace();
		this._drawingcanceled = true;
	}

	refresh(p_mapctx, p_prep_data) {

		// method meant to be extended

		let name;
		if (this._name === undefined) {
			name = "<class yet not defining '_name' attribute>";
		} else {
			name = this._name;
		}

		console.error(`'refresh' method not implemented for layer '${this.key}', '${name}' class`);
		
		let cancel = false;
		return cancel;
	}		
}

const featureLayersMixin = (Base) => class extends Base {

	_currFeatures;
	fields = "";

	setCurrFeatures(p_curr_feats, p_layer_key, p_layerobj, opt_exclude_from_redraw) {
		this._currFeatures = p_curr_feats;
		this._currFeatures.setLayer(p_layer_key, p_layerobj, opt_exclude_from_redraw);
	}

	featCount() {
		return this._currFeatures.featCount(this.key);
	}

	filteredFeatCount(opt_filterfunc) {
		return this._currFeatures.filteredFeatCount(this.key, opt_filterfunc);
	}	

}

// has feature mgmt, has attributes
export class VectorLayer extends featureLayersMixin(Layer) {

	geomtype;
	_filterfunc = null;
	_name = "<VectorLayer base class>";

	constructor() {
		super();
	}

	setFilterFunc(p_function) {
		// console.log("layer", this.key, "func:", p_function);
		this._filterfunc = p_function;
	}

	isFeatureInsideFilter(p_feat_atts) {
		let ret = true;
		if (this._filterfunc != null && !this._filterfunc(p_feat_atts)) {
			ret = false;
		}
		return ret;
	}
	
	* itemchunks(p_mapctxt, p_prep_data) {
		// to be implemented
		// for each chunk, respond with item_chunk_params object, specific to layer type

		// method meant to be extended
		let name;
		if (this._name === undefined) {
			name = "<class yet not defining '_name' attribute>";
		} else {
			name = this._name;
		}

		console.error(`'itemchunks' generator method not implemented for '${name}', vector layer class`);

	}		

}

export class RemoteVectorLayer extends VectorLayer {

	featchunksloading = {};
	_prerefreshed = false;
	_name = "<RemoteVectorLayer base class>";	

	isLoading() {
		// console.info(`[***] Checking layer ${this.key} is loading, preref: ${this._prerefreshed} OR featchkld:${Object.keys(this.featchunksloading).length}>0`);
		return this._prerefreshed || (Object.keys(this.featchunksloading).length > 0);
	}

	constructor() {
		super();
	}

	doCancel() {
		this._prerefreshed = false;
		super.doCancel();
	}

	* itemchunks(p_mapctxt, p_prep_data) {
		// to be implemented
		// for each chunk, respond with firstrecid, reccount
	}	

	preRefresh(p_mapctx) {

		if (this.isCanceled() || this.isLoading()) {
			return false;
		}

		if (!this.layervisible) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Remote vector layer '${this.key}' is not default visible`);
			}
			return false;
		}
		
		if (!this.checkScaleVisibility(p_mapctx.getScale())) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Remote vector layer '${this.key}' is out of scale visibility for 1:${p_mapctx.getScale()}`);
			}
			return false;
		}
		
		if (!this.isInited()) {
			console.log(`[WARN:LAYERS] Remote vector layer '${this.key}' is not inited`);
			return false;
		}
		this._prerefreshed = true;


		return true;
	}	

	getStats(p_mapctx, p_bounds) {
		// to be implemented
		// calculations for itemchunks,
		// first method to be called when consuming services, should call refresh
	}

	looplayeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, item_chunk_params) {
		
		// to be extended, to be called by 'refresh' method
		// for each chunk in 'itemschunks', add features to current feature collection

		// method meant to be extended
		let name;
		if (this._name === undefined) {
			name = "<class yet not defining '_name' attribute>";
		} else {
			name = this._name;
		}

		console.error(`'looplayeritems' method not implemented for '${name}' class`);

	}

	// accesses remote content, uses looplayeritems to feed read features to current feature collection
	refresh(p_mapctx, p_prep_data) {

		this._prerefreshed = false;

		if (this.isCanceled()) {		
			return true;
		}

		const [terrain_env, scr_env, dims] = genSingleEnv(p_mapctx);

		let cancel = false;
		try {

			// console.log("-- env --", terrain_env, scr_env, gfctx.strokeStyle, gfctx.lineWidth);
			//console.log("-- 338 --", gfctx.strokeStyle, gfctx.lineWidth);

			if (this.isCanceled()) {
				cancel = true;
			
			} else  {

				// console.log("--   >> 354 --", terrain_env, scr_env);
				for (let rstrid in this.featchunksloading) {
					if (this.featchunksloading.hasOwnProperty(rstrid)) {
						delete this.featchunksloading[rstrid];
					}
				} 

				// firstrec_order is zero - based
				let item_chunk_params;
				for (item_chunk_params of this.itemchunks(p_mapctx, p_prep_data)) {

					// console.log("--   >> 359 --", firstrec_order, reccount, this.constructor.name);
					// console.log("## 360 FILLSTYLE ####", gfctx.fillStyle);

					this.looplayeritems(p_mapctx, terrain_env, scr_env, dims, item_chunk_params);

					if (this.isCanceled()) {
						cancel = true;
						break;
					}
						
				}
			}

		} catch(e) {
			throw e;
		}

		return cancel;
	}	


}

export class RasterLayer extends Layer {

	rastersloading = {};
	filter = "none";
	envsplit = true;
	envsplit_cfg = {};
	_name = "<RasterLayer base class>";

	constructor(p_mapctx) {
		super(p_mapctx);
	}

	* envs(p_mapctxt) {
		// might be overriden to implement a different env split - based request chunking

		if (this.envsplit) {

			if (Object.keys(this.envsplit_cfg).length === 0) {
				this.envsplit_cfg = GlobalConst.ENVSPLIT_CFG_DEFAULT;
			}
	
			const scl = p_mapctxt.getScale();
			for (const envdata of genMultipleEnv(p_mapctxt, this.envsplit_cfg, scl)) {
				yield envdata;
			}

		} else {
			yield genSingleEnv(p_mapctxt);			
		}
	}
		
	* genlayeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {
		// to be extended
		// for each envelope generated in 'envs', generate an url to fetch an image
	}	

	refreshrasteritem(p_mapctxt, p_scr_env, p_dims, p_envkey, p_raster_url) {

		// to be extended
		// just draw each item in canvas

	}	

	refresh(p_mapctx, p_prep_data) {

		if (this.isCanceled()) {
			return true;
		}

		if (!this.layervisible) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Raster layer '${this.key}' is not default visible`);
			}
			return false;
		}
		if (!this.checkScaleVisibility(p_mapctx.getScale())) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Raster layer '${this.key}' is out of scale visibility for 1:${p_mapctx.getScale()}`);
			}
			return false;
		}
		
		if (!this.isInited()) {
			console.log(`[WARN:LAYERS] Raster layer '${this.key}' is not inited`);
			return false;
		}

		let cancel = false;

		try {

			if (!this.isCanceled()) {

				if (GlobalConst.getDebug("LAYERS")) {
					console.log(`[DBG:LAYERS] Layer '${this.key}' drawing, gettings envs`);
				}


				for (let rstrid in this.rastersloading) {
					if (this.rastersloading.hasOwnProperty(rstrid)) {
						this.rastersloading[rstrid].img.src = "";
						delete this.rastersloading[rstrid];
					}
				} 
		
				for (const [terrain_env, scr_env, dims, envkey] of this.envs(p_mapctx)) {

					//console.log("-- 220 env --", terrain_env, " canceled:", this._drawingcanceled);
					//console.log("-- 221 screnv,dims,envk --", scr_env, dims, envkey);

					if (this.isCanceled()) {
						cancel = true;
						break;
					}

					// console.log("-- gettting rasters --");

					for (const raster_url of this.genlayeritems(p_mapctx, terrain_env, scr_env, dims)) {
						
						// console.log("-- item --", terrain_env, scr_env, raster_url);

						if (!this.refreshrasteritem(p_mapctx, scr_env, dims, envkey, raster_url)) {
							cancel = true;
							break;
						}
						if (this.isCanceled()) {
							cancel = true;
							break;
						}				
					}
					if (cancel) {
						break;
					}
				}

			}			


		} catch(e) {
			throw e;
		}

		return cancel;
	}	
	
}