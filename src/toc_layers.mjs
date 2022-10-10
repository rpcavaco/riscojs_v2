
class Layer {
	minscale = 0;
	maxscale = Number.MAX_SAFE_INTEGER;
	defaultvisible = true;
	elements = [];
	checkScaleVisibility(p_scaleval) {
		return (p_scaleval >= this.minscale && p_scaleval <= this.maxscale);
	}
}

/*
class PlainGraphicsLayer  extends Layer {
	grfeatures = [];
}

class RasterLayer extends Layer {

	//super(false);
}
*/

export class TOCManager {
	
	layers = [];
	constructor(p_mapctx) {
		this.mapctx = p_mapctx;
	}

	initFromConfig(p_configvar) {
	}

	appendGraticuleLayer(p_spacing) {
		let x, bounds = [];
		this.mapctx.getMapBounds(bounds);

		x = Math.floor();
	}
}