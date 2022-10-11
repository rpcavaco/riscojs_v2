
import {GlobalConst} from './constants.js';

export class Layer {

	minscale = GlobalConst.MINSCALE;
	maxscale = Number.MAX_SAFE_INTEGER;
	defaultvisible = true;
	checkScaleVisibility(p_scaleval) {
		return (p_scaleval >= this.minscale && p_scaleval <= this.maxscale);
	}
	* items(p_mapctxt) {
		// to be extended
	}	

	draw2D(p_mapctxt, p_scaleval) {

		// to be extended
	}		
}