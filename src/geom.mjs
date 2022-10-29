
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

	var p1, p2, dist2, mindist=9999999, tmppt=[];
	out_projpt.length = 2;

	for (var i=0; i<(p_pointlst.length-2); i+=2 ) {
		p1 = [p_pointlst[i], p_pointlst[i+1]];
		p2 = [p_pointlst[i+2], p_pointlst[i+3]];
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

function distanceToLine(p_pointlist, p_path_levels, p_ptin, opt_debug) {
	var d, ret = 0, prj=[], prjd=0;
		
	switch (p_path_levels) {
		case 1:
			projectPointOnLine(p_pointlist, p_ptin, prj);
			ret = dist2D(p_ptin, prj);
			break;
		
		case 2:
			for (var i=0; i<p_pointlist.length; i++) {
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
			for (var j=0; j<p_pointlist.length; j++) 
			{
				for (var i=0; i<p_pointlist[j].length; i++) 
				{
					projectPointOnLine(p_pointlist[i], p_ptin, prj);
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

	var ret = false;
	
	function insideTest(pp_pointlist, pp_ptin) {
		
		var inner_ret = false;
		var n = pp_pointlist.length / 2;
		var j = n - 1;
		var p1, p2, iI, iJ;
		
		for (var i=0; i<n; i++) 
		{
			iI = 2*i;
			iJ = 2*j;
			p1 = [pp_pointlist[iI], pp_pointlist[iI+1]];
			p2 = [pp_pointlist[iJ], pp_pointlist[iJ+1]];
			if (
				pp_pointlist[iJ+1] <= pp_ptin[1] && pp_ptin[1] < pp_pointlist[iI+1] &&
				area2_3p(p1, p2, pp_ptin) > 0 ||
				pp_pointlist[iI+1] <= pp_ptin[1] && pp_ptin[1] < pp_pointlist[iJ+1] &&
				area2_3p(p2, p1, pp_ptin) > 0
			) 
			{
				inner_ret = !inner_ret;
			}
			j = i;
		}
		return inner_ret;
	}

	switch (p_path_levels) {
		
		case 1:
			ret = insideTest(p_pointlist, p_ptin);
			break;
		
		case 2:
			for (var i=0; i<p_pointlist.length; i++) 
			{
				if (insideTest(p_pointlist[i], p_ptin)) {
					ret = true;
					break;
				}
			}
			break;
		
		case 3:
			for (var i=0; i<p_pointlist.length; i++) 
			{
				for (var j=0; j<p_pointlist[i].length; j++) 
				{
					if (insideTest(p_pointlist[i][j], p_ptin)) {
						ret = true;
						break;
					}
				}
				if (ret) {
					break;
				}
			}
	}

	return ret;
}

export function distanceToPoly(p_pointlist, p_path_levels, p_ptin, opt_debug) {
	
	let ret = 0.0;
	
	if (!insidePolygon(p_pointlist, p_path_levels, p_ptin) ) {
		ret = distanceToLine(p_pointlist, p_path_levels, p_ptin, opt_debug);
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