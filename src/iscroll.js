/**
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Copyright (c) 2010 Matteo Spinelli, http://cubiq.org/
 * Released under MIT license
 * http://cubiq.org/dropbox/mit-license.txt
 * 
 * Version 4.0 dev.rel. - Last updated: 2010.12.20
 * 
 * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * 
 */

(function(){

function iScroll (el, options) {
	var that = this, doc = document, div, i;

	that.wrapper = typeof el == 'object' ? el : doc.getElementById(el);
	that.scroller = that.wrapper.children[0];
	that.scroller.style.cssText += '-webkit-transition-property:-webkit-transform;-webkit-transition-timing-function:cubic-bezier(0,0,0,1);-webkit-transition-duration:0;-webkit-transform-origin:0 0;-webkit-transform:' + trnOpen + '0,0' + trnClose;

	that.options = {
		vScroll: true,
		hScroll: true,
		bounce: has3d,
		momentum: has3d,
		lockDirection: true,
		zoom: false
	};

	// User defined options
	for (i in options) {
		that.options[i] = options[i];
	}

	that.refresh();

	that.bind(ORIENT_EV, window);
	that.bind(START_EV);
	
	if (hasGesture && that.options.zoom) {
		that.bind('gesturestart');
		that.scroller.style.webkitTransform = that.scroller.style.webkitTransform + ' scale(1)';
	}
}

iScroll.prototype = {
	x: 0, y: 0,
	scale: 1,
	
	handleEvent: function (e) {
		var that = this;
		
		switch(e.type) {
			case START_EV:
				that._start(e);
				break;
			case MOVE_EV:
				that._move(e);
				break;
			case END_EV:
			case CANCEL_EV:
				that._end(e);
				break;
			case 'webkitTransitionEnd':
				that._transitionEnd(e);
				break;
			case ORIENT_EV:
				that._orientChange();
				break;
			case 'gesturestart':
				that._gestStart(e);
				break;
			case 'gesturechange':
				that._gestChange(e);
				break;
			case 'gestureend':
			case 'gesturecancel':
				that._gestEnd(e);
				break;
		}
	},

	refresh: function () {
		var that = this;
		
		that.wrapperW = that.wrapper.clientWidth;
		that.wrapperH = that.wrapper.clientHeight;
		that.scrollerW = round(that.scroller.offsetWidth * that.scale);
		that.scrollerH = round(that.scroller.offsetHeight * that.scale);
		that.maxScrollX = that.wrapperW - that.scrollerW;
		that.maxScrollY = that.wrapperH - that.scrollerH;
		that.dirX = 0;
		that.dirY = 0;

		that.hScroll = that.options.hScroll && that.maxScrollX < 0;
		that.vScroll = that.options.vScroll && that.maxScrollY < 0;
		
		that._resetPos();
	},
	
	_orientChange: function () {
		var that = this;

		if (that.options.momentum) that.unbind('webkitTransitionEnd');

		setTimeout(function () {
			that.refresh();
		}, 0);
	},
	
	_pos: function (x, y) {
		var that = this;

		that.x = that.hScroll ? x : 0;
		that.y = that.vScroll ? y : 0;
		
		that.scroller.style.webkitTransform = trnOpen + that.x + 'px,' + that.y + 'px' + trnClose + ' scale(' + that.scale + ')';
	},
	
	_transitionTime: function (time) {
		time+= 'ms';
		this.scroller.style.webkitTransitionDuration = time;
	},
	
	_start: function (e) {
		var that = this,
			point = hasTouch ? e.changedTouches[0] : e,
			offsetLeft = offsetTop = 0, el,
			matrix;

		e.preventDefault();

		if (e.touches.length == 2 && that.options.zoom && hasGesture) {
			// As object position might change over time, we calculate the offset each time (overkill?)
			el = that.wrapper;
			do {
				offsetLeft += el.offsetLeft;
				offsetTop += el.offsetTop;
			} while (el = el.offsetParent);

			that.originX = abs(e.touches[0].pageX + e.touches[1].pageX - offsetLeft*2) / 2 - that.x;
			that.originY = abs(e.touches[0].pageY + e.touches[1].pageY - offsetTop*2) / 2 - that.y;
			return;
		}

		that.moved = false;
		that.distX = 0;
		that.distY = 0;
		that.absDistX = 0;
		that.absDistY = 0;
		that.dirX = 0;
		that.dirY = 0;
		that.returnTime = 0;
		that.scroller.style.webkitTransitionTimingFunction = 'cubic-bezier(0,0,0,1)';
		
		that._transitionTime(0);
		
		if (that.options.momentum) {
			matrix = new WebKitCSSMatrix(window.getComputedStyle(that.scroller).webkitTransform);
			if (matrix.e != that.x || matrix.f != that.y) {
				that.unbind('webkitTransitionEnd');
				that._pos(matrix.e, matrix.f);
			}
		}

		that.startX = that.x;
		that.startY = that.y;
		that.pointX = point.pageX;
		that.pointY = point.pageY;
		
		that.startTime = e.timeStamp;

		// Registering/unregistering of events is done to preserve resources on Android
//		that.unbind(START_EV);
		that.bind(MOVE_EV);
		that.bind(END_EV);
		that.bind(CANCEL_EV);
	},
	
	_move: function (e) {
		if (e.touches.length > 1) return;

		var that = this,
			point = hasTouch ? e.changedTouches[0] : e,
			deltaX = point.pageX - that.pointX,
			deltaY = point.pageY - that.pointY,
			newX = that.x + deltaX,
			newY = that.y + deltaY;

		e.preventDefault();

		that.pointX = point.pageX;
		that.pointY = point.pageY;

		// Slow down if outside of the boundaries
		if (newX > 0 || newX < that.maxScrollX) {
			newX = that.options.bounce ? that.x + round(deltaX / 2.5) : newX > 0 ? 0 : that.maxScrollX;
		}
		if (newY > 0 || newY < that.maxScrollY) { 
			newY = that.options.bounce ? that.y + round(deltaY / 2.5) : newY > 0 ? 0 : that.maxScrollY;
		}

		if (that.absDistX < 4 && that.absDistY < 4) {
			that.distX += deltaX;
			that.distY += deltaY;
			that.absDistX = abs(that.distX);
			that.absDistY = abs(that.distY);
			return;
		}
		
		// Lock direction
		if (that.options.lockDirection) {
			if (that.absDistX > that.absDistY+3) {
				newY = that.y;
				deltaY = 0;
			} else if (that.absDistY > that.absDistX+3) {
				newX = that.x;
				deltaX = 0;
			}
		}
		
		that.moved = true;
		that._pos(newX, newY);
		that.dirX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
		that.dirY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

		if (e.timeStamp - that.startTime > 300) {
			that.startTime = e.timeStamp;
			that.startX = that.x;
			that.startY = that.y;
		}
	},
	
	_end: function (e) {
		if (e.touches.length != 0) return;

		var that = this,
			point = hasTouch ? e.changedTouches[0] : e,
			target, ev,
			momentumX, momentumY,
			duration = e.timeStamp - that.startTime,
			newPosX = that.x, newPosY = that.y,
			newDuration;

//		that.bind(START_EV);
		that.unbind(MOVE_EV);
		that.unbind(END_EV);
		that.unbind(CANCEL_EV);

/*
		if (!that.moved) {
			
		}
*/
		if (duration > 300) duration = 0;
		
		if (duration && that.options.momentum) {
			momentumX = newPosX ? that._momentum(newPosX - that.startX, duration, -that.x, that.scrollerW - that.wrapperW + that.x, that.options.bounce ? that.wrapperW : 0) : { dist:0, time:0 };
			momentumY = newPosY ? that._momentum(newPosY - that.startY, duration, -that.y, that.scrollerH - that.wrapperH + that.y, that.options.bounce ? that.wrapperH : 0) : { dist:0, time:0 };

			if (momentumX.dist || momentumY.dist) {
				newPosX = that.x + momentumX.dist;
				newPosY = that.y + momentumY.dist;
				newDuration = max(max(momentumX.time, momentumY.time), 10);
				that.returnTime = min(round(newDuration / 2), 350);
				that.bind('webkitTransitionEnd');
				that.scrollTo(newPosX, newPosY, newDuration);
			}
		}
		
		if (!that.returnTime) that._resetPos(200);
	},
	
	_resetPos: function (time) {
		var that = this,
			resetX = that.x,
			resetY = that.y;
		
		if (that.x > 0) resetX = 0;
		else if (that.x < that.maxScrollX) resetX = that.maxScrollX;

		if (that.y > 0) resetY = 0;
		else if (that.y < that.maxScrollY) resetY = that.maxScrollY;
		
		if (resetX == that.x && resetY == that.y) return;
		
		that.scrollTo(resetX, resetY, time || 0);
	},
	
	_momentum: function (dist, time, maxDistUpper, maxDistLower, size) {
		var that = this,
			friction = 1.5,
			deceleration = 1.2,
			speed = abs(dist) / time * 1000,
			newDist = speed * speed / 1000 / friction,
			newTime = 0;

		// Proportinally reduce speed if we are outside of the boundaries 
		if (dist > 0 && newDist > maxDistUpper) {
			that.scroller.style.webkitTransitionTimingFunction = 'cubic-bezier(0,0,0.6,1)';
//			maxDistUpper = maxDistUpper + (size / max(8 / (newDist / (speed*2)), 3));
			maxDistUpper = maxDistUpper + (size / (7 / (newDist / speed)));
			speed = speed * maxDistUpper / newDist;
			newDist = maxDistUpper;
		} else if (dist < 0 && newDist > maxDistLower) {
			that.scroller.style.webkitTransitionTimingFunction = 'cubic-bezier(0,0,0.6,1)';
//			maxDistLower = maxDistLower + (size / max(8 / (newDist / (speed*2)), 3));
			maxDistLower = maxDistLower + (size / (7 / (newDist / speed)));
			speed = speed * maxDistLower / newDist;
			newDist = maxDistLower;
		}

		newDist = newDist * (dist < 0 ? -1 : 1);
		newTime = speed / deceleration;

		return { dist: round(newDist), time: round(newTime) };
	},
	
	_transitionEnd: function (e) {
		var that = this;
		that.unbind('webkitTransitionEnd');
		that._resetPos(that.returnTime);
		that.returnTime = 0;
	},
	
	_gestStart: function (e) {
		var that = this;

		that._transitionTime(0);

		that.unbind('gesturestart');
		that.bind('gesturechange');
		that.bind('gestureend');
		that.bind('gesturecancel');
	},

	_gestChange: function (e) {
		var that = this,
			scale = min(4, max(1, that.scale * e.scale)),
			x, y;

		if (scale > 1 && scale < 4) {
			x = that.originX - that.originX * e.scale + that.x;
			y = that.originY - that.originY * e.scale + that.y;
			that.scroller.style.webkitTransform = trnOpen + x + 'px,' + y + 'px' + trnClose + ' scale(' + scale + ')';
		}
	},

	_gestEnd: function (e) {
		var that = this;

		that.scale = min(4, max(1, that.scale * e.scale));
		that.x = that.originX - that.originX * e.scale + that.x;
		that.y = that.originY - that.originY * e.scale + that.y;

		that.refresh();

		that.bind('gesturestart')
		that.unbind('gesturechange');
		that.unbind('gestureend');
		that.unbind('gesturecancel');
	},

	scrollTo: function (x, y, time) {
		var that = this;
		
		that._transitionTime(time);
		that._pos(x, y);
	},
	
	destroy: function () {
		that.unbind('webkitTransitionEnd');
		that.unbind(ORIENT_EV);
		that.unbind(START_EV);
		that.unbind(MOVE_EV);
		that.unbind(END_EV);
		that.unbind(CANCEL_EV);
		that.unbind('gesturestart')
		that.unbind('gesturechange');
		that.unbind('gestureend');
		that.unbind('gesturecancel');
	},
	
	bind: function (type, el) {
		(el || this.scroller).addEventListener(type, this, false);
	},
	
	unbind: function (type, el) {
		(el || this.scroller).removeEventListener(type, this, false);
	},
}

var has3d = ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix()),
	hasTouch = 'ontouchstart' in window,
	hasGesture = 'ongesturestart' in window,
	isIThing = (/iphone|ipad/gi).test(navigator.appVersion),
	isAndroid = (/android/gi).test(navigator.appVersion),
	ORIENT_EV = 'onorientationchange' in window ? 'orientationchange' : 'resize',
	START_EV = hasTouch ? 'touchstart' : 'mousedown',
	MOVE_EV = hasTouch ? 'touchmove' : 'mousemove',
	END_EV = hasTouch ? 'touchend' : 'mouseup',
	CANCEL_EV = hasTouch ? 'touchcancel' : 'mouseup',
	trnOpen = 'translate' + (has3d ? '3d(' : '('),
	trnClose = has3d ? ',0)' : ')',
	abs = Math.abs, round = Math.round, min = Math.min, max = Math.max;

window.iScroll = iScroll;
})();
