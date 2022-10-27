

class LogicOperation {

	constructor(p_fname, p_value, p_op, opt_prevop) {
		this.fieldName = p_fname;
		this.fieldValue = p_value;
		this.prevOperator = opt_prevop;
		this.operator = p_op;
	}
}

class WhereClause {
	constructor() {
		this.ops = []; // list of LogicOperation
	}
	addOp(p_fname, p_value, p_op, opt_prevop) {
		this.ops.append(new LogicOperation(p_fname, p_value, p_op, opt_prevop))
	}
}

class Symbol {
	greaterOrEqualScale = Number.MAX_SAFE_INTEGER; // limit above the current scale
	constructor() {
		this.whereClause = new WhereClause();
	}
		
}

const strokeSymbolMixin = (Base) => class extends Base {
	strokeStyle;
	lineWidth;	
}

const fillSymbolMixin = (Base) => class extends Base {
	fillStyle;
}

export class CanvasLineSymbol extends strokeSymbolMixin(Symbol) { 
	constructor() {
		super();
	}
}

export class CanvasPolygonSymbol extends fillSymbolMixin(strokeSymbolMixin(Symbol)) { 
	constructor() {
		super();
	}
}

class MarkerSymbol extends Symbol {
	mrksize; 
	constructor() {
		super();
	}
	drawsymb(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, p_path_levels, opt_feat_id) {
		// asbtract, to be implemented by subclasses
	}
}

export class CanvasVertCross extends strokeSymbolMixin(MarkerSymbol) { 

	constructor() {
		super();
	}
	drawsymb(p_mapctxt, p_layer, p_terrain_env, p_scr_env, p_dims, p_coords, p_attrs, opt_feat_id) {

		const sclval = p_mapctxt.getScale();
		const dim = this.mrksize * (10.0 / Math.log10(sclval));

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
		