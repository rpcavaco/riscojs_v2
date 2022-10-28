
/**
 * Function rad2Deg
 * 
 * Convert radians to degrees
 * 
 * @param {float} p_val
 * 
 */
export function rad2Deg(p_val) {
		return p_val * 180.0 / Math.PI;
}
	
/**
 * Function deg2Rad
 * 
 * Convert degrees to radians
 * 
 * @param {float} p_val
 * 
 */
export function deg2Rad(p_val) {
	return p_val * Math.PI / 180.0;
}

export function distSquared2D(p_pt1, p_pt2) {
	const dy = p_pt2[1] - p_pt1[1];
	const dx = p_pt2[0] - p_pt1[0];
	return dx * dx + dy * dy;
}

export function dist2D(p_pt1, p_pt2) {
	return Math.sqrt(distSquared2D(p_pt1, p_pt2));
}

export function bbTouch(p_bb1, p_bb2) {

	let ret = false;

	if (p_bb1[2] > p_bb2[0]) {
		if (p_bb1[0] < p_bb2[2] ) {
			if (p_bb1[3] > p_bb2[1]) {
				if (p_bb1[1] < p_bb2[3] ) {
					ret = true;
				}
			}			
		}
	}

	return ret;
}

