.. js:function:: identity()

	Creates a 3x3 identity matrix

	:returns: module:webgl2-2d-math.Matrix3 an

.. js:function:: multiply(a, b)

	Takes two Matrix3s, a and b, and computes the product in the order

	that pre-composes b with a.  In other words, the matrix returned will

	:param module:webgl-2d-math.Matrix3 a: A matrix.
	:param module:webgl-2d-math.Matrix3 b: A matrix.
	:returns: module:webgl-2d-math.Matrix3 the

.. js:function:: scaling(sx, sy)

	Creates a 2D scaling matrix

	:param number sx: amount to scale in x
	:param number sy: amount to scale in y
	:returns: module:webgl-2d-math.Matrix3 a

.. js:function:: translation(tx, ty)

	Creates a 2D translation matrix

	:param number tx: amount to translate in x
	:param number ty: amount to translate in y
	:returns: module:webgl-2d-math.Matrix3 a

