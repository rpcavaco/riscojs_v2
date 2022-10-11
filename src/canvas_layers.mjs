
import {Layer} from './layers.mjs';
import {CanvasStrokeSymbol} from './canvas_symbols.mjs';

class CanvasVectorLayer extends Layer {

	canvasKey = 'normal';
	constructor() {
		super();
		this.default_stroke_symbol = new CanvasStrokeSymbol();
		// this.default_fill_symbol = null;
	}	
}

class CanvasGraticuleLayer extends CanvasVectorLayer {

	separation;
	constructor() {
		super();
	}
	* items(p_mapctxt) {

		let x, crdlist, crdlist_t, out_pt=[], bounds = [], modes=['horiz', 'vert'];
		let endlimit;
		p_mapctxt.getMapBounds(bounds);

		for (let mi=0; mi < modes.length; mi++) {

			if (modes[mi] == 'vert') {
				x = this.separation * Math.floor(bounds[0] / this.separation);
				endlimit = bounds[2];
			} else {
				x = this.separation * Math.floor(bounds[1] / this.separation);
				endlimit = bounds[3];
			}

			while (x <= endlimit) {
				x = x + this.separation;
				if (modes[mi] == 'vert') {
					crdlist = [x, bounds[1], x, bounds[3]];
				} else {
					crdlist = [bounds[0], x, bounds[2], x];
				}
				crdlist_t = []
				crdlist_t.length = crdlist.length;
				for (let i=0; i<2; i++) {
					p_mapctxt.transformmgr.getCanvasPt([crdlist[2*i], crdlist[2*i+1]], out_pt)
					crdlist_t[2*i] = out_pt[0];
					crdlist_t[2*i+1] = out_pt[1];
				}

				yield crdlist_t;
			}

		}


	}

	draw2D(p_mapctxt, p_scaleval) {

		if (!this.defaultvisible) {
			return;
		}
		if (!this.checkScaleVisibility(p_scaleval)) {
			return;
		}		

		const gfctx = p_mapctxt.canvasmgr.getDrwCtx(this.canvasKey, '2d');
		gfctx.save();
		try {
			gfctx.strokeStyle = this.default_stroke_symbol.strokeStyle;
			gfctx.lineWidth = this.default_stroke_symbol.lineWidth;
			for (let elem_coords of this.items(p_mapctxt)) {
				gfctx.beginPath();
				gfctx.moveTo(elem_coords[0], elem_coords[1]);
				gfctx.lineTo(elem_coords[2], elem_coords[3]);
				gfctx.stroke();
			}
		} catch(e) {
			throw e;
		} finally {
			gfctx.restore();
		}
	}	
}

/*
class RasterLayer extends Layer {

	//super(false);
}
*/

const canvas_layer_classes = {
    "graticule": CanvasGraticuleLayer
};

export class DynamicCanvasLayer {
    constructor (p_classkey, opts) {
        return new canvas_layer_classes[p_classkey](opts);
    }
}