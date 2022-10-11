

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

export class CanvasStrokeSymbol {
	strokeStyle;
	lineWidth;	
	constructor() {
		this.whereClause = new WhereClause();
	}
		
}


		