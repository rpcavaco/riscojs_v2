

export function thickCircunference(p_ctx, p_center_list, p_exterior_rad, p_thickness, p_tick_divsion, b_tachostyle) {

	let step;

	if (b_tachostyle) {
		step = (4/3.0) * Math.PI / p_tick_divsion;
	} else {
		step = 2 * Math.PI / p_tick_divsion;
	}

	for (let r, xi, yi, xe, ye, ang, co, se, i = 0; i < p_tick_divsion; i++) {
		
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

		xe = p_center_list[0] + co * r;
		ye = p_center_list[1] + se * r;

		p_ctx.beginPath();
		p_ctx.moveTo(xi, yi);
		p_ctx.lineTo(xe, ye);
		p_ctx.stroke();

		
	}

}