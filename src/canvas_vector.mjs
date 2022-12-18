
import {GlobalConst} from './constants.js';
import {dist2D} from './geom.mjs';
import {GraticuleLayer, PointGridLayer, AreaGridLayer, AGSQryLayer} from './vectorlayers.mjs';
import { RiscoFeatsLayer } from './risco_ownlayers.mjs';

const canvasVectorMethodsMixin = (Base) => class extends Base {
	
	canvasKey = 'normal';
	default_symbol;	
	fillflag = false;
	strokeflag = false;
	_gfctx;  // current graphics context to be always updated at each refreshing / drawing

	grabGf2DCtx(p_mapctx, opt_alt_canvaskey, opt_symbs) {

		let canvaskey;

		if (opt_alt_canvaskey) {
			canvaskey = opt_alt_canvaskey;
		} else {
			canvaskey = this.canvasKey;
		}

		//console.log("canvaskey:", canvaskey, opt_symbs);

		this._gfctx = p_mapctx.renderingsmgr.getDrwCtx(canvaskey, '2d');
		this._gfctx.save();

		if (opt_symbs) {

			if (opt_symbs.strokeStyle !== undefined && opt_symbs.strokeStyle.toLowerCase() !== "none") {
				this._gfctx.strokeStyle = opt_symbs.strokeStyle;
				this.strokeflag = true;
			}

			if (opt_symbs.lineWidth !== undefined) {
				this._gfctx.lineWidth = opt_symbs.lineWidth;
			}	

			if (opt_symbs.fillStyle !== undefined && opt_symbs.fillStyle.toLowerCase() !== "none") {
				this._gfctx.fillStyle = opt_symbs.fillStyle;
				this.fillflag = true;
			}	

			if (opt_symbs.font !== undefined) {
				this._gfctx.font = opt_symbs.font;
			}	

		} else {

			if (this.default_symbol.strokeStyle !== undefined && this.default_symbol.strokeStyle.toLowerCase() !== "none") {
				this._gfctx.strokeStyle = this.default_symbol.strokeStyle;
				this.strokeflag = true;
			}

			if (this.default_symbol.lineWidth !== undefined) {
				this._gfctx.lineWidth = this.default_symbol.lineWidth;
			}	

			if (this.default_symbol.fillStyle !== undefined && this.default_symbol.fillStyle.toLowerCase() !== "none") {
				this._gfctx.fillStyle = this.default_symbol.fillStyle;
				this.fillflag = true;
			}	

			if (this.default_symbol.font !== undefined) {
				this._gfctx.font = this.default_symbol.font;
			}				
		}

		//console.log(">>", strokeflag, fillflag);

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

		// console.log("pl:", p_path_levels);

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
							if (GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING == pp_this.key && GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING_FEATID == pp_feat_id) {
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

					if (GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING == pp_this.key && GlobalConst.DEBUG_CANVASVECTOR_PATHCLOSING_FEATID == pp_feat_id) {
						console.log(`[DEBUG_FEAT] closing path on ${pp_feat_id}`)
					}

					pp_this._gfctx.closePath();
				}

				ret = true;

			}

			return [ret, started];
		}

		if (p_coords.length > 0) {

			let retobj = innerCycle(this, p_coords, 0, p_path_levels, opt_feat_id, false);
			let ret = retobj[0];

			if (ret) {

				if (this.strokeflag) {
					this._gfctx.stroke();
				}

				if (["poly", "point"].indexOf(this.geomtype) >= 0) {
					if (this.fillflag) {
						this._gfctx.fill();
					}
				}
			}

		}

		return true;		
	}
}

export class CanvasGraticuleLayer extends canvasVectorMethodsMixin(GraticuleLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskey, opt_symbs) {

		const ok = this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskey, opt_symbs);

		if (ok && !this.strokeflag && !this.fillflag) {
			throw new Error(`Layer ${this.key}, no 'dostroke' and no 'dofill' flags, nothin to draw`);
		}

		if (ok) {
			try {
				this._gfctx.beginPath();
				this._gfctx.moveTo(p_coords[0], p_coords[1]);
				this._gfctx.lineTo(p_coords[2], p_coords[3]);

				if (this.strokeflag) {
					this._gfctx.stroke();
				};
				if (this.fillflag) {
					this._gfctx.fill();
				};


			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}
}

export class CanvasPointGridLayer extends canvasVectorMethodsMixin(PointGridLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskey, opt_symbs) {

		const ok = this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskey, opt_symbs);

		if (ok && !this.strokeflag && !this.fillflag) {
			throw new Error(`Layer ${this.key}, no 'stroke' and no 'fill' flags, nothin to draw`);
		}

		if (ok) {
			try {

				this.default_symbol.drawsymb(p_mapctxt, this, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, opt_feat_id)

			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}
		}

		return true;		
	}	
}

export class CanvasAreaGridLayer extends canvasVectorMethodsMixin(AreaGridLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskey, opt_symbs) {

		const ok = this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskey, opt_symbs);

		if (ok && !this.strokeflag && !this.fillflag) {
			throw new Error(`Layer ${this.key}, no 'stroke' and no 'fill' flags, nothin to draw`);
		}

		if (ok) {
			try {
				this._gfctx.beginPath();
				let cnt = 0, cpt=[];

				for (let pt of p_coords) {

					p_mapctxt.transformmgr.getRenderingCoordsPt(pt, cpt);

					if (cnt < 1) {
						this._gfctx.moveTo(...cpt);
					} else {
						this._gfctx.lineTo(...cpt);
					}
					cnt++;
				}
				if (this.strokeflag) {
					this._gfctx.stroke();
				};
				if (this.fillflag) {
					this._gfctx.fill();
				};
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

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskey, opt_symbs) {

		let ret = true;

		if (this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskey, opt_symbs)) {

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

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id, opt_alt_canvaskey, opt_symbs) {

		let ret = true;

		//console.log("aa:", [p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs]);

		if (this.grabGf2DCtx(p_mapctxt, opt_alt_canvaskey, opt_symbs)) {

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

