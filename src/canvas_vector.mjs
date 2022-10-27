
import {GlobalConst} from './constants.js';
import {dist2D} from './geom.mjs';
import {GraticuleLayer, GraticulePtsLayer, AGSQryLayer} from './vectorlayers.mjs';
import { RiscoFeatsLayer } from './risco_ownlayers.mjs';

const canvasVectorMethodsMixin = (Base) => class extends Base {
	
	canvasKey = 'normal';
	default_symbol;	
	_gfctx;  // current graphics context to be always updated at each refreshing / drawing

	grabGf2DCtx(p_mapctx) {

		this._gfctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvasKey, '2d');
		this._gfctx.save();

		switch (this.geomtype) {

			case "poly":

				this._gfctx.fillStyle = this.default_symbol.fillStyle;
				this._gfctx.strokeStyle = this.default_symbol.strokeStyle;
				this._gfctx.lineWidth = this.default_symbol.lineWidth;

				break;

			case "line":

				this._gfctx.strokeStyle = this.default_symbol.strokeStyle;
				this._gfctx.lineWidth = this.default_symbol.lineWidth;

				break;
		}

		return true;
	}

	// must this.grabGf2DCtx first !	
	releaseGf2DCtx() {

		if (this._gfctx == null) {
			throw new Error(`graphics context was not previously grabbed for layer '${this.key}'`);
		}
		this._gfctx.restore();
		this._gfctx = null;
	
	}	

	// must this.grabGf2DCtx first !
	drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id) {

		if (this._gfctx == null) {
			throw new Error(`graphics context was not previously grabbed for layer '${this.key}'`);
		}

		function innerCycle(pp_this, pp_root, pp_call_level, pp_path_level, pp_feat_id, pp_started) {
	
			let ptini=null, ptfim=null, ret = false, started=pp_started;
			let retobj;
			const pt=[];

			for (let pti=0; pti<pp_root.length; pti++) {

				if (typeof pp_root[pti][0] != 'number' && ptini == null) {

					retobj = innerCycle(pp_this, pp_root[pti], pp_call_level+1, pp_path_level-1, pp_feat_id, started);
					ret = retobj[0];
					started = retobj[1];

				} else {

					if (ptini==null) {

						if (pp_path_level != 1) {
							console.error(`[WARN] non-zero bottom path level on layer '${pp_this.key}', feat.id:${pp_feat_id}`);
						}

						ptini = pp_root[pti].slice(0);

						if (!started) {

							started = true;
							if (GlobalConst.DEBUG_FEAT_LAYER == pp_this.key && GlobalConst.DEBUG_FEAT_ID == pp_feat_id) {
								console.log(`[DEBUG_FEAT] begin path on ${pp_feat_id}`)
							}
		
							pp_this._gfctx.beginPath();
						}
								
					}

					ptfim = pp_root[pti].slice(0);

					p_mapctxt.transformmgr.getRenderingCoordsPt(pp_root[pti], pt);

					if (pti == 0){
						pp_this._gfctx.moveTo(...pt);
					} else {
						pp_this._gfctx.lineTo(...pt);
					}

				}
			}

			if (ptini != null) {

				if (GlobalConst.TOLERANCEDIST_RINGCLOSED >= dist2D(ptini, ptfim)) {

					if (GlobalConst.DEBUG_FEAT_LAYER == pp_this.key && GlobalConst.DEBUG_FEAT_ID == pp_feat_id) {
						console.log(`[DEBUG_FEAT] closing path on ${pp_feat_id}`)
					}

					pp_this._gfctx.closePath();
				}

				ret = true;

			}

			return [ret, started];
		}

		if (p_coords.length > 0) {

			if (innerCycle(this, p_coords, 0, p_path_levels, opt_feat_id, false)) {

				this._gfctx.stroke();

				if (this.geomtype == "poly") {
					this._gfctx.fill();
				}
			}


			/*

			switch(p_path_levels) {

				case 2:

					this._gfctx.beginPath();
					for (const part of p_coords) {
		
						for (let pti=0; pti<part.length; pti++) {
		
							if (ptini==null) {
								ptini = part[pti].slice(0);
							}
		
							p_mapctxt.transformmgr.getRenderingCoordsPt(part[pti], pt)

							if (pti == 0){
								this._gfctx.moveTo(...pt);
							} else {
								this._gfctx.lineTo(...pt);
							}
						}
		
						if (GlobalConst.TOLERANCEDIST_RINGCLOSED >= dist2D(ptini, pt)) {
							this._gfctx.closePath();
						}
					}
		
					if (this.geomtype == "poly") {
						this._gfctx.fill();
					}
					this._gfctx.stroke();

					break;

				default:

					this._gfctx.beginPath();
		
					for (let pti=0; pti<p_coords.length; pti++) {
	
						if (ptini==null) {
							ptini = p_coords[pti].slice(0);
						}
	
						p_mapctxt.transformmgr.getRenderingCoordsPt(p_coords[pti], pt)

						if (pti == 0){
							this._gfctx.moveTo(...pt);
						} else {
							this._gfctx.lineTo(...pt);
						}
					}
	
					if (GlobalConst.TOLERANCEDIST_RINGCLOSED >= dist2D(ptini, pt)) {
						this._gfctx.closePath();
					}
		
					if (this.geomtype == "poly") {
						this._gfctx.fill();
					}
					this._gfctx.stroke();


			}

			*/
	
			
		}

		return true;		
	}
}

export class CanvasGraticuleLayer extends canvasVectorMethodsMixin(GraticuleLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id) {

		if (this.grabGf2DCtx(p_mapctxt)) {
			try {
				this._gfctx.beginPath();
				this._gfctx.moveTo(p_coords[0], p_coords[1]);
				this._gfctx.lineTo(p_coords[2], p_coords[3]);
				this._gfctx.stroke();
			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}
}

export class CanvasGraticulePtsLayer extends canvasVectorMethodsMixin(GraticulePtsLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id) {

		if (this.grabGf2DCtx(p_mapctxt)) {
			try {

				const sclval = p_mapctxt.getScale();
				const dim = this.ptdim * (10.0 / Math.log10(sclval));
		
				this._gfctx.beginPath();
		
				// horiz
				this._gfctx.moveTo(p_coords[0] - dim, p_coords[1]);
				this._gfctx.lineTo(p_coords[0] + dim, p_coords[1]);
				this._gfctx.stroke();
		
				this._gfctx.beginPath();
		
				// vert
				this._gfctx.moveTo(p_coords[0], p_coords[1] - dim);
				this._gfctx.lineTo(p_coords[0], p_coords[1] + dim);
				this._gfctx.stroke();

			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}	
}

export class CanvasAGSQryLayer extends canvasVectorMethodsMixin(AGSQryLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id) {

		let ret = true;

		if (this.grabGf2DCtx(p_mapctxt)) {

			try {

				ret = this.drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id);

			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}	
			
		}

		return ret;

	}


}

export class CanvasRiscoFeatsLayer extends canvasVectorMethodsMixin(RiscoFeatsLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id) {

		let ret = true;

		//console.log("aa:", [p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs]);

		if (this.grabGf2DCtx(p_mapctxt)) {

			try {

				// console.log(p_coords, p_path_levels);

				ret = this.drawPath(p_mapctxt, p_coords, p_path_levels, opt_feat_id);

			} catch(e) {
				console.log(p_coords, p_path_levels);
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}	
			
		}

		return ret;

	}


}

