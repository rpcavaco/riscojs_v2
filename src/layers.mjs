
import {GlobalConst} from './constants.js';

export function genSingleEnv(p_mapctxt) {

	const terrain_bounds = [], out_pt=[], dims=[], scr_bounds=[];
	p_mapctxt.getMapBounds(terrain_bounds);

	scr_bounds.length = 4;
	for (let i=0; i<2; i++) {
		p_mapctxt.transformmgr.getCanvasPt([terrain_bounds[2*i], terrain_bounds[2*i+1]], out_pt)
		scr_bounds[2*i] = out_pt[0];
		scr_bounds[2*i+1] = out_pt[1];
	}

	p_mapctxt.getCanvasDims(dims);

	const key = 0;

	return [terrain_bounds, scr_bounds, dims, key];
}

export function* genMultipleEnv(p_mapctxt, p_envsplit_cfg, p_scale) {

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

			p_mapctxt.transformmgr.getCanvasPt([tx_ticks[xi], ty_ticks[yi]], out_pt);
			out_scr_bounds.push(...out_pt);

			out_terr_bounds.push(tx_ticks[xi+1]);
			out_terr_bounds.push(ty_ticks[yi+1]);

			p_mapctxt.transformmgr.getCanvasPt([tx_ticks[xi+1], ty_ticks[yi+1]], out_pt);
			out_scr_bounds.push(...out_pt);

			out_dims.push(...[out_scr_bounds[2] - out_scr_bounds[0], out_scr_bounds[1] - out_scr_bounds[3]]);

			yield [out_terr_bounds.slice(0), out_scr_bounds.slice(0), out_dims.slice(0), mult*yi+xi];
		}		
	}

}

class Layer {

	minscale = GlobalConst.MINSCALE;
	maxscale = Number.MAX_SAFE_INTEGER;
	defaultvisible = true;
	envsplit_cfg = {};
	blend = false;

	_drawingcanceled = false;
	_key;

	_servmetadata_docollect = true;
	_servmetadata;
	_servmetadata_report;
	_servmetadata_report_completed = false;
	_metadata_or_root_url;

	// constructor(p_mapctxt) {
	//	this.mapctx = p_mapctxt;
	//  console.log(this.mapctx);
	constructor() {
		this.missing_mandatory_configs = [];
	}

	isInited () {
		// to be overridden by sub classes, when needed
		return true;
	}

	// Why passing Map context to this method if this layer has it as a field ?
	// The reason is: it is not still available at this stage; it will be availabe later to subsequent drawing ops
	initLayer(p_mapctx, p_lyr_order) {
		// to be extended, if needed

		// if not finishing in error, must alter instance state in order fo method 'isInited' to return true
	}	

	setMapctxt(p_mapctxt) {
		this.mapctx = p_mapctxt;
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

	onCancel() {
		// to be extended
		// At least must end with:
		this._drawingcanceled = false;
	}

	* envs(p_mapctxt) {
		// might be overriden to implement a different env split - based request chunking

		if (this.envsplit) {

			if (Object.keys(this.envsplit_cfg).length === 0) {
				this.envsplit_cfg = GlobalConst.ENVSPLIT_CFG_DEFAULT;
			}
	
			const scl = this.mapctx.getScale();
			for (const envdata of genMultipleEnv(p_mapctxt, this.envsplit_cfg, scl)) {
				yield envdata;
			}

		} else {
			yield genSingleEnv(p_mapctxt);			
		}
	}

	draw2D(p_mapctx, p_lyrorder) {

		// to be extended
		
		let cancel = false;
		return cancel;
	}		
}

export class VectorLayer extends Layer {

	envsplit = false;
	constructor(p_mapctx) {
		super(p_mapctx);
	}

	
	* itemchunks(p_mapctxt, p_terrain_env) {
		// to be extended
		// for each chunk, responde with firstrecid, reccount
	}		

	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims, firstrecid, reccount) {
		// to be extended
		// for each envelope generated in 'envs', generate an graphic item or feature in canvas coords
	}	

	drawitem2D(p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, item_geom, item_atts, p_lyrorder) {

		// to be extended
		// for each 'canvas' item just draw

	}	

	draw2D(p_mapctx, p_lyrorder) {

		if (!this.defaultvisible) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Vector layer '${this.key}' is not default visible`);
			}
			return;
		}
		if (!this.checkScaleVisibility(p_mapctx.getScale())) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Vector layer '${this.key}' is out of scale visibility for 1:${p_mapctx.getScale()}`);
			}
			return;
		}
		
		if (!this.isInited()) {
			console.log(`[WARN:LAYERS] Vector layer '${this.key}' is not inited`);
			return;
		}		

		const gfctx = this.mapctx.canvasmgr.getDrwCtx(this.canvasKey, '2d');
		let cancel = false;

		gfctx.save();
		try {

			gfctx.strokeStyle = this.default_stroke_symbol.strokeStyle;
			gfctx.lineWidth = this.default_stroke_symbol.lineWidth;

			for (const [terrain_env, scr_env, dims, envkey, totalrecs] of this.envs(p_mapctx)) {

				// console.log("-- env --", terrain_env, scr_env, gfctx.strokeStyle, gfctx.lineWidth);

				if (this._drawingcanceled) {
					this.onCancel();
					cancel = true;
					break;
				}

				for (const [firstrecid, reccount] of this.itemchunks(p_mapctx, terrain_env)) {

					for (const [item_coords, item_attrs] of this.layeritems(this.mapctx, terrain_env, scr_env, dims, firstrecid, reccount)) {

						//console.log("-- item --", terrain_env, scr_env, item_coords, item_attrs);

						if (!this.drawitem2D(this.mapctx, gfctx, terrain_env, scr_env, dims, envkey, item_coords, item_attrs, p_lyrorder)) {
							cancel = true;
							break;
						}

						if (this._drawingcanceled) {
							this.onCancel();
							cancel = true;
							break;
						}				
					}

				}

				if (cancel) {
					break;
				}
			}

		} catch(e) {
			throw e;
		} finally {
			gfctx.restore();
		}

		return cancel;
	}		
}

export class RasterLayer extends Layer {

	rastersloading = {};
	filter = "none";
	envsplit = true;

	constructor(p_mapctx) {
		super(p_mapctx);
	}

	* layeritems(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {
		// to be extended
		// for each envelope generated in 'envs', generate an graphic item, feature (or chunks of items or features) in canvas coords
	}	

	drawitem2D(p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, p_raster_url, p_lyrorder) {

		// to be extended
		// just draw each item in canvas

	}	

	draw2D(p_mapctx, p_lyrorder) {

		if (!this.defaultvisible) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Raster layer '${this.key}' is not default visible`);
			}
			return;
		}
		if (!this.checkScaleVisibility(p_mapctx.getScale())) {
			if (GlobalConst.getDebug("LAYERS")) {
				console.log(`[DBG:LAYERS] Raster layer '${this.key}' is out of scale visibility for 1:${p_mapctx.getScale()}`);
			}
			return;
		}
		
		if (!this.isInited()) {
			console.log(`[WARN:LAYERS] Raster layer '${this.key}' is not inited`);
			return;
		}

		const gfctx = this.mapctx.canvasmgr.getDrwCtx(this.canvasKey, '2d');

		let cancel = false;

		gfctx.save();
		try {

			if (!this._drawingcanceled) {

				if (GlobalConst.getDebug("LAYERS")) {
					console.log(`[DBG:LAYERS] Layer '${this.key}' drawing, gettings envs`);
				}


				for (let rstrid in this.rastersloading) {
					this.rastersloading[rstrid].img.src = "";
					delete this.rastersloading[rstrid];
				} 
		
				for (const [terrain_env, scr_env, dims, envkey] of this.envs(p_mapctx)) {

					//console.log("-- 220 env --", terrain_env, " canceled:", this._drawingcanceled);
					//console.log("-- 221 screnv,dims,envk --", scr_env, dims, envkey);

					if (this._drawingcanceled) {
						this.onCancel();
						cancel = true;
						break;
					}

					// console.log("-- gettting rasters --");

					for (const raster_url of this.layeritems(p_mapctx, terrain_env, scr_env, dims)) {
						
						// console.log("-- item --", terrain_env, scr_env, raster_url);

						if (!this.drawitem2D(p_mapctx, gfctx, terrain_env, scr_env, dims, envkey, raster_url, p_lyrorder)) {
							cancel = true;
							break;
						}
						if (this._drawingcanceled) {
							this.onCancel();
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
		} finally {
			gfctx.restore();
		}

		return cancel;
	}	
	
}