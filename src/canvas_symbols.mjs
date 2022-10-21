

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


		