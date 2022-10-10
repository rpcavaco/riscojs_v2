
class BaseTool {

	constructor(p_joinstogglegroup) {
		this.enabled = true;
		this.joinstogglegroup = p_joinstogglegroup;
	}

	onEvent(p_mapctx, p_evt) {
		// Abstract
	}

}


class DefaultTool extends BaseTool {

	constructor() {
		super(false);
	}

	onEvent(p_mapctx, p_evt) {
		if (p_evt.type == 'mousemove') {
			console.log("mousemove:", p_evt);
		}
	}	
}


export class ToolManager {

	constructor() {
		this.maptools = [new DefaultTool()];
	}

	addTool(p_toolinstance) {
		if (p_toolinstance == null) {
			throw new Error("Class ToolManager, addTool, null tool instance passed");
		}	

		const existing_classnames = [], classname = p_toolinstance.constructor.name;
		if (!(p_toolinstance instanceof BaseTool)) {
			throw new Error(`Class ToolManager, addTool, tool is not a BaseTool instance: ${classname}`);
		}		

		for (let i=0; i<this.maptools.length; i++) {
			if (existing_classnames.indexOf(this.maptools[i].constructor.name) >= 0) {
				throw new Error(`Class ToolManager, addTool, found duplicate tool instance of: ${this.maptools[i].constructor.name}`);
			}
			existing_classnames.push(this.maptools[i].constructor.name); 
		}	
		
		if (existing_classnames.indexOf(p_toolinstance.constructor.name) < 0) { 
			this.maptools.push(p_toolinstance);
		} else {
			console.warn(`Class ToolManager, addTool, foiled attempt to add duplicate instance of: ${p_toolinstance.constructor.name}`);
		}	
	}

	_findTool(p_classname) {
		let foundtool = null;
		for (let i=0; i<this.maptools.length; i++) {
			if (this.maptools[i].constructor.name == p_classname) {
				foundtool = this.maptools[i];
			}
		}	
		if (foundtool == null) {
			throw new Error(`Class ToolManager, no instance of '${p_classname}' was found.`);
		}
		return foundtool;	
	}

	enableTool(p_classname) {

		let foundtool = this._findTool(p_classname);

		if (!foundtool.joinstogglegroup) {
			foundtool.enabled = true;
		} else {
			for (let j=0; j<this.maptools.length; j++) {
				if (!this.maptools[j].joinstogglegroup) {
					continue;
				}
				this.maptools[j].enabled = false;
			}	
			foundtool.enabled = true;		
		}
	}

	onEvent(p_mapctx, p_evt) {

		let _ret, ret = true;
		
		for (let i=0; i<this.maptools.length; i++) {
			if (this.maptools[i].enabled) {
				_ret = this.maptools[i].onEvent(p_mapctx, p_evt);
				if (this.maptools[i].joinstogglegroup) {
					ret = _ret;
				}
			}
		}

		// stopPropagation - onlye tools from toggle group is checked for return value 
		return ret;
	}
	

	


}