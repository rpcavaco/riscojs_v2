.. js:class:: MapAffineTransformation([opt_name])

	Transformation from ground length into canvas dots.

	Canvas to terrain achieved aplying inverse matrix.

	:param string opt_name: Optional name

.. js:class:: Transform2DMgr(p_mapctx_config_var, p_canvasmgr)

	Manager class for simple linear geometric coordinate transforms in 2D space (avoiding geographic projection systems).

	:param object p_mapctx_config_var: Variable object containing configuration JSON dictionary~
	:param object p_canvasmgr: HTML5 Canvases manager

.. js:method:: init()

	Initiate transforms manager with config values or reset it to those initial values


.. js:method:: setScale(p_scale)

	:param float p_scale: 

.. js:method:: setCenter(p_cx, p_cy)

	:param float p_cx: 
	:param float p_cy: 

.. js:method:: getTerrainPt(p_scrpt, out_pt)

	:param object p_scrpt: Array of coordinates for a canvas point
	:param float out_pt: Out parameter: array of coordinates for a terrain point

.. js:method:: getCanvasPt(p_terrpt, out_pt)

	:param object p_terrpt: Array of coordinates for a terrain point
	:param float out_pt: Out parameter: array of coordinates for a canvas point

