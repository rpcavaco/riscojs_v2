import {GlobalConst} from './constants.js';


export class GrSymbol {

	greaterOrEqualScale = Number.MAX_SAFE_INTEGER; // limit above the current scale
	func = "none";
	key = "default";
	#toStroke = false;
	#toFill = false;
	globalAlpha = "none";
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

		this.#toStroke = false;

		if (this.labelFillStyle !== undefined && this.labelFillStyle.toLowerCase() !== "none") {
			this.#toFill = true
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
	strokeStyle;
	lineWidth;	
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
}

const fillSymbolMixin = (Base) => class extends Base {
	fillStyle;
}

export class CanvasLineSymbol extends labelSymbolMixin(strokeSymbolMixin(GrSymbol)) { 
	
	symbname;
	constructor(opt_variablesymb_idx) {
		super();
		if (opt_variablesymb_idx != null) {
			this._variablesymb_idx = opt_variablesymb_idx;
		} else {
			this._variablesymb_idx = -1;
		}
		this.symbname = "Line";
	}
	get variablesymb_idx() {
		return this._variablesymb_idx;
	}

	drawfreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

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
	
	symbname;
	constructor(opt_variablesymb_idx) {
		super();
		if (opt_variablesymb_idx != null) {
			this._variablesymb_idx = opt_variablesymb_idx;
		} else {
			this._variablesymb_idx = -1;
		}
		this.symbname = "Polygon";
	}
	get variablesymb_idx() {
		return this._variablesymb_idx;
	}	

	drawfreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

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
	markersize; 
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
	drawsymb(p_mapctxt, p_layer, p_coords, p_iconname, opt_feat_id) {
		// asbtract, to be implemented by subclasses
	}
}

export class CanvasVertCross extends strokeSymbolMixin(MarkerSymbol) { 

	symbname;
	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.symbname = "VertCross";
	}
	drawsymb(p_mapctxt, p_layer, p_coords, p_iconname, opt_feat_id) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval);

		p_layer._gfctx.beginPath();

		// horiz
		p_layer._gfctx.moveTo(p_coords[0] - dim, p_coords[1]);
		p_layer._gfctx.lineTo(p_coords[0] + dim, p_coords[1]);
		p_layer._gfctx.stroke();

		p_layer._gfctx.beginPath();

		// vert
		p_layer._gfctx.moveTo(p_coords[0], p_coords[1] - dim);
		p_layer._gfctx.lineTo(p_coords[0], p_coords[1] + dim);
		p_layer._gfctx.stroke();

	}
}

export class CanvasCircle extends fillSymbolMixin(strokeSymbolMixin(MarkerSymbol)) { 

	symbname;
	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.symbname = "Circle";
	}
	drawsymb(p_mapctxt, p_layer, p_coords, p_iconname, opt_feat_id) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval));

		p_layer._gfctx.beginPath();
		p_layer._gfctx.arc(p_coords[0], p_coords[1], dim, 0, Math.PI * 2, true);

		
		if (this["fillStyle"] !== undefined && this["fillStyle"].toLowerCase() !== "none") {
			p_layer._gfctx.fill();
		}

		if (this["strokeStyle"] !== undefined && this["strokeStyle"].toLowerCase() !== "none") {
			p_layer._gfctx.stroke();
		}

	}

	drawfreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

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

	symbname;
	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.symbname = "Diamond";
	}
	drawsymb(p_mapctxt, p_layer, p_coords, p_iconname, opt_feat_id) {

		const sclval = p_mapctxt.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval));

		p_layer._gfctx.beginPath();

		p_layer._gfctx.moveTo(p_coords[0]-dim, p_coords[1]);
		p_layer._gfctx.lineTo(p_coords[0], p_coords[1]+dim);
		p_layer._gfctx.lineTo(p_coords[0]+dim, p_coords[1]);
		p_layer._gfctx.lineTo(p_coords[0], p_coords[1]-dim);
		p_layer._gfctx.closePath();

		if (this["fillStyle"] !== undefined) {
			p_layer._gfctx.fill();
		}

		p_layer._gfctx.stroke();

	}
}
		
export class CanvasIcon extends fillSymbolMixin(strokeSymbolMixin(MarkerSymbol)) { 

	symbname;
	constructor(opt_variablesymb_idx) {
		super(opt_variablesymb_idx);
		this.symbname = "Icon";
	}
	async drawsymb(p_mapctxt, p_layer, p_coords, p_iconname, opt_feat_id) {

		const sclval = p_mapctxt.getScale();
		const dim = Math.round(this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval)));

		const img = await p_mapctxt.imgbuffer.syncFetchImage(p_layer.iconsrcfunc(p_iconname), p_iconname)

		const r = img.width / img.height;
		let w, h;
		if (r > 1) {
			h = dim;
			w = h * r;
		} else {
			w = dim;
			h = w / r;
		}

		p_layer._gfctx.drawImage(img, p_coords[0]-(w/2), p_coords[1]-(h/2), w, h);

	}

	async drawfreeSymb(p_mapctx, p_ctx, p_symbcenter, p_vert_step, p_lyr) {

		const sclval = p_mapctx.getScale();
		const dim = this.markersize * (GlobalConst.MARKERSIZE_SCALEFACTOR / Math.log10(sclval));

		const r0 = Math.min(dim, 2.0*p_vert_step/3.0);

		const img = await p_mapctx.imgbuffer.syncFetchImage(p_lyr.iconsrcfunc(p_lyr.icondefsymb), p_lyr.icondefsymb);

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
	}
}