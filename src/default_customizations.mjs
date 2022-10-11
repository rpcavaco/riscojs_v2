

import canvasUtils from './canvasutils.mjs';

class MousecoordsPrint {

	right;
	boxh;
	boxw;
	bottom;

	printMouseCoords(p_mapctx, p_x, py) {

		const terr_pt = [], canvas_dims = [];
		p_mapctx.transformmgr.getTerrainPt([p_x, py], terr_pt);

		const ctx = p_mapctx.canvasmgr.getDrwCtx('service', '2d');
		p_mapctx.canvasmgr.getCanvasDims(canvas_dims);

		canvasUtils.ctxClear(ctx, ...canvas_dims);

		this.right = canvas_dims[0];
		this.boxh = 20;
		this.boxw = 130;
		this.bottom = canvas_dims[1]-this.boxh-2;

		ctx.fillStyle = "rgb(216, 216, 216)";
        ctx.fillRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh);

		ctx.fillStyle = "black";
		ctx.font = "8pt Arial ";

		ctx.fillText(terr_pt[0].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.right-this.boxw+8, this.bottom-6);		
		ctx.fillText(terr_pt[1].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.right-this.boxw+66, this.bottom-6);		
	}	

	removeMouseCoords(p_mapctx) {
		const canvas_dims = [];
		const gfctx = p_mapctx.canvasmgr.getDrwCtx('service', '2d');
		p_mapctx.canvasmgr.getCanvasDims(canvas_dims);
		canvasUtils.ctxClear(gfctx, ...canvas_dims);

		gfctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
	}	
}

export class MapCustomizations {

	constructor() {
		this.instances = {
			"mousecoordsprint": new MousecoordsPrint()
		}
		
	}

}