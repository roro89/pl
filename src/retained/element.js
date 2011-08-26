goog.provide('pl.retained.Element');

goog.require('goog.asserts');
goog.require('goog.color.alpha');
goog.require('goog.graphics.AffineTransform');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Rect');
goog.require('goog.math.Size');
goog.require('pl.gfx');

/**
 * @constructor
 * @param {number} width
 * @param {number} height
 * @param {boolean=} opt_enableCache
 */
pl.retained.Element = function(width, height, opt_enableCache) {
  this.width = width;
  this.height = height;

  /**
   * @private
   * @type {?pl.retained.Container}
   */
  this._parent = null;

  if (opt_enableCache) {
    this._drawInternal = pl.retained.Element.prototype._drawCached;
  }
};

/**
 * @type {?goog.graphics.AffineTransform}
 */
pl.retained.Element.prototype.parentTransform = null;

/**
 * @return {?goog.graphics.AffineTransform}
 */
pl.retained.Element.prototype.getTransform = function() {
  if (this.parentTransform) {
    return this.parentTransform.clone();
  } else {
    return null;
  }
};

/**
 * @param {!CanvasRenderingContext2D} ctx
 **/
pl.retained.Element.prototype.draw = goog.abstractMethod;

/**
 * @return {!goog.math.Size}
 */
pl.retained.Element.prototype.getSize = function() {
  return new goog.math.Size(this.width, this.height);
};

/**
 * @param {goog.math.Size} size
 * @return {boolean}
 */
pl.retained.Element.prototype.setSize = function(size) {
  if (!goog.math.Size.equals(this.getSize(), size)) {
    this.width = size.width;
    this.height = size.height;
    this.invalidateDraw();
    return true;
  }
  return false;
};

/**
 * Only valid if caching is enabled
 * Ensures that the a non-cached draw is done during the next pass
 */
pl.retained.Element.prototype.invalidateDraw = function() {
  this._lastDrawSize = null;
  this._invalidateParent();
};

pl.retained.Element.prototype._invalidateParent = function() {
  if (this._parent) {
    this._parent.childInvalidated(this);
  }
};

/**
 * @param {boolean=} opt_frontToBack
 * @return {!Array.<!pl.retained.Element>}
 */
pl.retained.Element.prototype.getVisualChildren = function(opt_frontToBack) {
  return [];
};

/**
 * @param {!pl.retained.Container} parent
 */
pl.retained.Element.prototype.claim = function(parent) {
  goog.asserts.assert(this._parent === null, 'already claimed');
  this._parent = parent;
};

/**
 * @private
 * @param {!CanvasRenderingContext2D} ctx
 **/
pl.retained.Element.prototype._drawCore = function(ctx) {
  if (goog.isDef(this.alpha)) {
    ctx.globalAlpha = this.alpha;
  }

  if (this.fillStyle) {
    ctx.save();
    ctx.fillStyle = this.fillStyle;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  // call the abstract draw method
  this.draw(ctx);
};

/**
 * @private
 * @param {!CanvasRenderingContext2D} ctx
 **/
pl.retained.Element.prototype._drawNormal = function(ctx) {
  ctx.save();

  // Translate to the starting position
  pl.gfx.transform(ctx, this.getTransform());

  // clip to the bounds of the object
  ctx.beginPath();
  ctx.rect(0, 0, this.width, this.height);
  ctx.clip();

  this._drawCore(ctx);
  ctx.restore();
};

/**
 * @private
 * @param {!CanvasRenderingContext2D} ctx
 **/
pl.retained.Element.prototype._drawCached = function(ctx) {
  if (!this._cacheCanvas || !goog.math.Size.equals(pl.ex.getCanvasSize(this._cacheCanvas), this._lastDrawSize)) {
    if (!this._cacheCanvas) {
      this._cacheCanvas =
      /** @type {!HTMLCanvasElement} */
      document.createElement('canvas');
    }
    this._cacheCanvas.width = this.width;
    this._cacheCanvas.height = this.height;

    var cacheCtx =
    /** @type {!CanvasRenderingContext2D} */
    this._cacheCanvas.getContext('2d');

    this._drawCore(cacheCtx);
  }

  ctx.save();
  pl.gfx.transform(ctx, this.getTransform());

  ctx.drawImage(this._cacheCanvas, 0, 0);
  ctx.restore();
  this._lastDrawSize = this.getSize();
};

/**
 * @private
 * @param {!CanvasRenderingContext2D} ctx
 **/
pl.retained.Element.prototype._drawInternal = pl.retained.Element.prototype._drawNormal;
