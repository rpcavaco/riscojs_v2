.. js:class:: HTML5CanvasMgr(p_paneldiv[, opt_base_zindex])

	Manager class for Canvas(es) drawing.

	An instance of this class manages four overlay canvases, for:

	a) 'base': raster drawing background

	b) 'normal' vector drawing

	c) 'temporary' vector, like highlights

	d) 'transient' vectors, e.g.: mouse interaction or viewport manipulation artifacts

	:param object p_paneldiv: Non-null reference to panel's DIV DOM object
	:param integer opt_base_zindex: Optional z-index for bottom canvas

.. js:method:: init()

	Initialization of  Canvas(es) manager or reset


.. js:method:: getCanvasDims(out_pt)

	:param float out_pt: Out parameter: array of width x height

.. js:method:: getCanvasCenter(out_pt)

	:param float out_pt: Out parameter: array of coordinates for a canvas point

