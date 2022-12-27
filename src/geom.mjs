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

export function distanceToLine(p_pointlist, p_path_levels, p_ptin, p_minarea, opt_debug, opt_out_projpt) {
	let d, ret = 0, prj, prjd=0;

	if (opt_out_projpt) {
		prj=opt_out_projpt;
	} else {
		prj=[];
	}

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

export function ptInsideEnv(p_env, p_pt) {
	return p_pt[0] >= p_env[0] && p_pt[0] <= p_env[2] && p_pt[1] >= p_env[1] && p_pt[1] <= p_env[3];
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

export function loopPathParts(p_pathcoords, p_pathlevels, p_applyfunction, p_func_args_list) {

	if (p_pathlevels == 0) {
		return;
	}

	if (p_pathlevels == 1) {
		if (typeof p_pathcoords[0][0] != 'number') {
			throw new Error(`loopPathParts error, pathlevel is 1 but current path is not array of points (array of array of coordinates): ${p_pathcoords}`);
		}
		p_applyfunction(p_pathcoords, p_func_args_list);
	
	} else {

		for (const pathpart of p_pathcoords) {
			if (typeof pathpart[0][0] == 'number' && p_pathlevels > 2) {
				throw new Error(`loopPathParts error, pathlevel is ${p_pathlevels-1} > 1 but current path is an array of points (array of array of coordinates): ${JSON.stringify(pathpart)}`);
			}
			loopPathParts(pathpart, p_pathlevels-1, p_applyfunction, p_func_args_list);
		}

	}

}

export function evalTextAlongPathViability(p_mapctxt, p_coords, p_path_levels, p_labeltxtlen, opt_terrain_env) {

	function qtize(p_val) {
		return parseInt(p_val / GlobalConst.LBL_QUANTIZE_SIZE);
	}

	function verticalityTest(p_dx, p_dy) {
		if (p_dx == 0) {
			return true;
		} else {
			return qtize(Math.abs(p_dy)) / qtize(Math.abs(p_dx)) > 2;
		}
	}

	if (p_coords.length < 1) {
		return null;
	}

	const ubRendCoordsFunc = p_mapctxt.transformmgr.getRenderingCoordsPt;
	const tl = p_labeltxtlen;
	let retobj = null;
	let globaldx = 0;

	// First, check if there is enough horizontal on near-horizontal continuous path to hold the whole text length.
	// If such path doesn't exist, include run same test including verticallly aligned segments.
	// In either case, delta - x must always be of same sign.

	let collected_paths = [];
	let check_verticality = true;
	let loop_count = 0;

	//console.log(p_coords);

	while(loop_count < 2) {

		loopPathParts(p_coords, p_path_levels, function(p_pathpart, p_func_args_list) { 
			
			let dx, dy, pl, prev_positive_dir=null;
			let current_collected_path = [];

			const [p_collected_paths, p_check_verticality] = p_func_args_list;

			for (let pi=1; pi<p_pathpart.length; pi++) {

				dy = p_pathpart[pi][1] - p_pathpart[pi-1][1];
				dx = p_pathpart[pi][0] - p_pathpart[pi-1][0];

				// skip if terrain env is given and beginning point of segment is out of it
				if (opt_terrain_env != null) {
					if (dx > 0) {
						if (!ptInsideEnv(opt_terrain_env, p_pathpart[pi-1])) {
							continue;
						}
					} else {
						if (!ptInsideEnv(opt_terrain_env, p_pathpart[pi])) {
							continue;
						}
					}
				}

				if ((p_check_verticality && verticalityTest(dx, dy)) || (prev_positive_dir!==null && prev_positive_dir != (dx > 0))) {
					if (current_collected_path.length > 0) {
						pl = pathLength(current_collected_path, 1, ubRendCoordsFunc.bind(p_mapctxt.transformmgr));
						if (tl <= GlobalConst.LBL_MAX_ALONGPATH_OCCUPATION * pl) {
							p_collected_paths.push([...current_collected_path]);
						}
						current_collected_path.length = 0;
					}
				} else {
					if (pi==1) {
						current_collected_path.push([...p_pathpart[pi-1]]);
					}
					current_collected_path.push([...p_pathpart[pi]]);
				}
				prev_positive_dir = (dx > 0);
			}
			if (current_collected_path.length > 0) {
				pl = pathLength(current_collected_path, 1, ubRendCoordsFunc.bind(p_mapctxt.transformmgr));
				if (tl <= GlobalConst.LBL_MAX_ALONGPATH_OCCUPATION * pl) {
					p_collected_paths.push([...current_collected_path]);
				}
			}
		}, [collected_paths, check_verticality]);

		if (loop_count == 0 && collected_paths.length > 0) {
			break;
		}

		check_verticality = false;
		loop_count++;
	}

	if (collected_paths.length > 0) {

		collected_paths.sort((a, b) => {
			return pathLength(b, 1) - pathLength(a, 1);
		})
	
		for (let pi=1; pi<collected_paths[0].length; pi++) {
			globaldx += collected_paths[0][pi][0] - collected_paths[0][pi-1][0];
		}

		if (globaldx > 0) {
			retobj = collected_paths[0];
		} else {
			retobj = collected_paths[0].reverse();
		}
	}

	return retobj;
}

export function pathEnv(p_coords, p_path_levels) {

	const ret = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];
	loopPathParts(p_coords, p_path_levels, function(p_pathpart, p_ret) { 
		for (const pt of p_pathpart) {
			p_ret[0] = Math.min(pt[0], p_ret[0]);
			p_ret[1] = Math.min(pt[1], p_ret[1]);
			p_ret[2] = Math.max(pt[0], p_ret[2]);
			p_ret[3] = Math.max(pt[1], p_ret[3]);
		}
	}, ret);

	return ret;
}

export function findPolygonCentroid(p_coords, p_path_levels, p_cpt, p_step) {

	const movs = [
		[1,0],
		[0,1],
		[-1,0],
		[0,-1]
	];

	const visited = {};
	
	let test_col, test_row, next_movidx, curr_col = 0, curr_row = 0;
	let test_pt = [...p_cpt];
	let movidx = 0;

	const env = pathEnv(p_coords, p_path_levels);

	//console.log(test_pt, "env:", env);

	let secloopcnt = 200;

	// TODO - não progredir para fora do envelope
	while (!insidePolygon(p_coords, p_path_levels, test_pt)) {

		secloopcnt--;
		if (secloopcnt < 0) {
			throw new Error("no inside centroid found for polygon, point test limit count exceeded");
		}

		if (visited[curr_row] === undefined) {
			visited[curr_row] = [];
		}
		visited[curr_row].push(curr_col);

		next_movidx = (movidx + 1) % 4;
		test_col = curr_col + movs[next_movidx][0];
		test_row = curr_row + movs[next_movidx][1];

		if (visited[test_row] !== undefined && visited[test_row].indexOf(test_col) >= 0) {
			curr_col = curr_col + movs[movidx][0];
			curr_row = curr_row + movs[movidx][1];	
		} else {
			curr_col = test_col;
			curr_row = test_row;
			movidx = next_movidx;
		}

		test_pt[0] = curr_col * p_step + p_cpt[0];
		test_pt[1] = curr_row * p_step + p_cpt[1];

		if (!ptInsideEnv(env, test_pt)) {
			throw new Error(`no inside centroid found for polygon, secloopcnt:${secloopcnt}`);
		}
	}

	//console.log("out secloopcnt:", secloopcnt);

	return test_pt;

}
