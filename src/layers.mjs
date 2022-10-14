
import {GlobalConst} from './constants.js';

function genSingleEnv(p_mapctxt) {

	const terrain_bounds = [], out_pt=[], dims=[], scr_bounds=[];
	p_mapctxt.getMapBounds(terrain_bounds);

	scr_bounds.length = 4;
	for (let i=0; i<2; i++) {
		p_mapctxt.transformmgr.getCanvasPt([terrain_bounds[2*i], terrain_bounds[2*i+1]], out_pt)
		scr_bounds[2*i] = out_pt[0];
		scr_bounds[2*i+1] = out_pt[1];
	}

	p_mapctxt.getCanvasDims(dims);

	return [terrain_bounds, scr_bounds, dims];
}

class Layer {

	minscale = GlobalConst.MINSCALE;
	maxscale = Number.MAX_SAFE_INTEGER;
	defaultvisible = true;
	drawingcanceled = false;
	inited = true;
	#key;
	#mapctxt;
	constructor(p_mapctxt) {
		this.#mapctxt = p_mapctxt;
		this.missing_mandatory_configs = [];
	}

	get mapctxt() {
		return this.#mapctxt;
	}

	checkScaleVisibility(p_scaleval) {
		if (p_scaleval == null) {
			throw new Error(`Layer '${this.key}', null scale val during scale interval visibility check`);	
		}
		return (p_scaleval >= this.minscale && p_scaleval <= this.maxscale);
	}

	checkAlreadyInit() {
		return this.inited;
	}

	/* init (p_mapctxt) {  
		an optional INIT method can perform initialization like get capabilities on OGC services
	} */

	set key(p_key) {
		this.#key = p_key;
	}
	get key() {
		return this.#key;
	}

	onCancel() {
		// to be extended
		// At least must end with:
		this.drawingcanceled = false;
	}

	* envs() {
		// intended to be extended / replaced whenever request chunking, by envelopes, is needed
		yield genSingleEnv(this.#mapctxt);
	}	

	* items(p_terrain_env, p_scr_env, p_dims) {
		// to be extended
		// for each envelope generated in 'envs', generate an graphic item or feature in canvas coords
	}	

	draw2D() {

		// to be extended
		
		let cancel = false;
		return cancel;
	}		
}

export class VectorLayer extends Layer {

	constructor(p_mapctx) {
		super(p_mapctx);
	}


	* items(p_terrain_env, p_scr_env, p_dims) {
		// to be extended
		// for each envelope generated in 'envs', generate an graphic item or feature in canvas coords
	}	

	drawitem2D(p_gfctx, p_terrain_env, p_scr_env, p_dims, item_geom, item_atts) {

		// to be extended
		// for each 'canvas' item just draw

	}	

	draw2D() {

		if (!this.defaultvisible) {
			return;
		}
		if (!this.checkScaleVisibility(this.mapctxt.getScale())) {
			return;
		}		

		const gfctx = this.mapctxt.canvasmgr.getDrwCtx(this.canvasKey, '2d');

		let cancel = false;

		gfctx.save();
		try {

			gfctx.strokeStyle = this.default_stroke_symbol.strokeStyle;
			gfctx.lineWidth = this.default_stroke_symbol.lineWidth;

			for (const [terrain_env, scr_env, dims] of this.envs(this.mapctxt)) {

				// console.log("-- env --", terrain_env, scr_env, gfctx.strokeStyle, gfctx.lineWidth);

				if (this.drawingcanceled) {
					this.onCancel();
					cancel = true;
					break;
				}
				for (const [item_coords, item_attrs] of this.items(this.mapctxt, terrain_env, scr_env, dims)) {

					//console.log("-- item --", terrain_env, scr_env, item_coords, item_attrs);

					if (!this.drawitem2D(this.mapctxt, gfctx, terrain_env, scr_env, dims, item_coords, item_attrs)) {
						cancel = true;
						break;
					}
					if (this.drawingcanceled) {
						this.onCancel();
						cancel = true;
						break;
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

	constructor(p_mapctx) {
		super(p_mapctx);
	}

	* envs() {
		// intended to be extended / replaced whenever request chunking, by envelopes, is needed
		yield genSingleEnv(this.mapctxt);
	}	

	* items(p_terrain_env, p_scr_env, p_dims) {
		// to be extended
		// for each envelope generated in 'envs', generate an graphic item or feature in canvas coords
	}	

	drawitem2D(p_gfctx, p_terrain_env, p_scr_env, p_dims, p_raster_url) {

		// to be extended
		// for each 'canvas' item just draw

	}	

	draw2D() {

		if (!this.defaultvisible) {
			return;
		}
		if (!this.checkScaleVisibility(this.mapctxt.getScale())) {
			return;
		}
		
		if (!this.inited) {
			console.log("#######    NOT INITED      #######");
			return;
		}

		const gfctx = this.mapctxt.canvasmgr.getDrwCtx(this.canvasKey, '2d');

		let cancel = false;

		gfctx.save();
		try {

			for (const [terrain_env, scr_env, dims] of this.envs(this.mapctxt)) {

				// console.log("-- env --", terrain_env, scr_env, gfctx.strokeStyle, gfctx.lineWidth);

				if (this.drawingcanceled) {
					this.onCancel();
					cancel = true;
					break;
				}
				for (const raster_url of this.items(this.mapctxt, terrain_env, scr_env, dims)) {

					//console.log("-- item --", terrain_env, scr_env, item_coords, item_attrs);

					if (!this.drawitem2D(this.mapctxt, gfctx, terrain_env, scr_env, dims, raster_url)) {
						cancel = true;
						break;
					}
					if (this.drawingcanceled) {
						this.onCancel();
						cancel = true;
						break;
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