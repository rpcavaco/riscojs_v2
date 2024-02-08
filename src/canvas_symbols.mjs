import {GlobalConst} from './constants.js';


export class GrSymbol {

	greaterOrEqualScale = Number.MAX_SAFE_INTEGER; // limit above the current scale
	func = "none";
	change = "none";
	key = "default";
	#toStroke = false;
	#toFill = false;
	globalAlpha = "none";
	skipconfigs = [];
	dimsinpix = false; // dimensions in pixels
	vsgroup = "none";

	/* constructor() {
		this.whereClause = new WhereClause();
	} */

	get toStroke() {
		return this.#toStroke;
	}

	get toFill() {
		return this.#toFill;
	}	

	setStyle(p_ctx) {

		if (this.strokeStyle !== undefined && this.strokeStyle.toLowerCase() !== "none") {
			this.#toStroke = true
			p_ctx.strokeStyle = this.strokeStyle;
		}

		if (this.lineWidth !== undefined) {
			p_ctx.lineWidth = this.lineWidth;
		}	

		if (this.lineDash !== undefined && this.lineDash.length > 0) {
			p_ctx.setLineDash(this.lineDash);
		}	

		if (this.fillStyle !== undefined && this.fillStyle.toLowerCase() !== "none") {
			this.#toFill = true
			p_ctx.fillStyle = this.fillStyle;
		}

		if (this.globalAlpha !== undefined) {
			if (this.globalAlpha !== "none") {
				p_ctx.globalAlpha = this.globalAlpha;
			}
		}
	}

	setLabelStyle(p_ctx) {

		if (this.labelStrokeStyle !== undefined && this.labelStrokeStyle.toLowerCase() !== "none") {
			p_ctx.strokeStyle = this.labelStrokeStyle;
		}

		if (this.labelFillStyle !== undefined && this.labelFillStyle.toLowerCase() !== "none") {
			p_ctx.fillStyle = this.labelFillStyle;
		}	

		let fontface='Helvetica', fntsz = 14;
		if (this.labelFontSizePX !== undefined) {   
			fntsz = this.labelFontSizePX;
		}

		if (this.labelFontFace !== undefined) {
			fontface = this.labelFontFace;
		}			

		p_ctx.font = `${fntsz}px ${fontface}`;			
	}	

}

const strokeSymbolMixin = (Base) => class extends Base {

	strokeStyle = "none";
	lineWidth = "none";	
	lineDash = [];

}

const labelSymbolMixin = (Base) => class extends Base {
	
	labelplacement = "centroid";
	labelFillStyle = "white";
	labelFontFace = "Helvetica"
	labelFontSizePX = 14;
	labelMaskFillStyle = "#808080a0";
	labelTextAlign = "center";	
	labelTextBaseline = "middle";	
	labelRotation = "none";	
	labelextend = "none "; // "meas-inner-offset:length-outer-offset:symbol-name-or-none"
	
	labelLeaderLength = "none";
	labelLeaderStroke = "none";
	labelLeaderLinewidth = "none";	
	labelLeaderRotation = "none";	

	labelPositionShift = [];

	labelShadowColor = "none";
	labelShadowBlur = "none";
	labelShadowOffsetX = "none";
	labelShadowOffsetY = "none";			

}

const fillSymbolMixin = (Base) => class extends Base {
	
	fillStyle = "none";

	shadowColor = "none";
	shadowBlur = "none";
	shadowOffsetX = "none";
	shadowOffsetY = "none";	

	globalAlpha = "none";

	setStyle(p_ctx) {

		super.setStyle(p_ctx);

		for (let attr of ["shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY"]) {
			if (this[attr].toString().toLowerCase() != "none") {
				p_ctx[attr] = this[attr];
			}
		}

	}	
}

export class CanvasLineSymbol extends labelSymbolMixin(strokeSymbolMixin(GrSymbol)) { 
	
	constructor(opt_variablesymb_idx) {
		super();
		if (opt_variablesymb_idx != null) {
			this._variablesymb_idx = opt_variablesymb_idx;
		} else {
			this._variablesymb_idx = -1;
		}
	}
	get variablesymb_idx() {
		return this._variablesymb_idx;
	}

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		let hw = 10;
		let x = p_symbcenter[0] - hw;
		let w = 2 * hw;

		let h = p_vert_step / 3;
		let y = p_symbcenter[1] - (h/2);

		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_ctx.beginPath();
			p_ctx.moveTo(x, y+h);
			p_ctx.lineTo(x+0.25*w, y);
			p_ctx.lineTo(x+0.75*w, y+h);
			p_ctx.lineTo(x+w, y);
			p_ctx.stroke();
		}
	}	
}

export class CanvasPolygonSymbol extends labelSymbolMixin(fillSymbolMixin(strokeSymbolMixin(GrSymbol))) { 
	
	constructor(opt_variablesymb_idx) {
		super();
		if (opt_variablesymb_idx != null) {
			this._variablesymb_idx = opt_variablesymb_idx;
		} else {
			this._variablesymb_idx = -1;
		}
	}
	get variablesymb_idx() {
		return this._variablesymb_idx;
	}	

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		let hw = 10;
		let x = p_symbcenter[0] - hw;
		let w = 2 * hw;

		let h = p_vert_step / 3;
		let y = p_symbcenter[1] - (h/2);

		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_ctx.fillRect(x, y, w, h);
		}
		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_ctx.strokeRect(x, y, w, h);
		}
	}

}

class MarkerSymbol extends labelSymbolMixin(GrSymbol) {
	markersize = 1; 
	position_shift = [];
	iconmarkervalue = "none";
	_variablesymb_idx;
	constructor(opt_variablesymb_idx) {
		super();
		if (opt_variablesymb_idx != null) {
			this._variablesymb_idx = opt_variablesymb_idx;
		} else {
			this._variablesymb_idx = -1;
		}
	}
	get variablesymb_idx() {
		return this._variablesymb_idx;
	}	
	drawsymb(p_mapctxt, p_layer, p_coords) {
		console.trace("MarkerSymbol: calling abstract 'drawsymb'");
		// asbtract, to be implemented by subclasses
	}
	

}

export class CanvasVertCross extends strokeSymbolMixin(MarkerSymbol) { 

	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "vertcross";
	}

	drawSimpleSymb(p_ctx, p_coords, opt_dim) {

		let dim;
		
		if (opt_dim) {
			dim = opt_dim;
		} else {
			dim = this.markersize;
		}

		let cx, cy;
		if (this.position_shift.length >= 2) {
			cx = this.position_shift[0] + p_coords[0];
			cy = this.position_shift[1] + p_coords[1];
		} else {
			cx = p_coords[0];
			cy = p_coords[1];
		}

		p_ctx.beginPath();

		// horiz
		p_ctx.moveTo(cx - dim, cy);
		p_ctx.lineTo(cx + dim, cy);
		p_ctx.stroke();

		p_ctx.beginPath();

		// vert
		p_ctx.moveTo(cx, cy - dim);
		p_ctx.lineTo(cx, cy + dim);
		p_ctx.stroke();

	}

	drawsymb(p_mapctxt, p_layer, p_coords) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval) * 0.5;

		this.drawSimpleSymb(p_layer._gfctx, p_coords, dim);

	}

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval) * 0.5;

		this.drawSimpleSymb(p_ctx, p_symbcenter, dim);

	}
}

export class CanvasStar extends strokeSymbolMixin(MarkerSymbol) { 

	points = 4;
	rotation_degrees = 0;
	thickness = 0;
	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "star";
	}

	drawSimpleSymb(p_ctx, p_coords, opt_dim) {

		let exterior_radius;
		
		if (opt_dim) {
			exterior_radius = opt_dim;
		} else {
			exterior_radius = this.markersize;
		}

		let cx, cy;
		if (this.position_shift.length >= 2) {
			cx = this.position_shift[0] + p_coords[0];
			cy = this.position_shift[1] + p_coords[1];
		} else {
			cx = p_coords[0];
			cy = p_coords[1];
		}

		let ang, co,se, xi, yi, xe, ye, r;
		const step = (2 * Math.PI) / this.points;

		for (let stepi = 0; stepi < this.points; stepi++) {

			ang = (stepi * step) + ((this.rotation_degrees * Math.PI) / 180.0) ;

			co = Math.cos(ang);
			se = Math.sin(ang);

			r = exterior_radius - this.thickness;
	
			xi = cx + co * r;
			yi = cy + se * r;

			r = exterior_radius;

			xe = cx + co * r;
			ye = cy + se * r;

			p_ctx.beginPath();
			p_ctx.moveTo(xi, yi);
			p_ctx.lineTo(xe, ye);
			p_ctx.stroke();			
		}

	}

	drawsymb(p_mapctxt, p_layer, p_coords) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval);

		this.drawSimpleSymb(p_layer._gfctx, p_coords), dim;

	}
}

export class CanvasRegPolygon extends fillSymbolMixin(MarkerSymbol) { 

	points = 3;
	rotation_degrees = 0;
	thickness = 0;
	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "polysymb";
	}

	drawSimpleSymb(p_ctx, p_coords, opt_dim) {

		let exterior_radius;
		
		if (opt_dim) {
			exterior_radius = opt_dim;
		} else {
			exterior_radius = this.markersize;
		}

		let cx, cy;
		if (this.position_shift.length >= 2) {
			cx = this.position_shift[0] + p_coords[0];
			cy = this.position_shift[1] + p_coords[1];
		} else {
			cx = p_coords[0];
			cy = p_coords[1];
		}

		let ang, co,se, xe, ye, r, first=true;
		const step = (2 * Math.PI) / this.points;

		for (let stepi = 0; stepi < this.points; stepi++) {

			ang = (stepi * step) + ((this.rotation_degrees * Math.PI) / 180.0) ;

			co = Math.cos(ang);
			se = Math.sin(ang);

			r = exterior_radius;

			xe = cx + co * r;
			ye = cy + se * r;

			if (first) {
				p_ctx.beginPath();
				p_ctx.moveTo(xe, ye);
			} else {
				p_ctx.lineTo(xe, ye);
			}
			
			first = false;
		}

		if (!first) {
			p_ctx.fill();		
			p_ctx.stroke();			
		}

	}

	drawsymb(p_mapctxt, p_layer, p_coords) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval) * 0.5;

		this.drawSimpleSymb(p_layer._gfctx, p_coords, dim);

	}

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval) * 0.5;

		this.drawSimpleSymb(p_ctx, p_symbcenter, dim);

	}
}

export class CanvasCircle extends fillSymbolMixin(strokeSymbolMixin(MarkerSymbol)) { 

	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "circle";
	}

	drawSimpleSymb(p_ctx, p_coords, opt_dim) {

		let dim;
		if (opt_dim) {
			dim = opt_dim;
		} else {
			dim = this.markersize;
		}

		let cx, cy;
		if (this.position_shift.length >= 2) {
			cx = this.position_shift[0] + p_coords[0];
			cy = this.position_shift[1] + p_coords[1];
		} else {
			cx = p_coords[0];
			cy = p_coords[1];
		}

		p_ctx.beginPath();
		p_ctx.arc(cx, cy, dim, 0, Math.PI * 2, true);

		
		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_ctx.fill();
		}

		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_ctx.stroke();
		}

	}

	drawsymb(p_mapctxt, p_layer, p_coords) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval)) * 0.5;

		this.drawSimpleSymb(p_layer._gfctx, p_coords, dim);
	}

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval));

		const r = Math.min(dim, p_vert_step/4.0);

		p_ctx.beginPath();
		p_ctx.arc(p_symbcenter[0], p_symbcenter[1], r, 0, Math.PI * 2, true);

		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_ctx.fill();
		}
		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_ctx.stroke();
		}
	}
}

export class CanvasConcentricCircles extends fillSymbolMixin(strokeSymbolMixin(MarkerSymbol)) { 

	radiuses;
	skipconfigs = ['markersize'];

	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "conc_circles";
	}

	drawsymb(p_mapctxt, p_layer, p_coords) {

		let sclval = p_mapctxt.getScale();
		let dim, cx, cy;

		for (let ri=0; ri<this.radiuses.length; ri++) {

			if (this.dimsinpix) {
				dim = this.radiuses[ri];
			} else {
				sclval = p_mapctxt.getScale();
				dim = this.radiuses[ri] * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval));
			}

			if (this.position_shift.length >= 2) {
				cx = this.position_shift[0] + p_coords[0];
				cy = this.position_shift[1] + p_coords[1];
			} else {
				cx = p_coords[0];
				cy = p_coords[1];
			}
	
			p_layer._gfctx.beginPath();
			p_layer._gfctx.arc(cx, cy, dim, 0, Math.PI * 2, true);
	
			
			if (ri==0 && this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
				p_layer._gfctx.fill();
			}
	
			if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
				p_layer._gfctx.stroke();
			}

		}

	}

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval));

		const r = Math.min(dim, p_vert_step/4.0);

		p_ctx.beginPath();
		p_ctx.arc(p_symbcenter[0], p_symbcenter[1], r, 0, Math.PI * 2, true);

		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_ctx.fill();
		}
		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_ctx.stroke();
		}
	}
}

export class CanvasDiamond extends fillSymbolMixin(strokeSymbolMixin(MarkerSymbol)) { 

	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "diamond";
	}
	drawsymb(p_mapctxt, p_layer, p_coords) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval)) * 0.5;

		let cx, cy;
		if (this.position_shift.length >= 2) {
			cx = this.position_shift[0] + p_coords[0];
			cy = this.position_shift[1] + p_coords[1];
		} else {
			cx = p_coords[0];
			cy = p_coords[1];
		}

		p_layer._gfctx.beginPath();

		p_layer._gfctx.moveTo(cx-dim, cy);
		p_layer._gfctx.lineTo(cx, cy+dim);
		p_layer._gfctx.lineTo(cx+dim, cy);
		p_layer._gfctx.lineTo(cx, cy-dim);
		p_layer._gfctx.closePath();

		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_layer._gfctx.fill();
		}
		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_layer._gfctx.stroke();
		}

	}

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval)) * 0.5;

		p_ctx.beginPath();

		p_ctx.moveTo(p_symbcenter[0]-dim, p_symbcenter[1]);
		p_ctx.lineTo(p_symbcenter[0], p_symbcenter[1]+dim);
		p_ctx.lineTo(p_symbcenter[0]+dim, p_symbcenter[1]);
		p_ctx.lineTo(p_symbcenter[0], p_symbcenter[1]-dim);
		p_ctx.closePath();

		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_ctx.fill();
		}
		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_ctx.stroke();
		}

	}
}

export class CanvasSquare extends fillSymbolMixin(strokeSymbolMixin(MarkerSymbol)) { 

	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "square";
	}

	drawsymb(p_mapctxt, p_layer, p_coords) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval)) * 0.5;

		// console.log("SQ draw", p_layer.key, "fid:", opt_feat_id);


		let cx, cy;
		if (this.position_shift.length >= 2) {
			cx = this.position_shift[0] + p_coords[0];
			cy = this.position_shift[1] + p_coords[1];
		} else {
			cx = p_coords[0];
			cy = p_coords[1];
		}

		p_layer._gfctx.beginPath();

		p_layer._gfctx.moveTo(cx-dim, cy-dim);
		p_layer._gfctx.lineTo(cx+dim, cy-dim);
		p_layer._gfctx.lineTo(cx+dim, cy+dim);
		p_layer._gfctx.lineTo(cx-dim, cy+dim);
		p_layer._gfctx.closePath();

		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_layer._gfctx.fill();
		}
		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_layer._gfctx.stroke();
		}

	}

	drawFreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval)) * 0.5;

		p_ctx.beginPath();
		p_ctx.moveTo(p_symbcenter[0]-dim, p_symbcenter[1]-dim);
		p_ctx.lineTo(p_symbcenter[0]+dim, p_symbcenter[1]-dim);
		p_ctx.lineTo(p_symbcenter[0]+dim, p_symbcenter[1]+dim);
		p_ctx.lineTo(p_symbcenter[0]-dim, p_symbcenter[1]+dim);
		p_ctx.closePath();

		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_ctx.fill();
		}
		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_ctx.stroke();
		}
	}	
}
		
export class CanvasIcon extends MarkerSymbol { 

	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.marker = "icon";
	}

	drawSimpleSymbAsync(p_ctx, p_imgbuffer, p_coords, p_imgnamekey, p_imgurl, opt_dim) {

		let dim;
		if (opt_dim) {
			dim = opt_dim;
		} else {
			dim = this.markersize;
		}

		let prom, isfresult;
		if (p_imgurl.slice(0,5) == "data:") {

			prom = new Promise((resolve, reject) => {

				const img = new Image();
				img.crossOrigin = "anonymous";
				img.decoding = "async";
				img.src = p_imgurl;

				img
				.decode()
				.then(() => {
					if (img.complete) {

						const r = img.width / img.height;
						let w, h;
						if (r > 1.5) {
							w = 1.5 * dim;
							h = w / r;
						} else if (r > 1) { 
							h = dim;
							w = h * r;
						} else if (r < 0.67) { 
							h = 1.5 * dim;
							w = h * r;
						} else {
							w = dim;
							h = w / r;
						}

						p_ctx.drawImage(img, p_coords[0]-(w/2), p_coords[1]-(h/2), w, h);
		
						resolve();
					} else {
						reject(new Error(`[WARN] drawsymbAsync: img NOT complete.`));
					}
				})
				.catch((e) => {
					reject(new Error(`[WARN] drawsymbAsync error '${e}'.`));
				});
			});
			
		} else {
			prom = new Promise((resolve, reject) =>  {

				function fetchimg(img) {
	
						const r = img.width / img.height;
						let w, h;
						if (r > 1.5) {
							w = 1.5 * dim;
							h = w / r;
						} else if (r > 1) { 
							h = dim;
							w = h * r;
						} else if (r < 0.67) { 
							h = 1.5 * dim;
							w = h * r;
						} else {
							w = dim;
							h = w / r;
						}
						//console.log("    >>> drawimage", p_layer.key, opt_feat_id, p_layer._gfctx == null, img);
						p_ctx.drawImage(img, p_coords[0]-(w/2), p_coords[1]-(h/2), w, h);
						//console.log("    <<< drawimage end", p_layer.key, opt_feat_id);
	
						resolve();
				
				};

				if (this.iconmarkervalue !== undefined && this.iconmarkervalue != 'none') {
					p_imgbuffer.asyncFetchImage([p_imgnamekey, p_imgurl]).then(fetchimg).catch(reject);
				} else {
					p_imgbuffer.asyncFetchImage([p_imgnamekey, p_imgurl]).then(fetchimg).catch(reject);
				}

			});
		}



		return prom;
	}

	drawsymbAsync(p_mapctxt, p_layer, p_coords, p_args, b_from_dataurl) {

		const sclval = p_mapctxt.getScale();
		const dim = Math.round(this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval)));

		let prom, isfresult;

		if (b_from_dataurl) {

			prom = new Promise((resolve, reject) => {

				if (this.iconmarkervalue !== undefined && this.iconmarkervalue != 'none') {
					isfresult = this.iconsrcfunc(this.iconmarkervalue);
				} else {
					isfresult = this.iconsrcfunc(p_args);
				}

				const [ _, imgurl] = isfresult;
		
				const img = new Image();
				img.crossOrigin = "anonymous";
				img.decoding = "async";
				img.src = imgurl;

				img
				.decode()
				.then(() => {
					if (img.complete) {

						const r = img.width / img.height;
						let w, h;
						if (r > 1.5) {
							w = 1.5 * dim;
							h = w / r;
						} else if (r > 1) { 
							h = dim;
							w = h * r;
						} else if (r < 0.67) { 
							h = 1.5 * dim;
							w = h * r;
						} else {
							w = dim;
							h = w / r;
						}

						p_layer._gfctx.drawImage(img, p_coords[0]-(w/2), p_coords[1]-(h/2), w, h);
		
						resolve();
					} else {
						reject(new Error(`[WARN] drawsymbAsync: img for feat ${p_args} NOT complete.`));
					}
				})
				.catch((e) => {
					reject(new Error(`[WARN] drawsymbAsync for feat '${p_args}': error '${e}'.`));
				});
			});
			
		} else {
			prom = new Promise((resolve, reject) =>  {

				function fetchimg(img) {
	
						const r = img.width / img.height;
						let w, h;
						if (r > 1.5) {
							w = 1.5 * dim;
							h = w / r;
						} else if (r > 1) { 
							h = dim;
							w = h * r;
						} else if (r < 0.67) { 
							h = 1.5 * dim;
							w = h * r;
						} else {
							w = dim;
							h = w / r;
						}
						//console.log("    >>> drawimage", p_layer.key, opt_feat_id, p_layer._gfctx == null, img);
						p_layer._gfctx.drawImage(img, p_coords[0]-(w/2), p_coords[1]-(h/2), w, h);
						//console.log("    <<< drawimage end", p_layer.key, opt_feat_id);
	
						resolve();
				
				};

				if (this.iconmarkervalue !== undefined && this.iconmarkervalue != 'none') {
					p_mapctxt.imgbuffer.asyncFetchImage(p_layer.iconsrcfunc(this.iconmarkervalue)).then(fetchimg).catch(reject);
				} else {
					p_mapctxt.imgbuffer.asyncFetchImage(p_layer.iconsrcfunc(p_args)).then(fetchimg).catch(reject);
				}

			});
		}



		return prom;

	}	

	drawfreeSymbAsync(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval));

		const r0 = Math.min(dim, p_vert_step);

		return new Promise((resolve, reject) =>  {

			function fetchimg(img) {
				const r = img.width / img.height;
				let w, h;
				if (r > 1) {
					h = r0;
					w = h * r;
				} else {
					w = r0;
					h = w / r;
				}
	
				p_ctx.drawImage(img, p_symbcenter[0]-(w/2), p_symbcenter[1]-(h/2), w, h);	
				
				resolve();
	
			}

			if (this.iconmarkervalue !== undefined && this.iconmarkervalue != 'none') {
				p_mapctx.imgbuffer.asyncFetchImage(p_lyr.iconsrcfunc(this.iconmarkervalue)).then(fetchimg).catch(reject);
			} else {

				if (p_lyr.icondefsymb == null || p_lyr.icondefsymb == "none") {
					reject(`layer '${p_lyr.key}' has no 'icondefsymb' configuration`);
				}
		
				p_mapctx.imgbuffer.asyncFetchImage(p_lyr.iconsrcfunc(p_lyr.icondefsymb)).then(fetchimg).catch(reject);
			}



		});
	}
}