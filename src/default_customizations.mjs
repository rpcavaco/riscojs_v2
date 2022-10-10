

import canvasUtils from './canvasutils.mjs';

export class MapCustomizations {

	static printMouseCoords(p_mapctx, p_x, py) {
		const terr_pt = [], canvas_dims = [];
		p_mapctx.transformmgr.getTerrainPt([p_x, py], terr_pt);

		const ctx = p_mapctx.canvasmgr.getDrwCtx('service', '2d');
		p_mapctx.canvasmgr.getCanvasDims(canvas_dims);

		canvasUtils.ctxClear(ctx, ...canvas_dims);

		const right = canvas_dims[0];
		const boxh = 20;
		const boxw = 130;
		const bottom = canvas_dims[1]-boxh-2;
		
		ctx.fillStyle = "rgb(216, 216, 216)";
        ctx.fillRect(right-boxw, bottom-boxh, boxw, boxh);

		ctx.fillStyle = "black";
		ctx.font = "8pt Arial ";

		ctx.fillText(terr_pt[0].toLocaleString(undefined, { maximumFractionDigits: 2 }), right-boxw+8, bottom-6);		
		ctx.fillText(terr_pt[1].toLocaleString(undefined, { maximumFractionDigits: 2 }), right-boxw+66, bottom-6);		
	}	

	static removeMouseCoords(p_mapctx) {
		const canvas_dims = [];
		const ctx = p_mapctx.canvasmgr.getDrwCtx('service', '2d');
		p_mapctx.canvasmgr.getCanvasDims(canvas_dims);
		canvasUtils.ctxClear(ctx, ...canvas_dims);
	}	
}