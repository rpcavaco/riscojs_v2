.. js:class:: RiscoMapOverlay(p_paneldiv_id)

	Overlaying or stacking of more than one RiscoMap context

	:param string p_paneldiv_id: Id of HTML DIV element to act as RiscoJS map panel

.. js:method:: newMapCtx(p_config_var, p_ctx_id)

	Create new map context attached to this overlay

	:param object p_config_var: Variable object containing configuration JSON dictionary
	:param string p_ctx_id: Identification of this context
	:returns: the context just created

.. js:method:: getMapCtx(p_ctx_id)

	Return exisitng map context attached to this overlay

	:param string p_ctx_id: Identification of this context
	:returns: The context for the given id

.. js:class:: RiscoMapCtx(p_config_var, p_paneldiv)

	Risco Map Context controller, main class to use in case of a simple one map web client

	:param object p_config_var: Variable object containing configuration JSON dictionary
	:param object p_paneldiv: String Id or object reference to HTML DIV element to act as RiscoJS map panel

.. js:method:: resize()


.. js:method:: userResize(p_this_mapctx)

	:param object p_this_mapctx: This map context

