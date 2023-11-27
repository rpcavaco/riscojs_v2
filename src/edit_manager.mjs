
export class EditingMgr {

	current_user;
	editmgr_toolmanager;

	constructor(p_toolmanager, auth_mode, p_other_widgets) {
		this.editmgr_toolmanager = p_toolmanager;
	}

	setCurrentUser(p_username) {
		this.current_user = p_username;
	}	
}