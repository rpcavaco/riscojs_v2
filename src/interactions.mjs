
export class BaseTool {

	enabled = true;
	constructor(p_joinstogglegroup, opt_defaultintoggle) {
		this.joinstogglegroup = p_joinstogglegroup;
		if (this.joinstogglegroup) {
			if (opt_defaultintoggle == null) {
				this.defaultintoggle = false;
			} else {
				this.defaultintoggle = opt_defaultintoggle;
			}
		} else {
			this.defaultintoggle = false;
		}
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
			p_mapctx.printMouseCoords(p_evt.clientX, p_evt.clientY);
		}
		if (p_evt.type == 'mouseout' || p_evt.type == "mouseleave") {
			p_mapctx.removeMouseCoords();
		}
		
	}	
}

// pan, zoom wheel, info
class MultiTool extends BaseTool {

	constructor() {
		super(true, true); // part of general toggle group, default in toogle
		this.start_screen = null;
	}

	finishPan(p_transfmgr, p_x, p_y, opt_origin) {
		
		let dx=0, dy=0;
		let deltascrx =  Math.abs(this.start_screen[0] - p_x);
		let deltascry =  Math.abs(this.start_screen[1] - p_y);

		if (opt_origin == 'touch') {
			dx = 6;
			dy = 6;
		}

		if (deltascrx > dx || deltascry > dy) {		
			p_transfmgr.doPan(this.start_screen, [p_x, p_y], true);
		}
	}

	/*

	static transientPan(p_mapctx, p_x, p_y, p_start_terrain, p_start_screen) {

		const terrain_pt=[];

		p_mapctx.transformmgr.getTerrainPt([p_x, p_y], terrain_pt);	

		let deltax = p_start_terrain[0] - terrain_pt[0];
		let deltay = p_start_terrain[1] - terrain_pt[1];
		
		let deltascrx =  p_x - p_start_screen[0];
		let deltascry =  p_y - p_start_screen[1];

		//console.log([ p_start_terrain[0],  p_start_terrain[1], terrain_pt[0], terrain_pt[1],  deltax, deltay]);

		if (Math.abs(deltascrx) > 1 || Math.abs(deltascry) > 1) {
			//this.scrDiffFromLastSrvResponse.moveCenter(deltascrx, deltascry);
			
			// this.moveCenter(deltax, deltay);
			// this.redraw(true);
		}

	}	*/

	onEvent(p_mapctx, p_evt) {

		let ret = true;

		try {
			switch(p_evt.type) {

				case 'mousedown':
					// console.log(p_evt, "start:", this.start_screen, (p_evt.buttons & 1) == 1);
					if (this.start_screen == null) {
						if ((p_evt.buttons & 1) == 1) {						
							this.start_screen = [p_evt.clientX, p_evt.clientY];		
							// console.log("start_screen:", this.start_screen);					
							ret = false;
						}
					}
					break;

				case 'mouseup':
				case 'mouseout':
				case 'mouseleave':
					if (this.start_screen != null) {
						this.finishPan(p_mapctx.transformmgr, p_evt.clientX, p_evt.clientY, 'mouse');	
						this.start_screen = null;
						ret = false;
					}
					break;

				/*
				case 'mousemove':
					if (this.started) {
						if ((p_evt.buttons & 1) == 1) {

							this.last_pt = [p_evt.clientX, p_evt.clientY];

							ret = false;
						}
					}
					break; */
			}
		} catch(e) {
			this.start_screen = null;
			throw e;
		}
		
		return ret;
	}	
}

export class ToolManager {

	constructor(p_mapctx_config_var) {

		if (p_mapctx_config_var == null) {
			throw new Error("Class ToolManager, null mapctx_config_var");
		}

		this.maptools = [new DefaultTool()];
		
		if (p_mapctx_config_var["togglable_tools"] !== undefined) {
			for (let i=0; i<p_mapctx_config_var["togglable_tools"].length; i++) {
				switch (p_mapctx_config_var["togglable_tools"][i]) {
					case "MultiTool":
						this.addTool(new MultiTool());
						break;
				}
			}
		}	
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

	enableTool(p_classname, p_do_enable) {

		let foundtool = this._findTool(p_classname);

		if (foundtool == null) {
			return;
		}

		if (!foundtool.joinstogglegroup) {
			foundtool.enabled = p_do_enable;
		} else {
			if (p_do_enable) {

				// disable all in toggle group ...
				for (let j=0; j<this.maptools.length; j++) {
					if (!this.maptools[j].joinstogglegroup) {
						continue;
					}
					this.maptools[j].enabled = false;
				}	

				// enable chosen tool
				foundtool.enabled = true;	

			} else {
				let do_continue = true;

				// Check if tool to disable is default in toggle group, in that case, stop
				for (let j=0; j<this.maptools.length; j++) {
					if (this.maptools[j].defaultintoggle) {
						if (this.maptools[j].constructor.name == p_classname) {
							do_continue = false;
							break;
						}
					}
				}

				// Dsiable all in toggle group and enable default tools
				if (do_continue) {
					for (let j=0; j<this.maptools.length; j++) {
						if (!this.maptools[j].joinstogglegroup) {
							continue;
						}
						if (this.maptools[j].defaultintoggle) {
							this.maptools[j].enabled = true;
						} else {
							this.maptools[j].enabled = false;
						}
					}
				}
			}
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

		// stopPropagation - only tools from toggle group is checked for return value 
		return ret;
	}
	

	


}