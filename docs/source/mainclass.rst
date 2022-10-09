
Main classes
============

The fundamental class is **RiscoMapCtx**.
This class is not a singleton, it is viable to instantiate more than once to control multiple map panels throughout a web page or app.
 
Each *RiscoMapCtx* instance defines a map context. 

Different map contexts can be spread in different locations on a page or can be overlayed or z-stacked to achieve split screen effects map comparison sliders, etc.

In case of stacking map contexts, map contexts must be intatiated through **RiscoMapOverlay** class.

.. include:: generated\main.rst

HTML5 Canvas
------------

.. include:: generated\html5canvas.rst	

