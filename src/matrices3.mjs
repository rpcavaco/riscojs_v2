

/*
 * Code adapted from Gregg Tavares (https://webgl2fundamentals.org/)
 *
 *
 * Copyright 2012, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of his
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * Function identity
 * Creates a 3x3 identity matrix
 * @returns {Matrix3} an identity matrix
 */
export function identity(out_result) {
	out_result.length = 9;
	out_result[0] = 1;
	out_result[1] = 0;
	out_result[2] = 0;
	out_result[3] = 0;
	out_result[4] = 1;
	out_result[5] = 0;
	out_result[6] = 0;
	out_result[7] = 0;
	out_result[8] = 1;
}

/**
 * Function multiply
 * Takes two Matrix3s, a and b, and computes the product in the order
 * that pre-composes b with a.  In other words, the matrix returned will
 * @param {Matrix3} a A matrix.
 * @param {Matrix3} b A matrix.
 * @returns {Matrix3} the result.
 */
export function multiply(a, b, out_result) {
		
	if (out_result.length != 9) {
		out_result.length = 9;
	}
	
	out_result[0] = b[0] * a[0] + b[1] * a[3] + b[2] * a[6];
	out_result[1] = b[0] * a[1] + b[1] * a[4] + b[2] * a[7];
	out_result[2] = b[0] * a[2] + b[1] * a[5] + b[2] * a[8];
	out_result[3] = b[3] * a[0] + b[4] * a[3] + b[5] * a[6];
	out_result[4] = b[3] * a[1] + b[4] * a[4] + b[5] * a[7];
	out_result[5] = b[3] * a[2] + b[4] * a[5] + b[5] * a[8];
	out_result[6] = b[6] * a[0] + b[7] * a[3] + b[8] * a[6];
	out_result[7] = b[6] * a[1] + b[7] * a[4] + b[8] * a[7];
	out_result[8] = b[6] * a[2] + b[7] * a[5] + b[8] * a[8];
}

export function inverse(m, out_result) {
		
	if (out_result.length != 9) {
		out_result.length = 9;
	}

	var A = m[4] * m[8] - m[5] * m[7]; 
	var B = m[5] * m[6] - m[3] * m[8]; 
	var C = m[3] * m[7] - m[4] * m[6]; 
	var oneOvrDet, determ = m[0] * A + m[1] * B + m[2] * C; 
	
	if (determ !== 0) {
		oneOvrDet = 1.0 / determ; 

		out_result[0] = A * oneOvrDet;
		out_result[1] = (m[2] * m[7] - m[1] * m[8]) * oneOvrDet;
		out_result[2] = (m[1] * m[5] - m[2] * m[4]) * oneOvrDet;
		out_result[3] = B * oneOvrDet;
		out_result[4] = (m[0] * m[8] - m[2] * m[6]) * oneOvrDet;
		out_result[5] = (m[2] * m[3] - m[0] * m[5]) * oneOvrDet;
		out_result[6] = C * oneOvrDet;
		out_result[7] = (m[1] * m[6] - m[0] * m[7]) * oneOvrDet;
		out_result[8] = (m[0] * m[4] - m[1] * m[3]) * oneOvrDet;
	}
}

/**
 * Function scaling
 * Creates a 2D scaling matrix
 * @param {number} sx amount to scale in x
 * @param {number} sy amount to scale in y
 * @returns {Matrix3} a scale matrix that scales by sx and sy.
 */
export function scaling(sx, sy, out_result) {
	out_result.length = 9;
	out_result[0] = sx;
	out_result[1] = 0;
	out_result[2] = 0;

	out_result[3] = 0;
	out_result[4] = sy;
	out_result[5] = 0;

	out_result[6] = 0;
	out_result[7] = 0;
	out_result[8] = 1;
}

/**
 * Function translation
 * Creates a 2D translation matrix
 * @param {number} tx amount to translate in x
 * @param {number} ty amount to translate in y
 * @returns {Matrix3} a translation matrix that translates by tx and ty.
 */
export function translation(tx, ty, out_result) {
	out_result.length = 9;
	out_result[0] = 1;
	out_result[1] = 0;
	out_result[2] = 0;
	
	out_result[3] = 0;
	out_result[4] = 1;
	out_result[5] = 0;
	
	out_result[6] = tx;
	out_result[7] = ty;
	out_result[8] = 1;
}

export function twod_shift(m, dx, dy) {
	m[6] += dx;
	m[7] += dy;
}

/**
 * Creates a 2D rotation matrix
 * @param {number} angleInRadians amount to rotate in radians
 * @returns {Matrix3} a rotation matrix that rotates by angleInRadians
 */
export function rotation(angleInRadians, out_result) {
	var c = Math.cos(angleInRadians);
	var s = Math.sin(angleInRadians);

	out_result.length = 9;
	out_result[0] = c;
	out_result[1] = -s;
	out_result[2] = 0;

	out_result[3] = s;
	out_result[4] = c;
	out_result[5] = 0;

	out_result[6] = 0;
	out_result[7] = 0;
	out_result[8] = 1;
}

/**
 * ----------------- End of Gregg's code -------------------
 *  */  


export function getCartoScaling(m) {
	return (m[0]-m[4])/2.0;
}

export function vectorMultiply(v, m, out_result) {
	out_result.length = 3;
	//console.log('vector:'+v);
	for (var i = 0; i < 3; i++) 
	{
		out_result[i] = 0.0;
		for (var j = 0; j < 3; j++) {
			out_result[i] += v[j] * m[j * 3 + i];
		//console.log(dst[i]+ " += " + v[j] + " * " + m[j * 4 + i]);
	  }
	  //console.log('dst['+i+'] = '+dst[i]);
	  
	}
	//console.log('resultado:'+dst);
}