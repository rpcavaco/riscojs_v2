
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
	drawPath(p_mapctxt, p_coords) {

		//console.log("coords_", p_coords);

		if (this._gfctx == null) {
			throw new Error(`graphics context was not previously grabbed for layer '${this.key}'`);
		}

		const pt=[];
		let ptini=null;

		if (p_coords.length > 0) {

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

			this._gfctx.fill();
			this._gfctx.stroke();	
			
		}

		return true;		
	}
}

export class CanvasGraticuleLayer extends canvasVectorMethodsMixin(GraticuleLayer) {

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs) {

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

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs) {

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

	refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs) {

		let ret = true;

		if (this.grabGf2DCtx(p_mapctxt)) {

			try {

				ret = this.drawPath(p_mapctxt, p_coords);

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

	/*refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs) {

		let ret = true;

		if (this.grabGf2DCtx(p_mapctxt)) {

			try {

				ret = this.drawPath(p_mapctxt, p_coords);

			} catch(e) {
				throw e;
			} finally {
				this.releaseGf2DCtx();
			}	
			
		}

		return ret;

	} */


}

