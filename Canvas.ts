import {fabric} from "fabric";
/**
 * This code extends the fabric.Canvas class with additional methods and event handlers to enable drawing mode on the canvas.
 * It uses a mixin pattern to keep the drawing-related functionality separate and easily applicable to any fabric.Canvas instance.
 */

// Default drawing class is fabric.Rect, but it can be customized
fabric.Canvas.prototype.drawingClass = 'rect'

fabric.Canvas.prototype.drawingOptions = {}
/**
 * Enable drawing mode on the canvas
 * @param klass - The object type which will be created on mousedown
 */
fabric.Canvas.prototype.enableDrawing = function (klass: string) {
    // If a custom drawing class is provided, use it
    if (klass) {
        this.drawingClass = klass;
    }

    if(this.interactiveMode === "drawing"){
        return
    }

    this.interactiveMode = "drawing"
    // Disable object selection, discard active object, and render the canvas
    this.disableSelection()
    this.disablePanning()
    this.discardActiveObject()
    this.renderAll()

    // Add event listeners for mouse events during drawing
    this.on('mouse:down', this._tableDrawingMouseDown);
    this.on('mouse:move', this._tableDrawingMouseMove);
    this.on('mouse:up', this._tableDrawingMouseUp);
}

fabric.Canvas.prototype.disablePanning = function () {
    // @ts-ignore
    this.off('mouse:down', this._handModeMouseDown);
    // @ts-ignore
    this.off('mouse:move', this._handModeMouseMove);
    this.off('mouse:up', this._handModeMouseUp);
}

fabric.Canvas.prototype.interactiveMode = "selection"

fabric.Canvas.prototype.enablePanning = function () {
    if(this.interactiveMode === "panning"){
        return
    }
    this.disableSelection()
    this.disableDrawing()
    this.discardActiveObject()
    this.renderAll()
    this.interactiveMode = "panning"
    this.on('mouse:down', this._handModeMouseDown);
    this.on('mouse:move', this._handModeMouseMove);
    this.on('mouse:up', this._handModeMouseUp);
}
//Disable drawing mode
fabric.Canvas.prototype.disableDrawing = function () {
    // Enable object selection and remove drawing event listeners
    // @ts-ignore
    this.off('mouse:down', this._tableDrawingMouseDown);
    // @ts-ignore
    this.off('mouse:move', this._tableDrawingMouseMove);
    this.off('mouse:up', this._tableDrawingMouseUp);
}

fabric.Canvas.prototype.disableSelection = function () {
    this.selection = false
}

fabric.Canvas.prototype.enableSelection = function () {
    if(this.interactiveMode === "selection"){
        return
    }
    this.interactiveMode = "selection"
    this.disablePanning()
    this.disableDrawing()
    this.selection = true
}
// Event handler for mouse down during drawing
fabric.Canvas.prototype._tableDrawingMouseDown = function (o: fabric.IEvent) {
    // If there is an active object, do nothing
    if (this._activeObject) {
        return;
    }
    let pointer = this.getPointer(o.e);
    this._drawModeData ={...pointer}
}
// Event handler for mouse move during drawing
fabric.Canvas.prototype._tableDrawingMouseMove = function (o: fabric.IEvent<MouseEvent>) {
    // If drawing mode is not enabled, do nothing
    if (!this._drawModeData) return;

    let pointer = this.getPointer(o.e);
    let x = pointer.x, y = pointer.y

    // If drawing object doesn't exist, create and add it to the canvas
    if (!this._drawModeData.object) {

        var klass = fabric.util.getKlass(this.drawingClass, 'fabric');

        this._drawModeData.object = new klass({
            left: this._drawModeData.x,
            top: this._drawModeData.y,
            width: x - this._drawModeData.x,
            height: y - this._drawModeData.y,
            ...this.drawingOptions
        });
        this.add(this._drawModeData.object as fabric.Object);
        this.fire("drawing:start",{target: this._drawModeData.object})
    }

    // Adjust the position and dimensions of the drawing object
    if (this._drawModeData.x > x) {
        this._drawModeData.object!.set({left: x});
    }
    if (this._drawModeData.y > y) {
        this._drawModeData.object!.set({top: y});
    }
    this._drawModeData.object!.set({
        width: Math.abs(x - this._drawModeData.x),
        height: Math.abs(y - this._drawModeData.y)
    })

    this.fire("drawing",{target: this._drawModeData.object})
    this.renderAll();
}
// Event handler for mouse up during drawing
fabric.Canvas.prototype._tableDrawingMouseUp = function () {
    // If no drawing object exists, do nothing
    if (!this._drawModeData) {
        return
    }
    if (!this._drawModeData.object) {
        delete this._drawModeData
        return
    }

    // Set coordinates for the drawing object, trigger events, and set it as active
    this._drawModeData.object.setCoords()
    this.fire('object:placed', {target: this._drawModeData.object});
    this._drawModeData.object.fire('placed');
    // this.setActiveObject(this._drawModeData.object)

    this.fire("drawing:end",{target: this._drawModeData.object})
    // Clean up drawing-related properties
    delete this._drawModeData;
}

fabric.Canvas.prototype._handModeMouseMove = function (e: fabric.IEvent<MouseEvent>) {
    if(this._activeObject){
        return
    }
    if (!this._handModeData) {
        return
    }
    let event = e.e
    this._handModeData.state = "move";

    if (event.pageY === this._handModeData.dragCursorPosition.y && event.pageX === this._handModeData.dragCursorPosition.x) {
        return;
    }

    let scroll = {
        x: this.viewportTransform[4],
        y: this.viewportTransform[5]
    };

    let newScroll = {
        x: scroll.x - (this._handModeData.dragCursorPosition.x - event.pageX),
        y: scroll.y - (this._handModeData.dragCursorPosition.y - event.pageY)
    };
    let zoom = this.getZoom()
    if(newScroll.y > this.height/2){
        newScroll.y = this.height/2
    }
    if(newScroll.x > this.width/2){
        newScroll.x = this.width/2
    }
    if(newScroll.y < this.height/2 - this.getOriginalHeight() * zoom - 10){
        newScroll.y = this.height/2 - this.getOriginalHeight() * zoom - 10
    }
    if(newScroll.x < this.width/2 - this.getOriginalWidth() * zoom - 10){
        newScroll.x = this.width/2 - this.getOriginalWidth() * zoom - 10
    }

    this.viewportTransform[4] = newScroll.x;
    this.viewportTransform[5] = newScroll.y;

    this.fire('viewport:translate', {
        x: this.viewportTransform[4],
        y: this.viewportTransform[5]
    });

    this.renderAll();
    for (let i = 0, len = this._objects.length; i < len; i++) {
        this._objects[i].setCoords();
    }

    this._handModeData.dragCursorPosition.y = event.pageY;
    this._handModeData.dragCursorPosition.x = event.pageX;
}

fabric.Canvas.prototype._handModeMouseUp = function () {
    delete this._handModeData;
}

fabric.Canvas.prototype._handModeMouseDown = function (e: fabric.IEvent<MouseEvent>) {
    if(this._activeObject){
        return
    }
    let event = e.e
    this._handModeData = {
        state: "down",
        dragCursorPosition: {
            y: event.pageY,
            x: event.pageX
        }
    }
}


function getProportions (photo: any, container: any) {
    let w = photo.naturalWidth || photo.width
    let h = photo.naturalHeight || photo.height

    let scaleX = container.width && container.width / w || 999
    let scaleY = container.height && container.height / h || 999
    let scale = Math.min(scaleX, scaleY)
    let output = {
        scale: scale,
        width: w * scale,
        height: h * scale
    }
    return output;
}

// fabric.Canvas.prototype.onResize = function () {
//     let _scale = Math.min(1, 800 / this.width);
//     // this.setZoom(_scale);
//     this.setDimensions({width: this.width, height: this.height});
//     this.fire('resized')
// }
fabric.Canvas.prototype.getCenter = function () {
    return {
        top: (this.originalHeight || this.getHeight()) / 2,
        left: (this.originalWidth || this.getWidth()) / 2
    };
}
fabric.Canvas.prototype.setOriginalSize = function (w: number | HTMLImageElement, h: number) {
    if(w.constructor === Number){
        this.originalWidth = w
        this.originalHeight = h
    }
    else{
        let image = w as HTMLImageElement
        this.originalWidth = image.naturalWidth
        this.originalHeight = image.naturalHeight
    }
    this.fire('resized')
    return this;
}
fabric.Canvas.prototype.setOriginalWidth = function (value: number) {
    this.originalWidth = value;
    if (!this.stretchable) {
        this.setWidth(value);
    }
    this.fire('resized')
}
fabric.Canvas.prototype.setOriginalHeight = function (value: number) {
    this.originalHeight = value;
    if (!this.stretchable) {
        this.setHeight(value);
    }
    this.fire('resized')
}
fabric.Canvas.prototype.getOriginalSize = function() {
    return {
        width: this.originalWidth || this.width || 0,
        height: this.originalHeight || this.height || 0
    }
}
fabric.Canvas.prototype.getOriginalWidth = function() {
    return this.originalWidth || this.width  || 0;
}
fabric.Canvas.prototype.getOriginalHeight = function() {
    return this.originalHeight || this.height  || 0;
}
fabric.Canvas.prototype.updateCanvasSize = function() {
    let options = this.stretchingOptions;
    let _parent = this.getRelativeContainer();
    if (!_parent) return;

    let marginX = options.marginX || options.margin || 0
    let marginY = options.marginY || options.margin || 0
    let w = this.getOriginalWidth()
    let h = this.getOriginalHeight()

    let _w = _parent.offsetWidth - marginX * 2,
        _h = _parent.offsetHeight - marginY * 2;
    if (options.maxWidthRate) {
        _w *= options.maxWidthRate;
    }
    if (options.maxHeightRate) {
        _w *= options.maxHeightRate;
    }
    if (options.maxWidth) {
        _w = Math.min(options.maxWidth, _w);
    }
    if (options.maxHeight) {
        _h = Math.min(options.maxHeight, _h);
    }
    if (_w <= 0 || _h <= 0) return;

    this.setDimensions({
        width: _w /*- _offset.left*/,
        height: _h /*- _offset.top*/
    });
    this.renderAll()
    this.fire('resized')
}
fabric.Canvas.prototype._onResize = function () {
    if (this.stretchable) {
        this.updateCanvasSize()
    } else {
        this.calcOffset();
    }
}
fabric.Canvas.prototype.getRelativeContainer = function() {
    // if (this._scrollContainer) return this._scrollContainer;
    if (!this.wrapperEl.parentNode) return null;

    function getRelativeContainer(el: HTMLElement) {
        do {
            if (window.getComputedStyle(el).position !== "static") {
                return el;
            }
            el = el.parentElement as HTMLElement;
        } while (el);
        return document.body;
    }

    let el = getRelativeContainer(this.wrapperEl.parentNode as HTMLElement);
    this._scrollContainer = el
    return el;
}
fabric.Canvas.prototype.getScrollContainer = function()   {
    // if (this._scrollContainer) return this._scrollContainer;
    if (!this.wrapperEl.parentNode) return null;

    function getScrollContainer(el: HTMLElement) : HTMLElement {
        do {
            if (window.getComputedStyle(el).overflow !== "visible") {
                return el;
            }
            el = el.parentElement as HTMLElement;
        } while (el);
        return document.body;
    }

    let el = getScrollContainer(this.wrapperEl.parentNode as HTMLElement);

    this._scrollContainer = el
    return el;
}
fabric.Canvas.prototype.setStretchingOptions = function(val: any)  {
    this.stretchingOptions = val;
    if (!this.stretchable) return
    if (this.lowerCanvasEl) {
        this._onResize();
    }
}
fabric.Canvas.prototype.setStretchable = function(val: boolean) {
    this.stretchable = val;
    if (!this.stretchable) return

    this.wrapperEl.style.width = "100%"
    this.wrapperEl.style.height = "100%"

    this.resizeObserver = new ResizeObserver(() => this._onResize());
    this.resizeObserver.observe(this.wrapperEl);


    if (this.lowerCanvasEl) {
        this._onResize();
    }
}
fabric.Canvas.prototype._zoomToPointNative = fabric.Canvas.prototype.zoomToPoint
fabric.Canvas.prototype.zoomIn = function() {
    let point = this.getOrignalCenter();
    let scaleValue = this.getZoom() * this.scaleFactor;

    let _max = this.getMaxZoom();
    let _min = this.getMinZoomOptions().scale;
    if (scaleValue > _max) scaleValue = _max;
    if (scaleValue < _min) scaleValue = _min;

    this.zoomToPoint(point, scaleValue);
}
fabric.Canvas.prototype.zoomOut = function() {
    let point = this.getOrignalCenter();
    let scaleValue = this.getZoom() / this.scaleFactor;

    let _max = this.getMaxZoom();
    let _min = this.getMinZoomOptions().scale;
    if (scaleValue > _max) scaleValue = _max;
    if (scaleValue < _min) scaleValue = _min;
    this.zoomToPoint(point, scaleValue);
}
fabric.Canvas.prototype.setMouseWheelZoom = function(val: boolean) {
    this.mouseWheelZoom = val;
    this.on("mouse:wheel", this.wheelZoom);
}
fabric.Canvas.prototype.zoomToPoint = function(point: fabric.IPoint, newZoom: number) {
    if (this.changeDimensionOnZoom) {
        let size = this.getOriginalSize()
        this.setDimensions({
            width: Math.round(size.width * newZoom),
            height: Math.round(size.height * newZoom)
        }, {
            // cssOnly: true
        });
    }
    this._zoomToPointNative(point, newZoom);
    this.fire('viewport:translate', {x: this.viewportTransform[4], y: this.viewportTransform[5]});
    this.fire('viewport:scaled', {scale: newZoom});
    return this
}
fabric.Canvas.prototype.resetViewport = function() {
    this.viewportTransform[0] = 1;
    this.viewportTransform[3] = 1;
    this.viewportTransform[4] = 0;
    this.viewportTransform[5] = 0;
    this.renderAll();
    for (let i in this._objects) {
        this._objects[i].setCoords();
    }
}
fabric.Canvas.prototype.getMaxZoom = function() {
    return this.maxZoom;
}
fabric.Canvas.prototype.getMinZoomOptions = function() {
    let container;
    if (this.changeDimensionOnZoom) {
        let scrollParent = this.getScrollContainer();
        container = scrollParent || this.wrapperEl;
    } else {
        container = this.wrapperEl;
    }
    let _containerSize = {
        width: container.clientWidth,
        height: container.clientHeight
    };
    let _bgSize = {
        width: this.originalWidth || this.width,
        height: this.originalHeight || this.height
    };
    let _maxSize = {
        width: _containerSize.width * this.minZoom,
        height: _containerSize.height * this.minZoom
    };
    let size = getProportions(_bgSize, _maxSize);

    if (size.scale > 1) {
        return {
            scale: 1,
            width: this.originalWidth,
            height: this.originalHeight,
        }
    }

    return size;
}
fabric.Canvas.prototype.centerAndZoomOut = function() {
    if (!this.lowerCanvasEl) {
        return;
    }
    let options = this.getMinZoomOptions();
    if (this.changeDimensionOnZoom) {
        this.setZoom(options.scale);
        let scrollParent = this.getScrollContainer();
        if (scrollParent) {
            scrollParent.scrollTop = (scrollParent.scrollHeight - scrollParent.clientHeight) / 2;
            scrollParent.scrollLeft = (scrollParent.scrollWidth - scrollParent.clientWidth) / 2;
        }
    } else {
        let _containerSize = {
            width: this.wrapperEl.clientWidth,
            height: this.wrapperEl.clientHeight
        };
        let vpt = this.viewportTransform.slice(0);
        vpt[0] = options.scale;
        vpt[3] = options.scale;
        vpt[4] = (_containerSize.width - options.width) / 2;
        vpt[5] = (_containerSize.height - options.height) / 2;

        this.setViewportTransform(vpt);
    }
    this.fire('viewport:translate', {x: this.viewportTransform[4], y: this.viewportTransform[5]});
    this.fire('viewport:scaled', {scale: this.viewportTransform[0]});
}
fabric.Canvas.prototype.centerOnObject = function(tag: fabric.Object) {
    let br = tag.getBoundingRect();
    let ct = this.viewportTransform;
    br.width /= ct[0];
    br.height /= ct[3];
    let size = {
        width: br.width * 1.1,
        height: br.height * 1.1
    };
    let sizeOptions = getProportions(size, this);
    let _w = (this.width / sizeOptions.scale - size.width) / 2;
    let _h = (this.height / sizeOptions.scale - size.height) / 2;
    let _l = (br.left - ct[4]) / ct[0];
    let _t = (br.top - ct[5]) / ct[3];
    let x2 = [
        sizeOptions.scale,
        0, 0,
        sizeOptions.scale,
        -_l * sizeOptions.scale + (br.width * 0.05 + _w) * sizeOptions.scale,
        -_t * sizeOptions.scale + (br.height * 0.05 + _h) * sizeOptions.scale
    ];

    this.setViewportTransform(x2);
    this.fire("viewport:scaled", {scale: sizeOptions.scale});
    this.renderAll();
}
fabric.Canvas.prototype.wheelZoom = function(e: fabric.IEvent<WheelEvent>): boolean {
    let event = e.e;

    if (!this.mouseWheelZoom || this.zoomCtrlKey && !event.ctrlKey) {
        return false;
    }
//Find nearest point, that is inside image END
    let zoomStep;// = 0.1 * event.deltaY;
    if (event.deltaY < 0) {
        zoomStep = 1 + this.zoomStep;
    } else {
        zoomStep = 1 - this.zoomStep;
    }

    let cZoom = this.getZoom();
    let newZoom = cZoom * zoomStep;
    let minZoom = this.getMinZoomOptions().scale;

    let maxZoom = this.getMaxZoom()
    if (newZoom > maxZoom) {
        newZoom = maxZoom;
    }

    if (this.zoomToPointEnabled) {
        let point = new fabric.Point(event.offsetX, event.offsetY);
        let _x = this.viewportTransform[4];
        let _y = this.viewportTransform[5];

        // Find nearest point, that is inside image
        // It is needed to prevent canvas to zoom outside image
        if (this.originalWidth) {
            let _w = this.originalWidth * cZoom + _x;

            if (point.x < _x) {
                point.x = _x;
            }
            if (point.x > _w) {
                point.x = _w;
            }
        }
        if (this.originalHeight) {
            let _h = this.originalHeight * cZoom + _y;
            if (point.y < _y) {
                point.y = _y;
            }
            if (point.y > _h) {
                point.y = _h;
            }
        }

        if (minZoom > newZoom) {
            if (this.autoCenterAndZoomOut) {
                this.centerAndZoomOut();
            } else if (event.deltaY < 0) {
                this.zoomToPoint(point, newZoom);
            }
        } else {
            this.zoomToPoint(point, newZoom);
        }
    } else {
        this.setZoom(newZoom);
    }
    for (let i in this._objects) {
        this._objects[i].setCoords();
    }
    this.renderAll();
    event.stopPropagation();
    event.preventDefault();
    return false; //preventing scroll page
}
fabric.Canvas.prototype.getOrignalCenter = function() {
    return {
        x: (this.width / 2) * this.viewportTransform[0] + this.viewportTransform[4],
        y: (this.height / 2) * this.viewportTransform[3] + this.viewportTransform[5]
    };
}
fabric.Canvas.prototype.updateScrollbars = function (){
    let zoom = this.getZoom()
    let vt = this.viewportTransform
    let x = vt[4]
    let y = vt[5]
    // if(x >0 ){
    //     this.horizontalScrollElementBg.style.display = "none"
    // }

    this.verticalScrollElement.scrollTop = -y + this.height/2
    this.horizontalScrollElement.scrollLeft = -x + this.width/2

    this.horizontalScrollElementBg.style.width = (this.originalWidth * zoom + this.width) + "px"
    this.verticalScrollElementBg.style.height = (this.originalHeight * zoom + this.height) + "px"
}
fabric.Canvas.prototype._scrollEvent = function (event: WheelEvent){
    if(event.shiftKey){
        this.horizontalScrollElement.scrollLeft += event.deltaY
    }
    else{
        this.verticalScrollElement.scrollTop += event.deltaY
    }
}
fabric.Canvas.prototype.createScrollbars = function() {

    this.verticalScrollElement = document.createElement("div");
    this.verticalScrollElement.classList.add("vertical-scroll");
    this.horizontalScrollElement  = document.createElement("div");
    this.horizontalScrollElement.classList.add("horizontal-scroll");
    this.wrapperEl.appendChild(this.horizontalScrollElement);
    this.wrapperEl.appendChild(this.verticalScrollElement);

    this.verticalScrollElementBg = document.createElement("div");
    this.horizontalScrollElementBg  = document.createElement("div");
    this.verticalScrollElement.appendChild(this.verticalScrollElementBg);
    this.horizontalScrollElement.appendChild(this.horizontalScrollElementBg);

    this.wrapperEl.addEventListener("mousewheel", (event) => this._scrollEvent(event as WheelEvent))
    this.on("viewport:translate",()=> this.updateScrollbars())
    this.on("viewport:scaled",()=> this.updateScrollbars())
    this.on("resized",()=> this.updateScrollbars())

    this.horizontalScrollElement.onscroll = this.verticalScrollElement.onscroll = (e) => {
        this.viewportTransform[4] =  -this.horizontalScrollElement.scrollLeft + this.width/2
        this.viewportTransform[5] =  -this.verticalScrollElement.scrollTop + this.height/2
        this.renderAll()
    }

}
fabric.Canvas.prototype.stretchable = false
fabric.Canvas.prototype.zoomCtrlKey = true
fabric.Canvas.prototype.mouseWheelZoom = false
fabric.Canvas.prototype.changeDimensionOnZoom = false
fabric.Canvas.prototype.zoomToPointEnabled = true
fabric.Canvas.prototype.maxZoom = 10
fabric.Canvas.prototype.autoCenterAndZoomOut = false
fabric.Canvas.prototype.zoomStep = 0.1
fabric.Canvas.prototype.scaleFactor = 1.1
fabric.Canvas.prototype.minZoom = 0.9
fabric.Canvas.prototype.stretchingOptions = {
    action: "resize"
}

/**
 * Augment declarations to add custom methods to fabric.Canvas interface
 */
declare module "fabric" {
    namespace fabric {
        interface Canvas {

            setBackgroundImage(image: Image | string, callback?: Function): fabric.Canvas;
            setBackgroundColor(backgroundColor: string | fabric.Pattern | fabric.Gradient, callback?: Function): fabric.Canvas;

            drawingOptions: fabric.IObjectOptions;

            interactiveMode: string;
            /**
             * The transformation (in the format of Canvas transform) which focuses the viewport
             */
            viewportTransform: number[];

            drawingClass: string,

            disableDrawing(): void;

            _tableDrawingMouseUp(): void;

            enableDrawing(klass: string): void;

            _drawModeData?: {
                x: number,
                y: number,
                object?: fabric.Object
            }

            _handModeData?: {
                state: string,
                dragCursorPosition: {
                    y: number,
                    x: number
                }
            }

            // off(event: 'mouse:move', foo: (e: fabric.IEvent<MouseEvent>) => void): void
            //
            // off(event: 'mouse:down', foo: (e: fabric.IEvent<MouseEvent>) => void): void
            //
            // off(event: 'mouse:up', foo: (e: fabric.IEvent<MouseEvent>) => void): void

            disablePanning(): void

            enablePanning(): void

            disableDrawing(): void

            disableSelection(): void

            enableSelection(): void

            isDrawing(): void

            _tableDrawingMouseDown(o: fabric.IEvent<MouseEvent>): void

            _tableDrawingMouseMove(o: fabric.IEvent<MouseEvent>): void

            _tableDrawingMouseUp(): void

            _handModeMouseMove(e: fabric.IEvent<MouseEvent>): void

            _handModeMouseDown(e: fabric.IEvent<MouseEvent>): void

            _handModeMouseUp(): void

            _scrollEvent  (event: WheelEvent): void;
            updateScrollbars  (): void;
            createScrollbars (): void;
            verticalScrollElement: HTMLDivElement
            horizontalScrollElement: HTMLDivElement
            verticalScrollElementBg: HTMLDivElement
            horizontalScrollElementBg: HTMLDivElement

            stretchable: boolean,
            zoomCtrlKey: boolean,
            mouseWheelZoom: boolean,
            changeDimensionOnZoom: boolean,
            zoomToPointEnabled: boolean,
            autoCenterAndZoomOut: boolean,
            maxZoom: number,
            zoomStep: number,
            scaleFactor: number,
            minZoom: number,
            width: number,
            height: number,
            resizeObserver: ResizeObserver

            stretchingOptions: {
                action: string,
                maxWidth?: number,
                maxHeight?: number,
                maxWidthRate?: number,
                maxHeightRate?: number,
                margin?: number,
                marginX?: number,
                marginY?: number,
            }

            originalHeight: number,
            originalWidth: number,
            wrapperEl: HTMLElement
            lowerCanvasEl: HTMLElement
            _scrollContainer: HTMLElement

            setOriginalSize(w: number | HTMLImageElement, h?: number): void,

            centerAndZoomOut(): void,

            zoomIn(): void,

            zoomOut(): void,

            setStretchable(val: boolean): void,

            onResize(): void

            getCenter(): {
                top: number,
                left: number
            }

            setOriginalSize(w: number | HTMLImageElement, h: number): void

            setOriginalWidth(value: number): void

            setOriginalHeight(value: number): void

            getOriginalSize(): {
                width: number,
                height: number
            }

            getOriginalWidth(): number

            getOriginalHeight(): number

            updateCanvasSize(): void

            _onResize(): void

            getRelativeContainer(): HTMLElement | null

            getScrollContainer(): HTMLElement | null

            setStretchingOptions(val: any): void

            setStretchable(val: boolean): void

            setMouseWheelZoom(val: boolean): void

            _zoomToPointNative: Function

            zoomIn(): void

            zoomOut(): void

            resetViewport(): void

            getMaxZoom(): number

            getMinZoomOptions(): {scale: number, width: number, height: number}

            centerOnObject(tag: fabric.Object): void

            wheelZoom(e: fabric.IEvent<WheelEvent>): void

            getOrignalCenter(): fabric.IPoint

        }
    }
}