
import {MapPrintInRect} from './customization_canvas_baseclasses.mjs';

export class EditingMgr extends MapPrintInRect {

	current_user;
	current_user_canedit;
	editing_is_enabled;
	editable_layers;

	left;
	boxh;
	boxw;
	top;
	fillStyleBack; 
	fillStyleFront; 
	font;
	print_attempts;
	had_prev_interaction;
	// collapsedstate;
	prevboxenv;
	bottom;
	other_widgets;
	std_boxdims;
	// active_mode;

	constructor(p_toolmanager, p_editable_layers, p_other_widgets) {
		this.editable_layers = p_editable_layers;
		this.current_user_canedit = false;
		p_toolmanager.setEditingManager(this);
	}

	setCurrentUser(p_username, b_user_canedit) {
		this.current_user = p_username;
		this.current_user_canedit = b_user_canedit;
	}
	
	setEditingEnabled(p_editing_is_enabled) {
		this.editing_is_enabled = p_editing_is_enabled;
	}		
}