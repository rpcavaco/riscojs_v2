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

export function pathLength(p_pathcoords, p_path_levels, opt_transform_func) {

	console.log("39", p_path_levels);

	let global_ret = 0;

	function subPathLength(p_coords) {
		let ret = 0, pt1 = null, ptt=[];

		for (const pt of  p_coords) {
			if (opt_transform_func) {
				opt_transform_func(pt, ptt);
			} else {
				ptt = pt;
			}
			if (pt1 == null) {
				pt1 = [...ptt];
				continue;
			}

			ret += dist2D(pt1, ptt); 
			pt1 = [...ptt];
		}

		return ret;
	} 

	function innerCycle(pp_current_coords, pp_current_path_level) {
		if (pp_current_path_level == 1) {
			global_ret += subPathLength(pp_current_coords);
			return;
		} else {	
			for (const subpath in pp_current_coords) {
				innerCycle(subpath, pp_current_path_level-1);
			}
		}
	}

	innerCycle(p_pathcoords, p_path_levels);

	return global_ret;
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

export function area2(p_pointlst) {
	
	let ret = 0.0;
	
	let n = p_pointlst.length;
	let j = n - 1;
	
	for (let i=0; i<n; i++) {
		ret += p_pointlst[j][0] * p_pointlst[i][1] - p_pointlst[j][1] * p_pointlst[i][0];
		j = i;
	}
	
	return ret;
	
}

function isPointOnSegment(p_ptseg1, p_ptseg2, p_ptin, p_minarea, opt_dodebug) {
	//let minval = 0.0001;		
	const partA = 
		p_ptseg1[0] != p_ptseg2[0] &&
			(p_ptseg1[0] <= p_ptin[0] && p_ptin[0] <= p_ptseg2[0] || p_ptseg2[0] <= p_ptin[0] && p_ptin[0] <= p_ptseg1[0]) ||
		p_ptseg1[0] == p_ptseg2[0] && 
			(p_ptseg1[1] <= p_ptin[1] && p_ptin[1] <= p_ptseg2[1] || p_ptseg2[1] <= p_ptin[1] && p_ptin[1] <= p_ptseg1[1])
	const absarea = Math.abs(area2_3p(p_ptseg1, p_ptseg2, p_ptin));

	if (opt_dodebug)
		console.log("[DBG:DISTANCETO] is pt on segm, init test:", partA, "area test:", absarea, "<", p_minarea);
	
	return partA && absarea < p_minarea;		
}

function projectPointOnSegment(p_ptseg1, p_ptseg2, p_ptin, p_minarea, out_projpt, opt_dodebug) {

	out_projpt.length = 2;

	//console.log(" pos >"+p_ptseg1+" "+p_ptseg2+" "+JSON.stringify(p_ptin));
	
	let d1, d2,dx = p_ptseg2[0] - p_ptseg1[0];
	let dy = p_ptseg2[1] - p_ptseg1[1];
	let len2 = (dx * dx) + (dy * dy);
	let inprod = dx * (p_ptin[0] - p_ptseg1[0]) + dy * (p_ptin[1] - p_ptseg1[1]);
	
	if (opt_dodebug)
		console.log("[DBG:DISTANCETO] prj pt on segm, dx:",dx,"dy:",dy,"inprod:",inprod,"len2:",len2, "rdx:", (inprod * (dx/len2)));
	
	out_projpt[0] = p_ptseg1[0] + (inprod * (dx/len2));
	out_projpt[1] = p_ptseg1[1] + (inprod * (dy/len2));
	
	if (!isPointOnSegment(p_ptseg1, p_ptseg2, p_ptin, p_minarea, opt_dodebug)) {

		if (opt_dodebug)
			console.log("not on seg");

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

function projectPointOnLine(p_pointlst, p_ptin, p_minarea, out_projpt, opt_debug) {

	let p1, p2, dist2, mindist=9999999, tmppt=[];
	out_projpt.length = 2;

	for (let i=0; i<(p_pointlst.length-1); i++ ) {
		p1 = p_pointlst[i];
		p2 = p_pointlst[i+1];
		projectPointOnSegment(p1, p2, p_ptin, p_minarea, tmppt, opt_debug);
		dist2 = distSquared2D(p_ptin, tmppt);
		if (dist2 < mindist) {
			mindist = dist2;
			out_projpt[0] = tmppt[0];
			out_projpt[1] = tmppt[1];
		}
		if (opt_debug) {
			console.log("[DBG:DISTANCETO] proj pt on ln, segmidx:",i,"mindist2:",mindist,"dist2:",dist2,"given pt:",p_ptin,"tmppt:",tmppt,"p1:",p1,"p2:",p2);
		}

	}
	
	return mindist;
}

export function distanceToLine(p_pointlist, p_path_levels, p_ptin, p_minarea, opt_debug) {
	let d, ret = 0, prj=[], prjd=0;

	switch (p_path_levels) {

		case 1:
			projectPointOnLine(p_pointlist, p_ptin, p_minarea, prj, opt_debug);
			ret = dist2D(p_ptin, prj);
			if (opt_debug) {
				console.log("[DBG:DISTANCETO] to line (single path) given pt:",p_ptin,"prj:",prj,"pd:",prjd,"d:",d);
			}
			break;
		
		case 2:
			for (let i=0; i<p_pointlist.length; i++) {
				prjd = projectPointOnLine(p_pointlist[i], p_ptin, p_minarea, prj, opt_debug);
				d = dist2D(p_ptin, prj);
				if (opt_debug) {
					console.log("[DBG:DISTANCETO] to line, subpath i:",i,"given pt:",p_ptin,"prj:",prj,"pd:",prjd,"d:",d);
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
			for (let j=0; j<p_pointlist.length; j++) {
				for (let i=0; i<p_pointlist[j].length; i++) {
					prjd = projectPointOnLine(p_pointlist[j][i], p_ptin, p_minarea, prj);
					d = dist2D(p_ptin, prj);
					if (opt_debug) {
						console.log("[DBG:DISTANCETO] to line, part j:",j,"subpath i:",i,"given pt:",p_ptin,"prj:",prj,"pd:",prjd,"d:",d);
					}	
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

export function distanceToPoly(p_pointlist, p_path_levels, p_ptin, p_minarea, opt_debug, opt_id) {
	
	let ret = 0.0;
	
	if (!insidePolygon(p_pointlist, p_path_levels, p_ptin) ) {
		if (GlobalConst.getDebug("GEOM")) {
			console.log(`[DBG:GEOM] distanceToPoly, outside id: ${opt_id}`);
		}
		ret = distanceToLine(p_pointlist, p_path_levels, p_ptin, p_minarea, opt_debug);
	} else {
		if (GlobalConst.getDebug("GEOM")) {
			console.log(`[DBG:GEOM] distanceToPoly, inside id: ${opt_id}`);
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

export function segmentMeasureToPoint(pt1, pt2, p_measure, out_pt) {
	const dx = pt2[0] - pt1[0];
	const dy = pt2[1] - pt1[1];	

	out_pt.length = 2;
	
	if (dx == 0) {
		out_pt[1] = pt1[1] + p_measure * dy;
		out_pt[0] = pt1[0] + (dx / dy)  * p_measure * dy;
	} else {
		out_pt[0] = pt1[0] + p_measure * dx;
		out_pt[1] = pt1[1] + (dy / dx)  * p_measure * dx;
	}

}