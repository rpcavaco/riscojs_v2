

import {VectorLayer} from './layers.mjs';
import {CanvasStrokeSymbol} from './canvas_symbols.mjs';

class CanvasVectorLayer extends VectorLayer {

	canvasKey = 'normal';
	// constructor(p_mapctxt) {
		//super(p_mapctxt);
	constructor() {
		super();
		this.default_stroke_symbol = new CanvasStrokeSymbol();
		// this.default_fill_symbol = null;
	}	
}

export class CanvasGraticuleLayer extends CanvasVectorLayer {

	separation;
	/* constructor(p_mapctxt) {
		super(p_mapctxt);
	} */
	constructor() {
		super();
	}
	* envs(p_mapctxt) {

		const terrain_bounds = [], out_pt=[], scr_bounds = null; //scr_bounds=[];
		p_mapctxt.getMapBounds(terrain_bounds);

		/*
		scr_bounds.length = 4;
		for (let i=0; i<2; i++) {
			p_mapctxt.transformmgr.getCanvasPt([terrain_bounds[2*i], terrain_bounds[2*i+1]], out_pt)
			scr_bounds[2*i] = out_pt[0];
			scr_bounds[2*i+1] = out_pt[1];
		}
		*/

		yield [terrain_bounds, scr_bounds];
	}
	
	* items(p_mapctxt, p_terrain_env, p_scr_env, p_dims) {
		
		const line = [];
		let x, endlimit, crdlist=[], out_pt=[], crdlist_t;
		for (const mode of ['horiz', 'vert']) {

			if (mode == 'vert') {
				x = this.separation * Math.floor(p_terrain_env[0] / this.separation);
				endlimit = p_terrain_env[2];
			} else {
				x = this.separation * Math.floor(p_terrain_env[1] / this.separation);
				endlimit = p_terrain_env[3];
			}

			while (x <= endlimit) {

				x = x + this.separation;
				if (mode == 'vert') {
					crdlist.length = 0;
					crdlist.push(...[x, p_terrain_env[1], x, p_terrain_env[3]]);
				} else {
					crdlist.length = 0;
					crdlist.push(...[p_terrain_env[0], x, p_terrain_env[2], x]);
				}
				crdlist_t = []
				crdlist_t.length = crdlist.length;
				for (let i=0; i<2; i++) {
					p_mapctxt.transformmgr.getCanvasPt([crdlist[2*i], crdlist[2*i+1]], out_pt)
					crdlist_t[2*i] = out_pt[0];
					crdlist_t[2*i+1] = out_pt[1];
				}

				yield [crdlist_t, null];
			}

		}

	}	
	
	drawitem2D(p_mapctxt, p_gfctx, p_terrain_env, p_scr_env, p_dims, p_envkey, p_canvas_coords, p_attrs) {

		p_gfctx.beginPath();
		p_gfctx.moveTo(p_canvas_coords[0], p_canvas_coords[1]);
		p_gfctx.lineTo(p_canvas_coords[2], p_canvas_coords[3]);
		p_gfctx.stroke();

		return true;

	}	
}

/*
class CanvasSplitterLayer extends CanvasVectorLayer {

*/

