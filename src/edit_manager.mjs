
export class EditManager {

	current_user;
	editmgr_toolmanager;

	constructor(p_toolmanager) {
		this.editmgr_toolmanager = p_toolmanager;
	}

	setCurrentUser(p_username) {
		this.current_user = p_username;
	}	
}