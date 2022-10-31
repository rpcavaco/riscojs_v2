import {GlobalConst} from './constants.js';
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


function area2_3p(p_pt1, p_pt2, p_pt3) {
	return (p_pt1[0] - p_pt3[0]) * (p_pt2[1] - p_pt3[1]) - (p_pt1[1] - p_pt3[1]) * (p_pt2[0] - p_pt3[0]);
}

/*
-- Needs deep revision
function ccw(p_pt_sequence) {

	let n = p_pt_sequence.length, k = 0;

	for (let i=1; i<n; i++) {
		if (p_pt_sequence[i][0] <= p_pt_sequence[k][0] && (p_pt_sequence[i][0] < p_pt_sequence[k][0] || p_pt_sequence[i][1] < p_pt_sequence[k][1])) {
			k = i;
			break;
		}
	}
	let prev = k - 1, next = k + 1;
	if (prev == -1) {
		prev = n - 1;
	}
	if (next == n) {
		next = 0;
	}
	console.log(prev, k, next, area2_3p(p_pt_sequence[prev], p_pt_sequence[k], p_pt_sequence[next]), p_pt_sequence[prev], p_pt_sequence[k], p_pt_sequence[next]);
	return (area2_3p(p_pt_sequence[prev], p_pt_sequence[k], p_pt_sequence[next]) > 0);
}
*/

function area2(p_pointlst) {
	
	let ret = 0.0;
	
	let n = p_pointlst.length;
	let j = n - 1;
	
	for (let i=0; i<n; i++) {
		ret += p_pointlst[j][0] * p_pointlst[i][1] - p_pointlst[j][1] * p_pointlst[i][0];
		j = i;
	}
	
	return ret;
	
}

function isPointOnSegment(p_ptseg1, p_ptseg2, p_ptin) {
	let minval = 0.0001;		
	return (
		p_ptseg1[0] != p_ptseg2[0] &&
			(p_ptseg1[0] <= p_ptin[0] && p_ptin[0] <= p_ptseg2[0] || p_ptseg2[0] <= p_ptin[0] && p_ptin[0] <= p_ptseg1[0]) ||
		p_ptseg1[0] == p_ptseg2[0] && 
			(p_ptseg1[1] <= p_ptin[1] && p_ptin[1] <= p_ptseg2[1] || p_ptseg2[1] <= p_ptin[1] && p_ptin[1] <= p_ptseg1[1])
	) && Math.abs(area2_3p(p_ptseg1, p_ptseg2, p_ptin)) < minval;		
}

function projectPointOnSegment(p_ptseg1, p_ptseg2, p_ptin, out_projpt) {

	out_projpt.length = 2;

	//console.log(" pos >"+p_ptseg1+" "+p_ptseg2+" "+JSON.stringify(p_ptin));
	
	let d1, d2,dx = p_ptseg2[0] * 1.0 - p_ptseg1[0] * 1.0;
	let dy = p_ptseg2[1] * 1.0 - p_ptseg1[1] * 1.0;
	let len2 = (dx * dx) + (dy * dy);
	let inprod = dx * (p_ptin[0] - p_ptseg1[0]) + dy * (p_ptin[1] - p_ptseg1[1]);
	
	//console.log("dx:"+dx+", dy:"+dy+", inprod:"+inprod+", len2:"+len2);
	
	out_projpt[0] = p_ptseg1[0] + (inprod * (dx/len2));
	out_projpt[1] = p_ptseg1[1] + (inprod * (dy/len2));
	
	if (!isPointOnSegment(p_ptseg1, p_ptseg2, p_ptin)) {
		d1 = distSquared2D(p_ptseg1, p_ptin);
		d2 = distSquared2D(p_ptseg2, p_ptin);
		if (d1 <= d2) {
			out_projpt[0] = p_ptseg1[0];
			out_projpt[1] = p_ptseg1[1];
		} else {
			out_projpt[0] = p_ptseg2[0];
			out_projpt[1] = p_ptseg2[1];
		}
	}
	
}

function projectPointOnLine(p_pointlst, p_ptin, out_projpt, opt_debug) {

	let p1, p2, dist2, mindist=9999999, tmppt=[];
	out_projpt.length = 2;

	for (let i=0; i<(p_pointlst.length-1); i++ ) {
		p1 = p_pointlst[i];
		p2 = p_pointlst[i+1];
		projectPointOnSegment(p1, p2, p_ptin, tmppt);
		dist2 = distSquared2D(p_ptin, tmppt);
		if (opt_debug) {
			console.log("mindist:"+mindist+", dist2:"+dist2+" ptin:"+JSON.stringify(p_ptin)+" tmppt:"+JSON.stringify(tmppt)+" p1:"+JSON.stringify(p1)+" p2:"+JSON.stringify(p2));
		}
		if (dist2 < mindist) {
			mindist = dist2;
			out_projpt[0] = tmppt[0];
			out_projpt[1] = tmppt[1];
		}
	}
	
	return mindist;
}

export function distanceToLine(p_pointlist, p_path_levels, p_ptin, opt_debug) {
	let d, ret = 0, prj=[], prjd=0;

	switch (p_path_levels) {

		case 1:
			projectPointOnLine(p_pointlist, p_ptin, prj);
			ret = dist2D(p_ptin, prj);
			break;
		
		case 2:
			for (let i=0; i<p_pointlist.length; i++) {
				prjd = projectPointOnLine(p_pointlist[i], p_ptin, prj, opt_debug);
				d = dist2D(p_ptin, prj);
				if (opt_debug) {
					console.log("i:"+i+", pt:"+JSON.stringify(p_ptin)+", prj:"+JSON.stringify(prj)+" pd:"+prjd+" d2:"+Math.pow(d,2));
				}
				if (i==0) {
					ret = d;
				} else {
					if (d < ret) {
						ret = d;
					}
				}
			}
			break;
		
		case 3:
			for (let j=0; j<p_pointlist.length; j++) 
			{
				for (let i=0; i<p_pointlist[j].length; i++) 
				{
					projectPointOnLine(p_pointlist[j][i], p_ptin, prj);
					d = dist2D(p_ptin, prj);
					if (i==0) {
						ret = d;
					} else {
						if (d < ret) {
							ret = d;
						}
					}
				}
			}
	}
	
	return ret;
}

function insidePolygon(p_pointlist, p_path_levels, p_ptin) {

	let first_is_ccw, this_is_ccw, ret = false;
	
	function insideTest(pp_pointlist, pp_ptin) {
		
		let inner_ret = false;
		let n = pp_pointlist.length;
		let j = n - 1;
		
		for (let i=0; i<n; i++) {
			if (
				pp_pointlist[j][1] <= pp_ptin[1] && pp_ptin[1] < pp_pointlist[i][1] &&
				area2_3p(pp_pointlist[i], pp_pointlist[j], pp_ptin) > 0 ||
				pp_pointlist[i][1] <= pp_ptin[1] && pp_ptin[1] < pp_pointlist[j][1] &&
				area2_3p(pp_pointlist[j], pp_pointlist[i], pp_ptin) > 0
			) 
			{
				inner_ret = !inner_ret;
			}
			j = i;
		}
		return inner_ret;
	}


	/*
	// Avoid collections of one ring in path_levels == 3
	if (p_path_levels == 3 && p_pointlist.length > 1) { 
		//let p;
		console.log("a:", p_pointlist)
		for (let i=0; i<(p_pointlist.length-1); i++) {
			if (p_pointlist[i].length == 1 && p_pointlist[i+1].length == 1) {
				console.log("i:", i, p_pointlist[i].equals(p_pointlist[i+1]));
			}
		}

	} */

	switch (p_path_levels) {
		
		case 1:
			ret = insideTest(p_pointlist, p_ptin);
			break;
		
		case 2:
			for (let i=0; i<p_pointlist.length; i++) {	
				if (i==0) {
					first_is_ccw = area2(p_pointlist[i]) > 0;  // first may be outer ring only when poly has holes, otherwise is first of n disjoint rings
					this_is_ccw = first_is_ccw;
				} else {
					this_is_ccw = area2(p_pointlist[i]) > 0;
				}

				if (insideTest(p_pointlist[i], p_ptin)) {
					if (i==0) {
						ret = true;
					} else {
						// inside of hole
						if (this_is_ccw != first_is_ccw) {
							ret = false;
							break;
						} else {
							ret = true;
						}
					}

					if (GlobalConst.getDebug("GEOM")) {
						console.log(`[DBG:GEOM] insidePolygon, inside ring ${i}, ccw:${this_is_ccw}`);
					}
				} else {
					if (GlobalConst.getDebug("GEOM")) {
						console.log(`[DBG:GEOM] insidePolygon, outside ring ${i}, ccw:${this_is_ccw}`);
					}
				}
			}
			break;
		
		case 3:
			//console.log(p_pointlist)
			//throw new Error("puf!");
			for (let i=0; i<p_pointlist.length; i++) 
			{
				for (let j=0; j<p_pointlist[i].length; j++) {	
					if (j==0) {
						first_is_ccw = area2(p_pointlist[i][j]) > 0;  // first may be outer ring only when poly has holes, otherwise is first of n disjoint rings
						this_is_ccw = first_is_ccw;
					} else {
						this_is_ccw = area2(p_pointlist[i][j]) > 0;
					}
	
					if (insideTest(p_pointlist[i][j], p_ptin)) {
						if (j==0) {
							ret = true;
						} else {
							// inside of hole
							if (this_is_ccw != first_is_ccw) {
								ret = false;
								break;
							} else {
								ret = true;
							}
						}
	
						if (GlobalConst.getDebug("GEOM")) {
							console.log(`[DBG:GEOM] insidePolygon, inside ring ${i},${j}, ccw:${this_is_ccw}`);
						}
					} else {
						if (GlobalConst.getDebug("GEOM")) {
							console.log(`[DBG:GEOM] insidePolygon, outside ring ${i},${j}, ccw:${this_is_ccw}`);
						}
					}
				}
			}
	}

	return ret;
}

export function distanceToPoly(p_pointlist, p_path_levels, p_ptin, opt_debug, id) {
	
	let ret = 0.0;
	
	if (!insidePolygon(p_pointlist, p_path_levels, p_ptin) ) {
		if (GlobalConst.getDebug("GEOM")) {
			console.log(`[DBG:GEOM] distanceToPoly, outside id: ${id}`);
		}
		ret = distanceToLine(p_pointlist, p_path_levels, p_ptin, opt_debug);
	} else {
		if (GlobalConst.getDebug("GEOM")) {
			console.log(`[DBG:GEOM] distanceToPoly, inside id: ${id}`);
		}
	}
	
	return ret;
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

export function geomTest() {

	let v = area2_3p([0, 0], [2 ,0], [2, 2]);
	if (GlobalConst.getDebug("GEOM")) {
		console.log(`[DBG:GEOM] test 1, area2, 3 pts: ${v}, CCW: ${v > 0} == true`);
	}

	if (v <= 0) {
		throw new Error("CW/CCW logic is flawed, wrong result on geometry test 1");
	}

	v = area2_3p([2, 2], [2 ,0], [0, 0] );
	if (GlobalConst.getDebug("GEOM")) {
		console.log(`[DBG:GEOM] test 2, area2, 3 pts: ${v}, CCW: ${v > 0} == false`)
	}

	if (v > 0) {
		throw new Error("CW/CCW logic is flawed, wrong result on geometry test 2");
	}

	v = area2([
		[0, 0],
		[2, 0],
		[2, 2],
		[0, 2],
		[0, 0]
	]);

	if (GlobalConst.getDebug("GEOM")) {
		console.log(`[DBG:GEOM] test 3, area2: ${v}, CCW: ${v > 0} == true`);
	}

	if (v <= 0) {
		throw new Error("CW/CCW logic is flawed, wrong result on geometry test 3");
	}

	v = area2([
		[0, 0],
		[0, 2],
		[2, 2],
		[2, 0],
		[0, 0]
	]);

	if (GlobalConst.getDebug("GEOM")) {
		console.log(`[DBG:GEOM] test 4, area2: ${v}, CCW: ${v > 0} == false`);
	}

	if (v > 0) {
		throw new Error("CW/CCW logic is flawed, wrong result on geometry test 4");
	}

}