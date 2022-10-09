.. js:class:: RiscoMapOverlay(p_paneldiv_id)

	Overlaying or stacking of more than one RiscoMap context

	Alows over

	:param string p_paneldiv_id: Id of HTML DIV element to act as RiscoJS map panel

.. js:method:: newCtx(p_config_var, p_ctx_id)

	Create new map context attached to this overlay

	:param string p_config_var: Name of variable containing configuration JSON dictionary
	:param string p_ctx_id: Identification of this context
	:returns: the context just created

.. js:class:: RiscoMapCtx(p_config_var, p_paneldiv)

	Risco Map Context controller, main class to use in case of a simple one map web client

	:param string p_config_var: Name of variable containing configuration JSON dictionary
	:param object p_paneldiv: String Id or object reference to HTML DIV element to act as RiscoJS map panel
	:returns: string

