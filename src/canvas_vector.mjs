
import {GlobalConst} from './constants.js';
import {dist2D} from './geom.mjs';


import {WKID_List} from './esri_wkids.js';
import {uuidv4} from './utils.mjs';
import {GraticuleLayer, GraticulePtsLayer, AGSQryLayer} from './vectorlayers.mjs';



const canvasVectorMethodsMixin = (Base) => class extends Base {
	canvasKey = 'normal';
	default_symbol;	

}

export class CanvasGraticuleLayer extends canvasVectorMethodsMixin(GraticuleLayer) {

	backendRefreshItem(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs) {
		p_gfctx.beginPath();
		p_gfctx.moveTo(p_coords[0], p_coords[1]);
		p_gfctx.lineTo(p_coords[2], p_coords[3]);
		p_gfctx.stroke();

		return true;		
	}
}

export class CanvasGraticulePtsLayer extends canvasVectorMethodsMixin(GraticulePtsLayer) {

	backendRefreshItem(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs) {
		
		const sclval = p_mapctxt.getScale();
		const dim = this.ptdim * (10.0 / Math.log10(sclval));

		p_gfctx.beginPath();

		// horiz
		p_gfctx.moveTo(p_coords[0] - dim, p_coords[1]);
		p_gfctx.lineTo(p_coords[0] + dim, p_coords[1]);
		p_gfctx.stroke();

		p_gfctx.beginPath();

		// vert
		p_gfctx.moveTo(p_coords[0], p_coords[1] - dim);
		p_gfctx.lineTo(p_coords[0], p_coords[1] + dim);
		p_gfctx.stroke();

		return true;	
	}
}

export class CanvasAGSQryLayer extends canvasVectorMethodsMixin(AGSQryLayer) {

	backendRefreshItem(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs) {

		const pt=[];
		let ptini=null;

		if (p_coords.length > 0) {

			p_gfctx.beginPath();

			for (const part of p_coords) {
				for (let pti=0; pti<part.length; pti++) {

					if (ptini==null) {
						ptini = part[pti].slice(0);
					}

					p_mapctxt.transformmgr.getCanvasPt(part[pti], pt)

					if (pti == 0){
						p_gfctx.moveTo(...pt);
					} else {
						p_gfctx.lineTo(...pt);
					}
				}

				if (GlobalConst.TOLERANCEDIST_RINGCLOSED >= dist2D(ptini, pt)) {
					p_gfctx.closePath();
				}
			}

			p_gfctx.fill();
			p_gfctx.stroke();	
			
		}

		return true;

	}


}

