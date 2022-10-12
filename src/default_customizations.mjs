
import {I18n} from './i18n.mjs';

class MapPrintInRect {

	right;
	boxh;
	boxw;
	bottom;
	fillStyleBack = "rgb(216, 216, 216)"; 
	fillStyleFront = "rgb(65, 65, 65)"; 
	font = "8pt Arial ";

	constructor() {
		this.i18n = new I18n();
	}

	print(p_mapctx, p_x, py) {
		// To be implemented
	}

	remove(p_mapctx) {
		const canvas_dims = [];
		const gfctx = p_mapctx.canvasmgr.getDrwCtx('service', '2d');
		p_mapctx.canvasmgr.getCanvasDims(canvas_dims);

		gfctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
	}	
	
}

class MousecoordsPrint extends MapPrintInRect {

	constructor() {
		super();
	}

	print(p_mapctx, p_x, py) {

		const terr_pt = [], canvas_dims = [];
		p_mapctx.transformmgr.getTerrainPt([p_x, py], terr_pt);

		const ctx = p_mapctx.canvasmgr.getDrwCtx('service', '2d');
		ctx.save();

		try {
			p_mapctx.canvasmgr.getCanvasDims(canvas_dims);

			this.right = canvas_dims[0];
			this.boxh = 20;
			this.boxw = 130;
			this.bottom = canvas_dims[1]-(2*this.boxh)-2;

			ctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			ctx.fillText(terr_pt[0].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.right-this.boxw+8, this.bottom-6);		
			ctx.fillText(terr_pt[1].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.right-this.boxw+66, this.bottom-6);	
			
		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}

	}	

	
}

class MapScalePrint extends MapPrintInRect {

	constructor() {
		super();
	}

	print(p_mapctx, p_scaleval) {

		const canvas_dims = [];
		const ctx = p_mapctx.canvasmgr.getDrwCtx('service', '2d');
		ctx.save();

		try {
			p_mapctx.canvasmgr.getCanvasDims(canvas_dims);

			this.right = canvas_dims[0];
			this.boxh = 20;
			this.boxw = 130;
			this.bottom = canvas_dims[1]-this.boxh;

			ctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh);

			//console.log('>> MapScalePrint print scale', [this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh]);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			ctx.fillText(this.i18n.msg('ESCL', true) + " 1:"+p_scaleval, this.right-this.boxw+12, this.bottom-6);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	


}

export class MapCustomizations {

	constructor() {
		this.instances = {
			"mousecoordsprint": new MousecoordsPrint(),
			"mapscaleprint": new MapScalePrint()
		}
		
	}

}
