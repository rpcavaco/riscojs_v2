
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

	addTool(p_toolinstance) {
	}
}