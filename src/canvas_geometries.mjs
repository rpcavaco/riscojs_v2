import {projectPointOnSegment, dist2D} from './geom.mjs';


function calcLabelOffset(p_tm, p_ang) {
	
	const h = p_tm.actualBoundingBoxAscent + p_tm.actualBoundingBoxDescent;
	const hh = h / 2.0;
	const hw = p_tm.width / 2.0;
	const lw = 2.0 * p_tm.width;
	const lh = 2.0 * h;

	const rectpts = [
		[-hw,-hh],
		[hw,-hh],
		[hw,hh],
		[-hw,hh]
	];

	const q = Math.PI / 4.0;
	let p1 = null;

	let d, dist = null, ang = 0;
	if (p_ang < 0) {
		ang = 2*Math.PI - p_ang;
	} else {
		ang = p_ang;
	}

	if (ang > 7 * q || ang <= q) {
		p1 = [lw, Math.tan(ang) * lw];
	} else if (ang > q && ang <= 3 * q) {
		p1 = [lh / Math.tan(ang), lh];
	} else if (ang > 3 * q && ang <= 5 * q) {
		p1 = [-lw, - Math.tan(ang) * lw];
	} else if (ang > 5 * q && ang <= 7 * q) {
		p1 = [- lh / Math.tan(ang), -lh];
	}

	const projpt = [];
	// let selpt = null;
	for (const pt of rectpts) {
		projectPointOnSegment([0,0], p1, pt, 0.01, projpt);
		d = dist2D([0,0], projpt);
		if (dist == null || d > dist) {
			dist = d;
		}
	}

	return dist;

}
export function thickTickedCircunference(p_ctx, p_center_list, p_exterior_rad, p_thickness, p_tick_cfg, b_tachostyle, b_labelticks) {

	let step;
	let minv = 0, maxv, divisor, unitdivision=10, unitticks=false, unitgroupcnt=0, lbltxt, delta, dy;

	if (p_tick_cfg != null && p_tick_cfg["min"] !== undefined) {
		minv = parseFloat(p_tick_cfg["min"]);
	}

	if (p_tick_cfg != null) {
		if (p_tick_cfg["max"] === undefined) {
			throw new Error("thickCircunference, tick config is missing mandatory 'max' value");
		}else {
			maxv = parseFloat(p_tick_cfg["max"]);
		}
	}

	if (p_tick_cfg != null) {
		if (p_tick_cfg["divisor"] === undefined) {
			throw new Error("thickCircunference, tick config is missing mandatory 'divisor' value");
		}else {
			divisor = parseInt(p_tick_cfg["divisor"]);
		}
	}

	if (p_tick_cfg != null && p_tick_cfg["unitdivision"] !== undefined) {
		unitdivision = parseInt(p_tick_cfg["unitdivision"]);
	}

	if (p_tick_cfg != null && p_tick_cfg["unitticks"] !== undefined) {
		unitticks = p_tick_cfg["unitticks"];
	}	

	if (p_tick_cfg != null && p_tick_cfg["unitgroupcnt"] !== undefined) {
		unitgroupcnt = parseInt(p_tick_cfg["unitgroupcnt"]);
	}	

	if (p_tick_cfg != null) {
		delta = unitdivision * (maxv - minv) / divisor;
	} else {
		delta = 100;
	}

	if (b_tachostyle) {
		step = (4 * Math.PI / 3.0) / delta;
	} else {
		step = (2 * Math.PI) / delta;
	}

	let r, xi, yi, xe, ye, ang, co, se, units, offs, txtrad, tm;
	for (let i = 0; i <= delta; i++) {
		
		if (b_tachostyle) {
			ang = (i * step) + (Math.PI * 5 / 6.0);
		} else {
			ang = i * step;
		}

		r = p_exterior_rad - p_thickness;

		co = Math.cos(ang);
		se = Math.sin(ang);

		xi = p_center_list[0] + co * r;
		yi = p_center_list[1] + se * r;

		r = p_exterior_rad;

		txtrad = null;
		tm = null;
		if (unitticks) {
			if (i % unitdivision == 0) {

				if (i == delta) {
			
					lbltxt = "x" + divisor.toString();
					tm = p_ctx.measureText(lbltxt);
					offs = calcLabelOffset(tm, ang);

				} else {

					units = i / unitdivision;

					if (b_labelticks && (unitgroupcnt == 0 || units % unitgroupcnt == 0)) {
						lbltxt = units.toString();
						tm = p_ctx.measureText(lbltxt);
						offs = calcLabelOffset(tm, ang);
					} else {
						offs = 0;
					}
				}
					
				if (units % unitgroupcnt == 0) {
					r = p_exterior_rad + (p_thickness/3.0);
				} else {
					r = p_exterior_rad + (p_thickness/5.0);
				}
		
				if (offs > 0) {
					txtrad = r + offs;
				}
			}
		}

		xe = p_center_list[0] + co * r;
		ye = p_center_list[1] + se * r;

		p_ctx.beginPath();
		p_ctx.moveTo(xi, yi);
		p_ctx.lineTo(xe, ye);
		p_ctx.stroke();

		if (txtrad) {

			xe = p_center_list[0] + co * txtrad;
			ye = p_center_list[1] + se * txtrad;

			if (tm) {
				dy = tm.actualBoundingBoxAscent / 2.0;
			} else {
				dy = 0;
			}

			p_ctx.fillText(lbltxt, xe, ye + dy);
		}

		
	}

}